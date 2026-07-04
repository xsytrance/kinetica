import { parseLyrics, type SyncedWord } from "./lyrics";

const r3 = (n: number) => Math.round(n * 1000) / 1000;

// LRC (per-line timestamps) → per-word timings, spreading each line's words
// evenly from its stamp to the next line's stamp. Section headers are skipped.
export function wordsFromLrc(lrc: string): SyncedWord[] {
  const { lines } = parseLyrics(lrc);
  const timed = lines.map((l, i) => ({ ...l, i })).filter((l) => !l.header && l.t != null && l.text);
  const words: SyncedWord[] = [];
  for (let k = 0; k < timed.length; k++) {
    const line = timed[k];
    const toks = line.text.split(/\s+/).filter(Boolean);
    const t0 = line.t!;
    const t1 = timed[k + 1]?.t ?? t0 + Math.max(1.2, toks.length * 0.34);
    const span = Math.max(0.3, t1 - t0 - 0.05);
    const dt = span / Math.max(1, toks.length);
    toks.forEach((w, j) => words.push({ t: r3(t0 + j * dt), w }));
  }
  return words;
}

// Word timings → a display LRC, grouping words into lines on long gaps (>1.1s)
// or every ~9 words. Used for the on-device-transcribe path so phrase mode has
// line structure.
export function lrcFromWords(words: SyncedWord[]): string {
  const toLrc = (sec: number) => {
    const mm = Math.floor(sec / 60), ss = Math.floor(sec % 60), cs = Math.round((sec % 1) * 100) % 100;
    return `[${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}]`;
  };
  const lines: string[] = [];
  let cur: SyncedWord[] = [];
  const flush = () => { if (cur.length) { lines.push(toLrc(cur[0].t) + cur.map((w) => w.w).join(" ")); cur = []; } };
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    const gap = words[i + 1] ? words[i + 1].t - words[i].t : 99;
    if (gap > 1.1 || cur.length >= 9) flush();
  }
  flush();
  return lines.join("\n");
}
