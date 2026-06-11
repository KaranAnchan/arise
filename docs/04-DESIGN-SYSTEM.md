# Arise — Design System & Wireframes

**Version:** 1.0 · **Date:** 2026-06-11

---

## 1. Design direction — "The System Window"

Shift + Lift's identity was a forge: heat on iron. Arise's identity is **a System window from
a dark fantasy webtoon**: a near-black void where the interface itself is a supernatural
artifact speaking to you. Two chromatic systems coexist with strict jobs:

1. **The heat ramp (kept from Shift + Lift)** — *information about your body*. Muscle
   activation only. Cold steel → ember → flame → white-hot. It never decorates.
2. **The aura ramp (new)** — *information about your power*. XP, levels, quests, ceremonies,
   accents. Its hue is **bound to your current tier's aura** (GDD §3): faint white at Tier 1
   → light blue → cobalt → violet → purple-black void → void + white-hot crown at Tier 10.
   **The app literally changes color as you ascend** — the cheapest, most pervasive visual
   progression we have, and it works before a single character image exists.

Principles: dark, dense, matte; glow is earned (active/hot/aura elements only); the System
speaks in mono; zero decoration that doesn't carry information.

## 2. Tokens

### 2.1 Static base (all tiers)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07090E` | app background (deeper than Shift + Lift — void, not workshop) |
| `--panel` | `#10141D` | cards / System windows |
| `--panel-2` | `#171D29` | nested surfaces |
| `--line` | `#232B3A` | hairline borders |
| `--text` | `#EDF1F7` | primary text |
| `--muted` | `#8E99A8` | secondary text |
| `--faint` | `#566173` | labels |
| `--ok` | `#58C98A` | done / beat-last-time |
| `--warn` | `#E0B14C` | held (no progress, no regress) |
| `--down` | `#C95858` | regressed set (informational, never punitive copy) |
| `--work` | `#3E9ED9` | shift days (kept) |
| `--heat-0…4` | `#252C38 #4A2C22 #B2401F #FF7A1A #FFD166` | muscle heatmap ramp (kept verbatim from Shift + Lift) |

### 2.2 Tier-bound aura tokens (set on `<html data-tier="n">` at boot and on tier-up)

| Token | Role | T1 | T3 | T5 | T8 | T10 |
|---|---|---|---|---|---|---|
| `--aura` | primary accent | `#C9D4E0` | `#2E7CD6` | `#7B3FE4` | `#9D4DFF` | `#B98CFF` |
| `--aura-hi` | highlights / bar fill tip | `#EAF0F6` | `#5EA8F0` | `#A06CF0` | `#C77DFF` | `#FFFFFF` |
| `--aura-deep` | pressed / depths | `#39414C` | `#174A8F` | `#4A1F96` | `#3D0F73` | `#1A0533` |
| `--aura-glow` | shadow color (α applied in CSS) | `#C9D4E0` | `#2E7CD6` | `#7B3FE4` | `#9D4DFF` | `#B98CFF` |

All 10 tiers' values generate from the manifest's `aura.colors` (single source of truth =
`tiers.json`); the table shows anchors. XP bars, quest borders, level numerals, ceremony
effects, focus rings — all `--aura`. Worked muscles stay heat-ramp orange forever.

### 2.3 Typography (self-hosted via @fontsource, kept from Shift + Lift)

| Role | Font | Use |
|---|---|---|
| Display | **Unbounded** 700/900 | Gate names, level numerals, tier names, ceremonies |
| Body | **Sora** 400/600/700 | Cues, notes, paragraphs |
| System/Data | **Martian Mono** 400/700 | ALL System voice (bracketed lines), schemes, logs, labels, stats |

Scale: 11 labels (+0.14em tracking, uppercase) · 13.5 body · 15 card titles · 22 gate names ·
34 level numeral · 48 ceremony numeral. System-voice lines render with a 12–18 ms/char
typewriter effect (skippable on tap; off under reduced motion).

### 2.4 Shape, space, motion

- Radii 14/10/8 (cards/chips/inputs); 1 px `--line` borders; System windows get a 1 px
  `--aura` inner border at 25% alpha — the "magic UI" tell.
- 4-px grid; gutter 14 px; max content width 560 px mobile flow; ≥ 900 px dashboard becomes
  two columns (character | today).
