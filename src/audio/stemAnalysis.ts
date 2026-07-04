import type { LoadedStems, StemRole } from "@/ingest/stemZip";
import type { StemData } from "@/lib/stemSense";

// Browser port of analyze_stems.py: measure a set of decoded stems into the
// StemData the engine performs from — kicks/snares/hats from band-split onsets
// on the drum stem, per-stem loudness envelopes, drum-cut windows, and risers.
// Pure DSP, no AI. Stems already share one clock (the mix is their sum), so
// align.lag is 0.

const ENV_HZ = 12.5;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function toMono(buf: AudioBuffer): Float32Array {
  if (buf.numberOfChannels === 1) return buf.getChannelData(0);
  const n = buf.length, out = new Float32Array(n), chs = buf.numberOfChannels;
  for (let c = 0; c < chs; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / chs; }
  return out;
}

/** Perceptual loudness envelope, 0..99 at `hz` frames/sec (matches envAt()). */
function loudness(mono: Float32Array, sr: number, hz = ENV_HZ): number[] {
  const hop = Math.max(1, Math.round(sr / hz));
  const n = Math.floor(mono.length / hop);
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0; const base = i * hop;
    for (let j = 0; j < hop; j++) { const v = mono[base + j]; s += v * v; }
    const rms = Math.sqrt(s / hop);
    const db = 20 * Math.log10(rms + 1e-9);        // ~ -100..0
    const v = Math.max(0, Math.min(1, (db + 50) / 50)); // -50..0 dB → 0..1
    out[i] = Math.round(v * 99);
  }
  return out;
}

/** Linear RMS envelope (0..1) at a finer rate, for onset picking. */
function rmsEnv(mono: Float32Array, sr: number, hz: number): { env: Float32Array; hz: number } {
  const hop = Math.max(1, Math.round(sr / hz));
  const n = Math.floor(mono.length / hop);
  const env = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0; const base = i * hop;
    for (let j = 0; j < hop; j++) { const v = mono[base + j]; s += v * v; }
    env[i] = Math.sqrt(s / hop);
  }
  return { env, hz };
}

async function bandpass(buf: AudioBuffer, type: BiquadFilterType, freq: number, Q: number): Promise<Float32Array> {
  const oac = new OfflineAudioContext(1, buf.length, buf.sampleRate);
  const src = oac.createBufferSource(); src.buffer = buf;
  const f = oac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q;
  src.connect(f); f.connect(oac.destination); src.start();
  return (await oac.startRendering()).getChannelData(0);
}

/** Spectral-flux-ish onset pick on an RMS envelope with adaptive threshold. */
function pickOnsets(env: Float32Array, hz: number, sensitivity: number, refractory: number): number[] {
  const times: number[] = [];
  let avg = 0, last = -1e9;
  for (let i = 1; i < env.length; i++) {
    const nov = Math.max(0, env[i] - env[i - 1]);
    avg = avg * 0.98 + nov * 0.02;
    const t = i / hz;
    if (nov > Math.max(1e-4, avg * sensitivity) && env[i] > 0.015 && t - last > refractory) { times.push(r3(t)); last = t; }
  }
  return times;
}

/** Tempo (BPM) via autocorrelation of a low-band energy envelope. */
function estimateBpm(env: Float32Array, hz: number): number {
  const minLag = Math.round(hz * 60 / 200), maxLag = Math.round(hz * 60 / 60); // 60..200 BPM
  let best = minLag, bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = lag; i < env.length; i++) s += env[i] * env[i - lag];
    if (s > bestScore) { bestScore = s; best = lag; }
  }
  return Math.round((60 * hz) / best * 100) / 100;
}

/** Windows where the drum envelope falls silent (dramatic cuts). */
function findCuts(drumEnv: number[], hz: number): [number, number][] {
  const max = Math.max(1, ...drumEnv);
  const thr = max * 0.14;
  const cuts: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < drumEnv.length; i++) {
    const quiet = drumEnv[i] < thr;
    if (quiet && start < 0) start = i;
    if (!quiet && start >= 0) { const a = start / hz, b = i / hz; if (b - a >= 0.6) cuts.push([r3(a), r3(b)]); start = -1; }
  }
  return cuts;
}

/** Energy ramps in melodic stems that end at a drum return (ride into the drop). */
function findRisers(melodic: number[], drumEnv: number[], hz: number, cuts: [number, number][]): { t: number; end: number }[] {
  const out: { t: number; end: number }[] = [];
  for (const [, b] of cuts) {
    const endF = Math.round(b * hz);
    const startF = Math.max(0, endF - Math.round(3.5 * hz));
    if (endF - startF < 3) continue;
    // rising if the melodic energy near the cut's end is well above its start
    const rise = (melodic[endF] ?? 0) - (melodic[startF] ?? 0);
    if (rise > 10) out.push({ t: r3(startF / hz), end: r3(b) });
  }
  return out;
}

export async function analyzeStems(stems: LoadedStems, onProgress?: (m: string) => void): Promise<StemData> {
  const { roles, sampleRate: sr, duration } = stems;
  const env: StemData["env"] = {};
  for (const role of Object.keys(roles) as StemRole[]) {
    const b = roles[role]; if (!b) continue;
    env[role] = loudness(toMono(b), sr);
  }

  const drums = roles.drums ?? roles.other ?? roles.bass;
  let kicks: number[] = [], snares: number[] = [], hats: number[] = [], beats: number[] = [], bpm = 120;
  if (drums) {
    onProgress?.("Measuring the beat…");
    const [low, mid, high] = await Promise.all([
      bandpass(drums, "lowpass", 110, 0.7),
      bandpass(drums, "bandpass", 260, 0.9),
      bandpass(drums, "highpass", 7500, 0.7),
    ]);
    const kEnv = rmsEnv(low, sr, 200), sEnv = rmsEnv(mid, sr, 200), hEnv = rmsEnv(high, sr, 220);
    kicks = pickOnsets(kEnv.env, kEnv.hz, 1.5, 0.10);
    snares = pickOnsets(sEnv.env, sEnv.hz, 1.7, 0.10);
    hats = pickOnsets(hEnv.env, hEnv.hz, 1.9, 0.045);
    bpm = estimateBpm(kEnv.env, kEnv.hz);
    // Beat grid: from the first kick, step by the beat period.
    const period = 60 / bpm;
    const t0 = kicks[0] ?? 0;
    for (let t = t0; t < duration; t += period) beats.push(r3(t));
  }

  const drumEnv = env.drums ?? [];
  const cuts = drumEnv.length ? findCuts(drumEnv, ENV_HZ) : [];
  const melodic = env.synth ?? env.other ?? env.bass ?? [];
  const risers = drumEnv.length && melodic.length ? findRisers(melodic, drumEnv, ENV_HZ, cuts) : [];

  return { v: 1, bpm, envHz: ENV_HZ, duration: r3(duration), align: { lag: 0, score: 1 }, beats, kicks, snares, hats, cuts, risers, env };
}
