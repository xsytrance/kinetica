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

// ── Wikimedia Commons — public-domain / CC images, NO KEY. CORS via origin=*. ──
const wikimedia: ImageSource = {
  id: "wikimedia",
  label: "Wikimedia Commons (public domain · no key)",
  needsKey: false,
  attribution: "Photos via Wikimedia Commons",
  async search(query, _key, opts) {
    const p = new URLSearchParams({
      action: "query", format: "json", origin: "*",
      generator: "search", gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: "6", gsrlimit: "12",
      prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1600",
    });
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?${p}`, { signal: opts?.signal });
    if (!r.ok) throw new Error(`Wikimedia ${r.status}`);
    const pages = (await r.json()).query?.pages;
    const strip = (s = "") => s.replace(/<[^>]+>/g, "").trim();
    return (pages ? Object.values(pages) : []).map((pg: any): Photo | null => {
      const ii = pg.imageinfo?.[0];
      if (!ii || (ii.mime && !/^image\/(jpe?g|png|webp)/.test(ii.mime))) return null;
      const meta = ii.extmetadata || {};
      return {
        url: ii.thumburl || ii.url, thumb: ii.thumburl || ii.url, width: ii.width || 0, height: ii.height || 0,
        author: strip(meta.Artist?.value) || "Unknown", authorUrl: ii.descriptionurl || "",
        sourceUrl: ii.descriptionurl || ii.url, source: "Wikimedia Commons", license: strip(meta.LicenseShortName?.value),
      };
    }).filter((x): x is Photo => !!x);
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

// ── Pixabay — free API key, generous limits. CORS-enabled. ──
const pixabay: ImageSource = {
  id: "pixabay",
  label: "Pixabay (free key)",
  needsKey: true,
  keyHint: "Get a free key at pixabay.com/api/docs",
  attribution: "Photos via Pixabay",
  async search(query, key, opts) {
    if (!key) throw new Error("Pixabay needs a free API key.");
    const p = new URLSearchParams({
      key, q: query, image_type: "photo", safesearch: "true", per_page: "8",
      orientation: opts?.orientation === "portrait" ? "vertical" : "horizontal",
    });
    const r = await fetch(`https://pixabay.com/api/?${p}`, { signal: opts?.signal });
    if (!r.ok) throw new Error(`Pixabay ${r.status}${r.status === 400 ? " — check your key" : ""}`);
    const d = await r.json();
    return (d.hits ?? []).map((x: any): Photo => ({
      url: x.largeImageURL || x.webformatURL, thumb: x.previewURL || x.webformatURL,
      width: x.imageWidth || 0, height: x.imageHeight || 0,
      author: x.user || "Unknown", authorUrl: `https://pixabay.com/users/${x.user}-${x.user_id}/`,
      sourceUrl: x.pageURL, source: "Pixabay",
    }));
  },
};

// ── Art Institute of Chicago — public-domain FINE ART, NO KEY. CORS-enabled. ──
// A different aesthetic: classic paintings/photographs as backdrops.
const artic: ImageSource = {
  id: "artic",
  label: "Art Institute of Chicago (fine art · no key)",
  needsKey: false,
  attribution: "Art via the Art Institute of Chicago",
  async search(query, _key, opts) {
    const p = new URLSearchParams({ q: query, limit: "12", fields: "id,title,image_id,artist_title,is_public_domain" });
    const r = await fetch(`https://api.artic.edu/api/v1/artworks/search?${p}`, { signal: opts?.signal });
    if (!r.ok) throw new Error(`Art Institute ${r.status}`);
    const d = await r.json();
    const iiif = "https://www.artic.edu/iiif/2";
    return (d.data ?? []).filter((x: any) => x.is_public_domain && x.image_id).map((x: any): Photo => ({
      url: `${iiif}/${x.image_id}/full/843,/0/default.jpg`, thumb: `${iiif}/${x.image_id}/full/400,/0/default.jpg`,
      width: 843, height: 700, author: x.artist_title || "Unknown", authorUrl: `https://www.artic.edu/artworks/${x.id}`,
      sourceUrl: `https://www.artic.edu/artworks/${x.id}`, source: "Art Institute of Chicago",
    }));
  },
};

// Keyless sources first (zero setup), then the free-key ones.
export const IMAGE_SOURCES: ImageSource[] = [openverse, wikimedia, artic, pexels, unsplash, pixabay];
export const getSource = (id: string) => IMAGE_SOURCES.find((s) => s.id === id) ?? openverse;

/** Unsplash's "trigger a download" endpoint — called when we adopt a photo. */
export async function pingDownload(photo: Photo, key?: string) {
  if (photo.source !== "Unsplash" || !photo.downloadLocation || !key) return;
  try { await fetch(`${photo.downloadLocation}${photo.downloadLocation.includes("?") ? "&" : "?"}client_id=${key}`); } catch { /* best-effort */ }
}
