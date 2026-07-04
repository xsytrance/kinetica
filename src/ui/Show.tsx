import { useEffect, useState } from "react";
import { useMusicPlayer } from "@/audio/player";
import { KineticStage } from "@/engine/KineticStage";
import type { Track } from "@/lib/types";
import type { Credit } from "@/images/populate";

type Mode = "phrase" | "focus" | "dynamic";
const MODES: { id: Mode; label: string }[] = [
  { id: "phrase", label: "Phrase" },
  { id: "focus", label: "Focus" },
  { id: "dynamic", label: "Dynamic" },
];

export function Show({ track, onExit, credits = [], attribution = "" }: {
  track: Track; onExit: () => void; credits?: Credit[]; attribution?: string;
}) {
  const player = useMusicPlayer();
  const [mode, setMode] = useState<Mode>("phrase");
  const [playing, setPlaying] = useState(true);
  const [showCredits, setShowCredits] = useState(false);

  useEffect(() => {
    player.load(track);
    const t = setTimeout(() => { player.play(); setPlaying(true); }, 300);
    return () => { clearTimeout(t); player.pause(); };
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => { player.toggle(); setPlaying((p) => !p); };

  return (
    <div className="fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden">
      {/* controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4">
        <button onClick={onExit} className="pointer-events-auto rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white">
          ← New song
        </button>
        <div className="pointer-events-auto flex gap-1.5">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition ${mode === m.id ? "bg-[var(--theme-primary)] text-black" : "border border-white/15 text-white/60 hover:text-white"}`}>
              {m.label}
            </button>
          ))}
          <button onClick={toggle} className="pointer-events-auto ml-1 rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white/70">
            {playing ? "❚❚" : "▶"}
          </button>
        </div>
      </div>

      <KineticStage track={track} pass={3} mode={mode} />

      {/* Photo attribution — free-photo APIs require crediting the creators. */}
      {attribution && (
        <div className="pointer-events-none absolute inset-x-0 bottom-1 z-30 flex flex-col items-center gap-1">
          {showCredits && credits.length > 0 && (
            <div className="pointer-events-auto max-h-40 max-w-2xl overflow-y-auto rounded-lg bg-black/70 p-3 text-center font-mono text-[10px] leading-relaxed text-white/70 backdrop-blur">
              {credits.map((c, i) => (
                <div key={i}>
                  <span className="text-white/40">{c.word}:</span>{" "}
                  <a href={c.authorUrl || c.sourceUrl} target="_blank" rel="noreferrer" className="underline">{c.author}</a>
                  <span className="text-white/40"> · {c.source}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowCredits((s) => !s)} className="pointer-events-auto rounded-full bg-black/40 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-white/40 hover:text-white/70">
            {attribution}{credits.length ? ` · ${showCredits ? "hide" : "credits"}` : ""}
          </button>
        </div>
      )}
    </div>
  );
}
