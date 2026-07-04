import type { Planet } from "@/lib/planet";
import { buildAnalysisMessages, finalizeAnalysis } from "./analyze";

// Level 2 — 100% local AI. Analysis runs on your own Ollama server, art on your
// own ComfyUI. Nothing leaves your machine; no key, no cost. Both are called
// straight from the browser, so each must allow this origin (Ollama:
// OLLAMA_ORIGINS=*, ComfyUI: --enable-cors-header "*"). See docs/LOCAL_SETUP.md.
// Browsers permit https pages to reach http://localhost (localhost is exempt
// from mixed-content blocking), so this works from the hosted site too.

export interface OllamaOpts { lyrics: string; title: string; duration: number; host: string; model: string; signal?: AbortSignal }

export async function analyzeSongOllama(o: OllamaOpts): Promise<Planet> {
  const { system, user, secs } = buildAnalysisMessages(o);
  const host = o.host.replace(/\/$/, "");
  let r: Response;
  try {
    r = await fetch(`${host}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: o.signal,
      body: JSON.stringify({ model: o.model, stream: false, format: "json", think: false, options: { temperature: 0.4, num_ctx: 8192 }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
  } catch {
    throw new Error(`Can't reach Ollama at ${host}. Is it running, and is OLLAMA_ORIGINS set to allow this site?`);
  }
  if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const content: string = (await r.json())?.message?.content ?? "";
  return finalizeAnalysis(content, secs, o.duration);
}
