// One-click visual "looks". A preset re-grades the whole show without touching
// the timing/effects: it overrides the theme palette, the display font, a global
// color-grade class on the stage, and (optionally) forces the particle weather.
// "Auto" keeps the song's own analyzed palette + automatic particles.

import type { ParticleMode } from "@/engine/KineticParticles";
import type { TextEffect } from "@/lib/effects/registry";

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
}

export const PRESETS: Preset[] = [
  { id: "auto", label: "Auto" },
  { id: "neon", label: "Neon", palette: ["#ff2bd6", "#43f7ff", "#8dff4a", "#0a0014"], font: '"Arial Black", "Helvetica Neue", sans-serif', stageClass: "fx-neon", particle: "sparks", effects: ["neon", "glitch", "pulse", "slam"] },
  { id: "film", label: "Film", palette: ["#f0c98a", "#e8dcc0", "#c77d4a", "#0e0906"], font: 'Georgia, "Times New Roman", serif', stageClass: "fx-film", particle: "dust", effects: ["dissolve", "whisper", "carve", "bloom"] },
  { id: "minimal", label: "Minimal", palette: ["#ffffff", "#cfcfcf", "#9a9a9a", "#08080c"], font: '"Helvetica Neue", Arial, sans-serif', stageClass: "fx-minimal", particle: "dust", effects: ["whisper", "dissolve"] },
  { id: "inferno", label: "Inferno", palette: ["#ff5a1f", "#ffb020", "#ff2d2d", "#0c0402"], font: '"Arial Narrow", "Arial Black", sans-serif', stageClass: "fx-inferno", particle: "embers", effects: ["burn", "slam", "melt", "shatter"] },
  { id: "vapor", label: "Vapor", palette: ["#ff6ad5", "#8a6dff", "#26d9d9", "#0d0620"], font: '"Trebuchet MS", "Segoe UI", sans-serif', stageClass: "fx-vapor", particle: "rain", effects: ["wave", "neon", "whisper", "dissolve"] },
];

export const getPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? PRESETS[0];
