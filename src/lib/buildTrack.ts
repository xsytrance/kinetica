import type { Track } from "./types";
import type { StemData } from "./stemSense";
import type { SyncedWord } from "./lyrics";
import { deriveTheme } from "./theme";

// Assemble the Track the engine performs from Level-0 inputs. The stems.json is
// handed to the engine as an object URL (loadStems fetches it), so no server.
export function buildTrack(opts: {
  title: string;
  color?: string;
  lyricsLrc: string;
  words: SyncedWord[];
  stemData: StemData;
  planet?: Track["planet"]; // Levels 1/2 pass a fuller analysis; Level 0 gets a stub
}): Track {
  const color = opts.color || deriveTheme(opts.title || "kinetica").primary;
  const stemsUrl = URL.createObjectURL(new Blob([JSON.stringify(opts.stemData)], { type: "application/json" }));

  const planet = opts.planet ?? {
    analysis: {
      summary: "",
      overallMood: "",
      themes: [],
      palette: [color],
      sections: [],
      keywords: [],
    },
    generatedAt: null,
    interactions: { tapEffect: "dissolve", moments: [] },
  };
  // Wire the measured senses onto the planet.
  planet.assets = { ...(planet.assets ?? {}), stems: stemsUrl };

  return {
    id: "kinetica-" + Math.abs(hash(opts.title + opts.words.length)).toString(36),
    title: opts.title || "Untitled",
    artist: "",
    genre: "",
    color,
    audioUrl: "", // filled by the caller with the mixed-master object URL
    lyrics: opts.lyricsLrc,
    lyricsSynced: { words: opts.words },
    planet,
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}