- Micro 150–250 ms ease-out; heatmap stop transitions 400 ms; XP bar fills with a 600 ms
  ease-out + `--aura-hi` leading-edge spark.
- **Ceremonies:** level-up ≈ 2.5 s (dim → typewriter → image crossfade 700 ms → stat roll),
  tier-up ≈ 5 s (adds whole-UI accent recolor sweep + arc text). Always skippable on tap.
- `prefers-reduced-motion`: typewriter→instant text, particles→static glow, crossfades only.

## 3. Component library (mobile-first; key props sketched)

| Component | Notes |
|---|---|
| `SystemText` | mono, brackets, typewriter; `tone: info\|reward\|warning` |
| `SystemWindow` | panel + aura inner border; all "System speaks" containers |
| `XPBar` | aura gradient fill, numeric `cur/next`, spark on gain |
| `CharacterCard` | image or `AuraPlaceholder`; level numeral; equipped title; tap → profile |
| `AuraPlaceholder` | SVG silhouette + canvas particles from tier manifest; intensity = within-tier progress |
| `TierTease` | locked slot, `[CLASSIFIED — REACH LEVEL n]`, edge leak of next aura |
| `QuestRow` | objective, XP value, auto-claimed check animation |
| `RosterStrip` | 7 chips: gym=aura, work=`--work`, rest=grey (was heat; gym days now carry your power color) |
| `GateHeader` | gate name (Unbounded), rank badge = current tier, rationale line |
| `BodyHeatmap` | ported SVG component; focus/aggregate behavior unchanged |
| `ExerciseCard` | collapsed: name+scheme+done state; expanded: demo, cues, `SetLogger` |
| `SetLogger` | per-set rows; prefilled; weight steppers ±2.5; rep stepper; grade chip (`▲ beat / ▶ held / ▼` ) |
| `TallyScreen` | itemized XP lines counting up → XPBar fill → continue (or ceremony) |
| `Ceremony` | full-screen level-up / tier-up |
| `StatPanel` | STR/VIT/AGI/REC bars + numerals (mono) |
| `RelicGrid` / `TierGallery` | trophy case; gallery shows unlocked images, classified slots |
| `SyncDot` | quiet corner indicator: synced / pending / offline |

## 4. Wireframes (text)

### 4.1 Dashboard — "Status Window" (mobile)

```
┌──────────────────────────────────┐
│ ARISE                    ◌ sync  │
│ [SYSTEM] GOOD EVENING, HUNTER.   │  SystemText greeting (context-aware)
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │        ╭────────────╮        │ │
│ │        │  CHARACTER  │       │ │  CharacterCard: lvl image / aura
│ │        │   (aura)    │       │ │  placeholder, particles behind
│ │        ╰────────────╯        │ │
│ │  LV 27  ─ SHADOW OF THE FORGE│ │  level numeral + equipped title
│ │  XP ████████████░░░░  642/438│ │  XPBar (aura gradient)
│ │  C-RANK ASSASSIN   21-30     │ │  tier name + range
│ │  ▸ [CLASSIFIED — LEVEL 31] ◂ │ │  TierTease (violet leaking at edges)
│ └──────────────────────────────┘ │
│ [MO][TU][WE][TH][FR][SA][SU]     │  RosterStrip, today ringed in aura
│ ┌──────────────────────────────┐ │
│ │ [TODAY'S GATE]               │ │
│ │ IRON ABYSS — PULL            │ │  GateHeader preview
│ │ lats · traps · rear delts    │ │
│ │        [ ENTER GATE ]        │ │  primary CTA (aura)
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ [DAILY QUESTS]               │ │
│ │ ◻ Clear Iron Abyss      +25  │ │
│ │ ◻ Beat row tonnage      +20  │ │
│ │ ◼ Log body weight       +10 ✓│ │  auto-claimed
│ └──────────────────────────────┘ │
│ STREAK ×1.3 · WEEK 3             │
└──────────────────────────────────┘
```

Shift day: Gate card becomes `[MANDATORY QUEST: ENDURANCE TRIAL]` (blue) with one-tap
confirm + quest intel. Rest day: Sanctuary panel (grey/aura) with recovery rules.

### 4.2 Gate — workout session

