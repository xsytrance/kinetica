import { useState } from "react";
import type { Preset } from "@/lib/presets";
import { ALL_PARTICLE_MODES, type ParticleMode } from "@/engine/KineticParticles";
import { ALL_TEXT_EFFECTS, type TextEffect, type SurfaceMode } from "@/lib/effects/registry";
import { newPresetId } from "@/lib/customPresets";

const FONTS: { label: string; value: string }[] = [
  { label: "Sans", value: '"Helvetica Neue", Arial, sans-serif' },
  { label: "Bold", value: '"Arial Black", "Helvetica Neue", sans-serif' },
  { label: "Condensed", value: '"Arial Narrow", "Arial Black", sans-serif' },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Rounded", value: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { label: "Mono", value: '"Courier New", monospace' },
];
const PARTICLES: (ParticleMode | "")[] = ["", ...ALL_PARTICLE_MODES];
// Friendly names over the shared color-grade classes (index.css .fx-*).
const GRADES: { label: string; value: string | undefined }[] = [
  { label: "None", value: undefined },
  { label: "Vivid", value: "fx-neon" },
  { label: "Film + vignette", value: "fx-film" },
  { label: "Desaturated", value: "fx-minimal" },
  { label: "Warm", value: "fx-golden" },
  { label: "Cool", value: "fx-frostbite" },
  { label: "Noir vignette", value: "fx-noir" },
  { label: "Scanlines", value: "fx-cyberpunk" },
  { label: "Soft dream", value: "fx-dreamcore" },
];
const ALL_EFFECTS = ALL_TEXT_EFFECTS;
// "" = the song's own lyric-derived surface; "none" = clean glass; else forced.
const SURFACES: (SurfaceMode | "none" | "")[] = ["", "none", "mud", "rust", "cracks", "condensation", "vines", "moss", "blood", "sand"];
const COLOR_LABELS = ["Primary", "Secondary", "Accent", "Background"];

export function VibeBuilder({ initial, onSave, onCancel, onDelete }: {
  initial?: Preset;
  onSave: (p: Preset) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}) {
  const pal = initial?.palette ?? ["#ff2bd6", "#43f7ff", "#8dff4a", "#0a0014"];
  const [label, setLabel] = useState(initial?.label ?? "My vibe");
  const [colors, setColors] = useState<[string, string, string, string]>([pal[0], pal[1], pal[2], pal[3]]);
  const [font, setFont] = useState(initial?.font ?? FONTS[0].value);
  const [particle, setParticle] = useState<ParticleMode | "">(initial?.particle ?? "");
  const [stageClass, setStageClass] = useState<string | undefined>(initial?.stageClass);
  const [surface, setSurface] = useState<SurfaceMode | "none" | "">(initial?.surface ?? "");
  const [effects, setEffects] = useState<TextEffect[]>(initial?.effects ?? []);

  const setColor = (i: number, v: string) => setColors((c) => c.map((x, j) => (j === i ? v : x)) as [string, string, string, string]);
  const toggleFx = (fx: TextEffect) => setEffects((e) => (e.includes(fx) ? e.filter((x) => x !== fx) : [...e, fx]));

  const save = () => onSave({
    id: initial?.id ?? newPresetId(),
    label: label.trim() || "My vibe",
    palette: colors,
    font,
    stageClass,
    particle: particle || undefined,
    effects: effects.length ? effects : undefined,
    surface: surface || undefined,
  });

  const field = "rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-secondary)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/12 bg-[#0b0810] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-black text-white">{initial ? "Edit vibe" : "Custom vibe"}</h3>
          <button onClick={onCancel} className="font-mono text-xs text-white/50 hover:text-white">✕</button>
        </div>

        {/* live swatch preview */}
        <div className="mt-3 flex items-center gap-3 rounded-xl p-3" style={{ background: colors[3] }}>
          <span className="font-display text-3xl font-black leading-none" style={{ fontFamily: font, color: colors[0], textShadow: `0 0 0.5em ${colors[2]}` }}>Aa</span>
          <div className="flex gap-1.5">
            {colors.slice(0, 3).map((c, i) => <span key={i} className="h-6 w-6 rounded-full border border-white/20" style={{ background: c }} />)}
          </div>
        </div>

        {/* name */}
        <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-white/45">Name</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={`mt-1 w-full ${field}`} />

        {/* palette */}
        <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-white/45">Palette</label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {colors.map((c, i) => (
            <label key={i} className="flex flex-col items-center gap-1">
              <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-white/15 bg-transparent" aria-label={COLOR_LABELS[i]} />
              <span className="font-mono text-[9px] text-white/40">{COLOR_LABELS[i]}</span>
            </label>
          ))}
        </div>

        {/* font + particle + grade + surface */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Font</label>
            <select value={font} onChange={(e) => setFont(e.target.value)} className={`mt-1 w-full ${field}`}>
              {FONTS.map((f) => <option key={f.label} value={f.value} className="bg-black">{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Particle</label>
            <select value={particle} onChange={(e) => setParticle(e.target.value as ParticleMode | "")} className={`mt-1 w-full ${field}`}>
              {PARTICLES.map((p) => <option key={p || "auto"} value={p} className="bg-black">{p || "auto"}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Grade</label>
            <select value={stageClass ?? ""} onChange={(e) => setStageClass(e.target.value || undefined)} className={`mt-1 w-full ${field}`}>
              {GRADES.map((g) => <option key={g.label} value={g.value ?? ""} className="bg-black">{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-white/45">Surface</label>
            <select value={surface} onChange={(e) => setSurface(e.target.value as SurfaceMode | "none" | "")} className={`mt-1 w-full ${field}`}>
              {SURFACES.map((s) => <option key={s || "auto"} value={s} className="bg-black">{s || "auto"}</option>)}
            </select>
          </div>
        </div>

        {/* effect palette */}
        <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-white/45">
          Text effects <span className="text-white/30">— none selected = all allowed</span>
        </label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {ALL_EFFECTS.map((fx) => (
            <button key={fx} onClick={() => toggleFx(fx)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] transition ${effects.includes(fx) ? "bg-[var(--theme-secondary)] text-black" : "border border-white/20 text-white/55 hover:text-white"}`}>
              {fx}
            </button>
          ))}
        </div>

        {/* actions */}
        <div className="mt-5 flex items-center justify-between gap-2">
          {initial && onDelete
            ? <button onClick={() => onDelete(initial.id)} className="font-mono text-[11px] text-red-400/80 hover:text-red-300">Delete</button>
            : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-full border border-white/20 px-4 py-2 font-mono text-[11px] text-white/60 hover:text-white">Cancel</button>
            <button onClick={save} className="rounded-full bg-[var(--theme-secondary)] px-5 py-2 font-display text-sm font-bold text-black">Save vibe</button>
          </div>
        </div>
      </div>
    </div>
  );
}
