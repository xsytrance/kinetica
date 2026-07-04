// Level 2 art generation via a local ComfyUI server (SDXL Turbo, 4 steps). The
// browser queues a prompt, polls history, and pulls the rendered image →
// object URL. ComfyUI must run with --enable-cors-header "*" so the page can
// call it. Ported from x1c7's generate.mjs.

export interface ComfyOpts { prompt: string; host: string; ckpt?: string; w?: number; h?: number; seed?: number; signal?: AbortSignal }

const NEGATIVE = "text, watermark, logo, caption, letters, low quality, deformed, oversaturated, cartoon";

function graph(prompt: string, ckpt: string, w: number, h: number, seed: number) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: ckpt } },
    "2": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 1], text: `${prompt}, cinematic, atmospheric, no text` } },
    "3": { class_type: "CLIPTextEncode", inputs: { clip: ["1", 1], text: NEGATIVE } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0], seed, steps: 4, cfg: 1.0, sampler_name: "euler_ancestral", scheduler: "normal", denoise: 1.0 } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { images: ["6", 0], filename_prefix: "kinetica" } },
  };
}

/** Reachability probe for the settings UI. */
export async function comfyReachable(host: string, signal?: AbortSignal): Promise<boolean> {
  try { return (await fetch(`${host.replace(/\/$/, "")}/system_stats`, { signal })).ok; } catch { return false; }
}

export async function generateComfy(o: ComfyOpts): Promise<string> {
  const host = o.host.replace(/\/$/, "");
  const ckpt = o.ckpt || "sdxl_turbo_1.0_fp16.safetensors";
  const seed = o.seed ?? Math.floor(performance.now() * 1000) % 2_000_000_000;
  let q: Response;
  try {
    q = await fetch(`${host}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: graph(o.prompt, ckpt, o.w || 1152, o.h || 832, seed) }), signal: o.signal });
  } catch {
    throw new Error(`Can't reach ComfyUI at ${host}. Is it running with --enable-cors-header "*"?`);
  }
  if (!q.ok) throw new Error(`ComfyUI ${q.status}: ${(await q.text()).slice(0, 160)}`);
  const { prompt_id } = await q.json();

  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 700));
    if (o.signal?.aborted) throw new Error("cancelled");
    const h = await (await fetch(`${host}/history/${prompt_id}`, { signal: o.signal })).json();
    const entry = h[prompt_id];
    if (entry?.status?.status_str === "error") throw new Error("ComfyUI reported an error (check the console/model).");
    const img = entry?.outputs?.["7"]?.images?.[0];
    if (img) {
      const res = await fetch(`${host}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder || "")}&type=${img.type}`, { signal: o.signal });
      return URL.createObjectURL(await res.blob());
    }
  }
  throw new Error("ComfyUI timed out generating the image.");
}

/** Generate one image per keyword locally (free, GPU-bound). */
export async function generateArtComfy(queries: { word: string; query: string }[], o: {
  host: string; ckpt?: string; onProgress?: (done: number, total: number, word: string) => void; signal?: AbortSignal;
}): Promise<Record<string, string>> {
  const keywords: Record<string, string> = {};
  let done = 0;
  for (const q of queries) {
    o.onProgress?.(done, queries.length, q.word);
    try { keywords[q.word] = await generateComfy({ prompt: q.query, host: o.host, ckpt: o.ckpt, signal: o.signal }); }
    catch (e) { if (done === 0 && !Object.keys(keywords).length) throw e; }
    done++;
  }
  o.onProgress?.(done, queries.length, "");
  return keywords;
}
