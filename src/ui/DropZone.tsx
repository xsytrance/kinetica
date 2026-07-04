import { useCallback, useRef, useState } from "react";

export function DropZone({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="font-display text-5xl font-black uppercase tracking-tight glow-text sm:text-7xl" style={{ color: "var(--theme-primary)" }}>
          Kinetica
        </h1>
        <p className="mt-3 max-w-xl font-mono text-xs uppercase tracking-[0.25em] text-white/50 sm:text-sm">
          Drop your Suno stem zip → get a cinematic, interactive lyric video
        </p>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        className={`flex h-64 w-full max-w-xl flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed transition ${
          over ? "border-[var(--theme-primary)] bg-white/5 scale-[1.02]" : "border-white/20 hover:border-white/40"
        }`}
      >
        <span className="text-5xl">🪐</span>
        <span className="font-display text-lg font-bold text-white/80">Drop a stem zip, or click to choose</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">100% local · nothing is uploaded</span>
      </button>
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => pick(e.target.files)} />

      {error && <p className="max-w-xl text-center text-sm text-red-300">{error}</p>}

      <p className="max-w-xl text-center font-mono text-[11px] leading-relaxed text-white/35">
        Free, and your song never leaves your device — no sign-in, no API key here.
        Want AI direction &amp; generated art? Run Kinetica{" "}
        <a href="https://github.com/xsytrance/kinetica#run-it-locally-for-ai-features" target="_blank" rel="noreferrer" className="text-white/60 underline hover:text-[var(--theme-primary)]">on your own machine</a>{" "}
        so your keys stay yours.
      </p>

      <a href="https://x1c7.com" target="_blank" rel="noreferrer" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 transition hover:text-[var(--theme-primary)]">
        made by xsytrance · x1c7.com ↗
      </a>
    </div>
  );
}
