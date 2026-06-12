# Arise — Context Handoff Log

**Purpose:** the living memory of this project. Each phase appends an entry using the
template below **in the same commit/PR that completes the phase**. Anyone (human or AI)
picking up the project starts here, then reads `01-PRD.md` → `02-GDD.md` →
`03-TECHNICAL-DESIGN.md` → `04-DESIGN-SYSTEM.md` → `05-BUILD-PLAN.md`.

---

## Template (copy for each new entry)

```markdown
## Phase N — <name> · completed YYYY-MM-DD · tag vX.Y.Z

### What shipped
- <bullet summary of delivered functionality>

### Decisions made (and why)
- <decision> — <reasoning>. <If it contradicts a doc, note the doc update made.>

### Architecture / schema changes
- <new tables, event types, modules, or "none">

### Known issues & deliberate deferrals
- <what was skipped or is buggy, and why that was acceptable>

### Instructions for the next phase
- <gotchas, setup steps, invariants to preserve, where the bodies are buried>
```

---

## Phase 5 — Endgame · completed 2026-06-12 · tag v0.5.0 (= v1 code-complete)

### What shipped
- **Bosses** (`src/engine/bosses.ts`, derived — no events): milestones every +10 kg
  (compound) / +5 kg (accessory). Defeat = the milestone weight held for every
  programmed set at the bottom of the rep range; XP 300/150 (+100 at "named" 50 kg
  multiples), fed to STR/AGI, **never streak-multiplied** (GDD §2.3). Announcement
  when the next milestone is within one clean +2.5 kg session — rendered at the
  prior session's tally (GDD §6) and as a pulsing banner inside the Gate.
- **Clean-baseline rule (bug caught by tests):** defeats and announcements key off
  the best weight ever HELD (full sets in range), not the touched max — otherwise a
  failed attempt that touched 80 kg would bury the boss forever. A failed attempt
  changes nothing; the kill lands whenever the weight is finally held. Tested.
- **Relics** (derived): named-milestone PRs (hand-named: IRON BOOTS, CRIMSON
  STANDARD, TITANSPINE; generated sigils otherwise), GATEBREAKER SIGIL (any
  10-honored-week run, ever), IMPORTED SOUL (any history import). `RelicGrid` in
  the profile.
- **Titles:** tier names reached; equip in the profile (stored in Dexie `meta` —
  display preference, not game state); shown under the character name when it
  differs from the current tier.
- **TierGallery:** all 10 tiers, reached ones show their aura gradient + name,
  the rest are `CLASSIFIED — LV n`.
- **Tally:** gate lines → streak multiplier → boss lines (face value) → total →
  boss announcements; `GateTally` gained `bossTotal`; the tally-equals-reducer-delta
  invariant holds with bosses in play (tested).
- **PWA/hardening:** CacheFirst for character art was already configured (Phase 1).
  Lighthouse on the production build: performance 93 / accessibility 95 /
  best-practices 100, 256 KiB total. Offline cold start verified by killing the
  server under a controlled SW — the app fully renders from precache.
- **Deploy:** `netlify.toml` (SPA redirect + build), `public/_redirects` (Drop
  fallback), `docs/06-DEPLOY.md` (adapted Shift + Lift Route A; git-linked Netlify
  recommended; post-deploy checklist).
- 25 new unit tests (114 total); system smoke now also covers relics, gallery,
  titles at a deep seed.

