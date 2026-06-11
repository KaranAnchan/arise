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
