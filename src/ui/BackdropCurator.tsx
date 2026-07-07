import type { KeywordCandidates } from "@/images/populate";

// Per-keyword backdrop curation: for each lyric keyword, show the candidate
// photos and let the user pick the one that lands, drop it, tweak the query, or
// re-search. The chosen map (word → url) feeds curationResult() on "Start".
export function BackdropCurator({
  items, chosen, queries, reSearching,
  onChoose, onClear, onQuery, onReSearch,
}: {
  items: KeywordCandidates[];
  chosen: Record<string, string>;
  queries: Record<string, string>;
  reSearching: string | null;
  onChoose: (word: string, url: string) => void;
  onClear: (word: string) => void;
  onQuery: (word: string, q: string) => void;
  onReSearch: (word: string) => void;
}) {
  const placed = items.filter((it) => chosen[it.word]).length;
  return (
    <div className="mt-3">
      <p className="font-mono text-[10px] text-white/45">
        Curate — pick the backdrop for each word ({placed}/{items.length} placed). Empty = clean stage for that word.
      </p>
      <div className="mt-2 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
        {items.map((it) => (
          <div key={it.word} className="rounded-lg border border-white/8 p-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-white/85">{it.word}</span>
              <input
                value={queries[it.word] ?? it.query}
                onChange={(e) => onQuery(it.word, e.target.value)}
                className="min-w-0 flex-1 rounded border border-white/12 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 outline-none focus:border-[var(--theme-secondary)]"
                aria-label={`Search query for ${it.word}`}
              />
              <button onClick={() => onReSearch(it.word)} disabled={reSearching === it.word} title="Re-search this word"
                className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/70 hover:text-white disabled:opacity-40">
                {reSearching === it.word ? "…" : "⟳"}
              </button>
              {chosen[it.word] && (
                <button onClick={() => onClear(it.word)} title="No backdrop for this word"
                  className="rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/45 hover:text-white">✕</button>
              )}
            </div>
            {it.photos.length === 0 ? (
              <p className="mt-2 font-mono text-[10px] text-white/35">no candidates — edit the query and re-search.</p>
            ) : (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {it.photos.map((p) => {
                  const sel = chosen[it.word] === p.url;
                  return (
                    <button key={p.url} onClick={() => onChoose(it.word, p.url)} title={`${p.author} · ${p.source}`}
                      className={`relative h-16 w-24 shrink-0 overflow-hidden rounded transition ${sel ? "ring-2 ring-[var(--theme-secondary)]" : "ring-1 ring-white/10 hover:ring-white/40"}`}>
                      <img src={p.thumb || p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {sel && <span className="absolute bottom-0 right-0 bg-[var(--theme-secondary)] px-1 font-mono text-[8px] font-bold text-black">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
