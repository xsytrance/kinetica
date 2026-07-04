# Level 2 — 100% local AI (Ollama + ComfyUI)

Level 2 runs the whole AI pipeline on **your own machine** — no API key, no cloud,
no per-image cost, and nothing leaves your computer. You need two local servers:

- **Ollama** — reads your lyrics and writes the "direction" (emotions, sections,
  palette, imagery prompts).
- **ComfyUI** — generates the art backdrops from those prompts.

Kinetica talks to both over `localhost`. This guide gets them running.

> Heads-up: image generation needs a **GPU** to be quick. On CPU it still works
> but each image can take a minute+. An NVIDIA GPU with ≥6GB VRAM is a good start.

---

## 1. Ollama (lyric analysis)

1. Install from **https://ollama.com/download** (macOS / Windows / Linux).
2. Pull a small, capable model:
   ```bash
   ollama pull qwen2.5:14b     # great quality; use qwen2.5:7b on ≤8GB VRAM
   ```
3. Ollama serves on `http://localhost:11434` automatically. Test:
   ```bash
   curl http://localhost:11434/api/tags
   ```
4. In Kinetica → **Settings → Level 2**, set the Ollama URL (default
   `http://localhost:11434`) and model name. Done.

---

## 2. ComfyUI (art generation)

### Install
```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Get a fast image model (SDXL Turbo — ~4 steps, seconds per image)
Download **`sdxl_turbo_1.0_fp16.safetensors`** from
https://huggingface.co/stabilityai/sdxl-turbo and put it in:
```
ComfyUI/models/checkpoints/
```

### Run it with the API + CORS open to Kinetica
```bash
python main.py --listen 127.0.0.1 --port 8188 --enable-cors-header "*"
```
- `--enable-cors-header "*"` lets the Kinetica web app call ComfyUI from the
  browser. (If you host Kinetica somewhere other than localhost, set the exact
  origin instead of `*`.)
- The API is now at `http://localhost:8188`. Kinetica queues prompts against
  `/prompt` and pulls results from `/history` + `/view`.

### Point Kinetica at it
In Kinetica → **Settings → Level 2**, set the ComfyUI URL (`http://localhost:8188`)
and the checkpoint name (`sdxl_turbo_1.0_fp16.safetensors`). Kinetica caps how
many images it generates per song so a run stays quick.

---

## Troubleshooting

- **"ComfyUI not reachable"** — is `python main.py …` still running? Is the port
  8188? Did you pass `--enable-cors-header`?
- **CORS error in the browser console** — you started ComfyUI without the CORS
  flag, or Kinetica isn't served from an allowed origin.
- **Ollama returns nothing / loops** — some "thinking" models misbehave in JSON
  mode; `qwen2.5` variants are reliable. Try a bigger model if analysis is thin.
- **Out of VRAM** — use a smaller Ollama model, and SDXL **Turbo** (not base) for
  art; close other GPU apps.

---

*Level 1 (OpenRouter, bring-your-own-key) needs none of this — just paste a key.
Level 0 needs nothing at all.*
