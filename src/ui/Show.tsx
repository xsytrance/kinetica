import { useEffect, useMemo, useState } from "react";
import { useMusicPlayer } from "@/audio/player";
import { KineticStage, clean } from "@/engine/KineticStage";
import { WordFxPanel } from "./WordFxPanel";
import type { TextEffect } from "@/lib/effects/registry";
import type { ParticleMode } from "@/engine/KineticParticles";
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

  // ── Per-word effect overrides (director control) ──
  const [overrides, setOverrides] = useState<Record<string, TextEffect>>(() => ({ ...(track.planet?.effects?.overrides ?? {}) }));
  const [fxPanel, setFxPanel] = useState(false);
  const uniqueWords = useMemo(() => {
    const seen = new Map<string, string>(); // key -> display (first seen)
    for (const w of track.lyricsSynced?.words ?? []) {
      const display = clean(w.w);
      const key = display.toLowerCase();
      if (key && !seen.has(key)) seen.set(key, display);
    }
    return [...seen.entries()].map(([key, display]) => ({ key, display }));
  }, [track]);
  const setOverride = (key: string, fx: TextEffect | null) =>
    setOverrides((o) => {
      if (!fx) { const { [key]: _drop, ...rest } = o; return rest; }
      return { ...o, [key]: fx };
    });

  // ── Director's deck: live weather override + intensity knobs ──
  const [deckOpen, setDeckOpen] = useState(false);
  const [particleOverride, setParticleOverride] = useState<ParticleMode | "">("");
  const [deck, setDeck] = useState({ density: 1, glow: 0, grain: 0, vignette: 0 });
  const setDeckVal = (k: keyof typeof deck, v: number) => setDeck((d) => ({ ...d, [k]: v }));
  const PARTICLES: (ParticleMode | "")[] = ["", "dust", "embers", "ash", "rain", "snow", "bubbles", "sparks", "petals", "pollen"];
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
          <button
            onClick={() => setDeckOpen((v) => !v)}
            title="Director's deck — vibe, weather, intensity, per-word FX" aria-label="Director's deck"
            className={`rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition ${deckOpen ? "border-[var(--theme-secondary)] text-[var(--theme-secondary)]" : "border-white/15 bg-black/50 text-white/70 hover:text-white"}`}
          >
            ⚙ Director
          </button>
          <span className="hidden font-mono text-[10px] text-white/40 sm:inline">✦ {preset.label}</span>
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
          track={track} pass={3} mode={mode}
          forceParticle={particleOverride || preset.particle}
          // Bias word effects + surface to the preset; per-word overrides (from
          // the FX panel) always win over the vibe. Auto = no filter.
          effects={preset.effects || preset.surface || Object.keys(overrides).length
            ? { allow: preset.effects, surface: preset.surface, overrides }
            : undefined}
          deck={deck}
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

      {deckOpen && (
        <div className="pointer-events-auto absolute left-3 top-16 z-40 flex max-h-[80dvh] w-72 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/12 bg-[#0b0810]/95 p-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-black text-white">Director’s deck</h3>
            <button onClick={() => setDeckOpen(false)} className="font-mono text-xs text-white/50 hover:text-white">✕</button>
          </div>

          {/* Vibe */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Vibe</label>
            <div className="mt-1 flex gap-1.5">
              <select value={presetId} onChange={(e) => setPresetId(e.target.value)} aria-label="Visual style" className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 font-mono text-[11px] text-white/80 outline-none">
                {PRESETS.map((p) => <option key={p.id} value={p.id} className="bg-black">✦ {p.label}</option>)}
                {customPresets.length > 0 && <optgroup label="Your vibes">{customPresets.map((p) => <option key={p.id} value={p.id} className="bg-black">✎ {p.label}</option>)}</optgroup>}
              </select>
              <button onClick={() => setBuilder({ initial: isCustom ? preset : undefined })} title={isCustom ? "Edit vibe" : "New vibe"} className="rounded-lg border border-white/15 px-2.5 py-1.5 font-mono text-[11px] text-white/70 hover:text-white">{isCustom ? "✎" : "＋"}</button>
            </div>
          </div>

          {/* Cover + Weather */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Cover theme</label>
              <div className="mt-1 flex gap-1">
                <label className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-center font-mono text-[11px] ${coverTheme ? "border-[var(--theme-secondary)] text-[var(--theme-secondary)]" : "border-white/15 text-white/70 hover:text-white"}`}>
                  {coverTheme ? "🎨 ✓" : "🎨 set"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onCover(e.target.files?.[0])} />
                </label>
                {coverTheme && <button onClick={() => setCoverTheme(null)} title="Clear cover theme" className="rounded-lg border border-white/15 px-2 font-mono text-[11px] text-white/50 hover:text-white">✕</button>}
              </div>
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Weather</label>
              <select value={particleOverride} onChange={(e) => setParticleOverride(e.target.value as ParticleMode | "")} aria-label="Weather override" className="mt-1 w-full rounded-lg border border-white/15 bg-black/60 px-2 py-1.5 font-mono text-[11px] text-white/80 outline-none">
                {PARTICLES.map((p) => <option key={p || "auto"} value={p} className="bg-black">{p || "auto"}</option>)}
              </select>
            </div>
          </div>

          {/* Intensity sliders (perf-lite aware in the engine) */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Intensity</label>
            <div className="mt-1.5 space-y-2">
              {([["density", "Density", 0.2, 2, 0.05], ["glow", "Glow", 0, 1, 0.05], ["grain", "Grain", 0, 1, 0.05], ["vignette", "Vignette", 0, 1, 0.05]] as const).map(([key, lbl, min, max, step]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-14 font-mono text-[10px] text-white/55">{lbl}</span>
                  <input type="range" min={min} max={max} step={step} value={deck[key]} onChange={(e) => setDeckVal(key, parseFloat(e.target.value))} aria-label={lbl} className="min-w-0 flex-1 accent-[var(--theme-secondary)]" />
                  <span className="w-8 text-right font-mono text-[10px] text-white/40">{deck[key].toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-word FX opens its own panel (on the right) */}
          <button onClick={() => setFxPanel((v) => !v)} className={`rounded-full border py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${fxPanel || Object.keys(overrides).length ? "border-[var(--theme-secondary)] text-[var(--theme-secondary)]" : "border-white/15 text-white/60 hover:text-white"}`}>
            ✦ Per-word FX{Object.keys(overrides).length ? ` · ${Object.keys(overrides).length}` : ""}
          </button>
        </div>
      )}

      {fxPanel && (
        <WordFxPanel
          words={uniqueWords}
          overrides={overrides}
          onSet={setOverride}
          onClear={() => setOverrides({})}
          onClose={() => setFxPanel(false)}
        />
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
