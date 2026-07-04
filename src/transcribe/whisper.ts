import type { LoadedStems } from "@/ingest/stemZip";
import type { SyncedWord } from "@/lib/lyrics";

// On-device transcription (Level 0, no API key). Runs Whisper in the browser via
// Transformers.js (WASM/WebGPU) with word-level timestamps. The model downloads
// once on first use (~40MB for whisper-base) and is cached by the browser; the
// audio never leaves the machine. Lazy-loaded so the offline paste/tap path never
// pays for it.

export interface Transcript { words: SyncedWord[] }

function bestVocalMono(stems: LoadedStems): { data: Float32Array; sr: number } {
  const b = stems.roles.lead ?? stems.roles.back ?? Object.values(stems.roles)[0]!;
  const n = b.length, out = new Float32Array(n), chs = b.numberOfChannels;
  for (let c = 0; c < chs; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / chs; }
  return { data: out, sr: b.sampleRate };
}

// Whisper wants 16kHz mono.
function resampleTo16k(data: Float32Array, sr: number): Float32Array {
  if (sr === 16000) return data;
  const ratio = sr / 16000, n = Math.floor(data.length / ratio), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * ratio, j = Math.floor(x), f = x - j; out[i] = (data[j] ?? 0) * (1 - f) + (data[j + 1] ?? 0) * f; }
  return out;
}

export async function transcribeOnDevice(stems: LoadedStems, onProgress?: (m: string) => void): Promise<Transcript> {
  onProgress?.("Loading the on-device speech model (first run downloads ~40MB)…");
  // @vite-ignore — optional heavy dep; the paste/tap path works without it.
  const mod: any = await import(/* @vite-ignore */ "@huggingface/transformers");
  const { pipeline } = mod;
  const asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-base", {
    progress_callback: (p: any) => { if (p?.status === "progress" && p.file) onProgress?.(`Downloading model: ${p.file} ${Math.round(p.progress || 0)}%`); },
  });

  const vocal = bestVocalMono(stems);
  const audio = resampleTo16k(vocal.data, vocal.sr);
  onProgress?.("Transcribing on your device…");
  const out: any = await asr(audio, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5 });

  const chunks: any[] = out?.chunks ?? [];
  const words: SyncedWord[] = chunks
    .map((c) => ({ t: Array.isArray(c.timestamp) ? c.timestamp[0] : 0, w: String(c.text || "").trim() }))
    .filter((w) => w.w && Number.isFinite(w.t));
  if (!words.length) throw new Error("Transcription produced no words — try the paste/tap path.");
  return { words };
}
