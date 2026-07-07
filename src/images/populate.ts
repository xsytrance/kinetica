import type { Track } from "@/lib/types";
import type { ImageSource, Photo, SearchOpts } from "./types";
import { photoQueries } from "@/lib/keywords";
import { getSource, pingDownload, KEYLESS_SOURCES } from "./sources";

export interface Credit { word: string; author: string; authorUrl: string; sourceUrl: string; source: string }
export interface PopulateResult {
  keywords: Record<string, string>;
  credits: Credit[];
  attribution: string;
  /** Set when the chosen source failed and the keyless net carried the run —
   *  so the UI can note it (e.g. a bad key) without aborting a working show. */
  warning?: string;
}

const landscape = (results: Photo[]): Photo | undefined =>
  results.find((p) => p.width >= p.height && p.url) ?? results.find((p) => p.url);

// One keyword's search: try the chosen source, then fall through the keyless
// sources so a planet is NEVER left with a blank backdrop for a word. Only the
// chosen source uses the user's key; fallbacks are all no-key by definition.
async function searchWord(
  primary: ImageSource, query: string, key: string | undefined, sopts: SearchOpts,
): Promise<{ pick: Photo | null; primaryError: unknown }> {
  const chain = [primary, ...KEYLESS_SOURCES.filter((s) => s.id !== primary.id)];
  let primaryError: unknown = null;
  for (const src of chain) {
    const srcKey = src.id === primary.id ? key : undefined;
    if (src.needsKey && !srcKey) continue;
    try {
      const pick = landscape(await src.search(query, srcKey, sopts));
      if (pick?.url) return { pick, primaryError };
    } catch (e) {
      if (src.id === primary.id) primaryError = e;
    }
  }
  return { pick: null, primaryError };
}

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
  const sopts: SearchOpts = { orientation: "landscape", signal: opts.signal };
  let done = 0;
  let firstPrimaryError: unknown = null;

  for (const q of queries) {
    opts.onProgress?.(done, queries.length, q.word);
    const { pick, primaryError } = await searchWord(src, q.query, opts.key, sopts);
    if (primaryError && !firstPrimaryError) firstPrimaryError = primaryError;
    if (pick?.url) {
      keywords[q.word] = pick.url;
      credits.push({ word: q.word, author: pick.author, authorUrl: pick.authorUrl, sourceUrl: pick.sourceUrl, source: pick.source });
      pingDownload(pick, opts.key);
    }
    // A bad key / CORS / network fail that even the keyless net couldn't cover on
    // the very first word should surface; later per-word misses just get skipped.
    else if (done === 0 && !Object.keys(keywords).length && primaryError) {
      throw primaryError;
    }
    done++;
    await new Promise((r) => setTimeout(r, 150)); // gentle on rate limits
  }
  opts.onProgress?.(done, queries.length, "");

  // If the chosen source stumbled but the keyless net still filled the planet,
  // hand back a gentle note and the no-key attribution that actually carried it.
  const usedFallback = firstPrimaryError != null && Object.keys(keywords).length > 0;
  return {
    keywords, credits,
    attribution: usedFallback ? "Photos via free, no-key sources (CC / public domain)" : src.attribution,
    warning: usedFallback
      ? `${src.label} didn't respond${src.needsKey ? " (check the key?)" : ""} — filled in with free no-key photos.`
      : undefined,
  };
}

/** Merge searched photos into a copy of the track so the engine re-reads them. */
export function withPhotos(track: Track, keywords: Record<string, string>): Track {
  const planet = track.planet ?? { analysis: { summary: "", overallMood: "", themes: [], palette: [track.color], sections: [], keywords: [] }, generatedAt: null };
  return {
    ...track,
    planet: { ...planet, assets: { ...(planet.assets ?? {}), keywords: { ...(planet.assets?.keywords ?? {}), ...keywords } } },
  };
}
