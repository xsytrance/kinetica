import type { LyricsSynced } from "./lyrics";
import type { Planet } from "./planet";

// A song bundle the engine performs. Level 0 fills id/title/color/audioUrl +
// lyrics + lyricsSynced + a stems-backed planet; Levels 1/2 enrich planet.analysis
// and planet.assets. `audioUrl` is an object URL of the mixed-down master (Web
// Audio), so nothing is uploaded.
export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  mood?: string;
  color: string;
  audioUrl: string;
  lyrics?: string;          // plain or LRC-timestamped
  lyricsSynced?: LyricsSynced; // per-word timings — the engine's core data
  planet?: Planet;          // analysis + assets (+ assets.stems object-URL)
}
