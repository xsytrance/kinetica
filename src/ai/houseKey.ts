import type { Planet } from "@/lib/planet";
import { buildAnalysisMessages, finalizeAnalysis } from "./analyze";

// ═══════════════════════════════════════════════════════════════════════════
// THE HOUSE KEY — limited-time. The owner is lending their own OpenRouter key
// so the hosted site can do cloud AI direction with NO sign-in: the browser
// calls a small proxy on x1c7.com, which holds the key server-side and talks
// to free models only (tencent/hy3, falling back to NVIDIA Nemotron). Fair-use
// rate limits apply; "Connect with OpenRouter" remains the full-power path.
// This never sends anything anywhere except the song's title + lyrics.
// ═══════════════════════════════════════════════════════════════════════════

export const HOUSE_PROXY = "https://x1c7.com/api/kinetica/ai";

export const HOUSE_MODEL_LABEL = "tencent/hy3 · free (Nemotron fallback)";

export const HOUSE_ANNOUNCEMENT =
  "🎁 Limited time: AI direction is on the house. I've plugged my own OpenRouter key " +
  "into the hosted site for testing — free models (Tencent HY3, NVIDIA Nemotron fallback), " +
  "no sign-in needed, fair-use limited. Connect your own key any time for full control.";

/** Is the house key live? (route deployed + key configured, and we can reach it) */
export async function houseKeyLive(signal?: AbortSignal): Promise<boolean> {
  try {
    const r = await fetch(HOUSE_PROXY, { signal: signal ?? AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    return !!(await r.json()).enabled;
  } catch { return false; }
}

export interface HouseAnalyzeOpts { lyrics: string; title: string; duration: number; signal?: AbortSignal }

/** Analyze the song through the house-key proxy (same prompt + finishing as BYOK). */
export async function analyzeSongHouse(o: HouseAnalyzeOpts): Promise<Planet> {
  const { system, user, secs } = buildAnalysisMessages(o);
  const r = await fetch(HOUSE_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.5,
    }),
    signal: o.signal,
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; content?: string; error?: string };
  if (!r.ok || !j.content) throw new Error(j.error || `House key unavailable (${r.status}) — try again or connect your own key.`);
  return finalizeAnalysis(j.content, secs, o.duration);
}
