// A single searchable photo result, normalized across providers, with the
// attribution every free-photo API expects.
export interface Photo {
  url: string;        // full-size (backdrop) image URL
  thumb: string;      // small preview
  width: number;
  height: number;
  author: string;
  authorUrl: string;
  sourceUrl: string;  // the photo's page on the provider
  source: string;     // provider label (for the credit line)
  license?: string;
  /** Unsplash asks you to hit this when a photo is "used" — we do, politely. */
  downloadLocation?: string;
}

export interface SearchOpts {
  orientation?: "landscape" | "portrait" | "square";
  signal?: AbortSignal;
}

export interface ImageSource {
  id: string;
  label: string;
  needsKey: boolean;
  keyHint?: string;       // where to get a free key
  attribution: string;    // static credit shown while its photos are on screen
  search: (query: string, key: string | undefined, opts?: SearchOpts) => Promise<Photo[]>;
}
