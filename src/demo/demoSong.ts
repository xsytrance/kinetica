import type { LoadedStems } from "@/ingest/stemZip";
import type { SyncedWord } from "@/lib/lyrics";
import { wordsFromLrc } from "@/lib/lyricsBuild";

// A zero-asset demo: synthesize a short beat in the browser (kick / snare / hats
// / bass / pad) and run it through the exact same pipeline as a real stem zip.
// No files, no network, no licensing — just to show the engine off instantly.

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;
const BARS = 10;
const DUR = BARS * 4 * BEAT; // 20s

// Canned lyrics timed to the 120bpm grid — packed with effect + stutter words
// (burn on "fire", pileups on "go"/"higher", beat-reactive throughout).
const LRC = `[Intro]
[00:00.50]turn it up
[Verse]
[00:02.50]drop the beat and let it ride
[00:04.50]neon lights, we come alive
[Hook]
[00:06.50]go go go go go go
[00:08.50]light it up and watch it glow
[Drop]
[00:10.50]fire fire fire
[00:12.50]higher higher higher higher
[Verse]
[00:14.50]feel the bass, it never dies
[00:16.50]hold the night inside your eyes
[Outro]
[00:18.50]kinetica`;

function noise(): number { return Math.random() * 2 - 1; }

export function makeDemo(): { stems: LoadedStems; lyricsLrc: string; words: SyncedWord[]; title: string } {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  const len = Math.ceil(DUR * SR);
  const mk = () => ac.createBuffer(1, len, SR);
  const drums = mk(), bass = mk(), synth = mk();
  const d = drums.getChannelData(0), b = bass.getChannelData(0), s = synth.getChannelData(0);
  const at = (t: number) => Math.floor(t * SR);

  const beats = Math.floor(DUR / BEAT);
  for (let beat = 0; beat < beats; beat++) {
    const t0 = beat * BEAT;
    // kick on every beat — pitch-swept sine with fast decay
    for (let i = 0; i < 0.14 * SR; i++) {
      const t = i / SR, env = Math.exp(-t * 26), f = 120 - 70 * Math.min(1, t / 0.06);
      const idx = at(t0) + i; if (idx < len) d[idx] += Math.sin(2 * Math.PI * f * t) * env * 0.9;
    }
    // snare on beats 2 & 4 — filtered-ish noise burst
    if (beat % 2 === 1) for (let i = 0; i < 0.13 * SR; i++) {
      const t = i / SR, idx = at(t0) + i; if (idx < len) d[idx] += noise() * Math.exp(-t * 34) * 0.5;
    }
    // bass — root note per beat cycling a little progression
    const roots = [55, 55, 82.4, 65.4]; // A1 A1 E2 C2
    const f = roots[beat % roots.length];
    for (let i = 0; i < BEAT * 0.9 * SR; i++) {
      const t = i / SR, env = Math.min(1, t * 40) * Math.exp(-t * 2.2), idx = at(t0) + i;
      if (idx < len) b[idx] += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env * 0.4;
    }
  }
  // hats on every 8th note
  for (let h = 0; h < beats * 2; h++) {
    const t0 = h * BEAT / 2;
    for (let i = 0; i < 0.035 * SR; i++) { const t = i / SR, idx = at(t0) + i; if (idx < len) d[idx] += noise() * Math.exp(-t * 120) * 0.16; }
  }
  // pad — a slow chord (A minor-ish) shimmering underneath
  const chord = [220, 261.6, 329.6];
  for (let i = 0; i < len; i++) {
    const t = i / SR, lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t);
    let v = 0; for (const f of chord) v += Math.sin(2 * Math.PI * f * t);
    s[i] += (v / chord.length) * 0.12 * lfo;
  }
  ac.close().catch(() => {});

  return {
    stems: { roles: { drums, bass, synth }, names: ["Drums", "Bass", "Synth"], sampleRate: SR, duration: DUR },
    lyricsLrc: LRC,
    words: wordsFromLrc(LRC),
    title: "Kinetica Demo",
  };
}
