# Build Log — Kinetica

Newest first. The lyric **engine** (`src/engine/*`, `src/lib/{effects,lexicon,planet,
theme,palette,perf,stemSense,shapes,lyrics,beatClock}`, `src/data/lexicon.json`) is
**not authored here** — it's synced from the x1c7 workshop via that repo's
`scripts/engine/sync-to-kinetica.mjs`. Only the Kinetica shell (`ui/`, `images/`,
`ingest/`, `audio/`, `ai/`, `export/`, `lib/presets|keywords|buildTrack`) is authored here.

---

## 2026-07-13 (later) — Demo-worthy: dynamic by default, transport, coach, the Suno letter

Owner's punch list after seeing the live demo on a phone: cropped header,
phrase mode rendering a full-page wall, missing transport, nothing explains
itself, and the landing needed his voice.

- **Phrase-wall fixed in the ENGINE** (authored in x1c7, synced here): line
  grouping matched LRC stamps to word times *exactly*, which The Alignment's
  measured timings broke — whole songs became one "phrase". Stamps now land
  on the nearest word onset (±0.6s); songs with no usable stamps segment on
  breath gaps. Also picked up the frozen-show decode-gate fix in the sync.
- **Show chrome rebuilt**: DYNAMIC is the default view; top bar wraps (no
  more cropped chips) with icon-only exit/director on phones; new bottom
  transport — ⏮ ▶/❚❚ ⏭ · ? · ● Rec. In the demo, ⏭ summons another random
  catalog song (`N` key), ⏮ restarts/walks history. "Now performing" marquee
  announces each pick.
- **Everything explains itself**: every control carries a `data-hint` hover/
  focus tooltip (pointer devices); the ? coach panel covers touch — and
  auto-opens once on a first demo visit ("This stage is yours").
- **Landing rebuilt in the owner's voice**: aurora title, equalizer strip,
  4-step "what happens next", the Suno letter ("not affiliated — but Suno
  changed my life; this engine is my thank-you letter"), the only-the-
  beginning teaser, and a "Go grab your stems on Suno" CTA with the Pro
  heads-up.

**Verified** headless at 390×844 (mobile) + 1440×900: no horizontal
overflow, dynamic default, phrase = one sentence (both LRC-mapped and
gap-fallback songs), next/prev navigate, tooltip renders, coach auto-opens
once, zero page errors.

---

## 2026-07-13 — The demo becomes real: a random catalog song, front and center

The landing page's demo was a tiny ghost-text link to a 20-second synthesized
beat with canned lyrics — it showcased almost nothing. Now:

- **`src/demo/catalogDemo.ts`** — the no-install demo performs a REAL song:
  a random word-timed planet from the x1c7.com catalog, fetched from its
  public sources (Supabase anon REST — publishable key, same one the site
  ships — + the public R2 bucket; both CORS-open, verified). Planet art keys
  are site-relative `/planets/…`, so they're deep-absolutized against the R2
  base — object keys included, because `assets.alt` maps art-key → art-key.
  Kinetica's `PLANET_BASE = ""` then resolves them untouched.
- **App**: the demo goes straight to the show (the planet already has
  analysis/art/timings — no lyrics/art steps). If the catalog is unreachable
  (offline), the old synthesized beat still performs as the fallback.
- **DropZone**: the demo is now the hero — a full-width glowing
  "▶ WATCH A LIVE DEMO" button above the drop zone, subline
  "a random song from the x1c7.com catalog — different every time".

**Verified** headless (playwright-core + system Chrome on `vite preview`):
hero visible, click → full show of a random real song (planet backdrops,
word ignition, mic-moment prompt, deck), different song across runs,
0 console errors (one run had two 404s on a song with thin art coverage —
the engine's gradient fallback self-heals those by design).

---

## 2026-07-07 — Engine synced to Phase 2.0

Received the current x1c7 engine (was running a stale clone). New in this repo:
- `src/engine/SurfaceEffects.tsx`, `src/engine/PerfHUD.tsx`
- `src/lib/effects/registry.ts`, `src/lib/perf.ts`, `src/lib/palette.ts`
- `src/lib/lexicon/{types,lookup}.ts`, `src/data/lexicon.json`
- `src/lib/engineHost.ts` (scaffolded seam: `useMusicPlayer` ← `@/audio/player`,
  `Track` ← `@/lib/types`, `HAS_SHARED_ART = false`)
- Refreshed `src/engine/KineticStage.tsx` + `KineticParticles.tsx`

Engine now has: surface effects (mud/rust/cracks/vines/…), the effect registry with a
single `WORD_FX` id→component map for word treatments, and lexicon-driven no-LLM effect
selection. Verified: `npm run typecheck`, `npm run build`, and the "Try a demo" flow all
green (headless smoke test: stage + particles render, 0 console errors).

Roadmap + detailed log live in the x1c7 repo: `docs/KINETICA-ROADMAP.md`, `docs/BUILD-LOG.md`.
</content>
