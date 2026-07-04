import { useCallback, useRef, useState } from "react";

const RELEASES = "https://github.com/xsytrance/kinetica/releases/latest";
function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Linux|X11|CrOS/i.test(ua)) return "Linux";
  return "";
}

export function DropZone({ onFile, error }: { onFile: (f: File) => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const os = detectOS();

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

      {/* Prominent desktop-app download */}
      <div className="flex flex-col items-center gap-2">
        <a
          href={RELEASES}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-3 rounded-full border-2 border-[var(--theme-primary)] px-7 py-3.5 font-display text-base font-bold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)] hover:text-black"
        >
          <span className="text-xl">⬇</span>
          <span>Download the free desktop app{os ? ` for ${os}` : ""}</span>
        </a>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          Windows · macOS · Linux · run AI privately with your own key
        </span>
      </div>

      <p className="max-w-xl text-center font-mono text-[11px] leading-relaxed text-white/35">
        You don't need the app to make a video here — the browser does Level 0,
        photo backdrops &amp; export with no sign-in and no key. The app (or{" "}
        <span className="text-white/50">Connect with OpenRouter</span>) is only for the
        AI features, so your key stays on your machine.
      </p>

      <div className="flex flex-col items-center gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">made by xsytrance</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/40">
          {[
            ["x1c7.com", "https://x1c7.com"],
            ["Suno", "https://suno.com/@xsytrance"],
            ["SoundCloud", "https://soundcloud.com/xsytrance"],
            ["GitHub", "https://github.com/xsytrance/kinetica"],
            ["agenor@outlook.com", "mailto:agenor@outlook.com"],
          ].map(([label, href]) => (
            <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="underline-offset-2 transition hover:text-[var(--theme-primary)] hover:underline">
              {label}
            </a>
          ))}
        </div>
        <p className="font-mono text-[10px] text-white/25">Open source (MIT) · no accounts · no tracking · your files stay on your device</p>
      </div>
    </div>
  );
}
