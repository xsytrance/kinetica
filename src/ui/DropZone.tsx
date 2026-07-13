import { useCallback, useRef, useState } from "react";
import { Eq } from "./Eq";

const RELEASES = "https://github.com/xsytrance/kinetica/releases/latest";
const SUNO = "https://suno.com";
function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Linux|X11|CrOS/i.test(ua)) return "Linux";
  return "";
}

const STEPS = [
  { icon: "🥁", title: "The beat is measured", body: "Real DSP on your actual stems — kicks, risers, drops. No AI needed." },
  { icon: "📝", title: "Lyrics time themselves", body: "Paste plain lyrics; they align to your isolated vocal, word by word." },
  { icon: "🖼", title: "Backdrops find themselves", body: "Free photo search paints every keyword. You curate, it obeys." },
  { icon: "🎬", title: "A show, not a slideshow", body: "Interactive, beat-reactive, recordable — export a real video." },
];

export function DropZone({ onFile, onDemo, error }: { onFile: (f: File) => void; onDemo: () => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const os = detectOS();

  const pick = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-9 p-6 py-12">
      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/40">xsytrance presents</p>
        <h1 className="title-aurora mt-2 font-display text-6xl font-black uppercase tracking-tight sm:text-8xl">
          Kinetica
        </h1>
        <p className="mt-4 max-w-xl font-mono text-xs uppercase tracking-[0.25em] text-white/55 sm:text-sm">
          Your stems become a cinematic, interactive lyric show
        </p>
        <div className="mt-5"><Eq /></div>
      </div>

      {/* ── The front-row seat: one tap, a real song performs ── */}
      <div className="flex w-full max-w-xl flex-col items-center gap-2">
        <button
          onClick={onDemo}
          className="w-full rounded-3xl px-8 py-5 font-display text-xl font-black uppercase tracking-wide text-black transition hover:scale-[1.03] sm:text-2xl"
          style={{ background: "linear-gradient(100deg, var(--theme-primary), var(--theme-secondary))", boxShadow: "0 0 48px color-mix(in srgb, var(--theme-primary) 45%, transparent)" }}
        >
          ▶ Watch a live demo
        </button>
        <span className="text-center font-mono text-[11px] uppercase tracking-wider text-white/45">
          a random song from the x1c7.com catalog — different every time · no file, no install
        </span>
      </div>

      {/* ── Or bring your own song ── */}
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        className={`flex h-52 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition ${
          over ? "border-[var(--theme-primary)] bg-white/5 scale-[1.02]" : "border-white/20 hover:border-white/40"
        }`}
      >
        <span className="text-5xl">🪐</span>
        <span className="font-display text-lg font-bold text-white/85">Drop your stem zip, or click to choose</span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">100% local · nothing is uploaded · your song never leaves this device</span>
      </button>
      <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => pick(e.target.files)} />

      {error && <p className="max-w-xl text-center text-sm text-red-300">{error}</p>}

      {/* ── What happens next ── */}
      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[var(--theme-secondary)]">step {i + 1}</span>
            </div>
            <h3 className="mt-2 font-display text-sm font-bold text-white/90">{s.title}</h3>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/45">{s.body}</p>
          </div>
        ))}
      </div>

      {/* ── The desktop app ── */}
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
        <p className="max-w-xl text-center font-mono text-[11px] leading-relaxed text-white/35">
          You don't need the app to make a video here — the browser does the whole
          Level 0 flow, photo backdrops &amp; export, no sign-in, no key. The app (or{" "}
          <span className="text-white/50">Connect with OpenRouter</span>) only adds the
          AI extras, and your key stays on your machine.
        </p>
      </div>

      {/* ── The Suno letter ── */}
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">an independent project · not affiliated with Suno</p>
        <p className="mt-3 font-display text-base leading-relaxed text-white/85">
          But let's be honest: <b className="text-[var(--theme-primary)]">Suno changed my life.</b>{" "}
          Every song in the demo catalog was born there. This whole engine is my thank-you letter.
        </p>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-white/45">
          And this is only the beginning — I'm going to keep showing you things you
          didn't know your stems could do. Stay close. <span className="text-white/60">— xsytrance</span>
        </p>
        <a
          href={SUNO}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-sm font-bold text-black transition hover:scale-105"
          style={{ background: "linear-gradient(100deg, var(--theme-accent), var(--theme-secondary))", boxShadow: "0 0 30px color-mix(in srgb, var(--theme-secondary) 35%, transparent)" }}
        >
          🎛 Go grab your stems on Suno →
        </a>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
          heads-up: stem downloads unlock with Suno Pro — that's where this starts
        </p>
      </div>

      {/* ── Footer ── */}
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
