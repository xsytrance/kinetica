# Kinetica

**Drop a Suno stem zip → get an interactive, beat-reactive cinematic lyric video.**
Free, private, and runs entirely in your browser.

Kinetica turns a song into a *world*: words that blow up, pile up, morph, ignite,
and dance in time with the actual drums and bass — because it *listens* to the
separated stems.

## Three ways to use it

| | Best for | Get it |
|---|---|---|
| 🌐 **Website** | Anyone — zero install | **[xsytrance.github.io/kinetica](https://xsytrance.github.io/kinetica/)** |
| 💻 **Desktop app** | Using the AI features privately | **[Download an installer](https://github.com/xsytrance/kinetica/releases/latest)** (Win / macOS / Linux) |
| 🛠️ **Clone & build** | Devs — self-host, audit, contribute | `git clone` (below) |

All three are the same app. Everything runs on **your** device — see
[Privacy & trust](#privacy--trust).

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

## Run it locally (for AI features)

**Your API key should never be pasted into a website you don't control** — so the
hosted site never asks for one. Level 0 (offline lyrics), free photo backdrops,
and video export all work on the hosted site with **no key and no sign-in**.

To use **Level 1 (OpenRouter, your key)**, run Kinetica **on your own machine**.
Then the key you enter stays on your computer and is sent only to OpenRouter.

### ⬇️ Download the desktop app (no Node, no terminal)

Grab a one-click installer from the **[latest release](https://github.com/xsytrance/kinetica/releases/latest)**:

| OS | File |
|----|------|
| **Windows** | `Kinetica_*_x64-setup.exe` (or `.msi`) |
| **macOS** (Apple Silicon) | `Kinetica_*_aarch64.dmg` |
| **Linux** | `.AppImage`, `.deb`, or `.rpm` |

Double-click to install, launch, and paste your key **in the app on your own
computer**. (Installers are unsigned for now, so you may need to click through an
"unidentified developer" warning.)

### …or run from source (with Node)

```bash
git clone https://github.com/xsytrance/kinetica
cd kinetica && npm install
npm run dev        # open the printed http://localhost URL — key entry is unlocked there
```

**Level 2 (100% local, no key at all)** — Ollama + ComfyUI on your machine —
works even from the hosted site (it only talks to `localhost`). Setup:
[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

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
- [x] **Level 0**: stem-zip ingest, in-browser stem analysis, on-device Whisper,
      tap-to-sync, the 3 interactive modes
- [x] **Free backdrops** — search **6 sources** for the song's key words, wired
      into the show with attribution. No-key: Openverse (CC), Wikimedia Commons,
      Art Institute of Chicago (fine art). Free-key: Pexels, Unsplash, Pixabay
- [x] Export to shareable **video** (record the show + audio → `.webm`)
- [x] **Level 1**: OpenRouter AI direction (emotions/sections/palette/imagery
      prompts) that also sharpens the photo search; optional AI image-gen with a
      cost warning + per-run cap
- [x] **Level 2**: 100% local — Ollama (direction) + ComfyUI (art), free &
      private, with setup docs (see [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md))
- [x] Style presets (Neon / Film / Minimal / Inferno / Vapor)
- [x] Desktop app (Tauri) with Win / macOS / Linux installers
- [x] "Connect with OpenRouter" (OAuth) — cloud AI without pasting a key
- [ ] Shareable links, MP4 export (ffmpeg.wasm)

## Privacy & trust

Kinetica is built so you never have to trust *me* with anything:

- **Your song never leaves your device.** Stems are unzipped, decoded, and
  analyzed **in your browser**. There is no upload, no account, and no server —
  the website is just static files.
- **No tracking, no analytics, no cookies.**
- **API keys stay yours.** The hosted site never asks for one. For cloud AI you
  either **"Connect with OpenRouter"** (you authenticate on *their* site, not
  here) or run the **desktop app / from source**, where a key you enter lives
  only in your own browser storage and is sent only to the provider you chose.
- **It's open source (MIT).** Read every line, build it yourself, or self-host.

## Credits & contact

Made by **xsytrance** for the Suno creator community, grown out of the lyric
engine at **[x1c7.com](https://x1c7.com)**.

- 🎵 Suno — [suno.com/@xsytrance](https://suno.com/@xsytrance)
- 🔊 SoundCloud — [soundcloud.com/xsytrance](https://soundcloud.com/xsytrance)
- 🌐 [x1c7.com](https://x1c7.com)
- ✉️ [agenor@outlook.com](mailto:agenor@outlook.com)

MIT licensed — use it, fork it, make something beautiful. PRs and issues welcome.
