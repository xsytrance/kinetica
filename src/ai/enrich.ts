import type { Track } from "@/lib/types";
import type { Planet } from "@/lib/planet";
import { generateImage } from "./openrouter";
import { photoQueries } from "@/lib/keywords";

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
export async function generateArt(track: Track, o: {
  model: string; key: string; vibe?: string; max?: number;
  onProgress?: (done: number, total: number, word: string) => void; signal?: AbortSignal;
}): Promise<{ keywords: Record<string, string>; count: number }> {
  const queries = photoQueries(track.lyrics || "", track.planet, o.max ?? 6, o.vibe);
  const keywords: Record<string, string> = {};
  let done = 0;
  for (const q of queries) {
    o.onProgress?.(done, queries.length, q.word);
    try {
      const url = await generateImage({ prompt: q.query, model: o.model, key: o.key, signal: o.signal });
      keywords[q.word] = url;
    } catch (e) {
      if (done === 0 && !Object.keys(keywords).length) throw e; // surface a bad key/model early
    }
    done++;
  }
  o.onProgress?.(done, queries.length, "");
  return { keywords, count: Object.keys(keywords).length };
}
