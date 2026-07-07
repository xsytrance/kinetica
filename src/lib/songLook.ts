// A deterministic per-song "look" — so two different songs never open the same,
// but the SAME song always opens the same way. No AI, no runtime randomness: the
// title + lyrics hash to a seed that picks a starting vibe, weather, and cinematic
// intensity. Strong mood signals in the words win; otherwise the seed rotates
// through the good presets so generic songs still each feel distinct.
import { PRESETS } from "./presets";
import type { ParticleMode } from "@/engine/KineticParticles";
import type { TextEffect } from "@/lib/effects/registry";

// FNV-1a — tiny, stable, well-spread hash. Same string → same seed, forever.
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Content signal → a fitting vibe (obvious matches read as intentional).
const MOOD_PRESET: [RegExp, string][] = [
  [/\b(fire|burn|burning|flame|flames|hell|rage|inferno|ash|blaze)\b/i, "inferno"],
  [/\b(cold|ice|icy|frost|frozen|winter|snow|numb|shiver)\b/i, "frostbite"],
  [/\b(neon|city|electric|digital|glitch|cyber|screen|signal|wired)\b/i, "synthwave"],
  [/\b(night|dark|shadow|shadows|midnight|smoke|alone|empty)\b/i, "noir"],
  [/\b(love|heart|hearts|dream|dreams|soft|angel|pastel|tender)\b/i, "dreamcore"],
  [/\b(forest|tree|trees|green|wild|earth|nature|grow|bloom|garden)\b/i, "forest"],
  [/\b(gold|golden|rich|crown|luxury|shine|sun|sunlight|summer|honey)\b/i, "golden"],
  [/\b(blood|kill|death|dead|moon|curse|sin|grave|ghost)\b/i, "bloodmoon"],
  [/\b(space|star|stars|galaxy|universe|cosmic|orbit|planet|astral)\b/i, "cosmic"],
  [/\b(sky|aurora|borealis|glacier|northern|shimmer|iridescent)\b/i, "aurora"],
  [/\b(sunset|dusk|evening|horizon|amber|twilight|orange sky)\b/i, "sunset"],
  [/\b(heaven|soul|spirit|holy|divine|ascend|weightless|ethereal|halo)\b/i, "ethereal"],
  [/\b(desert|sand|dune|dunes|dry|drought|mirage|arid|sahara)\b/i, "desert"],
  [/\b(machine|steel|metal|iron|factory|concrete|engine|grind|industrial)\b/i, "industrial"],
  [/\b(storm|rain|thunder|monsoon|downpour|flood|drench)\b/i, "monsoon"],
  [/\b(broken|rust|dirty|rough|worn|grunge|torn|ragged)\b/i, "grunge"],
  [/\b(sweet|candy|sugar|bubblegum|fun|playful|giddy)\b/i, "candy"],
  [/\b(chill|mellow|lazy|study|coffee|lofi|lo-fi|nostalg)\b/i, "lofi"],
  [/\b(ocean|sea|wave|waves|river|water|tide)\b/i, "vapor"],
];

// Ambient weather for extra per-song variance (the preset also forces one; an
// empty override means "use the preset's weather").
const AMBIENT: ParticleMode[] = ["fireflies", "stars", "pollen", "petals", "confetti", "leaves", "dust", "snow", "bubbles"];

export interface SongLook {
  presetId: string;
  particle: ParticleMode | "";
  deck: { density: number; glow: number; grain: number; vignette: number };
  /** the raw seed — so per-word effects can be seeded from the same source. */
  seed: number;
}

/** Deterministically pin distinctive text effects to a handful of a song's own
 *  words, drawn from the vibe's palette — so each song plays alive and unique,
 *  but the same song is always consistent. Keyed by clean(word).toLowerCase()
 *  (the exact key the stage resolver checks). */
export function seedWordEffects(
  words: { key: string; display: string }[], palette: TextEffect[], seed: number, max = 8,
): Record<string, TextEffect> {
  const out: Record<string, TextEffect> = {};
  if (!palette.length) return out;
  const cands = words.filter((w) => w.key.length >= 4); // skip "the", "a", "and"…
  let count = 0;
  for (let i = 0; i < cands.length && count < max; i++) {
    const h = ((seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0);
    if (h % 3 === 0) { // ~1 in 3 distinctive words lights up
      out[cands[i].key] = palette[(h >>> 4) % palette.length];
      count++;
    }
  }
  return out;
}

/** Compute a song's opening look. `salt` (from the 🎲 Surprise button) re-rolls
 *  it: salt 0 = content-aware first pick; salt > 0 = a fresh seeded rotation. */
export function songLook(title: string, lyrics: string, salt = 0): SongLook {
  const text = `${title}\n${lyrics}`;
  const seed = (seedOf(text || "kinetica") + salt * 0x9e3779b1) >>> 0;
  const pool = PRESETS.filter((p) => p.id !== "auto");

  const contentPick = salt === 0 ? MOOD_PRESET.find(([re]) => re.test(text))?.[1] : undefined;
  const presetId = contentPick ?? pool[seed % pool.length].id;

  // ~40% of songs get an ambient weather override for variety; the rest keep the
  // preset's forced weather. (Bit-sliced off the seed so it stays deterministic.)
  const wantAmbient = (seed >>> 5) % 5 < 2;
  const particle: ParticleMode | "" = wantAmbient ? AMBIENT[(seed >>> 8) % AMBIENT.length] : "";

  // Gentle cinematic defaults that vary song-to-song (density stays 1).
  const glow = 0.18 + ((seed >>> 11) % 34) / 100;      // 0.18 .. 0.52
  const grain = ((seed >>> 17) % 22) / 100;            // 0.00 .. 0.22
  const vignette = 0.08 + ((seed >>> 22) % 26) / 100;  // 0.08 .. 0.34

  return { presetId, particle, deck: { density: 1, glow, grain, vignette }, seed };
}
