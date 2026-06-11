# Arise — Phased Build Plan

**Version:** 1.0 · **Date:** 2026-06-11

Rules of engagement for every phase:

1. A phase is **done** when its exit criteria pass — not when its code exists.
2. Finish a phase by updating `00-HANDOFF.md` (decisions, schema changes, deferrals,
   instructions for the next phase) **in the same commit/PR** as the final change.
3. Engine changes always land with tests. UI may trail polish; math may not trail tests.
4. Git: one branch per phase (`phase-1-foundation`, …), merged to `main` when exit criteria
   pass. Tag merges `v0.1.0` … `v0.5.0`. Commit at every working checkpoint within a phase.

---

## Phase 1 — Foundation (engine + character + dashboard) → `v0.1.0`

**Goal:** the game's brain works and the dashboard renders a living character — local only.

**Create:**

| Area | Files |
|---|---|
| Scaffold | Vite + React + TS strict, TanStack Router/Query, Vitest, vite-plugin-pwa, ESLint/Prettier; `index.html`, `vite.config.ts`, `src/main.tsx` |
| Tokens | `src/styles/tokens.css` (base + per-tier aura blocks generated from manifest), fonts via @fontsource |
| Engine | `src/engine/{types,xp,reduce}.ts` + `__tests__/{xp.test.ts, reduce.test.ts, replay.property.test.ts}` |
| Store | `src/store/{db,append,useGameState}.ts` (Dexie; no sync yet) |
| Content | `src/data/program.ts` (ported from Shift + Lift + `cls`/`statTags`/gate names), `src/data/strings.ts` (first System copy) |
| Character | `public/assets/characters/tiers.json` (all 10 tiers), `src/character/{manifest.ts, AuraPlaceholder.tsx}` |
| UI | `SystemText`, `SystemWindow`, `XPBar`, `CharacterCard`, `TierTease`, `RosterStrip`; `src/routes/dashboard/` |
| Dev tool | `src/dev/seed.ts` — inject synthetic event logs (any level) to preview every tier |

**Data models:** `AriseEvent`, `GameState`, tier manifest schema.

**Test scenarios:**
- XP unit tests: every GDD §2.1 formula, ratio caps, streak cap, first-log default.
- Reducer: empty log → level 1 / 0 XP; crafted logs hit exact expected levels; levels are
  monotonic under any event append.
- Property test: shuffled permutations of an event set ⇒ identical state hash.
- Manifest: level→image/tier resolution incl. zero-padding; level 101 with extended manifest
  resolves (AC-9.2); missing file ⇒ placeholder (AC-9.3).
- Aura palette AA-contrast test (design system §5).

**Exit criteria:** dashboard shows character/level/XP from a seeded log; tier switch recolors
UI; engine coverage ≥ 90%; PWA installs locally.

---

## Phase 2 — The Gate (workout tracking + XP + ceremonies) → `v0.2.0`

**Goal:** full training flow. **Arise replaces Shift + Lift as the daily driver** (local-only
is fine — Shift + Lift was local-only too).

**Create:**

| Area | Files |
|---|---|
| Gate flow | `src/routes/gate/{GateView,GateHeader,ExerciseCard,SetLogger,TallyScreen}.tsx` |
| Ceremonies | `src/routes/gate/{Ceremony.tsx, ceremony.css}` (level-up + tier-up variants) |
| Ports | `src/body/` (heatmap), `src/anim/` (FK demos) from Shift + Lift, componentized |
| Engine | set grading (beat/held/regressed) vs last session; `gate_cleared` detection |
| Dashboard | wire "ENTER GATE" + today logic; shift/rest panels (static this phase) |

**Test scenarios:**
- SetLogger: prefill from last session; ≤ 3 taps happy path (AC-3.2); amend flow emits
  `set_amended`; grade chips correct on boundary cases (equal tonnage = held).
- Tally itemization matches engine output to the XP (AC-4.1).
- Ceremony triggers exactly on threshold crossing; never twice for one level; tier-up at
  10/20/…; reduced-motion variant renders.
- Heatmap: session aggregate = per-muscle max; exercise focus/restore.
- Airplane-mode E2E: full Gate offline (AC-3.6).

**Exit criteria:** Karan trains real sessions in Arise for a full week; XP/levels accrue
correctly; heatmap + demos at parity with Shift + Lift.

---

## Phase 3 — The System Awakens (quests, streaks, stats, voice) → `v0.3.0`

**Goal:** the app becomes a character, not a tracker.

