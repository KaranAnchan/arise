# ARISE

> **[THE SYSTEM HAS CHOSEN YOU.]**

A fitness RPG where your character's body is a mirror of your real one. Every real training
session feeds a 100-level evolution from E-Rank nobody to Absolute Shadow Deity, inspired by
Solo Leveling. The app is "The System": a cold, omniscient interface that issues quests,
measures you without flattery, and rewards only genuine progressive overload.

**Product truth under the fantasy:** the character can only level up if your real lifts go up,
so the only way to win the game is to actually get stronger.

Arise is the ground-up successor to **Shift + Lift** (a single-user offline workout PWA). It
keeps everything that app got right — shift-aware programming, the muscle heatmap, double
progression, offline-first discipline — and wraps it in an honest RPG progression layer with
accounts and cross-device sync.

## Status

| Phase | Name | Status |
|---|---|---|
| 0 | Design & documentation | ✅ Complete |
| 1 | Foundation (engine, character, dashboard) | ✅ Complete (`v0.1.0`) |
| 2 | The Gate (workout tracking, XP, level-ups) | ✅ Complete (`v0.2.0`) |
| 3 | The System Awakens (quests, streaks, stats) | ⬜ Not started |
| 4 | Ascension (auth, sync, multi-device) | ⬜ Not started |
| 5 | Endgame (bosses, relics, polish, deploy) | ⬜ Not started |

## Documentation

All design and build documentation lives in [`docs/`](docs/):

- [`00-HANDOFF.md`](docs/00-HANDOFF.md) — context handoff log; **read this first** when picking up the project, update it when finishing a phase
- [`01-PRD.md`](docs/01-PRD.md) — product requirements
- [`02-GDD.md`](docs/02-GDD.md) — game design document (XP, levels, tiers, quests, bosses)
- [`03-TECHNICAL-DESIGN.md`](docs/03-TECHNICAL-DESIGN.md) — stack, data model, sync, architecture
- [`04-DESIGN-SYSTEM.md`](docs/04-DESIGN-SYSTEM.md) — visual language, tokens, wireframes
- [`05-BUILD-PLAN.md`](docs/05-BUILD-PLAN.md) — phased build plan with files, models, and tests per phase

## Stack (summary)

React 19 + Vite + TypeScript PWA · Dexie (IndexedDB, offline-first event log) ·
Supabase (Postgres + Auth, sync) · deployed as a static PWA. Full rationale in the
[technical design doc](docs/03-TECHNICAL-DESIGN.md).

## Character assets

The app is designed around a **tier manifest** (`tiers.json`) and convention-based image paths
(`assets/characters/lvl_NN.webp`). Images are generated separately and dropped in at any time;
until then a procedural aura placeholder renders for every level. The system is extensible
beyond level 100 by appending manifest entries — no code changes.

## License

[MIT](LICENSE)
