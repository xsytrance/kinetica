// One-click visual "looks". A preset re-grades the whole show without touching
// the timing/effects: it overrides the theme palette, the display font, a global
// color-grade class on the stage, and (optionally) forces the particle weather.
// "Auto" keeps the song's own analyzed palette + automatic particles.

import type { ParticleMode } from "@/engine/KineticParticles";
import type { TextEffect, SurfaceMode } from "@/lib/effects/registry";

export interface Preset {
  id: string;
  label: string;
  palette?: [string, string, string, string]; // primary, secondary, accent, bg
  font?: string;                                // --font-display
  stageClass?: string;                          // color-grade class (index.css)
  particle?: ParticleMode;                      // force the weather layer
  /** the vibe's allowed text-effect palette — the stage suppresses any natural
   *  word effect outside this set, keeping a look coherent. Omit = no filter. */
  effects?: TextEffect[];
  /** force the stage's surface growth (mud/rust/vines/…), or "none" for clean
   *  glass. Omit = the song's own lyric-derived surface. */
  surface?: SurfaceMode | "none";
}

export const PRESETS: Preset[] = [
  { id: "auto", label: "Auto" },
  { id: "neon", label: "Neon", palette: ["#ff2bd6", "#43f7ff", "#8dff4a", "#0a0014"], font: '"Arial Black", "Helvetica Neue", sans-serif', stageClass: "fx-neon", particle: "sparks", effects: ["neon", "glitch", "pulse", "slam"] },
  { id: "film", label: "Film", palette: ["#f0c98a", "#e8dcc0", "#c77d4a", "#0e0906"], font: 'Georgia, "Times New Roman", serif', stageClass: "fx-film", particle: "dust", effects: ["dissolve", "whisper", "carve", "bloom"] },
  { id: "minimal", label: "Minimal", palette: ["#ffffff", "#cfcfcf", "#9a9a9a", "#08080c"], font: '"Helvetica Neue", Arial, sans-serif', stageClass: "fx-minimal", particle: "dust", effects: ["whisper", "dissolve"] },
  { id: "inferno", label: "Inferno", palette: ["#ff5a1f", "#ffb020", "#ff2d2d", "#0c0402"], font: '"Arial Narrow", "Arial Black", sans-serif', stageClass: "fx-inferno", particle: "embers", effects: ["burn", "slam", "melt", "shatter"], surface: "rust" },
  { id: "vapor", label: "Vapor", palette: ["#ff6ad5", "#8a6dff", "#26d9d9", "#0d0620"], font: '"Trebuchet MS", "Segoe UI", sans-serif', stageClass: "fx-vapor", particle: "rain", effects: ["wave", "neon", "whisper", "dissolve"], surface: "condensation" },
  { id: "noir", label: "Noir", palette: ["#ffffff", "#c8c8c8", "#8a8a8a", "#050505"], font: '"Arial Narrow", "Helvetica Neue", sans-serif', stageClass: "fx-noir", particle: "dust", effects: ["carve", "dissolve", "whisper", "shatter"], surface: "cracks" },
  { id: "golden", label: "Golden Hour", palette: ["#ffd27a", "#ffb347", "#ff8c42", "#160d04"], font: 'Georgia, "Times New Roman", serif', stageClass: "fx-golden", particle: "pollen", effects: ["bloom", "neon", "wave", "whisper"], surface: "sand" },
  { id: "frostbite", label: "Frostbite", palette: ["#eaf6ff", "#bfe2f7", "#7fb8e6", "#04101c"], font: '"Helvetica Neue", Arial, sans-serif', stageClass: "fx-frostbite", particle: "snow", effects: ["freeze", "whisper", "dissolve", "shatter"], surface: "condensation" },
  { id: "synthwave", label: "Synthwave", palette: ["#ff2bd6", "#26d9ff", "#ffd84a", "#0a0320"], font: '"Arial Black", "Helvetica Neue", sans-serif', stageClass: "fx-synthwave", particle: "sparks", effects: ["neon", "glitch", "pulse", "slam"], surface: "none" },
  { id: "forest", label: "Forest", palette: ["#a8d58a", "#6fae4f", "#c9822f", "#0a1408"], font: 'Georgia, "Times New Roman", serif', stageClass: "fx-forest", particle: "petals", effects: ["bloom", "wave", "whisper", "dissolve"], surface: "vines" },
  { id: "bloodmoon", label: "Blood Moon", palette: ["#ff3b3b", "#8a1a1f", "#c9822f", "#0c0202"], font: '"Arial Narrow", "Arial Black", sans-serif', stageClass: "fx-bloodmoon", particle: "ash", effects: ["burn", "shatter", "melt", "slam"], surface: "blood" },
  { id: "cyberpunk", label: "Cyberpunk", palette: ["#f6ff3b", "#ff2bd6", "#26d9ff", "#05060a"], font: '"Arial Black", "Helvetica Neue", sans-serif', stageClass: "fx-cyberpunk", particle: "rain", effects: ["glitch", "neon", "type", "pulse"], surface: "none" },
  { id: "dreamcore", label: "Dreamcore", palette: ["#ffc8e6", "#c8b0ff", "#b0f0e0", "#160f1e"], font: '"Trebuchet MS", "Segoe UI", sans-serif', stageClass: "fx-dreamcore", particle: "bubbles", effects: ["dissolve", "bloom", "whisper", "wave"], surface: "none" },
  { id: "mono1", label: "Mono +1", palette: ["#ffffff", "#cfcfcf", "#ff2bd6", "#08080c"], font: '"Helvetica Neue", Arial, sans-serif', stageClass: "fx-mono1", particle: "dust", effects: ["neon", "carve", "dissolve"], surface: "none" },
];

export const getPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
