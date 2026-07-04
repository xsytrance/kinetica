import { useCallback, useMemo, useState } from "react";
import type { Track } from "@/lib/types";
import { IMAGE_SOURCES, getSource } from "@/images/sources";
import { populatePhotos, withPhotos, type Credit } from "@/images/populate";

export function ArtStep({ track, onDone }: {
  track: Track;
  onDone: (track: Track, credits: Credit[], attribution: string) => void;
}) {
  const [sourceId, setSourceId] = useState("openverse");
  const source = useMemo(() => getSource(sourceId), [sourceId]);
  const [key, setKey] = useState(() => localStorage.getItem(`kinetica-key-${sourceId}`) ?? "");
  const [vibe, setVibe] = useState(track.mood || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [ready, setReady] = useState<{ track: Track; credits: Credit[]; attribution: string } | null>(null);

  const pickSource = useCallback((id: string) => {
    setSourceId(id);
    setKey(localStorage.getItem(`kinetica-key-${id}`) ?? "");
    setReady(null); setPreviews([]); setMsg("");
  }, []);

  const pull = useCallback(async () => {
    setBusy(true); setMsg(""); setPreviews([]); setReady(null);
    if (source.needsKey && key.trim()) localStorage.setItem(`kinetica-key-${sourceId}`, key.trim());
    try {
      const res = await populatePhotos(track, {
        sourceId, key: key.trim() || undefined, vibe,
        onProgress: (d, t, w) => setMsg(w ? `Finding “${w}” (${d + 1}/${t})…` : "Placing photos…"),
      });
      const urls = Object.values(res.keywords);
      if (!urls.length) { setMsg("No photos found — try a different source or vibe."); setBusy(false); return; }
      setPreviews(urls.slice(0, 8));
      setReady({ track: withPhotos(track, res.keywords), credits: res.credits, attribution: res.attribution });
      setMsg(`Placed ${urls.length} photo backdrops ✓`);
    } catch (e) {
      setMsg((e instanceof Error ? e.message : String(e)) + (source.needsKey ? " — check your key." : ""));
    }
    setBusy(false);
  }, [track, sourceId, source, key, vibe]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-6 p-6">
      <div>
        <h2 className="font-display text-2xl font-black text-white">Add photo backdrops <span className="text-white/40">(optional)</span></h2>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/50">
          Kinetica searches free photo services for your song's key words and drops
          them behind the lyrics — no GPU, no image-gen cost. Or skip and keep it pure type.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {IMAGE_SOURCES.map((s) => (
          <button key={s.id} onClick={() => pickSource(s.id)} className={`rounded-full px-4 py-2 font-mono text-[11px] transition ${sourceId === s.id ? "bg-[var(--theme-primary)] text-black" : "border border-white/20 text-white/60"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {source.needsKey && (
        <div className="space-y-1">
          <input
            value={key} onChange={(e) => setKey(e.target.value)} type="password" placeholder="Paste your free API key"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-mono text-sm text-white outline-none focus:border-[var(--theme-primary)]"
          />
          <p className="font-mono text-[10px] text-white/40">{source.keyHint} · stored only in your browser</p>
        </div>
      )}

      <input
        value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe (optional) — e.g. “moody cinematic night”"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 font-mono text-sm text-white outline-none focus:border-[var(--theme-primary)]"
      />

      <div className="flex items-center gap-3">
        <button onClick={pull} disabled={busy || (source.needsKey && !key.trim())} className="rounded-full bg-[var(--theme-primary)] px-6 py-3 font-display font-bold text-black disabled:opacity-40">
          {busy ? "Searching…" : "Pull free photos"}
        </button>
        <button
          onClick={() => (ready ? onDone(ready.track, ready.credits, ready.attribution) : onDone(track, [], ""))}
          className="rounded-full border border-white/20 px-6 py-3 font-mono text-xs uppercase tracking-wider text-white/70"
        >
          {ready ? "Start the show ▶" : "Skip — start the show ▶"}
        </button>
      </div>

      {msg && <p className="font-mono text-[11px] text-white/60">{msg}</p>}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((u, i) => <img key={i} src={u} alt="" className="h-20 w-full rounded object-cover" />)}
        </div>
      )}
    </div>
  );
}
