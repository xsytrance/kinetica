import type { Track } from "@/lib/types";
import type { Planet } from "@/lib/planet";
import type { PhotoQuery } from "@/lib/keywords";
import { generateImage } from "./openrouter";

// Merge an AI analysis into the track (keeping the measured stems + interactions),
// and recolor the theme from the analysis palette.
export function applyAnalysis(track: Track, planet: Planet): Track {
  const prevAssets = track.planet?.assets;
  const interactions = track.planet?.interactions ?? planet.interactions;
  return {
    ...track,
    color: planet.analysis.palette?.[0] || track.color,
    planet: { ...planet, assets: prevAssets, interactions },
  };
}

// Generate one AI image per keyword via OpenRouter (image-output model). This is
// the pricey path — callers must show the cost warning + a cap first.
export async function generateArtOpenRouter(queries: PhotoQuery[], o: {
  model: string; key: string;
  onProgress?: (done: number, total: number, word: string) => void; signal?: AbortSignal;
}): Promise<Record<string, string>> {
  const keywords: Record<string, string> = {};
  let done = 0;
  for (const q of queries) {
    o.onProgress?.(done, queries.length, q.word);
    try { keywords[q.word] = await generateImage({ prompt: q.query, model: o.model, key: o.key, signal: o.signal }); }
    catch (e) { if (done === 0 && !Object.keys(keywords).length) throw e; }
    done++;
  }
  o.onProgress?.(done, queries.length, "");
  return keywords;
}
