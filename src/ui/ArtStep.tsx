import { useCallback, useMemo, useState } from "react";
import type { Track } from "@/lib/types";
import { IMAGE_SOURCES, getSource } from "@/images/sources";
import { populatePhotos, withPhotos, type Credit } from "@/images/populate";
import { analyzeSong } from "@/ai/openrouter";
import { applyAnalysis, generateArt } from "@/ai/enrich";

export function ArtStep({ track, duration, onDone }: {
  track: Track;
  duration: number;
  onDone: (track: Track, credits: Credit[], attribution: string) => void;
}) {
  // The working planet — AI direction and backdrops accumulate onto it.
  const [working, setWorking] = useState<Track>(track);
  const [vibe, setVibe] = useState(track.mood || "");

  // ── Level 1: OpenRouter AI direction ──
  const [orKey, setOrKey] = useState(() => localStorage.getItem("kinetica-openrouter-key") ?? "");
  const [orModel, setOrModel] = useState(() => localStorage.getItem("kinetica-or-model") ?? "openai/gpt-4o-mini");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const analysis = working.planet?.analysis;
  const analyzed = !!analysis?.overallMood;

  const analyze = useCallback(async () => {
    if (!orKey.trim()) { setAiMsg("Paste your OpenRouter key first."); return; }
    localStorage.setItem("kinetica-openrouter-key", orKey.trim());
    localStorage.setItem("kinetica-or-model", orModel.trim());
    setAnalyzing(true); setAiMsg("Reading the song…");
    try {
      const planet = await analyzeSong({ lyrics: working.lyrics || "", title: working.title, duration, model: orModel.trim(), key: orKey.trim() });
      setWorking((w) => applyAnalysis(w, planet));
      setAiMsg(`Mood: ${planet.analysis.overallMood} · ${planet.analysis.sections.length} sections · photos will now use AI imagery ✓`);
    } catch (e) {
      setAiMsg((e instanceof Error ? e.message : String(e)));
    }
    setAnalyzing(false);
  }, [orKey, orModel, working]);

  // ── Backdrops: free photos, or (opt-in, costs credits) AI-generated art ──
  const [sourceId, setSourceId] = useState("openverse");
  const source = useMemo(() => getSource(sourceId), [sourceId]);
  const [imgKey, setImgKey] = useState(() => localStorage.getItem(`kinetica-key-${sourceId}`) ?? "");
  const [useAiArt, setUseAiArt] = useState(false);
  const [imgModel, setImgModel] = useState(() => localStorage.getItem("kinetica-img-model") ?? "google/gemini-2.5-flash-image-preview");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<{ credits: Credit[]; attribution: string } | null>(null);

  const pickSource = useCallback((id: string) => {
    setSourceId(id); setImgKey(localStorage.getItem(`kinetica-key-${id}`) ?? ""); setPreviews([]); setMsg(""); setResult(null);
  }, []);

  const pull = useCallback(async () => {
    setBusy(true); setMsg(""); setPreviews([]); setResult(null);
    try {
      if (useAiArt) {
        if (!orKey.trim()) throw new Error("AI art needs your OpenRouter key (above).");
        localStorage.setItem("kinetica-img-model", imgModel.trim());
        const { keywords } = await generateArt(working, {
          model: imgModel.trim(), key: orKey.trim(), vibe, max: 6,
          onProgress: (d, t, w) => setMsg(w ? `Generating “${w}” (${d + 1}/${t})…` : "Placing art…"),
        });
        if (!Object.keys(keywords).length) { setMsg("No art returned — check the image model."); setBusy(false); return; }
        setWorking((w) => withPhotos(w, keywords));
        setPreviews(Object.values(keywords).slice(0, 8));
        setResult({ credits: [], attribution: "Art generated with AI (OpenRouter)" });
        setMsg(`Generated ${Object.keys(keywords).length} AI backdrops ✓`);
      } else {
        if (source.needsKey && imgKey.trim()) localStorage.setItem(`kinetica-key-${sourceId}`, imgKey.trim());
        const res = await populatePhotos(working, {
          sourceId, key: imgKey.trim() || undefined, vibe,
          onProgress: (d, t, w) => setMsg(w ? `Finding “${w}” (${d + 1}/${t})…` : "Placing photos…"),
        });
        if (!Object.keys(res.keywords).length) { setMsg("No photos found — try a different source or vibe."); setBusy(false); return; }
        setWorking((w) => withPhotos(w, res.keywords));
        setPreviews(Object.values(res.keywords).slice(0, 8));
        setResult({ credits: res.credits, attribution: res.attribution });
        setMsg(`Placed ${Object.keys(res.keywords).length} photo backdrops ✓`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }, [useAiArt, orKey, imgModel, working, vibe, source, imgKey, sourceId]);

  const start = () => onDone(working, result?.credits ?? [], result?.attribution ?? "");

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-6 p-6">
      <div>
        <h2 className="font-display text-2xl font-black text-white">Enhance your video <span className="text-white/40">(optional)</span></h2>
        <p className="mt-1 font-mono text-[11px] leading-relaxed text-white/50">
          All optional. Add AI direction and photo/AI backdrops, or skip and start the show.
        </p>
      </div>

      {/* ── AI direction (Level 1, OpenRouter) ── */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-secondary)]">✦ AI direction · OpenRouter key</p>
        <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/45">
          The model reads your song and sets emotions, sections, a palette, and vivid imagery
          prompts — the show gets smarter and photo search gets cinematic. One cheap call (~a fraction of a cent).
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={orKey} onChange={(e) => setOrKey(e.target.value)} type="password" placeholder="OpenRouter API key (openrouter.ai/keys)"
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-secondary)]" />
          <input value={orModel} onChange={(e) => setOrModel(e.target.value)} placeholder="model"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-secondary)] sm:w-56" />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button onClick={analyze} disabled={analyzing} className="rounded-full bg-[var(--theme-secondary)] px-5 py-2 font-display text-sm font-bold text-black disabled:opacity-40">
            {analyzing ? "Analyzing…" : analyzed ? "Re-analyze" : "Analyze with AI"}
          </button>
          {aiMsg && <span className="font-mono text-[10px] text-white/60">{aiMsg}</span>}
        </div>
      </div>

      {/* ── Backdrops ── */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-primary)]">🖼 Backdrops</p>
        {!useAiArt && (
          <div className="mt-3 flex flex-wrap gap-2">
            {IMAGE_SOURCES.map((s) => (
              <button key={s.id} onClick={() => pickSource(s.id)} className={`rounded-full px-3 py-1.5 font-mono text-[11px] transition ${sourceId === s.id ? "bg-[var(--theme-primary)] text-black" : "border border-white/20 text-white/60"}`}>{s.label}</button>
            ))}
          </div>
        )}
        {!useAiArt && source.needsKey && (
          <input value={imgKey} onChange={(e) => setImgKey(e.target.value)} type="password" placeholder="Paste your free API key"
            className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-primary)]" />
        )}

        {/* AI art opt-in with the cost warning */}
        <label className="mt-3 flex items-start gap-2 text-white/70">
          <input type="checkbox" checked={useAiArt} onChange={(e) => setUseAiArt(e.target.checked)} className="mt-0.5" />
          <span className="font-mono text-[10px] leading-relaxed">
            Generate art with AI instead (needs the OpenRouter key above).
            <b className="text-amber-300"> ⚠ This can use a lot of your OpenRouter credits</b> — image models cost far more than the text analysis. Capped at 6 images per run.
          </span>
        </label>
        {useAiArt && (
          <input value={imgModel} onChange={(e) => setImgModel(e.target.value)} placeholder="image model, e.g. google/gemini-2.5-flash-image-preview"
            className="mt-2 w-full rounded-lg border border-amber-400/30 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-300" />
        )}

        <input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe (optional) — e.g. “moody cinematic night”"
          className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-primary)]" />

        <div className="mt-3 flex items-center gap-3">
          <button onClick={pull} disabled={busy || (!useAiArt && source.needsKey && !imgKey.trim())} className="rounded-full bg-[var(--theme-primary)] px-5 py-2 font-display text-sm font-bold text-black disabled:opacity-40">
            {busy ? "Working…" : useAiArt ? "Generate AI art" : "Pull free photos"}
          </button>
          {msg && <span className="font-mono text-[10px] text-white/60">{msg}</span>}
        </div>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {previews.map((u, i) => <img key={i} src={u} alt="" className="h-16 w-full rounded object-cover" />)}
          </div>
        )}
      </div>

      <button onClick={start} className="self-center rounded-full bg-white/10 px-8 py-3 font-display font-bold text-white transition hover:bg-white/20">
        Start the show ▶
      </button>
    </div>
  );
}
