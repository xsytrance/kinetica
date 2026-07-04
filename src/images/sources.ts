import type { ImageSource, Photo, SearchOpts } from "./types";

// ── Openverse — Creative-Commons images, NO KEY. The zero-setup default. ──
// (openverse.org, WordPress) CORS-enabled; anonymous access is rate-limited but
// plenty for one song. Returns properly-attributed CC-licensed photos.
const openverse: ImageSource = {
  id: "openverse",
  label: "Openverse (Creative Commons · no key)",
  needsKey: false,
  attribution: "Photos via Openverse (CC)",
  async search(query, _key, opts) {
    const p = new URLSearchParams({
      q: query, page_size: "8", mature: "false",
      license_type: "all", aspect_ratio: opts?.orientation === "portrait" ? "tall" : "wide",
    });
    const r = await fetch(`https://api.openverse.org/v1/images/?${p}`, { signal: opts?.signal });
    if (!r.ok) throw new Error(`Openverse ${r.status}`);
    const d = await r.json();
    return (d.results ?? []).map((x: any): Photo => ({
      url: x.url, thumb: x.thumbnail || x.url, width: x.width || 0, height: x.height || 0,
      author: x.creator || "Unknown", authorUrl: x.creator_url || x.foreign_landing_url || "",
      sourceUrl: x.foreign_landing_url || x.url, source: "Openverse", license: `${x.license} ${x.license_version || ""}`.trim(),
    }));
  },
};

// ── Pexels — free API key, generous limits (200/hr, 20k/mo). CORS-enabled. ──
const pexels: ImageSource = {
  id: "pexels",
  label: "Pexels (free key)",
  needsKey: true,
  keyHint: "Get a free key at pexels.com/api",
  attribution: "Photos provided by Pexels",
  async search(query, key, opts) {
    if (!key) throw new Error("Pexels needs a free API key.");
    const p = new URLSearchParams({ query, per_page: "8", orientation: opts?.orientation || "landscape" });
    const r = await fetch(`https://api.pexels.com/v1/search?${p}`, { headers: { Authorization: key }, signal: opts?.signal });
    if (!r.ok) throw new Error(`Pexels ${r.status}${r.status === 401 ? " — check your key" : ""}`);
    const d = await r.json();
    return (d.photos ?? []).map((x: any): Photo => ({
      url: x.src?.large2x || x.src?.large || x.src?.original, thumb: x.src?.medium || x.src?.small,
      width: x.width, height: x.height, author: x.photographer || "Unknown", authorUrl: x.photographer_url || "",
      sourceUrl: x.url, source: "Pexels",
    }));
  },
};

// ── Unsplash — free "Access Key" (Client-ID). CORS-enabled. ──
// Guideline: ping download_location when a photo is used (populate does this).
const unsplash: ImageSource = {
  id: "unsplash",
  label: "Unsplash (free key)",
  needsKey: true,
  keyHint: "Get a free Access Key at unsplash.com/developers",
  attribution: "Photos from Unsplash",
  async search(query, key, opts) {
    if (!key) throw new Error("Unsplash needs a free Access Key.");
    const p = new URLSearchParams({ query, per_page: "8", orientation: opts?.orientation || "landscape", client_id: key });
    const r = await fetch(`https://api.unsplash.com/search/photos?${p}`, { signal: opts?.signal });
    if (!r.ok) throw new Error(`Unsplash ${r.status}${r.status === 401 ? " — check your Access Key" : ""}`);
    const d = await r.json();
    return (d.results ?? []).map((x: any): Photo => ({
      url: x.urls?.regular, thumb: x.urls?.small, width: x.width, height: x.height,
      author: x.user?.name || "Unknown", authorUrl: x.user?.links?.html || "",
      sourceUrl: x.links?.html, source: "Unsplash", downloadLocation: x.links?.download_location,
    }));
  },
};

export const IMAGE_SOURCES: ImageSource[] = [openverse, pexels, unsplash];
export const getSource = (id: string) => IMAGE_SOURCES.find((s) => s.id === id) ?? openverse;

/** Unsplash's "trigger a download" endpoint — called when we adopt a photo. */
export async function pingDownload(photo: Photo, key?: string) {
  if (photo.source !== "Unsplash" || !photo.downloadLocation || !key) return;
  try { await fetch(`${photo.downloadLocation}${photo.downloadLocation.includes("?") ? "&" : "?"}client_id=${key}`); } catch { /* best-effort */ }
}
