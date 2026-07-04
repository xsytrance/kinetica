import { parseLyrics } from "./lyrics";
import type { Planet } from "./planet";

// Pull the most image-worthy words out of a song WITHOUT any AI — so photo
// backdrops work even at Level 0. Frequency × length ranking over content words
// (stopwords removed), with a boost for words in a built-in "evocative" set.
// When an LLM analysis exists (Level 1/2), its keywords win.

const STOP = new Set(
  ("a an the and or but if then than so as of to in on at by for with from into onto over under out up down off " +
    "i you he she it we they me him her us them my your his its our their mine yours ours " +
    "is am are was were be been being do does did done have has had will would shall should can could may might must " +
    "not no yes oh yeah ya uh na la woah whoa ooh mmm hey " +
    "this that these those here there where when what who how why which whom " +
    "just now still even ever never always all any some more most much many very too also only " +
    "get got go going gone come came like know knew see saw say said tell told want need feel felt make made take took " +
    "one two three too our are were you're i'm it's don't can't won't ain't gonna wanna gotta " +
    "on-on push-push feel-feel").split(/\s+/),
);

// Words that reliably return strong, cinematic photography — nudged up the list.
const EVOCATIVE = new Set(
  ("fire flame smoke ash ember spark rain storm ocean sea wave river water sky stars moon sun light dark shadow " +
    "night city street neon window mirror door road highway desert mountain forest snow ice frost fog dust " +
    "heart soul blood tears eyes hands skin gold silver diamond flower rose thorn wine glass candle " +
    "flags siren graveyard laundry dishes phone bills money socks silence bloodshot dance club mirrorball " +
    "love fear rage grief hope home ghost angel devil crown throne war peace").split(/\s+/),
);

export interface PhotoQuery { word: string; query: string; weight: number }

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");

/** Up to `max` search terms from the lyrics (or the planet's LLM keywords). */
export function photoQueries(lyrics: string, planet?: Planet, max = 8, vibe = ""): PhotoQuery[] {
  const suffix = vibe.trim() ? `, ${vibe.trim()}` : "";

  // Level 1/2: the analysis already chose the charged words + imagery prompts.
  const kw = planet?.analysis?.keywords;
  if (kw && kw.length) {
    return kw.slice(0, max).map((k, i) => ({
      word: k.word.toLowerCase(),
      query: (k.imageryPrompt || k.word) + suffix,
      weight: kw.length - i,
    }));
  }

  // Level 0: heuristic extraction from the plain lyric words.
  const text = parseLyrics(lyrics).lines.filter((l) => !l.header).map((l) => l.text).join(" ");
  const freq = new Map<string, number>();
  for (const raw of text.split(/\s+/)) {
    const w = clean(raw);
    if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const scored = [...freq.entries()].map(([w, f]) => ({
    word: w,
    query: w + suffix,
    weight: f * Math.min(w.length, 9) * (EVOCATIVE.has(w) ? 2.4 : 1),
  }));
  scored.sort((a, b) => b.weight - a.weight);
  // Keep distinct stems roughly (avoid "fire"/"fires" duplicates).
  const seen = new Set<string>();
  const out: PhotoQuery[] = [];
  for (const s of scored) {
    const stem = s.word.replace(/(ing|ed|s|es)$/, "");
    if (seen.has(stem)) continue;
    seen.add(stem);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
