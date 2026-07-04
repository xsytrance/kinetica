import type { LoadedStems } from "@/ingest/stemZip";

// Mix all stems back into one master and encode a WAV object URL for playback.
// (Suno stem zips don't include the master; the sum of the stems IS the song,
// and it stays in the exact same clock as the analysis — zero alignment needed.)
export function mixdownToWavUrl(stems: LoadedStems): { url: string; duration: number } {
  const bufs = Object.values(stems.roles).filter(Boolean) as AudioBuffer[];
  const sr = stems.sampleRate;
  const len = Math.max(...bufs.map((b) => b.length));
  const mono = new Float32Array(len);
  for (const b of bufs) {
    const chs = b.numberOfChannels;
    for (let c = 0; c < chs; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < d.length; i++) mono[i] += d[i] / chs;
    }
  }
  // Normalize to -1 dBFS so the summed stems don't clip.
  let peak = 0;
  for (let i = 0; i < len; i++) { const a = Math.abs(mono[i]); if (a > peak) peak = a; }
  const g = peak > 0 ? 0.89 / peak : 1;
  const blob = encodeWav(mono, sr, g);
  return { url: URL.createObjectURL(blob), duration: len / sr };
}

function encodeWav(samples: Float32Array, sr: number, gain: number): Blob {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const wr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
  wr(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); wr(8, "WAVE");
  wr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  wr(36, "data"); dv.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] * gain));
    dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buf], { type: "audio/wav" });
}
