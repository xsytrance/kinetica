import JSZip from "jszip";

// Roles the engine's stem senses understand. Extra Suno stems (guitar, keys,
// percussion, fx) fold into the closest bucket.
export type StemRole = "lead" | "back" | "drums" | "bass" | "synth" | "other";
export const ROLES: StemRole[] = ["lead", "back", "drums", "bass", "synth", "other"];

export interface LoadedStems {
  roles: Partial<Record<StemRole, AudioBuffer>>;
  names: string[];        // original filenames, for display
  sampleRate: number;
  duration: number;       // seconds (longest stem)
}

const AUDIO_RE = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;

export function classify(filename: string): StemRole {
  const n = filename.toLowerCase();
  if (/back|harmon|choir|adlib|ad-lib/.test(n)) return "back";
  if (/lead|vocal|vox|voice/.test(n)) return "lead";
  if (/drum|kick|snare|hat|beat/.test(n)) return "drums";
  if (/bass|808|sub/.test(n)) return "bass";
  if (/synth|keys|keyboard|piano|pad|organ/.test(n)) return "synth";
  return "other"; // guitar, percussion, fx, "other", strings...
}

async function decode(ac: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // decodeAudioData wants its own copy; slice guards against detachment.
  return ac.decodeAudioData(data.slice(0));
}

/** Sum several mono/stereo buffers into one (role bucket may collect >1 stem). */
function mixInto(ac: AudioContext, buffers: AudioBuffer[]): AudioBuffer {
  const len = Math.max(...buffers.map((b) => b.length));
  const sr = buffers[0].sampleRate;
  const out = ac.createBuffer(1, len, sr);
  const o = out.getChannelData(0);
  for (const b of buffers) {
    const chs = b.numberOfChannels;
    for (let c = 0; c < chs; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) o[i] += d[i] / chs;
    }
  }
  return out;
}

export async function loadStemZip(file: File | Blob, onProgress?: (msg: string) => void): Promise<LoadedStems> {
  onProgress?.("Unzipping stems…");
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((f) => !f.dir && AUDIO_RE.test(f.name) && !f.name.startsWith("__MACOSX"));
  if (!entries.length) throw new Error("No audio stems found in the zip. Suno stem zips contain .mp3 files like “0 Lead Vocals.mp3”.");

  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  const buckets = new Map<StemRole, AudioBuffer[]>();
  const names: string[] = [];
  let sampleRate = 44100, duration = 0;

  for (const e of entries) {
    const base = e.name.split("/").pop() || e.name;
    onProgress?.(`Decoding ${base}…`);
    const buf = await decode(ac, await e.async("arraybuffer"));
    sampleRate = buf.sampleRate;
    duration = Math.max(duration, buf.duration);
    const role = classify(base);
    (buckets.get(role) ?? buckets.set(role, []).get(role)!).push(buf);
    names.push(base);
  }

  const roles: Partial<Record<StemRole, AudioBuffer>> = {};
  for (const [role, bufs] of buckets) roles[role] = bufs.length === 1 ? bufs[0] : mixInto(ac, bufs);
  await ac.close();
  return { roles, names, sampleRate, duration };
}
