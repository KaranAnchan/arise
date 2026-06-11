# Arise — Product Requirements Document

**Version:** 1.0
**Owner:** Karan
**Date:** 2026-06-11
**Status:** Approved for build
**Supersedes:** Shift + Lift v2.0 PRD (`../shift-lift/docs/01-PRD.md`)

---

## 1. Problem statement

Workout tracking apps store numbers but build nothing. The user does all the imaginative work
of feeling progress; the app is a filing cabinet. Gamified fitness apps have the opposite
failure: they reward junk volume (XP per rep) and motion instead of progress, so the game
actively corrupts the training.

Arise solves both. It is a fitness RPG where a character visibly evolves through 100 levels
(10 tiers, E-Rank nobody → Absolute Shadow Deity), and **the only XP sources are honest
training outcomes** — completed programmed sessions, progressive overload achieved, recovery
honored. The training program is correct first; the game is a faithful render of it.

The primary user (Karan) works 3 physically demanding picking shifts per week and trains a
3-day PPL split engineered around that job fatigue (no spinal stacking, chest-supported
pulling, protected rest). That program — proven in Shift + Lift — is the launch content,
re-framed as the System's mandate.

## 2. Target audience

- **v1:** Karan — Android phone primary (in the gym, often offline), Windows desktop secondary.
- **Designed for:** any fitness enthusiast who loves RPGs. Accounts are real multi-tenant
  accounts from day one; nothing in the data model assumes a single user.

## 3. Goals / non-goals

### Goals

| # | Goal | Success criterion |
|---|---|---|
| G1 | Character progression | 100 levels / 10 tiers; level + tier visible on dashboard; character image (or aura placeholder) changes per level; ceremony on level-up |
| G2 | Honest XP engine | XP awarded only from logged training facts; deterministic; unit-tested; same event log replays to identical state on any device |
| G3 | Workout tracking ("Gates") | Per-set logging (weight × reps) faster than a paper notebook; pre-filled from last session; works fully offline |
| G4 | Exercise guidance | Scheme, rest, mind-muscle cue, form notes per exercise (ported from Shift + Lift); muscle heatmap per session and per exercise |
| G5 | Accounts + sync | Email/OAuth login; data syncs across devices; offline sessions sync on reconnect with no XP divergence |
| G6 | Quests | Daily quests auto-generated from the program; shift days are first-class "Mandatory Quests"; rest days grant recovery credit |
| G7 | Installable PWA | Installable on Android/iOS/desktop; full offline after first load |
| G8 | Extensible asset system | Adding levels beyond 100 or new transformation trees = edit manifest + drop image files; zero code changes |

### Non-goals (v1)

- Monetization of any kind (explicit decision — personal app first; revisit only if it ever goes public)
- Social features, leaderboards, sharing
- Program editor UI (program is data-driven and editable in code; an editor is post-v1 backlog)
- Nutrition tracking
- Native app store distribution (PWABuilder TWA route stays documented as an option)
- Real-time multiplayer anything

## 4. Functional requirements

Each FR has acceptance criteria (AC). A phase is done when its FRs' ACs pass.

### FR-1 — Authentication
User can create an account and sign in (email magic link and/or Google OAuth via Supabase).
- AC-1.1: Signing in on a second device shows the same character, level, XP, and history.
- AC-1.2: The app is usable offline after first authenticated load; auth state survives restarts.
- AC-1.3: Signing out leaves no other user's data readable on the device.

### FR-2 — Dashboard ("Status Window")
Opens to today's context: character card, level/XP bar, today's Gate or quest, streak.
- AC-2.1: Character card shows current level image, or the procedural aura placeholder when the image file is absent.
- AC-2.2: XP bar shows current level progress numerically and visually.
- AC-2.3: Today's scheduled activity (gym/work/rest) is auto-selected from the weekly roster.
- AC-2.4: Next tier is teased as a locked slot with its aura color, without revealing the image.

