// Align pasted lyrics (the TRUTH of what's sung) onto on-device transcription
// timings (Whisper hears WHEN, but often mishears WHAT). The result: the user's
// exact words, each carrying a real timestamp — no LRC authoring needed.
//
// Method: greedy anchor matching with a lookahead window (tolerates Whisper
// mishears/hallucinations), then linear interpolation for unmatched words,
// with monotonic clamping. Simple, fast, and good enough that the tap-sync
// fallback is rarely needed.

import type { SyncedWord } from "./lyrics";

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

/** A pasted line is a section header ("[Chorus]", "(Bridge)") — not sung text. */
export const isHeaderLine = (l: string) => /^\s*[\[(].*[\])]\s*$/.test(l.trim());

export interface AlignResult {
  words: SyncedWord[];
  lrc: string;
  /** 0..1 — how many pasted words found a direct timed anchor. */
  matchRate: number;
}

export function alignLyrics(pasted: string, timed: SyncedWord[]): AlignResult {
  const lines = pasted.split("\n").map((l) => l.trim()).filter((l) => l && !isHeaderLine(l));
  const flat: { w: string; line: number }[] = [];
  for (let li = 0; li < lines.length; li++) {
    for (const w of lines[li].split(/\s+/).filter(Boolean)) flat.push({ w, line: li });
  }
  const T = timed.map((t) => ({ t: t.t, n: norm(t.w) })).filter((x) => x.n);

  // Pass 1 — anchors: walk both sequences; a pasted word matches the next
  // identical transcribed word within a lookahead window.
  const times: (number | null)[] = new Array(flat.length).fill(null);
  let ti = 0, matched = 0;
  const WINDOW = 10;
  for (let i = 0; i < flat.length && ti < T.length; i++) {
    const n = norm(flat[i].w);
    if (!n) continue;
    for (let j = ti; j < Math.min(T.length, ti + WINDOW); j++) {
      if (T[j].n === n) { times[i] = T[j].t; ti = j + 1; matched++; break; }
    }
  }

  // Pass 2 — interpolate the gaps between anchors; extrapolate the edges.
  const anchorIdx = times.map((t, i) => (t != null ? i : -1)).filter((i) => i >= 0);
  if (anchorIdx.length) {
    const first = anchorIdx[0], last = anchorIdx[anchorIdx.length - 1];
    for (let k = 0; k < first; k++) times[k] = Math.max(0, (times[first] as number) - (first - k) * 0.32);
    for (let k = last + 1; k < flat.length; k++) times[k] = (times[last] as number) + (k - last) * 0.32;
    for (let a = 0; a < anchorIdx.length - 1; a++) {
      const i0 = anchorIdx[a], i1 = anchorIdx[a + 1];
      const t0 = times[i0] as number, t1 = times[i1] as number;
      const span = i1 - i0;
      for (let k = i0 + 1; k < i1; k++) times[k] = t0 + ((t1 - t0) * (k - i0)) / span;
    }
  }

  // Monotonic clamp (mishear anchors can jitter backwards).
  let prev = 0;
  const words: SyncedWord[] = flat.map((f, i) => {
    let t = times[i] ?? prev + 0.3;
    if (t < prev) t = prev + 0.01;
    prev = t;
    return { t: Math.round(t * 100) / 100, w: f.w };
  });

  // LRC: one stamp per pasted line (the first word's time).
  const toLrc = (sec: number) => {
    const mm = Math.floor(sec / 60), ss = Math.floor(sec % 60), cs = Math.round((sec % 1) * 100) % 100;
    return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
  };
  const firstOfLine = new Map<number, number>();
  flat.forEach((f, i) => { if (!firstOfLine.has(f.line)) firstOfLine.set(f.line, i); });
  const lrc = lines.map((l, li) => {
    const wi = firstOfLine.get(li);
    return wi == null ? l : toLrc(words[wi].t) + l;
  }).join("\n");

  const sungCount = flat.filter((f) => norm(f.w)).length || 1;
  return { words, lrc, matchRate: matched / sungCount };
}
