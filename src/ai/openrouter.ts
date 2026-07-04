import type { Planet } from "@/lib/planet";
import { buildAnalysisMessages, finalizeAnalysis } from "./analyze";

// Level 1 — bring-your-own-key AI direction via OpenRouter (CORS-friendly, one
// key for every model). Keys live only in the browser, sent only to OpenRouter.

const OR = "https://openrouter.ai/api/v1/chat/completions";

interface Msg { role: "system" | "user"; content: string }
function chat(key: string, model: string, messages: Msg[], extra: Record<string, unknown> = {}, signal?: AbortSignal) {
  return fetch(OR, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": location.origin, "X-Title": "Kinetica" },
    body: JSON.stringify({ model, messages, ...extra }),
    signal,
  });
}

export interface AnalyzeOpts { lyrics: string; title: string; duration: number; model: string; key: string; signal?: AbortSignal }

export async function analyzeSong(o: AnalyzeOpts): Promise<Planet> {
  const { system, user, secs } = buildAnalysisMessages(o);
  const r = await chat(o.key, o.model, [{ role: "system", content: system }, { role: "user", content: user }], { response_format: { type: "json_object" }, temperature: 0.5 }, o.signal);
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const content: string = (await r.json()).choices?.[0]?.message?.content ?? "";
  return finalizeAnalysis(content, secs, o.duration);
}

export interface ImageOpts { prompt: string; model: string; key: string; signal?: AbortSignal }

/** Generate one image via an OpenRouter image-output model → data URL. */
export async function generateImage(o: ImageOpts): Promise<string> {
  const r = await chat(o.key, o.model, [{ role: "user", content: `${o.prompt}. Cinematic, atmospheric, no text, no watermark.` }], { modalities: ["image", "text"] }, o.signal);
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const url = (await r.json()).choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("That model returned no image — pick an image-capable model.");
  return url;
}
