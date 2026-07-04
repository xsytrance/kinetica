import { useCallback, useMemo, useState } from "react";
import type { Track } from "@/lib/types";
import { IMAGE_SOURCES, getSource } from "@/images/sources";
import { populatePhotos, withPhotos, type Credit } from "@/images/populate";
import { photoQueries } from "@/lib/keywords";
import { analyzeSong } from "@/ai/openrouter";
import { analyzeSongOllama } from "@/ai/local";
import { applyAnalysis, generateArtOpenRouter } from "@/ai/enrich";
import { generateArtComfy } from "@/comfy/comfyui";

type Engine = "off" | "openrouter" | "local";
const ls = (k: string, d = "") => localStorage.getItem(k) ?? d;

export function ArtStep({ track, duration, onDone }: {
  track: Track; duration: number;
  onDone: (track: Track, credits: Credit[], attribution: string) => void;
}) {
  const [working, setWorking] = useState<Track>(track);
  const [vibe, setVibe] = useState(track.mood || "");
  const [engine, setEngine] = useState<Engine>("off");

  // provider settings (persisted)
  const [orKey, setOrKey] = useState(() => ls("kinetica-openrouter-key"));
  const [orModel, setOrModel] = useState(() => ls("kinetica-or-model", "openai/gpt-4o-mini"));
  const [orImgModel, setOrImgModel] = useState(() => ls("kinetica-img-model", "google/gemini-2.5-flash-image-preview"));
  const [ollamaHost, setOllamaHost] = useState(() => ls("kinetica-ollama-host", "http://localhost:11434"));
  const [ollamaModel, setOllamaModel] = useState(() => ls("kinetica-ollama-model", "qwen2.5:14b"));
  const [comfyHost, setComfyHost] = useState(() => ls("kinetica-comfy-host", "http://localhost:8188"));
  const [comfyCkpt, setComfyCkpt] = useState(() => ls("kinetica-comfy-ckpt", "sdxl_turbo_1.0_fp16.safetensors"));

  const [analyzing, setAnalyzing] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const analyzed = !!working.planet?.analysis?.overallMood;

  const analyze = useCallback(async () => {
    setAnalyzing(true); setAiMsg("Reading the song…");
    try {
      let planet;
      if (engine === "openrouter") {
        if (!orKey.trim()) throw new Error("Paste your OpenRouter key.");
        localStorage.setItem("kinetica-openrouter-key", orKey.trim());
        localStorage.setItem("kinetica-or-model", orModel.trim());
        planet = await analyzeSong({ lyrics: working.lyrics || "", title: working.title, duration, model: orModel.trim(), key: orKey.trim() });
      } else {
        localStorage.setItem("kinetica-ollama-host", ollamaHost.trim());
        localStorage.setItem("kinetica-ollama-model", ollamaModel.trim());
        planet = await analyzeSongOllama({ lyrics: working.lyrics || "", title: working.title, duration, host: ollamaHost.trim(), model: ollamaModel.trim() });
      }
      setWorking((w) => applyAnalysis(w, planet!));
      setAiMsg(`Mood: ${planet.analysis.overallMood} · ${planet.analysis.sections.length} sections · backdrops will now use AI imagery ✓`);
    } catch (e) { setAiMsg(e instanceof Error ? e.message : String(e)); }
    setAnalyzing(false);
  }, [engine, orKey, orModel, ollamaHost, ollamaModel, working, duration]);

  // ── Backdrops ──
  const [sourceId, setSourceId] = useState("openverse");
  const source = useMemo(() => getSource(sourceId), [sourceId]);
  const [imgKey, setImgKey] = useState(() => ls(`kinetica-key-${sourceId}`));
  const [useAiArt, setUseAiArt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<{ credits: Credit[]; attribution: string } | null>(null);

  const pickSource = useCallback((id: string) => {
    setSourceId(id); setImgKey(ls(`kinetica-key-${id}`)); setPreviews([]); setMsg(""); setResult(null);
  }, []);

  const pull = useCallback(async () => {
    setBusy(true); setMsg(""); setPreviews([]); setResult(null);
    const prog = (label: string) => (d: number, t: number, w: string) => setMsg(w ? `${label} “${w}” (${d + 1}/${t})…` : "Placing…");
    try {
      if (useAiArt && engine !== "off") {
        const queries = photoQueries(working.lyrics || "", working.planet, 6, vibe);
        let keywords: Record<string, string>;
        let attribution: string;
        if (engine === "openrouter") {
          if (!orKey.trim()) throw new Error("AI art needs your OpenRouter key.");
          localStorage.setItem("kinetica-img-model", orImgModel.trim());
          keywords = await generateArtOpenRouter(queries, { model: orImgModel.trim(), key: orKey.trim(), onProgress: prog("Generating") });
          attribution = "Art generated with AI (OpenRouter)";
        } else {
          localStorage.setItem("kinetica-comfy-host", comfyHost.trim());
          localStorage.setItem("kinetica-comfy-ckpt", comfyCkpt.trim());
          keywords = await generateArtComfy(queries, { host: comfyHost.trim(), ckpt: comfyCkpt.trim(), onProgress: prog("Rendering") });
          attribution = "Art generated locally (ComfyUI)";
        }
        if (!Object.keys(keywords).length) { setMsg("No art returned — check the model/server."); setBusy(false); return; }
        setWorking((w) => withPhotos(w, keywords));
        setPreviews(Object.values(keywords).slice(0, 8));
        setResult({ credits: [], attribution });
        setMsg(`Placed ${Object.keys(keywords).length} AI backdrops ✓`);
      } else {
        if (source.needsKey && imgKey.trim()) localStorage.setItem(`kinetica-key-${sourceId}`, imgKey.trim());
        const res = await populatePhotos(working, { sourceId, key: imgKey.trim() || undefined, vibe, onProgress: prog("Finding") });
        if (!Object.keys(res.keywords).length) { setMsg("No photos found — try a different source or vibe."); setBusy(false); return; }
        setWorking((w) => withPhotos(w, res.keywords));
        setPreviews(Object.values(res.keywords).slice(0, 8));
        setResult({ credits: res.credits, attribution: res.attribution });
        setMsg(`Placed ${Object.keys(res.keywords).length} photo backdrops ✓`);
      }
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }, [useAiArt, engine, working, vibe, orKey, orImgModel, comfyHost, comfyCkpt, source, imgKey, sourceId]);

  const start = () => onDone(working, result?.credits ?? [], result?.attribution ?? "");
  const field = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[var(--theme-secondary)]";

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-5 p-6">
      <div>
        <h2 className="font-display text-2xl font-black text-white">Enhance your video <span className="text-white/40">(optional)</span></h2>
        <p className="mt-1 font-mono text-[11px] text-white/50">All optional. Add AI direction and backdrops, or skip and start the show.</p>
      </div>

      {/* AI engine selector */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-secondary)]">✦ AI engine</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {([["off", "Off (free)"], ["openrouter", "OpenRouter · key"], ["local", "Local · Ollama+ComfyUI"]] as [Engine, string][]).map(([id, label]) => (
            <button key={id} onClick={() => { setEngine(id); setUseAiArt(false); }} className={`rounded-full px-4 py-1.5 font-mono text-[11px] transition ${engine === id ? "bg-[var(--theme-secondary)] text-black" : "border border-white/20 text-white/60"}`}>{label}</button>
          ))}
        </div>

        {engine === "openrouter" && (
          <div className="mt-3 space-y-2">
            <input value={orKey} onChange={(e) => setOrKey(e.target.value)} type="password" placeholder="OpenRouter API key (openrouter.ai/keys)" className={field} />
            <input value={orModel} onChange={(e) => setOrModel(e.target.value)} placeholder="text model, e.g. openai/gpt-4o-mini" className={field} />
          </div>
        )}
        {engine === "local" && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input value={ollamaHost} onChange={(e) => setOllamaHost(e.target.value)} placeholder="Ollama host" className={field} />
              <input value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} placeholder="model" className={field} />
            </div>
            <p className="font-mono text-[10px] text-white/40">Free &amp; private. Ollama must allow this site (OLLAMA_ORIGINS=*). See docs/LOCAL_SETUP.md.</p>
          </div>
        )}
        {engine !== "off" && (
          <div className="mt-3 flex items-center gap-3">
            <button onClick={analyze} disabled={analyzing} className="rounded-full bg-[var(--theme-secondary)] px-5 py-2 font-display text-sm font-bold text-black disabled:opacity-40">
              {analyzing ? "Analyzing…" : analyzed ? "Re-analyze" : "Analyze the song"}
            </button>
            {aiMsg && <span className="font-mono text-[10px] text-white/60">{aiMsg}</span>}
          </div>
        )}
      </div>

      {/* Backdrops */}
      <div className="rounded-xl border border-white/10 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--theme-primary)]">🖼 Backdrops</p>

        {engine !== "off" && (
          <label className="mt-3 flex items-start gap-2 text-white/70">
            <input type="checkbox" checked={useAiArt} onChange={(e) => setUseAiArt(e.target.checked)} className="mt-0.5" />
            <span className="font-mono text-[10px] leading-relaxed">
              Generate art with AI ({engine === "openrouter" ? "OpenRouter" : "your local ComfyUI"}).
              {engine === "openrouter"
                ? <b className="text-amber-300"> ⚠ Can use a lot of your OpenRouter credits</b>
                : <span className="text-emerald-300"> Free &amp; private — uses your GPU (needs ComfyUI with --enable-cors-header).</span>}
              {" "}Capped at 6 images.
            </span>
          </label>
        )}
        {useAiArt && engine === "openrouter" && (
          <input value={orImgModel} onChange={(e) => setOrImgModel(e.target.value)} placeholder="image model, e.g. google/gemini-2.5-flash-image-preview" className={`mt-2 ${field}`} />
        )}
        {useAiArt && engine === "local" && (
          <div className="mt-2 flex gap-2">
            <input value={comfyHost} onChange={(e) => setComfyHost(e.target.value)} placeholder="ComfyUI host" className={field} />
            <input value={comfyCkpt} onChange={(e) => setComfyCkpt(e.target.value)} placeholder="checkpoint" className={field} />
          </div>
        )}

        {!useAiArt && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {IMAGE_SOURCES.map((s) => (
                <button key={s.id} onClick={() => pickSource(s.id)} className={`rounded-full px-3 py-1.5 font-mono text-[11px] transition ${sourceId === s.id ? "bg-[var(--theme-primary)] text-black" : "border border-white/20 text-white/60"}`}>{s.label}</button>
              ))}
            </div>
            {source.needsKey && <input value={imgKey} onChange={(e) => setImgKey(e.target.value)} type="password" placeholder="Paste your free API key" className={`mt-2 ${field}`} />}
          </>
        )}

        <input value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Vibe (optional) — e.g. “moody cinematic night”" className={`mt-3 ${field}`} />

        <div className="mt-3 flex items-center gap-3">
          <button onClick={pull} disabled={busy || (!useAiArt && source.needsKey && !imgKey.trim())} className="rounded-full bg-[var(--theme-primary)] px-5 py-2 font-display text-sm font-bold text-black disabled:opacity-40">
            {busy ? "Working…" : useAiArt ? "Generate AI art" : "Pull free photos"}
          </button>
          {msg && <span className="font-mono text-[10px] text-white/60">{msg}</span>}
        </div>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">{previews.map((u, i) => <img key={i} src={u} alt="" className="h-16 w-full rounded object-cover" />)}</div>
        )}
      </div>

      <button onClick={start} className="self-center rounded-full bg-white/10 px-8 py-3 font-display font-bold text-white transition hover:bg-white/20">Start the show ▶</button>
    </div>
  );
}
