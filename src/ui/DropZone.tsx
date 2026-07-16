import { useCallback, useRef, useState } from "react";
import { Eq } from "./Eq";
import { HeroShow } from "./HeroShow";
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
  { icon: "🥁", title: "Your beat gets measured", body: "Real DSP on your actual stems — kicks, risers, drops. No AI, no guessing." },
  { icon: "📝", title: "Lyrics time themselves", body: "Paste plain lyrics; they align to your isolated vocal, word by word." },
  { icon: "🖼", title: "Backdrops find themselves", body: "Free photo search paints every keyword. You curate, it obeys." },
  { icon: "🎬", title: "You get a show, not a slideshow", body: "Interactive, beat-reactive, recordable — export a real video." },
];

const TRUST = ["100% in your browser", "nothing uploaded", "no account", "no API key", "open source"];

export function DropZone({ onFile, onDemo, error }: { onFile: (f: File) => void; onDemo: () => void; error: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const os = detectOS();

  const pick = useCallback((files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="flex flex-col items-center">
      {/* ══════════ HERO — a live show performs behind the invitation ══════════ */}
      <section className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center gap-8 overflow-hidden px-6 py-16">
        <div className="pointer-events-none absolute inset-0">
          <HeroShow onSongChange={setNowPlaying} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/50">xsytrance presents</p>
          <h1 className="title-aurora mt-2 font-display text-6xl font-black uppercase tracking-tight sm:text-8xl">Kinetica</h1>
          <p className="mt-4 max-w-xl font-display text-lg leading-snug text-white/90 sm:text-2xl">
            Your Suno stems become a <span style={{ color: "var(--theme-primary)" }}>cinematic, interactive</span> lyric show.
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">free · private · right here in your browser</p>
        </div>

        {/* PRIMARY action — bring your own song, first and biggest */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
          className={`group relative z-10 flex h-48 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed backdrop-blur-sm transition ${
            over ? "scale-[1.02] border-[var(--theme-primary)] bg-white/10" : "border-white/30 bg-black/20 hover:border-[var(--theme-primary)] hover:bg-white/5"
          }`}
          style={{ boxShadow: over ? "0 0 48px color-mix(in srgb, var(--theme-primary) 40%, transparent)" : "0 0 30px color-mix(in srgb, var(--theme-primary) 14%, transparent)" }}
        >
          <span className="text-5xl transition group-hover:scale-110">🪐</span>
          <span className="font-display text-2xl font-black uppercase tracking-wide text-white">Drop your stem zip</span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/55">or click to choose · nothing is uploaded, ever</span>
        </button>
        <input ref={inputRef} type="file" accept=".zip" className="hidden" onChange={(e) => pick(e.target.files)} />
        {error && <p className="relative z-10 max-w-xl text-center text-sm text-red-300">{error}</p>}

        {/* Secondary — no stems handy? watch the live one that's already playing */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <button
            onClick={onDemo}
            className="rounded-full border border-white/25 bg-black/30 px-6 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm transition hover:scale-105 hover:border-white/50"
          >
            ▶ Watch a full demo{nowPlaying ? ` — “${nowPlaying}”` : ""}
          </button>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-white/45">
            {nowPlaying ? "↑ that's a real catalog song, performing live behind this" : "a random catalog song · different every time · no file, no install"}
          </span>
        </div>

        <span className="relative z-10 mt-2 animate-bounce font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">scroll ↓ to see what it does</span>
      </section>

      {/* ══════════ BELOW THE FOLD — the playful tour ══════════ */}
      <div className="flex w-full flex-col items-center gap-14 px-6 py-16">

        {/* Poke the words */}
        <WordSizzle />

        {/* What happens to your song */}
        <div className="flex w-full max-w-3xl flex-col items-center gap-5">
          <div className="flex flex-col items-center text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[var(--theme-secondary)]">from zip to show in about a minute</p>
            <div className="mt-2"><Eq /></div>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {TRUST.map((t, i) => (
            <span key={t} className="flex items-center gap-3">
              {i > 0 && <span className="text-white/20">·</span>}
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{t}</span>
            </span>
          ))}
        </div>

        {/* The desktop app */}
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
          <p className="max-w-xl text-center font-mono text-[11px] leading-relaxed text-white/35">
            You don't need it to make a video here — the browser does the whole free flow, photo
            backdrops &amp; export, no sign-in. The app (or <span className="text-white/50">Connect with OpenRouter</span>)
            only adds the AI extras, with your key kept on your own machine.
          </p>
        </div>

        {/* The Suno letter */}
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

        {/* The Studio cross-link */}
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">want the full instrument?</p>
          <p className="mt-3 font-display text-base leading-relaxed text-white/85">
            The <b style={{ color: "var(--theme-secondary)" }}>x1c7 Studio</b> runs this same engine over a full
            measured catalog — looks, section decks, automation, live telemetry, even your own shaders.
          </p>
          <a
            href="https://x1c7.com/studio"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border px-6 py-3 font-display text-sm font-bold transition hover:scale-105"
            style={{ borderColor: "var(--theme-secondary)", color: "var(--theme-secondary)" }}
          >
            🎛 Open the Studio →
          </a>
        </div>

        {/* Footer */}
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
    </div>
  );
}
