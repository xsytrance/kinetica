import type { Planet, PlanetSection } from "@/lib/planet";
import { parseLyrics, headerLabel } from "@/lib/lyrics";

// Shared song-analysis core used by both the cloud (OpenRouter) and local
// (Ollama) providers: the same prompt and the same LRC-anchored section timing,
// so the only difference between the AI levels is where the model runs.

export const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.5));
export const isHex = (s: unknown): s is string => typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

/** Section name + real start time, straight from the LRC's [Section] headers. */
export function sectionsFromLrc(lyrics: string): { name: string; start: number }[] {
  const { lines } = parseLyrics(lyrics);
  const out: { name: string; start: number }[] = [];
  let pending: string | null = null;
  for (const l of lines) {
    if (l.header) pending = headerLabel(l.text);
    else if (l.t != null && pending != null) { out.push({ name: pending, start: l.t }); pending = null; }
  }
  return out;
}

export interface AnalyzeInput { lyrics: string; title: string; duration: number }

/** Build the {system, user} messages + the section list for the given song. */
export function buildAnalysisMessages(o: AnalyzeInput) {
  const secs = sectionsFromLrc(o.lyrics);
  const plain = parseLyrics(o.lyrics).lines.filter((l) => !l.header).map((l) => l.text).join("\n").slice(0, 4000);
  const system = "You are a music-video art director. Read the song and respond with ONLY a JSON object — no prose, no code fences.";
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
  "keywords": [{"word":"a SINGLE lowercase word that appears in the lyrics","emotion":"one word","imageryPrompt":"a vivid cinematic photo description for this word"}]
}`;
  return { system, user, secs };
}

/** Parse a model's JSON reply into a Planet, merging LRC-derived section timing. */
export function finalizeAnalysis(content: string, secs: { name: string; start: number }[], duration: number): Planet {
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
      name: String(m?.name ?? `Part ${i + 1}`), start: Math.round((duration * i) / Math.max(1, meta.length)),
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