```
┌──────────────────────────────────┐
│ ← IRON ABYSS            B-RANK   │  gate name + rank badge (= tier)
│ [SYSTEM] SPARE THE SPINE.        │  rationale, System-voiced
│ THE JOB ALREADY TAXED IT.        │
├──────────────────────────────────┤
│ ┌────────── HEATMAP ───────────┐ │
│ │   FRONT 🧍      BACK 🧍      │ │  heat ramp; focuses expanded ex.
│ │   cold ▁▂▃▅▇ primary         │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ▣ Chest-Supported Row     ✓  │ │  done (all sets logged)
│ ├──────────────────────────────┤ │
│ │ ▼ Lat Pulldown   3×10–12     │ │  expanded
│ │  [ demo animation ]          │ │
│ │  MIND–MUSCLE: drive elbows…  │ │
│ │  S1  52.5kg ×12   ▲ beat     │ │  SetLogger rows, prefilled,
│ │  S2  52.5kg ×11   ▶ held     │ │  grade chips vs last session
│ │  S3 [52.5kg] [−][+] [10] ✓→  │ │  current set: steppers + log
│ │  LAST: 52.5×(12,11,10) 4 JUN │ │
│ ├──────────────────────────────┤ │
│ │ ▢ Face Pull       3×12–15    │ │  collapsed
│ └──────────────────────────────┘ │
│ ████████░░ 2/4 CLEARED          │  gate progress
└──────────────────────────────────┘
```

### 4.3 Tally → Level-up ceremony

```
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│ [GATE CLEARED: IRON ABYSS]       │    │            (dim void)            │
│                                  │    │                                  │
│  SETS LOGGED          12   +118  │    │   [CONDITIONS MET.]              │
│  PROGRESSION: ROW          +50   │    │   [LEVEL UP.]                    │
│  WEIGHT UP: PULLDOWN       +120  │    │                                  │
│  GATE CLEAR                +100  │    │        ╭────────────╮            │
│  STREAK ×1.3              ×1.3   │    │        │  lvl 27 →  │            │
│  ──────────────────────────────  │    │        │   lvl 28   │  crossfade │
│  TOTAL                   +504    │    │        ╰────────────╯            │
│                                  │    │            LV 28                 │
│  XP ███████████████░░  cnt-up    │    │   STR 34 → 36   VIT 29 → 30      │
│        [ CONTINUE ]              │    │        [ tap to continue ]       │
└──────────────────────────────────┘    └──────────────────────────────────┘
```

Tier-up extends the right screen: aura recolor sweep across UI + tier arc text.

### 4.4 Hunter Profile

```
┌──────────────────────────────────┐
│ ← HUNTER PROFILE                 │
│  KARAN — LV 28 · C-RANK ASSASSIN │
│  TITLE: [SHADOW OF THE FORGE ▾]  │  equippable
│  STR ██████████░░ 36             │
│  VIT ████████░░░░ 30             │  StatPanel (mono numerals)
│  AGI ██████░░░░░░ 24             │
│  REC ███████░░░░░ 27             │
│ ┌─ SYSTEM RECORDS ─────────────┐ │
│ │ [bench ▾]  chart: kg over t  │ │  per-exercise progression chart
│ └──────────────────────────────┘ │
│ ┌─ RELICS ─────────────────────┐ │
│ │ ◆ Iron Boots  ◆ Gatebreaker  │ │
│ └──────────────────────────────┘ │
│ ┌─ EVOLUTION ──────────────────┐ │
│ │ [1][2]…[27][28][▒▒][▒▒]      │ │  TierGallery: unlocked thumbs,
│ └──────────────────────────────┘ │  classified slots ahead
└──────────────────────────────────┘
```

## 5. Accessibility

- All heat/aura color information is duplicated in text (grades have glyphs + words; XP has
  numerals; tier has a name).
- Ceremonies: `role="dialog"`, skippable, reduced-motion variants; no flashing > 3 Hz ever.
- SetLogger steppers are real buttons ≥ 44 px; full keyboard operability on desktop.
- System voice is stylistic, never the only carrier of an instruction.
- AA contrast minimums hold on every tier's aura accent (the generated palette is
  contrast-checked in a unit test against `--bg`/`--panel`).
