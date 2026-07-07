# Build Log — Kinetica

Newest first. The lyric **engine** (`src/engine/*`, `src/lib/{effects,lexicon,planet,
theme,palette,perf,stemSense,shapes,lyrics,beatClock}`, `src/data/lexicon.json`) is
**not authored here** — it's synced from the x1c7 workshop via that repo's
`scripts/engine/sync-to-kinetica.mjs`. Only the Kinetica shell (`ui/`, `images/`,
`ingest/`, `audio/`, `ai/`, `export/`, `lib/presets|keywords|buildTrack`) is authored here.

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