**Create:**

| Area | Files |
|---|---|
| Engine | `src/engine/quests.ts` (generation + auto-claim), streak computation in `reduce.ts`, stat pools (STR/VIT/AGI/REC) |
| UI | `QuestRow` + dashboard quest panel; shift-day Mandatory Quest flow (`shift_confirmed`); Sanctuary panel + `rest_honored` emission |
| Profile | `src/routes/profile/{Profile,StatPanel,Records}.tsx` — stats + per-exercise progression charts |
| Voice | full `strings.ts` pass: greetings (time/context-aware), absence comments, all panels System-voiced |

**Test scenarios:**
- Quest generator: correct templates per roster day; no duplicates; auto-claim fires from
  events; silent midnight expiry (no penalty events exist — assert none possible).
- Streak: 3/3 gates ⇒ increment; miss ⇒ ×1.0 reset, XP/levels untouched (AC-4.3).
- Stats: tagged events fill the right pools; tier multiplier display; determinism via replay.
- Rest day: logging a workout on Sunday forfeits Sanctuary bonus (and nothing else).

**Exit criteria:** every day type has a living flow; quests complete themselves from real
behavior; profile shows believable stats from real history.

---

## Phase 4 — Ascension (auth + sync + import) → `v0.4.0`

**Goal:** accounts, cross-device, history carried over. The riskiest phase — keep it boring.

**Create:**

| Area | Files |
|---|---|
| Backend | `supabase/migrations/0001_events_profiles.sql` (+ RLS policies); `.env.example` |
| Auth | `src/store/supabase.ts`, `src/routes/settings/Auth.tsx` (Google OAuth + magic link); local→uid event rewrite on first link |
| Sync | `src/store/sync.ts` (push/pull/cursor/backoff), `SyncDot`, triggers (focus, post-tally, reconnect, interval) |
| Import | `src/routes/settings/Import.tsx` — paste/upload Shift + Lift `sl2.log.*` JSON ⇒ `history_imported` event ⇒ retroactive XP + "Imported Soul" relic |

**Test scenarios:**
- Two-device integration: A logs offline, B logs online, both sync ⇒ identical state hash
  (AC-7.2); same-set concurrent amend ⇒ LWW, both events in history (AC-7.4).
- Push idempotency (duplicate `id` insert is a no-op); cursor resume after failure mid-pull.
- RLS: user B cannot read user A's events (integration test with two test users).
- Sign-out wipes Dexie (AC-1.3); signed-out app remains fully functional.
- Import: real Shift + Lift export reproduces dated history; XP from import matches engine
  rules; idempotent (re-import doesn't double).

**Exit criteria:** phone + desktop converge after offline sessions on both; Shift + Lift
history imported; a stranger could sign up (even though none will yet).

---

## Phase 5 — Endgame (bosses, relics, gallery, hardening, deploy) → `v0.5.0` = v1

**Goal:** the payoff layer + production polish.

**Create:**

| Area | Files |
|---|---|
| Engine | `src/engine/bosses.ts` (milestone detection, encounter lifecycle, name templates); relics + titles in `reduce.ts` |
| UI | boss announcement (in tally) + boss banner in Gate; `RelicGrid`, `TierGallery`, title equip; tier arc texts in tier-up ceremony |
| PWA | icon pipeline (port `make-icons.mjs`), precache + `CacheFirst` for character assets, update prompt (`[THE SYSTEM HAS EVOLVED]`), Lighthouse pass |
| Deploy | Netlify/CF Pages config; deploy docs (adapted Route A from Shift + Lift) |

**Test scenarios:**
- Boss triggers exactly when milestone is one clean session away; defeat detection at bottom
  of rep range; failure changes nothing; re-announcement works; no duplicate relics.
- Gallery virtualization with 100 images; classified slots beyond current level.
- Lighthouse: installable, PWA checks green; bundle budget (AC-8.2); offline cold start.

**Exit criteria:** v1 PRD goals G1–G8 all pass; deployed at a real URL; installed on phone
and desktop; Shift + Lift formally retired.

---

## Backlog parking lot (do not build early)

Program editor · rest timer notifications · post-100 trees (manifest-ready) · bodyweight
trends → VIT · JSON export · TWA package · snapshot optimization for replay.

## Context handoff protocol

`00-HANDOFF.md` is the living memory of this project. Every phase appends a section using
the template inside it. Any AI or human picking up the project reads, in order:
**HANDOFF → PRD → GDD → TDD → Design System → this plan**, then the code.
