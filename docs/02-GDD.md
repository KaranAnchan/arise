# Arise — Game Design Document

**Version:** 1.0 · **Date:** 2026-06-11

The single design law, stated once and enforced everywhere:

> **The game never compromises the training, and only the training powers the game.**
> No XP source rewards behavior the program doesn't want. No mechanic punishes real life.

---

## 1. The System (tone & framing)

The UI speaks as "The System" from Solo Leveling: terse, imperative, omniscient, in
monospaced brackets. Examples (full copy lives in `src/game/strings.ts`):

- `[QUEST AVAILABLE: GATE — CRIMSON FORGE]`
- `[CONDITIONS MET. LEVEL UP.]`
- `[THE SYSTEM ACKNOWLEDGES YOUR ABSENCE. IT DOES NOT FORGIVE WEIGHTS THAT GOT LIGHTER.]` (returning after a gap — comment, never confiscate)
- `[MANDATORY QUEST: ENDURANCE TRIAL — 8 HOURS, COLD ENVIRONMENT]` (work shift)
- `[SANCTUARY ACTIVE. RECOVERY IS A COMMAND, NOT A SUGGESTION.]` (rest day)

Real-world structures get canon names:

| Real thing | In-game |
|---|---|
| Gym session | **Gate** (dungeon). Push = "Crimson Forge", Pull = "Iron Abyss", Legs = "Titan's Foothold" |
| Work shift (picking) | **Mandatory Quest** — endurance trial, VIT XP |
| Rest day (Sunday) | **The Sanctuary** — recovery buff |
| PR / weight milestone attempt | **Boss encounter** |
| Weight log history | **System Records** |
| Stats screen | **Hunter Profile / Status Window** |

## 2. Leveling

### 2.1 XP sources (the only ones)

| Source | XP | Notes |
|---|---|---|
| Logged set | `10 × clamp(tonnageRatio, 0.5, 1.5)` | `tonnageRatio = setTonnage / matching set tonnage last session` (weight×reps). First-ever log of an exercise: flat 10. Capped so grinding extra junk reps can't farm XP |
| Exercise progression | **+50** | All sets hit the top of the rep range with the programmed weight (double-progression "conditions met") |
| Weight increase | **+120** | Logged weight for an exercise goes up (the +2.5 kg moment) — the single biggest regular award, because it is the actual win condition |
| Gate clear | **+100** | All exercises in the session completed |
| Mandatory Quest (shift) | **+30** | One tap to confirm; VIT-tagged |
| Sanctuary honored | **+25** | Rest day with no training logged; REC-tagged; awarded at day rollover |
| Daily quest | **+10 to +25** | Per quest definition (§4) |
| Boss defeated | **+150 to +400** | Scales with boss rank (§6) |

**Streak multiplier** applies to Gate-derived XP (sets, progression, clear) only:
`×(1 + 0.1 × consecutiveWeeks)`, capped at ×1.5. A "consecutive week" = all 3 scheduled
Gates cleared. Missing a week resets the multiplier to ×1.0 — **the bonus resets; banked XP
and levels never decrease.** Expected throughput: ~480–650 XP per Gate, **~2,000–2,400 XP
per consistent week.**

### 2.2 Level curve

```
xpToNext(level) = round(150 × 1.04^level)
```

| Level | XP to next | Real time at ~2,200 XP/week |
|---|---|---|
| 1 | 156 | first session levels you up 2–3× (hook) |
| 10 | 222 | ~3 levels/week |
| 25 | 400 | ~1–2 levels/week |
| 50 | 1,066 | ~2 sessions/level |
| 75 | 2,841 | ~1 level/week |
| 99 | 7,259 | ~3 weeks for the final level |

Cumulative 1→100 ≈ **185,000 XP ≈ 20 months** of consistent 3×/week training. Deliberate:
a 100-level journey that *means* something maps to a real physical transformation timeline.
Tiers 1–2 burn fast (retention hook), the back half is earned.

