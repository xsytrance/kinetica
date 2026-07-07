import { useEffect, useMemo, useState } from "react";
import { useMusicPlayer } from "@/audio/player";
import { KineticStage } from "@/engine/KineticStage";
import { useRecorder } from "@/export/useRecorder";
import { PRESETS } from "@/lib/presets";
import type { Preset } from "@/lib/presets";
import { loadCustomPresets, saveCustomPreset, deleteCustomPreset } from "@/lib/customPresets";
import { VibeBuilder } from "./VibeBuilder";
import { deriveTheme } from "@/lib/theme";
import type { ThemeOverride } from "@/lib/theme";
import { extractPalette } from "@/lib/palette";
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
  const recIo = useMemo(() => ({ getAudioStream: player.getAudioStream, seek: player.seek, play: player.play, duration: player.duration }), [player]);
  const rec = useRecorder(recIo);
  const safeTitle = (track.title || "kinetica").replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  // ── Presets: one-click looks that re-grade the whole show ──
  const [presetId, setPresetId] = useState("auto");
  const [customPresets, setCustomPresets] = useState<Preset[]>(() => loadCustomPresets());
  const [builder, setBuilder] = useState<{ initial?: Preset } | null>(null);
  const allPresets = useMemo(() => [...PRESETS, ...customPresets], [customPresets]);
  const preset = allPresets.find((p) => p.id === presetId) ?? PRESETS[0];
  const isCustom = customPresets.some((p) => p.id === preset.id);
  // A dropped cover seeds the "auto" palette (extractPalette → 3 vivid swatches).
  const [coverTheme, setCoverTheme] = useState<ThemeOverride | null>(null);
  const onCover = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    extractPalette(url).then((t) => { setCoverTheme(t); if (t) setPresetId("auto"); })
      .finally(() => URL.revokeObjectURL(url));
  };
  const autoPalette = useMemo((): readonly [string, string, string, string] => {
    const pal = track.planet?.analysis?.palette;
    const t = deriveTheme(track.color || "#ff2bd6");
    const bg = (Array.isArray(pal) && typeof pal[3] === "string" ? pal[3] : null) ?? t.bg;
    if (coverTheme) return [coverTheme.primary ?? t.primary, coverTheme.secondary ?? t.secondary, coverTheme.accent ?? t.accent, bg];
    if (Array.isArray(pal) && pal.length >= 3) return [pal[0] ?? t.primary, pal[1] ?? t.secondary, pal[2] ?? t.accent, bg];
    return [t.primary, t.secondary, t.accent, t.bg];
  }, [track, coverTheme]);
  useEffect(() => {
    const r = document.documentElement.style;
    const [p, s, a, bg] = preset.palette ?? autoPalette;
    r.setProperty("--theme-primary", p); r.setProperty("--theme-secondary", s);
    r.setProperty("--theme-accent", a); r.setProperty("--theme-bg", bg);
    if (preset.font) r.setProperty("--font-display", preset.font); else r.removeProperty("--font-display");
    return () => { r.removeProperty("--font-display"); };
  }, [preset, autoPalette]);

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
        <div className="pointer-events-auto flex items-center gap-2">
          <button onClick={onExit} className="rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white/60 hover:text-white">
            ← New song
          </button>
          <select
            value={presetId} onChange={(e) => setPresetId(e.target.value)}
            title="Visual style" aria-label="Visual style"
            className="rounded-full border border-white/15 bg-black/50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/70 outline-none"
          >
            {PRESETS.map((p) => <option key={p.id} value={p.id} className="bg-black text-white">✦ {p.label}</option>)}
            {customPresets.length > 0 && (
              <optgroup label="Your vibes">
                {customPresets.map((p) => <option key={p.id} value={p.id} className="bg-black text-white">✎ {p.label}</option>)}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => setBuilder({ initial: isCustom ? preset : undefined })}
            title={isCustom ? "Edit this vibe" : "Create a custom vibe"} aria-label={isCustom ? "Edit vibe" : "New vibe"}
            className="rounded-full border border-white/15 bg-black/50 px-3 py-2 font-mono text-[10px] text-white/70 hover:text-white"
          >
            {isCustom ? "✎ Edit" : "＋ Vibe"}
          </button>
          <label
            title="Theme the show from a cover image"
            className={`cursor-pointer rounded-full border px-3 py-2 font-mono text-[10px] transition ${coverTheme ? "border-[var(--theme-secondary)] text-[var(--theme-secondary)]" : "border-white/15 bg-black/50 text-white/70 hover:text-white"}`}
          >
            {coverTheme ? "🎨 Cover ✓" : "🎨 Cover"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onCover(e.target.files?.[0])} />
          </label>
          {coverTheme && (
            <button onClick={() => setCoverTheme(null)} title="Clear cover theme" className="rounded-full border border-white/15 bg-black/50 px-2 py-2 font-mono text-[10px] text-white/50 hover:text-white">✕</button>
          )}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className={`rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition ${mode === m.id ? "bg-[var(--theme-primary)] text-black" : "border border-white/15 text-white/60 hover:text-white"}`}>
              {m.label}
            </button>
          ))}
          <button onClick={toggle} className="pointer-events-auto ml-1 rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white/70">
            {playing ? "❚❚" : "▶"}
          </button>
          {rec.recording ? (
            <button onClick={rec.stop} className="pointer-events-auto rounded-full bg-red-500 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white">■ Stop</button>
          ) : (
            <button onClick={rec.start} className="pointer-events-auto rounded-full border border-red-400/60 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-red-300 hover:bg-red-500/20">● Record</button>
          )}
        </div>
      </div>

      {/* Export banner */}
      {(rec.recording || rec.downloadUrl || rec.error) && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-30 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-black/70 px-4 py-2 font-mono text-[11px] text-white/80 backdrop-blur">
            {rec.recording && <span className="text-red-300">● Recording — plays once from the top; hit Stop or “Stop sharing” when it ends.</span>}
            {!rec.recording && rec.downloadUrl && (
              <a href={rec.downloadUrl} download={`${safeTitle}-kinetica.webm`} className="text-[var(--theme-primary)] underline">⬇ Download your lyric video (.webm)</a>
            )}
            {rec.error && <span className="text-red-300">Recording failed: {rec.error}</span>}
          </div>
        </div>
      )}

      <div className={`absolute inset-0 ${preset.stageClass ?? ""}`}>
        <KineticStage
          track={track} pass={3} mode={mode} forceParticle={preset.particle}
          // Bias the word effects to the preset's palette (keeps any per-word
          // overrides the planet already carries). Auto = no filter.
          effects={preset.effects || track.planet?.effects?.overrides
            ? { allow: preset.effects, overrides: track.planet?.effects?.overrides }
            : undefined}
        />
      </div>

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

      {builder && (
        <VibeBuilder
          initial={builder.initial}
          onCancel={() => setBuilder(null)}
          onSave={(p) => { setCustomPresets(saveCustomPreset(p)); setPresetId(p.id); setBuilder(null); }}
          onDelete={(id) => {
            setCustomPresets(deleteCustomPreset(id));
            setPresetId((cur) => (cur === id ? "auto" : cur));
            setBuilder(null);
          }}
        />
      )}
    </div>
  );
}
