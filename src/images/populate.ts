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

// ── Curation: several candidates per keyword (for the backdrop curator UI) ──
export interface KeywordCandidates { word: string; query: string; photos: Photo[] }

/** Collect up to `cap` landscape-first candidates for one query. Tries the chosen
 *  source; only if it returns nothing does it fall through the keyless net, so a
 *  keyword is never left with an empty strip. */
async function candidatesForQuery(
  primary: ImageSource, query: string, key: string | undefined, sopts: SearchOpts, cap = 8,
): Promise<Photo[]> {
  const chain = [primary, ...KEYLESS_SOURCES.filter((s) => s.id !== primary.id)];
  for (const src of chain) {
    const srcKey = src.id === primary.id ? key : undefined;
    if (src.needsKey && !srcKey) continue;
    try {
      const results = await src.search(query, srcKey, sopts);
      const ordered = [...results]
        .filter((p) => p.url)
        .sort((a, b) => Number(b.width >= b.height) - Number(a.width >= a.height));
      const seen = new Set<string>();
      const photos = ordered.filter((p) => !seen.has(p.url) && seen.add(p.url)).slice(0, cap);
      if (photos.length) return photos; // got some from this source — don't dilute
    } catch { /* try the next source */ }
  }
  return [];
}

/** One keyword's candidate strip — for the curator's "re-search" button. */
export function searchKeyword(
  sourceId: string, query: string, key?: string, signal?: AbortSignal,
): Promise<Photo[]> {
  return candidatesForQuery(getSource(sourceId), query, key, { orientation: "landscape", signal });
}

/** Search several candidates per lyric keyword — the curator picks the final one. */
export async function searchCandidates(track: Track, opts: {
  sourceId: string; key?: string; vibe?: string; max?: number;
  onProgress?: (done: number, total: number, word: string) => void; signal?: AbortSignal;
}): Promise<KeywordCandidates[]> {
  const src = getSource(opts.sourceId);
  const queries = photoQueries(track.lyrics || "", track.planet, opts.max ?? 8, opts.vibe);
  const sopts: SearchOpts = { orientation: "landscape", signal: opts.signal };
  const out: KeywordCandidates[] = [];
  let done = 0;
  for (const q of queries) {
    opts.onProgress?.(done, queries.length, q.word);
    out.push({ word: q.word, query: q.query, photos: await candidatesForQuery(src, q.query, opts.key, sopts) });
    done++;
    await new Promise((r) => setTimeout(r, 150)); // gentle on rate limits
  }
  opts.onProgress?.(done, queries.length, "");
  return out;
}

/** Build the keyword→url map + credits from the curator's chosen photos. */
export function curationResult(
  items: KeywordCandidates[], chosen: Record<string, string>, key?: string,
): { keywords: Record<string, string>; credits: Credit[]; attribution: string } {
  const keywords: Record<string, string> = {};
  const credits: Credit[] = [];
  let attribution = "";
  for (const it of items) {
    const url = chosen[it.word];
    if (!url) continue;
    const photo = it.photos.find((p) => p.url === url);
    if (!photo) continue;
    keywords[it.word] = url;
    credits.push({ word: it.word, author: photo.author, authorUrl: photo.authorUrl, sourceUrl: photo.sourceUrl, source: photo.source });
    if (!attribution) attribution = `Photos via ${photo.source}`;
    pingDownload(photo, key);
  }
  return { keywords, credits, attribution: attribution || "Photos via free sources" };
}

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
