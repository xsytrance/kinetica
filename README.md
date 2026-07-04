# Kinetica

**Drop a Suno stem zip → get an interactive, beat-reactive cinematic lyric video.**
Free, private, and runs entirely in your browser.

Kinetica turns a song into a *world*: words that blow up, pile up, morph, ignite,
and dance in time with the actual drums and bass — because it *listens* to the
separated stems. Three ways to use it, from zero-setup to fully AI-powered.

---

## The three levels

### ⓿ Level 0 — Free & offline (no account, no key, no AI cost)
Drop your Suno **stem zip**. Kinetica:
- reads the stems and **measures the song** — kicks, snares, hats, bass, energy,
  drops — with plain audio math (no AI), so the visuals move with the music;
- gets your **lyrics** one of two ways: **auto-transcribe on your device** with an
  in-browser Whisper model (no API key, nothing leaves your machine), or **paste
  your lyrics** and tap along to time them;
- plays an interactive show in **three modes**:
  - **Phrase** — the whole line on stage, igniting word-by-word (easiest to read),
  - **Focus** — one word at a time, cinematic,
  - **Dynamic** — the playground: drag words around, fling them, tap to trigger
    effects, and watch repeated words pile up so you can swipe them away.

Everything above is 100% local. No sign-in. No cost. Your song never leaves the browser.

### ❶ Level 1 — Bring your own key (OpenRouter)
Add an **OpenRouter API key** to unlock AI direction:
- an LLM reads your lyrics and assigns **emotions, sections, a palette, and imagery
  prompts**;
- optional **AI-generated art** backdrops per section/keyword.

> ⚠️ **Cost warning.** Image generation can use **a lot** of tokens/credits fast.
> Kinetica shows a **running cost estimate**, a **hard cap** on images per song,
> and asks you to confirm before anything paid runs. Your key is stored **only in
> your browser** and is sent **only** to OpenRouter.

### ❷ Level 2 — 100% local AI (free & private)
Run the whole AI pipeline on your own machine — no key, no cloud, no cost:
- **[Ollama](https://ollama.com)** for lyric analysis,
- **[ComfyUI](https://github.com/comfyanonymous/ComfyUI)** for art generation.

See **[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)** for a step-by-step ComfyUI +
Ollama install and config guide.

---

## Quick start (run it yourself)

```bash
npm install
npm run dev      # open the printed localhost URL, drop a stem zip
```

Build a static site anyone can host (GitHub Pages, Vercel, Netlify — no server):

```bash
npm run build    # outputs dist/
```

## How it works

```
stem zip ──► unzip (JSZip) ──► decode (Web Audio) ──► measure stems (DSP, no AI)
                                                   └─► lyrics: on-device Whisper  ──►  planet
                                                        or paste + tap-to-sync         (timing + senses
                                                                                        + optional AI
   Level 1/2 (optional): LLM analysis + art  ─────────────────────────────────────►    analysis/art)
                                                                                          │
                                                                        Kinetica engine ◄─┘
                                                                   (phrase · focus · dynamic)
```

A **planet** is the self-contained bundle for one song: word timings, stem
"senses", optional analysis (emotions/sections/palette) and generated art. The
renderer performs the planet — the same engine at every level; AI just enriches
the planet.

## Roadmap

- [x] Project scaffold + engine core
- [ ] **Level 0**: stem-zip ingest, in-browser stem analysis, on-device Whisper,
      tap-to-sync, the 3 interactive modes
- [ ] Export to shareable **video** (record the canvas + audio)
- [ ] **Level 1**: OpenRouter analysis + art with cost guardrails
- [ ] **Level 2**: local Ollama + ComfyUI, with setup docs
- [ ] Effect/template presets, shareable links

## Credits

Kinetica grew out of the cinematic lyric engine built for
[x1c7.com](https://x1c7.com). Built for the Suno creator community. MIT licensed —
use it, fork it, make something beautiful.
