import type { Track } from "@/lib/types";

// The no-install demo performs a REAL song: a random word-timed planet from
// the x1c7.com catalog, fetched straight from its public sources (Supabase
// anon read + the public R2 bucket, both CORS-open). Every visit is a
// different show — full analysis, section art, DYNAMIC+ acts, the works.
//
// These are publishable credentials (they ship in the x1c7.com bundle too);
// Row-Level Security guards all writes.
const SUPABASE_URL = "https://kxbrjmbovjiwwcnepsfh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_W6GH_BAujfZz0KxKr07Wbg_OuQePF7-";
const PLANET_PUB = "https://pub-d3fd6ef07c3a4fc79ec69aa81645f904.r2.dev";

interface CatalogRow {
  id: string;
  title: string;
  artist: string | null;
  genre: string | null;
  mood: string | null;
  color: string | null;
  audio_url: string;
  lyrics: string | null;
  lyrics_synced: { words?: unknown[] } | null;
  planet: Track["planet"] | null;
}

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!r.ok) throw new Error(`catalog ${r.status}`);
  return (await r.json()) as T;
}

// Planet art lives at site-relative "/planets/…" keys (the site prefixes its
// PLANET_BASE; Kinetica's is ""). Rewrite every such string — object keys
// included, because assets.alt maps art-key → art-key.
function absolutize<T>(v: T): T {
  if (typeof v === "string") {
    return (v.startsWith("/planets/") ? `${PLANET_PUB}${v}` : v) as unknown as T;
  }
  if (Array.isArray(v)) return v.map(absolutize) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[absolutize(k)] = absolutize(val);
    }
    return out as unknown as T;
  }
  return v;
}

export async function fetchRandomCatalogSong(onProgress?: (msg: string) => void): Promise<Track> {
  onProgress?.("Calling the mothership…");
  // Cheap pass: ids of public, word-timed songs only (planets that can perform).
  const ids = await rest<{ id: string }[]>(
    "tracks?select=id&hidden=eq.false&lyrics_synced->words=not.is.null&planet=not.is.null&audio_url=not.is.null",
  );
  if (!ids.length) throw new Error("catalog is empty");
  const pick = ids[Math.floor(Math.random() * ids.length)].id;

  const rows = await rest<CatalogRow[]>(
    `tracks?select=id,title,artist,genre,mood,color,audio_url,lyrics,lyrics_synced,planet&id=eq.${encodeURIComponent(pick)}`,
  );
  const row = rows[0];
  if (!row?.lyrics_synced?.words?.length || !row.planet) throw new Error("picked a silent planet");
  onProgress?.(`Summoning “${row.title}”…`);

  return {
    id: `catalog-${row.id}`,
    title: row.title,
    artist: row.artist ?? "xsytrance",
    genre: row.genre ?? "",
    mood: row.mood ?? undefined,
    color: row.color || "#22d3ee",
    audioUrl: row.audio_url,
    lyrics: row.lyrics ?? "",
    lyricsSynced: row.lyrics_synced as Track["lyricsSynced"],
    planet: absolutize(row.planet),
  } as Track;
}