**Levels are derived, never stored.** `level = f(replayed event log)`. This makes sync
trivially consistent and the engine cheat-resistant to state tampering.

### 2.3 Anti-junk-volume guarantees

- Set XP is ratio-capped: 30 extra sets ≈ 30 × ~10 XP, less than one weight-increase bonus.
- Only *programmed* exercises generate progression/clear bonuses.
- Off-plan training on rest days forfeits the Sanctuary bonus (the System disapproves).

## 3. Tiers & character evolution

One image per level: `assets/characters/lvl_001.webp` … `lvl_100.webp` (zero-padded to 3 so
post-100 sorts correctly). Tier data is a manifest, `public/assets/characters/tiers.json`:

```jsonc
{
  "version": 1,
  "imagePattern": "assets/characters/lvl_{nnn}.webp",
  "tiers": [
    {
      "id": "e-rank",
      "name": "The E-Rank Awakening",
      "levels": [1, 10],
      "statMultiplier": 1.0,
      "aura": { "theme": "none-to-white", "colors": ["#00000000", "#EAF0F6"], "intensity": 0.15 },
      "arc": "Nobody believed the weakest hunter would return to the gate. He returned anyway."
    }
    // ... 9 more tiers; appending an 11th (levels 101+) requires no code changes
  ]
}
```

### 3.1 The 10 tiers

| Tier | Levels | Name | Stat × | Aura arc (drives the placeholder + UI accent) |
|---|---|---|---|---|
| 1 | 1–10 | The E-Rank Awakening | 1.0 | none → faint white at the feet |
| 2 | 11–20 | The D-Rank Vanguard | 1.2 | white → solid light blue |
| 3 | 21–30 | The C-Rank Assassin | 1.5 | light blue → cobalt |
| 4 | 31–40 | The B-Rank Elite | 1.9 | cobalt flames, runic lines |
| 5 | 41–50 | The A-Rank Vanguard | 2.4 | blue → deep violet eruption |
| 6 | 51–60 | The S-Rank Necromancer | 3.0 | violet + black shadow vortex |
| 7 | 61–70 | The Shadow Lord Awakening | 3.8 | shadow wings, crown of purple flame |
| 8 | 71–80 | The Monarch Candidate | 4.8 | purple-black void, reality warp |
| 9 | 81–90 | The Cosmic Sovereign | 6.0 | purple galaxy, cosmic stardust |
| 10 | 91–100 | The Absolute God of Shadows | 7.5 | infinite void + white cosmic crown |

(Level-by-level visual descriptions are the image-generation source material and live outside
this repo; the app only needs level number → image path → tier.)

### 3.2 Evolution moments

- **Level-up (standard):** dim screen → `[CONDITIONS MET. LEVEL UP.]` types out → image
  crossfades to new level (or aura placeholder intensifies) → stat deltas roll up → continue.
- **Tier-up (every 10th level):** extended ceremony — aura color shifts across the whole UI
  accent, tier arc text displays, new tier name stamps in. The UI accent color *is* the
  current tier's aura color (§ Design System), so tier-ups recolor the entire app.
- **Tease:** dashboard shows the next tier as `[CLASSIFIED — REACH LEVEL {n}]`, a darkened
  slot leaking the next aura color at its edges.
- **Missing image:** the procedural aura placeholder (silhouette + tier-themed particle aura
  scaled by within-tier progress) renders instead. Dropping a real `lvl_NNN.webp` into the
  assets folder upgrades that level on next load — no release needed if assets are remote.

## 4. Quests

### 4.1 Daily quests (2–3/day, generated, not hand-authored)

Generator picks from templates, filtered by today's roster type and recent history:

| Template | Condition type | XP |
|---|---|---|
| "Clear today's Gate: {name}" | gym day | 25 |
| "Beat last week's tonnage on {exercise}" | gym day, has history | 20 |
| "Complete the Endurance Trial" | shift day | 30 (the Mandatory Quest itself) |
| "Honor the Sanctuary" | rest day | 25 (the Sanctuary bonus itself) |
| "Log body weight" | ≤ 1×/week | 10 |
| "Review form notes for {exercise}" | new-ish exercise | 10 |

