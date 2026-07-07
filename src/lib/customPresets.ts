// User-authored vibe presets, persisted in localStorage. They share the exact
// Preset shape as the built-ins, so the Show dropdown and the effect-bias seam
// treat them identically — the only difference is the user owns them.
import type { Preset } from "./presets";

const KEY = "kinetica-custom-presets";

function read(): Preset[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((p) => p && typeof p.id === "string" && typeof p.label === "string") : [];
  } catch { return []; }
}
function write(all: Preset[]): Preset[] {
  localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export const loadCustomPresets = (): Preset[] => read();

/** Upsert by id (edits replace, new ones append). Returns the full list. */
export function saveCustomPreset(p: Preset): Preset[] {
  const rest = read().filter((x) => x.id !== p.id);
  return write([...rest, p]);
}

export function deleteCustomPreset(id: string): Preset[] {
  return write(read().filter((x) => x.id !== id));
}

/** Pretty JSON of every custom vibe — for the "export" button / sharing. */
export const exportCustomPresets = (): string => JSON.stringify(read(), null, 2);

/** Merge an exported JSON array back in (by id). Throws on malformed input. */
export function importCustomPresets(json: string): Preset[] {
  const arr = JSON.parse(json);
  if (!Array.isArray(arr)) throw new Error("Expected a JSON array of vibes.");
  const byId = new Map(read().map((p) => [p.id, p]));
  for (const p of arr) if (p && typeof p.id === "string" && typeof p.label === "string") byId.set(p.id, p);
  return write([...byId.values()]);
}

export const newPresetId = (): string => `custom-${Date.now().toString(36)}`;