### FR-3 — Gate (workout session)
A gym day renders the session as a Gate: header (rank-themed name + rationale), heatmap, exercise list.
- AC-3.1: Each exercise expands to per-set rows pre-filled with last session's weight/reps.
- AC-3.2: Logging a set takes ≤ 3 taps in the common case (confirm pre-fill).
- AC-3.3: Each logged set is graded vs last session (beat / held / regressed) and shows it inline.
- AC-3.4: Exercise guidance (cue, form, scheme, rest) is accessible without leaving the flow.
- AC-3.5: Heatmap focuses on the expanded exercise; collapses back to the session aggregate.
- AC-3.6: A Gate can be completed entirely in airplane mode.

### FR-4 — XP & leveling
The engine computes XP from logged events per the GDD formulas.
- AC-4.1: A session-end tally screen itemizes every XP source before the bar fills.
- AC-4.2: Level-up triggers the ceremony (System text, image transition, stat deltas). Tier-up triggers the extended ceremony with the tier arc text.
- AC-4.3: Levels never decrease. Streak bonuses reset; accrued XP does not.
- AC-4.4: Replaying the same event log always yields the same level/XP/stats (property-tested).

### FR-5 — Quests
- AC-5.1: 2–3 daily quests generate from the roster and recent history; completing one awards its XP immediately.
- AC-5.2: Shift days present a Mandatory Quest worth VIT-weighted XP, completable with one tap.
- AC-5.3: Rest days present the Sanctuary panel; honoring it (no logged training) grants the recovery bonus at day end.

### FR-6 — Stats ("Hunter Profile")
Derived stats (STR / VIT / AGI / REC), title, relics, tier gallery, history charts.
- AC-6.1: Stats are computed from the event log only; no manual editing.
- AC-6.2: Per-exercise weight progression chart over time.
- AC-6.3: Tier gallery shows unlocked levels' images; locked tiers show classified slots.

### FR-7 — Offline & sync
- AC-7.1: All writes go to the local event log first; the app never blocks on network.
- AC-7.2: Events sync to Supabase in the background; two devices converge to identical derived state after both sync.
- AC-7.3: Mid-session connection loss has zero user-visible effect.
- AC-7.4: Concurrent edits to the same set resolve last-write-wins; both events remain in history.

### FR-8 — PWA
- AC-8.1: Lighthouse installable; standalone display; app shell precached.
- AC-8.2: Interactive < 2 s on a mid-range phone; initial JS bundle < 350 KB gzipped (fonts/images excluded).

### FR-9 — Asset extensibility
- AC-9.1: Character images resolve via `tiers.json` manifest + level-number convention.
- AC-9.2: A manifest entry for levels 101–110 with a new image folder renders without code changes.
- AC-9.3: Missing image files render the aura placeholder, never a broken image.

### FR-10 — Shift + Lift data import
- AC-10.1: One-time import of Shift + Lift localStorage logs (`sl2.log.*`) into the event log, preserving dates, so training history (and earned XP) carries over.

## 5. Quality requirements

- Mobile-first 360–430 px; responsive up to desktop (dashboard becomes two-column ≥ 900 px).
- `prefers-reduced-motion` respected: ceremonies become crossfades, aura particles become static glows.
- Touch targets ≥ 44 px; WCAG AA text contrast; heatmap information duplicated in text.
- XP engine is a pure, framework-free TypeScript module with ≥ 90% test coverage.
- All System-voice copy lives in one strings module (theme is swappable, and translatable later).
- Sync consistency: after both devices sync, derived state hashes match (verified in integration tests).

## 6. Release plan

See `05-BUILD-PLAN.md` for the full phase breakdown with files and tests. Summary:

| Phase | Ships | User-visible result |
|---|---|---|
| 1 | Foundation | Dashboard with character, level, XP bar (local, seeded) |
| 2 | The Gate | Full workout tracking with XP — **replaces Shift + Lift as daily driver** |
| 3 | The System Awakens | Quests, streaks, stats, System voice everywhere |
| 4 | Ascension | Login + multi-device sync + Shift + Lift import |
| 5 | Endgame | Bosses, relics, tier gallery, PWA hardening, public deploy |

## 7. Backlog (post-v1)

- Program editor UI / multiple programs
- Rest timer with notifications
- Post-100 transformation trees (manifest already supports)
- Body weight / measurement tracking feeding VIT
- Export (JSON) of the full event log
- PWABuilder TWA package