Rules: quests are auto-claimed when their condition is met by logged events (no manual
"claim" taps for things the System can verify). Unfinished quests expire silently at
midnight — no guilt screens, no loss.

### 4.2 Mandatory Quests (shifts)

Tue/Thu/Fri from the roster. One-tap confirm ("Trial endured"), +30 VIT-tagged XP, and the
System surfaces the recovery rules from Shift + Lift's work-day guidance (crate form, food,
hydration) as "quest intel."

## 5. Stats — the Hunter Profile

Four stats, **derived only** (no point allocation — your training determines your build):

| Stat | Fed by (event tags) | Display formula |
|---|---|---|
| **STR** | weight-increase events, progression bonuses on compound lifts | `floor(10 + 2 × sqrt(strXP) × tierMultiplier)` |
| **VIT** | gates cleared, Mandatory Quests, weekly consistency | same shape, vitXP |
| **AGI** | accessory/isolation sets completed at full programmed reps | same shape, agiXP |
| **REC** | Sanctuary bonuses, rest-day compliance | same shape, recXP |

Each XP-awarding event carries stat tags (defined in the program data + engine), accumulating
into per-stat XP pools. `sqrt` keeps early gains fast and late gains slow; the tier multiplier
makes numbers inflate satisfyingly at tier-ups (same pools, bigger numbers — fiction, clearly
labeled as System amplification).

## 6. Bosses

Bosses are **auto-generated PR encounters**, never arbitrary content:

- Trigger: the double-progression trajectory puts a milestone weight (every +10 kg on
  compounds, +5 kg on accessories) within one clean session.
- Announcement: at the prior session's tally — `[A GATE BOSS HAS APPEARED: THE BENCH
  COLOSSUS — DEFEAT 80KG × 6]`.
- Resolution: hit the milestone weight at the bottom of the rep range with all sets → boss
  defeated (+150–400 XP by lift class, a relic if it's a "named" milestone like 100 kg).
- Failure: nothing is lost. `[THE COLOSSUS STANDS. IT WILL NOT STAND FOREVER.]` Boss
  re-announces when conditions are met again. **No retry limits, no debuffs** — a missed PR
  is already punishment.

Boss names are generated from lift + milestone (template pool per session type:
Colossus/Titan/Warden/Revenant…), so they need no authored content per boss.

## 7. Relics & titles (trophy case)

- **Relics:** permanent items awarded at named milestones — "Iron Boots" (first 100 kg leg
  press), "Gatebreaker Sigil" (first 10-week streak), "Imported Soul" (Shift + Lift history
  import). Stored as events; displayed in the Hunter Profile.
- **Titles:** one equippable honorific shown under the character name. Earned at tier-ups
  ("Vanguard of the Forge") and rare feats. Pure cosmetics.

## 8. Skill tree (cosmetic/informational only — v1.5+)

Unlock nodes spend nothing and modify no training variables. Nodes unlock: heatmap detail
layers, System lore entries, chart types, title slots, aura particle styles. Explicit design
guard: **training information (form cues, schemes) is never gated behind unlocks.**

## 9. Retention mechanics & what we deliberately rejected

Kept: streak multiplier (bonus-only), daily quests (auto-claimed), tier teases, boss
announcements creating "one more session" pull.

Rejected, with reasons recorded so future contributors don't re-add them:

| Rejected | Why |
|---|---|
| Gold/gems/energy economy | Fake scarcity over real recovery is either offensive (blocks training) or meaningless (doesn't). Relics/titles give collection without currency |
| XP per rep (uncapped) | Rewards junk volume; punishes the program's heavy low-rep work |
| Stat point allocation | Fake choice; training determines the build |
| Level/XP decay, streak punishment | Life happens; the System comments on absence but never confiscates. Levels are monotonic |
| Monetization hooks | Non-goal (PRD §3) |
