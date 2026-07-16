import { useCallback, useRef, useState } from "react";
import { HeroFX } from "./HeroFX";
import { WordSizzle } from "./WordSizzle";

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
  { icon: "🥁", title: "Beat measured", body: "Real DSP on your stems — kicks, risers, drops. No guessing." },
  { icon: "📝", title: "Lyrics time themselves", body: "Paste them; they align to your vocal, word by word." },
  { icon: "🖼", title: "Backdrops find themselves", body: "Free photo search paints every keyword." },
  { icon: "🎬", title: "A show, not a slideshow", body: "Interactive, beat-reactive, exports to video." },
];
const TRUST = ["100% in your browser", "nothing uploaded", "no account", "no key", "open source"];

export function DropZone({ onFile, onDemo, error }: { onFile: (f: File) => void; onDemo: () => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const os = detectOS();

  const pick = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="jk relative flex min-h-[100dvh] flex-col items-center">
      {/* ══════════ HERO ══════════ */}
      <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-7 overflow-hidden px-5 py-14">
        <HeroFX />

        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="jk-eyebrow text-[10px] text-white/45">xsytrance · presents</p>
          <div className="jk-wordwrap mt-2">
            <span className="jk-wordecho block text-[19vw] sm:text-[13vw] lg:text-[150px]" aria-hidden>KINETICA</span>
            <h1 className="jk-wordmark block text-[19vw] sm:text-[13vw] lg:text-[150px]">KINETICA</h1>
          </div>
          <p className="mt-3 max-w-xl font-display text-lg font-bold leading-snug text-white sm:text-2xl">
            Your Suno stems become a <span style={{ color: "var(--jk-cyan)" }}>cinematic</span>,{" "}
            <span style={{ color: "var(--jk-pink)" }}>interactive</span> lyric show.
          </p>
          <p className="jk-eyebrow mt-2 text-[9px] text-white/40">free · private · right here in your browser</p>
        </div>

        {/* PRIMARY — bring your own song */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
          className={`jk-drop group relative z-10 flex h-48 w-full max-w-xl flex-col items-center justify-center gap-2.5 ${over ? "jk-over" : ""}`}
        >
          <span className="text-5xl transition group-hover:scale-110" style={{ filter: "drop-shadow(0 0 14px var(--jk-gold))" }}>🪐</span>
          <span className="font-display text-2xl font-black uppercase tracking-wide text-white">Drop your stem zip</span>
          <span className="jk-eyebrow text-[10px] tracking-[0.2em] text-white/55">or click to choose · nothing is uploaded, ever</span>
        </button>
        <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => pick(e.target.files)} />
        {error && <p className="relative z-10 max-w-xl text-center text-sm text-red-300">{error}</p>}

        {/* Secondary — no stems handy */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <button onClick={onDemo} className="jk-pill jk-pill-ghost px-6 py-3 text-sm">▶ Watch a live demo</button>
          <span className="jk-eyebrow text-[9px] tracking-[0.2em] text-white/40">a random catalog song · different every time · no file, no install</span>
        </div>

        <span className="jk-eyebrow relative z-10 mt-1 animate-bounce text-[9px] text-white/30">scroll ↓ to play</span>
      </section>

      {/* ══════════ TOUR ══════════ */}
      <div className="jk-tour relative z-10 flex w-full flex-col items-center gap-12 px-5 py-16">
        <WordSizzle />

        {/* what happens, as neat chips */}
        <div className="grid w-full max-w-3xl grid-cols-2 gap-3 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="jk-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{s.icon}</span>
                <span className="jk-eyebrow text-[8px] tracking-[0.25em]" style={{ color: "var(--jk-cyan)" }}>step {i + 1}</span>
              </div>
              <h3 className="mt-2 font-display text-sm font-bold text-white/90">{s.title}</h3>
              <p className="mt-1 font-mono text-[10.5px] leading-relaxed text-white/45">{s.body}</p>
            </div>
          ))}
        </div>

        {/* trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {TRUST.map((t, i) => (
            <span key={t} className="flex items-center gap-3">
              {i > 0 && <span style={{ color: "var(--jk-violet)" }}>◆</span>}
              <span className="jk-eyebrow text-[9px] tracking-[0.18em] text-white/55">{t}</span>
            </span>
          ))}
        </div>

        {/* desktop app */}
        <a href={RELEASES} target="_blank" rel="noreferrer" className="jk-pill jk-pill-ghost flex items-center gap-3 px-7 py-3.5 text-sm" style={{ borderColor: "color-mix(in srgb, var(--jk-gold) 50%, transparent)", color: "var(--jk-gold)" }}>
          ⬇ Download the free desktop app{os ? ` for ${os}` : ""}
        </a>

        {/* the Suno letter */}
        <div className="jk-card w-full max-w-xl p-6 text-center">
          <p className="jk-eyebrow text-[9px] tracking-[0.3em] text-white/40">not affiliated with Suno · but</p>
          <p className="mt-3 font-display text-lg font-bold leading-relaxed text-white">
            <b style={{ color: "var(--jk-pink)" }}>Suno changed my life.</b> Every demo song was born there. This engine is my thank-you letter.
          </p>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-white/45">
            And it's only the beginning — I'll keep showing you what your stems can do. Stay close. <span className="text-white/60">— xsytrance</span>
          </p>
          <a href={SUNO} target="_blank" rel="noreferrer" className="jk-pill jk-pill-primary mt-4 inline-flex px-6 py-3 text-sm">🎛 Grab your stems on Suno →</a>
          <p className="jk-eyebrow mt-2 text-[8px] tracking-[0.15em] text-white/40">stem downloads unlock with Suno Pro — that's where this starts</p>
        </div>

        {/* the Studio */}
        <div className="jk-card w-full max-w-xl p-6 text-center">
          <p className="jk-eyebrow text-[9px] tracking-[0.3em] text-white/40">want the full instrument?</p>
          <p className="mt-3 font-display text-base font-bold leading-relaxed text-white">
            The <b style={{ color: "var(--jk-cyan)" }}>x1c7 Studio</b> runs this same engine over a full catalog — looks, decks, automation, even your own shaders.
          </p>
          <a href="https://x1c7.com/studio" target="_blank" rel="noreferrer" className="jk-pill jk-pill-ghost mt-4 inline-flex px-6 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--jk-cyan) 50%, transparent)", color: "var(--jk-cyan)" }}>
            🎛 Open the Studio →
          </a>
        </div>

        {/* footer */}
        <div className="flex flex-col items-center gap-2">
          <p className="jk-eyebrow text-[10px] tracking-[0.2em] text-white/40">made by xsytrance</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/40">
            {[
              ["x1c7.com", "https://x1c7.com"],
              ["Suno", "https://suno.com/@xsytrance"],
              ["SoundCloud", "https://soundcloud.com/xsytrance"],
              ["GitHub", "https://github.com/xsytrance/kinetica"],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="underline-offset-2 transition hover:underline" style={{ color: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--jk-pink)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}>
                {label}
              </a>
            ))}
          </div>
          <p className="font-mono text-[10px] text-white/25">Open source (MIT) · no accounts · no tracking · your files stay on your device</p>
        </div>
      </div>
    </div>
  );
}
