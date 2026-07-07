// ═══════════════════════════════════════════════════════════════════════════
// ENGINE HOST — the adapter seam (Kinetica side).
//
// The lyric engine is synced from x1c7 by scripts/engine/sync-to-kinetica.mjs.
// This is the ONE file it imports that differs per app. The sync scaffolds it
// once and never overwrites it. Keep it to these three exports.
// ═══════════════════════════════════════════════════════════════════════════

export { useMusicPlayer } from "@/audio/player";
export type { Track } from "@/lib/types";

/** Kinetica has no shared cross-song art library; song art comes from the planet. */
export const HAS_SHARED_ART = false;

/** Kinetica's art is local/generated (blob URLs), not under /planets/ — no prefix. */
export const PLANET_BASE = "";
