import type { Track } from "@/lib/types";
import { photoQueries } from "@/lib/keywords";
import { getSource, pingDownload } from "./sources";

export interface Credit { word: string; author: string; authorUrl: string; sourceUrl: string; source: string }
export interface PopulateResult { keywords: Record<string, string>; credits: Credit[]; attribution: string }

// Search one free photo per lyric keyword and wire them into the planet's
// keyword-art map — the same backdrops the engine already performs. Collects
// attribution and honors Unsplash's download-trigger guideline.
export async function populatePhotos(track: Track, opts: {
  sourceId: string; key?: string; vibe?: string; max?: number;
  onProgress?: (done: number, total: number, word: string) => void; signal?: AbortSignal;
}): Promise<PopulateResult> {
  const src = getSource(opts.sourceId);
  const queries = photoQueries(track.lyrics || "", track.planet, opts.max ?? 8, opts.vibe);
  const keywords: Record<string, string> = {};
  const credits: Credit[] = [];
  let done = 0;

  for (const q of queries) {
    opts.onProgress?.(done, queries.length, q.word);
    try {
      const results = await src.search(q.query, opts.key, { orientation: "landscape", signal: opts.signal });
      const pick = results.find((p) => p.width >= p.height && p.url) ?? results.find((p) => p.url);
      if (pick?.url) {
        keywords[q.word] = pick.url;
        credits.push({ word: q.word, author: pick.author, authorUrl: pick.authorUrl, sourceUrl: pick.sourceUrl, source: pick.source });
        pingDownload(pick, opts.key);
      }
    } catch (e) {
      // A bad key / CORS / network fail on the very first query should surface;
      // later per-word misses just get skipped so one dud word won't kill the run.
      if (done === 0 && !Object.keys(keywords).length) throw e;
    }
    done++;
    await new Promise((r) => setTimeout(r, 150)); // gentle on rate limits
  }
  opts.onProgress?.(done, queries.length, "");
  return { keywords, credits, attribution: src.attribution };
}

/** Merge searched photos into a copy of the track so the engine re-reads them. */
export function withPhotos(track: Track, keywords: Record<string, string>): Track {
  const planet = track.planet ?? { analysis: { summary: "", overallMood: "", themes: [], palette: [track.color], sections: [], keywords: [] }, generatedAt: null };
  return {
    ...track,
    planet: { ...planet, assets: { ...(planet.assets ?? {}), keywords: { ...(planet.assets?.keywords ?? {}), ...keywords } } },
  };
}
