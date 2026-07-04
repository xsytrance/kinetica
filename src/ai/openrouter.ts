import type { Planet, PlanetSection } from "@/lib/planet";
import { parseLyrics, headerLabel } from "@/lib/lyrics";

// Level 1 — bring-your-own-key AI direction via OpenRouter (CORS-friendly, one
// key for every model). The LLM assigns emotions, sections, a palette and vivid
// imagery prompts; section TIMING is taken from the LRC (deterministic), so the
// model only supplies meaning. Optional image generation for models that emit
// images. Keys live only in the browser and are sent only to OpenRouter.

const OR = "https://openrouter.ai/api/v1/chat/completions";
const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));
const isHex = (s: unknown) => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

interface Msg { role: "system" | "user"; content: string }
function chat(key: string, model: string, messages: Msg[], extra: Record<string, unknown> = {}, signal?: AbortSignal) {
  return fetch(OR, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": location.origin,
      "X-Title": "Kinetica",
    },
    body: JSON.stringify({ model, messages, ...extra }),
    signal,
  });
}

/** Section name + real start time, straight from the LRC's [Section] headers. */
function sectionsFromLrc(lyrics: string): { name: string; start: number }[] {
  const { lines } = parseLyrics(lyrics);
  const out: { name: string; start: number }[] = [];
  let pending: string | null = null;
  for (const l of lines) {
    if (l.header) pending = headerLabel(l.text);
    else if (l.t != null && pending != null) { out.push({ name: pending, start: l.t }); pending = null; }
  }
  return out;
}

export interface AnalyzeOpts { lyrics: string; title: string; duration: number; model: string; key: string; signal?: AbortSignal }

export async function analyzeSong(o: AnalyzeOpts): Promise<Planet> {
  const secs = sectionsFromLrc(o.lyrics);
  const plain = parseLyrics(o.lyrics).lines.filter((l) => !l.header).map((l) => l.text).join("\n").slice(0, 4000);
  const sys = "You are a music-video art director. Read the song and respond with ONLY a JSON object — no prose, no code fences.";
  const user =
`Song: "${o.title}" (~${Math.round(o.duration)}s).
SECTIONS in order (${secs.length ? "give one meta entry per section, same order/count" : "none provided — propose 5-8 sections"}): ${secs.map((s) => s.name).join(" | ") || "(propose)"}
LYRICS:
${plain}

Return JSON:
{
  "summary": "one evocative sentence",
  "overallMood": "one or two words",
  "themes": ["3-4 themes"],
  "palette": ["6 hex colors that capture the song's world, e.g. #1a2b3c"],
  "sections": [${secs.length ? '{"emotion":"one word","intensity":0.0-1.0,"colorHint":"#hex"}' : '{"name":"Section","emotion":"one word","intensity":0.0-1.0,"colorHint":"#hex"}'}],
  "keywords": [{"word":"a SINGLE lowercase word that appears in the lyrics","emotion":"one word","imageryPrompt":"a vivid cinematic photo description for this word"}]  // 6-9
}`;

  const r = await chat(o.key, o.model, [{ role: "system", content: sys }, { role: "user", content: user }], { response_format: { type: "json_object" }, temperature: 0.5 }, o.signal);
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const data = await r.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  const j = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));

  const meta: any[] = Array.isArray(j.sections) ? j.sections : [];
  let sections: PlanetSection[];
  if (secs.length) {
    sections = secs.map((s, i) => ({
      name: s.name, start: s.start,
      emotion: String(meta[i]?.emotion ?? ""), intensity: clamp01(meta[i]?.intensity ?? 0.5),
      colorHint: isHex(meta[i]?.colorHint) ? meta[i].colorHint : (isHex(j.palette?.[i % 6]) ? j.palette[i % 6] : "#8b7bff"),
    }));
  } else {
    sections = meta.map((m, i) => ({
      name: String(m?.name ?? `Part ${i + 1}`), start: Math.round((o.duration * i) / Math.max(1, meta.length)),
      emotion: String(m?.emotion ?? ""), intensity: clamp01(m?.intensity ?? 0.5),
      colorHint: isHex(m?.colorHint) ? m.colorHint : "#8b7bff",
    }));
  }

  const palette = (Array.isArray(j.palette) ? j.palette : []).filter(isHex);
  return {
    analysis: {
      summary: String(j.summary ?? ""), overallMood: String(j.overallMood ?? ""),
      themes: Array.isArray(j.themes) ? j.themes.map(String) : [],
      palette: palette.length ? palette : ["#8b7bff"],
      sections,
      keywords: (Array.isArray(j.keywords) ? j.keywords : []).map((k: any) => ({
        word: String(k?.word ?? "").toLowerCase(), emotion: String(k?.emotion ?? ""), imageryPrompt: String(k?.imageryPrompt ?? k?.word ?? ""),
      })).filter((k: { word: string }) => k.word),
    },
    generatedAt: null,
  };
}

export interface ImageOpts { prompt: string; model: string; key: string; signal?: AbortSignal }

/** Generate one image via an OpenRouter image-output model → data URL. */
export async function generateImage(o: ImageOpts): Promise<string> {
  const r = await chat(o.key, o.model, [{ role: "user", content: `${o.prompt}. Cinematic, atmospheric, no text, no watermark.` }], { modalities: ["image", "text"] }, o.signal);
  if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const data = await r.json();
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error("That model returned no image — pick an image-capable model.");
  return url;
}