### Decisions made (and why)
- **GDD §7 says relics are "stored as events"; the TDD says relics/bosses/titles are
  derived, never stored. The TDD wins** (append-only log + pure reducer is the
  project's architecture law; no new event types were added). GDD wording should be
  read as "persistent because the facts that earn them are".
- Boss XP outside date buckets — the streak multiplier explicitly covers gate-derived
  XP only; a PR is worth its face value.
- First-ever session establishes a baseline and can defeat nothing (no XP farming by
  walking in heavy).
- **Import order matters and that's by design:** importing history heavier than later
  live sessions recontextualizes those sessions as sandbagged and can LOWER totalXp
  (the honesty law applied retroactively). The product flow is import-first; the
  smoke mirrors it and documents the reasoning inline.
- Boss short-names + relic names live in `src/data/endgame.ts` (content layer);
  the engine only derives which bosses/relics exist.

### Architecture / schema changes
- None to events or storage schemas. GameState grew `bossesDefeated`,
  `pendingBosses`, `relics`, `titles`, `maxStreakWeeks`; `Facts` exposes
  `importSources`; `makeStreak` gained `maxRun()`; `XP.boss` constants.

### Known issues & deliberate deferrals
- **Exit criteria pending Karan (same as Phase 4's backend):** deploy at a real URL
  (10 min via docs/06-DEPLOY.md), install on phone+desktop, live two-device sync,
  then formally retire Shift + Lift. Everything code-side is done and verified.
- Tier-up ceremony already showed tier arcs (Phase 2) — re-verified, no change.
- Gallery holds 10 tier slots, not 100 level images (none exist yet); virtualize
  only if per-level art ever lands (manifest supports it — PRD G8).
- Title sync across devices (profiles.settings) deferred post-v1; titles re-derive
  everywhere anyway, only the equipped CHOICE is per-device.
- Boss names use a curated short-name map; new exercises fall back to the id.

### Instructions for whoever touches this next (post-v1)
- The backlog parking lot (build plan §end) is the only sanctioned post-v1 list.
- Balance pass: XP.boss constants are untouched theory — revisit after real weeks,
  same as the Phase 1 constants note. All knobs live in `XP`.
- If GDD §7's three example relics ever need exact-name parity, extend
  `NAMED_RELICS` in `src/data/endgame.ts` — never the engine.
- Before any new feature: read the rejected-mechanics table (GDD §9). It exists so
  v1.1 doesn't un-design v1.

---

## Phase 4 — Ascension · completed 2026-06-12 · tag v0.4.0

### What shipped
- **Backend:** `supabase/migrations/0001_events_profiles.sql` — events (append-only,
  `server_seq` identity, RLS select/insert own rows only, NO update/delete policies) +
  profiles. `.env.example`; `.gitignore` already protected `.env`.
- **Client:** `src/store/supabase.ts` exports the client **or null** — with no env the
  app is identical to Phase 3 (verified by the smoke suite running env-less).
- **Auth** (`src/store/auth.ts`): Google OAuth + email magic link; `useSession`;
  on sign-in/restore, `adoptLocalEvents` rewrites `userId='local'` rows (synced=0 only)
  to the uid — idempotent, runs every restore. `appendEvent` now stamps the active uid.
  `signOutAndWipe` = explicit action only (AC-1.3); a token dying in the background
  merely stops sync, never wipes.
- **Sync:** `syncCore.ts` is the whole algorithm with injected (db, transport, uid) —
  push synced=0 (server idempotent on id) → mark ONLY the pushed ids → pull batches
  `server_seq > cursor`, advancing the cursor per batch. `sync.ts` wires the Supabase
  transport, a status store (`useSyncStatus`: off/idle/syncing/error), 5s→5min
  exponential backoff, and triggers: sign-in, focus, visibilitychange, online, 15-min
  interval, post-tally (`TallyScreen` mount), post-import.
- **Import:** `importShiftLift.ts` parses a raw `JSON.stringify(localStorage)` dump,
  string-or-array values, or a bare exerciseId map → `history_imported`. `/settings`
  has paste + file upload. Verified in-browser: +106 XP retroactive on seeded state.
- **UI:** `/settings` (Auth + Import panels), `SyncDot` in the dashboard nav.
- **Tests (12 new):** two-device convergence on real Dexie via fake-indexeddb —
  identical full GameState after offline sessions on both (AC-7.2); concurrent same-set
  amend → LWW, both events kept (AC-7.4); push idempotency; cursor/synced marking;
  Postgres `+00:00` → `Z` normalization; mid-push append race. Import: 3 shapes,
  garbage rejection, idempotent re-paste, overlapping exports don't double-count.

### Decisions made (and why)
- **Transport is an interface** (`push` idempotent-on-id, `pull` cursor-ascending);
  the entire risky path is tested against an in-memory server without mocks of Dexie.
- **Pulled `occurred_at` is normalized** through `new Date().toISOString()` — sortEvents
  compares strings, so one `+00:00`-shaped timestamp would corrupt LWW ordering.
- **Post-push marking targets the pushed ids only** — events appended during the network
  await must stay synced=0 (regression-tested).
- **Import `source` = content hash** (`shift-lift:fnv1a`): identical re-imports dedupe
  via the reducer's importedSources; different exports merge safely because expansion
  upserts by (exercise, date, setIndex) — overlap cannot double XP (tested).
- Sign-out confirm is a two-tap in the UI, wipe stays out of the auth listener.

### Architecture / schema changes
- No event-type or Dexie schema changes. New: Supabase tables (SQL above), modules
  `supabase.ts`/`auth.ts`/`syncCore.ts`/`sync.ts`/`importShiftLift.ts`, `/settings`.
  `AriseDB` class export (named instances for tests); `appendEvent` uid stamping.

### Known issues & deliberate deferrals
- **Live-backend verification is pending provisioning** — convergence/LWW/idempotency
  are proven at the integration-test level; phone+desktop and stranger-signup need a
  real Supabase project (checklist below). RLS cross-user denial likewise.
- "Imported Soul" relic visual lands with the Phase 5 relic system; the import itself
  works now.
- `profiles` table is created but unused until Phase 5 (username, equipped title).
- Exactly-PULL_LIMIT pulls do one extra empty round-trip — harmless.
- Sanctuary back-fill duplicate (two devices, same date, different ids) confirmed safe
  in the convergence tests — `restDates` is a date Set.

### Supabase setup (one-time, ~10 min — required before live sync)
1. supabase.com → New project → SQL Editor → run
   `supabase/migrations/0001_events_profiles.sql`.
2. Auth → URL Configuration → add the app origin(s) (localhost:5173 + the deployed URL).
3. Auth → Providers → enable Google (follow Supabase's Google Cloud OAuth guide);
   email/magic-link is on by default.
4. `cp .env.example .env`, paste Project URL + anon key, restart `npm run dev`.
5. `/settings` → link account on two devices → train offline on both → both show
   SYNCED and identical LV/XP. That's AC-7.2 live.

### Instructions for the next phase (Phase 5 — Endgame)
- Boss milestones read from timelines already exposed; encounter lifecycle is derived
  state (no new event types planned — check GDD §6 before inventing any).
- Relics: "Imported Soul" = any `history_imported` fact exists. Titles equip via the
  `profiles.settings` jsonb — first real use of that table; sync it read-through only.
- PWA pass: port `make-icons.mjs` is DONE (Phase 1); remaining: CacheFirst for
  `assets/characters/*`, update-prompt copy exists (`SYSTEM.update`), Lighthouse run.
- Bundle is 142 KB gz with supabase-js — room under the 350 KB budget; code-split the
  settings route only if Lighthouse complains.

---

## Phase 3 — The System Awakens · completed 2026-06-12 · tag v0.3.0

### What shipped
- **Engine:** Sanctuary forfeit rule (training on an honored rest date voids that date's
  +25/REC — and nothing else); `bodyweights` facts (LWW per date); GameState grew
  `completedQuests` / `shiftConfirmedToday` / `trainingDates` / `lastTrainingDate` /
  `bodyweights`.
- **`src/engine/quests.ts`:** deterministic daily quest generation (GDD §4.1) — pure
  function of (day type, sessionId, date, GameState, program). Stable ids
  (`date|template|subject`), 2–3/day, claim semantics `auto`/`manual`/`intrinsic`,
  `questConditionMet` + `questDone` predicates. 13 unit tests.
- **`src/store/watchers.ts`:** quest auto-claim (emits `quest_completed` when an 'auto'
  condition is met by real events) + Sanctuary back-fill (`rest_honored` for every past
  roster rest day with no training, once per boot, idempotent). Pure parts unit-tested;
  `useWatchers` mounted in a new root `Shell` in main.tsx.
- **Dashboard:** Daily Quests panel (QuestRow ◇/◆, manual CLAIM button, inline bodyweight
  stepper+LOG when the quest is offered); Mandatory Quest panel now confirms with one tap
  (`shift_confirmed`, locked after via `shiftConfirmedToday`) and shows System-voiced
  quest intel ported from Shift + Lift's work-day guidance; Sanctuary panel explains the
  judged-at-dawn forfeit rule.
- **`/profile`:** StatPanel (stat cells + raw XP pools), bodyweight sparkline, System
  Records — per-exercise session count, best set, top-weight sparkline built from
  `buildTimelines` over the live log (same math as the reducer, can't disagree).
- **Voice pass:** absence comment (≥4 days since last training), streak-severed line
  (state diff vs localStorage), all new panels speak through `strings.ts`.
- `npm run smoke:system` (+ `smoke:gate` alias): drives quests render → bodyweight log →
  auto-claim (+10 verified from real state) → shift confirm (+30) → profile records.
  `window.arise.state()` added to the dev tools for state assertions from smoke scripts.

### Decisions made (and why)
- **Intrinsic quests never emit `quest_completed`.** GDD's XP column for "Endurance
  Trial"/"Honor the Sanctuary" *is* the shift/rest bonus; a quest event would double-pay.
  They mirror their underlying event in the UI instead.
- **Quest generation must be day-stable** — the system smoke caught the bug: fulfilling
  log_bodyweight removed it from the generated list before the watcher could claim it.
  `bodyweightDue` ignores today's entry; `review_form` picks via `prevByExercise`
  (strictly before today), not `lastByExercise`. Regression-tested.
- honor_sanctuary's live condition is always false ("JUDGED AT DAWN") — `rest_honored`
  lands on a later boot; its XP can't be missed, so the quest visually expiring unclaimed
  costs nothing.
- Streak-severed commentary uses localStorage (`arise.streakWeeks`), not an event —
  it's per-device display nicety; deriving it from events would pollute the log.
- review_form is manual-claim (tap pays +10): the System can't verify reading; GDD only
  forbids manual claims for *verifiable* things.

### Architecture / schema changes
- No new event types, no schema changes. New modules: `engine/quests.ts`,
  `store/watchers.ts`, `routes/profile/*`, `ui/Sparkline.tsx`. Root `Shell` component
  hosts watchers.

### Known issues & deliberate deferrals
- Quest auto-claim runs where `useQuests` is mounted (QuestPanel/dashboard): a condition
  met mid-gate claims when the user returns to the dashboard. Tally deliberately excludes
  quest XP (it itemizes the gate only), so nothing is lost or double-shown.
- Sanctuary back-fill will run on every device in Phase 4; two devices may emit
  `rest_honored` for the same date with different event ids — safe, `restDates` is a
  date Set, but expect duplicate events in the synced log.
- Streak-severed line shows once per device (localStorage), and absence/severed lines
  replace the greeting rather than stacking — keep it terse.
- Profile charts are top-weight sparklines, not full axes/tooltips charts — revisit in
  Phase 5 polish if the data earns it.

### Instructions for the next phase (Phase 4 — Ascension)
- `appendEvent`/`appendEvents` remained the only write paths (watchers comply) — the
  sync queue can trust `synced: 0` rows.
- The local→uid rewrite on first sign-in must rewrite `userId` on EVERY event including
  watcher-emitted ones (`quest_completed`, `rest_honored`).
- Push idempotency: server insert keyed on event `id`; the Sanctuary duplicate-date case
  above is the test to write for cross-device convergence.
- Import (`history_imported`) already replays through the XP pipeline and is idempotent
  per `source` — the Shift + Lift importer only needs to map the export to
  `ImportedLogEntry[]`.
- `window.arise.state()` is the fastest way to assert sync convergence in integration
  tests (state hash equality across devices).

---

## Phase 2 — The Gate · completed 2026-06-11 · tag v0.2.0

### What shipped
- **Full workout flow:** `/gate/$sessionId` route — gate header (rank badge = tier id),
  System-voiced rationale, ported body heatmap with per-exercise focus, exercise cards
  (expand → FK demo animation + cues + SetLogger), sticky gate progress + CLEAR GATE.
- **SetLogger:** rows per scheme set, prefilled from the previous session (weight/reps),
  ±2.5 kg / ±1 rep steppers, one-tap LOG (AC-3.2), tap a logged row to amend
  (`set_amended`), live grade chips (▲ beat / ▶ held / ▼ down / ◆ new) vs the matching
  set of the previous session, LAST line baseline.
- **Engine additions:** `grade.ts` (tonnage grading — same rule as set XP),
  `tally.ts` (itemized gate breakdown), reducer refactored into exported building blocks
  (`sortEvents/collectFacts/buildTimelines/makeStreak/exerciseSessionXp`) consumed by both
  reduce and tally; GameState gained `prevByExercise` / `todayByExercise` / `clearedToday`.
- **TallyScreen:** staggered itemized lines, streak multiplier line, total, live XP bar.
- **Ceremony:** level-up overlay (typewriter System text, character reveal, LV old→new,
  stat deltas); tier-up variant re-themes the whole UI mid-ceremony + shows tier arc.
- Ports from Shift + Lift at parity: `src/body/` (heatmap incl. focus transitions) and
  `src/anim/` (18 FK demos, IntersectionObserver + visibility gating, reduced-motion).
- `npm run smoke` (dashboard) + `scripts/smoke-gate.mjs`: drives a complete session through
  the real UI — 6 exercises, 18 sets, clear, tally (+280 verified correct), ceremony, dashboard.

### Decisions made (and why)
- **Tally can never disagree with the bar**: `tallyGate` is built from the same exported
  reducer primitives, and a unit test asserts tally.total === reducer XP delta (the
  invariant test in `tally.test.ts`).
- **Set XP accrues live as sets are logged**; the tally summarizes the whole session at
  clear time. Ceremonies are only evaluated at the tally (level before = reduce without
  this gate's events), so a mid-session level crossing celebrates at gate clear, not
  mid-set. Sessions never finished show no ceremony — acceptable, recorded here.
- **Grading = tonnage comparison, same-index set** — identical to the XP rule, so chips
  never contradict the awarded XP.
- **Prefill priority:** previous session same set → last logged set today → previous
  session set 1 → 20 kg.
- Ported skeleton.ts needed `| undefined` on optional props (`exactOptionalPropertyTypes`
  is on in arise, wasn't in Shift + Lift).

### Architecture / schema changes
- No schema changes; no new event types. GameState extended (additive).

### Known issues & deliberate deferrals
- Tally count-up is a CSS stagger, not numeric counting — revisit in Phase 5 polish.
- Gate is reachable by URL on non-gym days (training off-schedule is the user's call);
  the dashboard only offers the CTA on gym days.
- Off-plan training on rest days does not yet forfeit anything (Sanctuary events are
  Phase 3; the GDD rule lands with the quest system).
- `SYSTEM.dashboard.gateSealed` string is now unused (kept for reference).

### Instructions for the next phase (Phase 3 — The System Awakens)
- Quest generation (`src/engine/quests.ts`): pure function of (roster day type, date,
  GameState/history); auto-claim by inspecting facts — emit `quest_completed` from a small
  store-side watcher, NOT from inside the engine (engine stays pure).
- Shift confirm: the dashboard Mandatory Quest panel emits `shift_confirmed` (one tap,
  guard on `facts.shiftDates` via a `shiftConfirmedToday` GameState field you'll add).
- Sanctuary: emit `rest_honored` for YESTERDAY (or any past rest day) on boot if no
  training was logged that day — decide idempotency via the facts set, it's already deduped.
- Profile route: stats panel exists on the dashboard; move/expand into `/profile` with
  per-exercise charts from `lastByExercise` timelines (expose full timelines if needed —
  `buildTimelines` is already exported).
- Streak reset System commentary: copy lives in `strings.ts`, trigger from state diff.

---

## Phase 1 — Foundation · completed 2026-06-11 · tag v0.1.0

### What shipped
- Vite 8 + React 19 + TS strict scaffold with vite-plugin-pwa (manifest, SW, icon pipeline
  via sharp from `public/icons/icon.svg`).
- **Pure XP/leveling engine** (`src/engine/`): every GDD §2 formula, event-sourced reducer,
  40 unit tests + fast-check permutation property test; 99% line coverage.
- Tier manifest (`public/assets/characters/tiers.json`, 10 tiers with aura palettes + arc
  texts) + `src/character/` (resolution, `applyTierTheme`, AuraPlaceholder, CharacterImage
  with 404→placeholder fallback). WCAG contrast unit-tested for all tiers.
- Dexie store (`src/store/`): events table, uuidv7, `appendEvent` as the single write path,
  `useGameState` (liveQuery → reducer).
- Program ported from Shift + Lift verbatim + game metadata (cls/statTags/gate names);
  System voice strings module.
- Dashboard: status window (character, level, XP bar, tier tease), roster strip, today
  panel, stats row, streak line. Tier-bound aura recoloring works end to end.
- Dev tools: `window.arise.seed(level)/reset()` (simulates honest training weeks through the
  real rules); `npm run smoke` (playwright-core + system Chrome) boots, seeds, screenshots,
  and fails on unexpected console errors/404s.

### Decisions made (and why)
- **`xpToNext(99)` is 7,284, not the 7,259 the GDD table estimated** — engine is canonical,
  doc corrected.
- Engine sorts events by `(occurredAt, id)` and dedupes by id *inside* `reduce()` — that's
  what makes the permutation property hold; don't pre-sort outside.
- Weight-up bonus compares against the **all-time max**, not the previous session, so
  drop-and-raise oscillation can't farm +120s.
- Progression bonus additionally requires no weight drop below the all-time max
  (anti-sandbagging).
- Seed simulation date-shifts to end on the **previous** week so no seeded events land in
  the future of "today".
- Missing-image 404s for `/assets/characters/*` are **expected by design** (placeholder is
  the fallback); the smoke script whitelists them.
- playwright-core with `channel: 'chrome'` (system Chrome) for browser verification — no
  300 MB browser download in the repo.

### Architecture / schema changes
- Dexie v1 schema: `events (id, occurredAt, synced)`, `meta (key)`.
- Event envelope + 8 event types implemented exactly as TDD §2.1.

### Known issues & deliberate deferrals
- "ENTER GATE" CTA is sealed (Phase 2 wires it). Shift confirm + Sanctuary honoring are
  display-only (Phase 3 emits their events).
- Full Lighthouse install audit deferred to Phase 5; SW/manifest/icons are generated and the
  build precaches 35 entries (~820 KB incl. fonts). Bundle: 127 KB gz JS — under budget.
- Ideal-case seed shows ~2,500–3,300 XP/week early (every exercise progressing every other
  session); real-life pace will be slower. Revisit constants after Phase 2's live week.
- `quest_completed` engine support exists; the generator ships in Phase 3.

### Instructions for the next phase (Phase 2 — The Gate)
- Set grading (beat/held/regressed) belongs in the engine as a pure helper on
  `lastByExercise`; the tally screen must itemize from engine output, not recompute in UI.
- `appendEvent` is the only write path — keep it that way for the sync queue's sake.
- Port `src/body/` + `src/anim/` from `../shift-lift/src/`; they're framework-free DOM/SVG
  modules — wrap, don't rewrite.
- Ceremony triggers: compare `level` before/after the reducer run that includes the new
  events (the tally screen already has both states in hand).
- Use `npm run smoke` after wiring the Gate; extend it to log a set and clear a gate.

---

## Phase 0 — Design & Documentation · completed 2026-06-11 · (docs only, no tag)

### What shipped
- Complete documentation set: PRD, GDD, Technical Design, Design System & wireframes,
  5-phase build plan, this handoff log. Repo initialized (`arise`, MIT).

### Decisions made (and why)
- **Name: Arise** — the Shadow Monarch's summon command; double meaning for training; no
  trademark collision (common word). Brand replaces "Shift + Lift" everywhere.
- **Honest XP only** — XP sources are completed programmed work, progressive overload, and
  recovery compliance. Set XP is tonnage-ratio-capped to make junk volume worthless. This is
  the project's design law; see GDD §2.3 and the rejected-mechanics table (GDD §9).
- **Levels/stats are derived, never stored** — append-only event log + pure reducer.
  Eliminates sync conflicts for game state, enables property-testing determinism (replay ⇒
  identical state), makes "System Records" the literal log. CRDTs rejected as overkill;
  same-set edits resolve LWW.
- **Stack: React 19 + Vite PWA + Dexie + Supabase** — keeps Shift + Lift's proven
  static-PWA deploy loop; React because the app is now genuinely stateful; Supabase over
  Firebase (relational logs, RLS, Postgres). Next.js/Expo/Tauri rejected — see TDD §1.
- **Level curve:** `xpToNext(n) = round(150 × 1.04^n)`, total ≈ 185k XP ≈ 20 months at
  3×/week ≈ ~2,200 XP/week. Front-loaded hook, earned endgame. All constants in one config
  object for rebalancing.
- **Tier-bound UI accent** — the app's accent color follows the current tier's aura (white →
  blue → violet → void), giving pervasive visual progression before any character art exists.
  The muscle-heatmap heat ramp is kept verbatim from Shift + Lift and reserved for body data.
- **Character art is decoupled** — `tiers.json` manifest + `lvl_{nnn}.webp` convention +
  procedural aura placeholder. Images drop in anytime; extensible past level 100 by manifest
  append (PRD AC-9.x). The app never describes or generates images.
- **Rejected mechanics recorded in GDD §9** (currency/energy economy, XP-per-rep, stat
  allocation, level decay, monetization) so future contributors don't re-add them.
- **License MIT, repo public-safe** — no Solo Leveling assets/names in the codebase; original
  tier/gate names; "inspired aesthetic" only.

### Architecture / schema changes
- Defined (not yet implemented): `AriseEvent` envelope + 8 event types (TDD §2.1), Supabase
  `events`/`profiles` tables with RLS (TDD §3.1), Dexie tables (TDD §3.2), engine module
  boundary (pure TS, no framework imports).

### Known issues & deliberate deferrals
- XP constants are theory — expect a balance pass after Phase 2's real-week trial; that's why
  they live in one config object.
- Quest templates are a starter set; generator design allows adding templates as data.
- Program remains code-as-content (`program.ts`); editor UI is explicitly post-v1.

### Instructions for the next phase (Phase 1 — Foundation)
- Source program content from `../shift-lift/src/data/program.ts` (port, then add `cls`,
  `statTags`, gate names). Shift + Lift repo/folder stays untouched as reference + fallback
  daily driver until Phase 2 exits.
- Build the engine before any UI; the property test (shuffled event permutations ⇒ identical
  state hash) is the keystone test — write it early.
- `tiers.json` is the single source of truth for tier data AND the generated aura CSS
  palette; don't hand-write per-tier CSS values twice.
- Include `src/dev/seed.ts` from the start — previewing all 10 tiers without grinding 20
  months is required for ceremony/palette work.
- Branch `phase-1-foundation` from `main`; merge + tag `v0.1.0` on exit criteria; append the
  Phase 1 entry here in that merge.
