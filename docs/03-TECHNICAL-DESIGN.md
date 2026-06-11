# Arise — Technical Design Document

**Version:** 1.0 · **Date:** 2026-06-11

---

## 1. Stack decision

| Concern | Decision | Rationale |
|---|---|---|
| Framework | **React 19 + TypeScript (strict)** | The app is genuinely stateful now (derived game state, ceremonies, sync status). Vanilla DOM was right for Shift + Lift's single screen, wrong here |
| Build/PWA | **Vite 7 + vite-plugin-pwa** | Keeps the proven instant-deploy pipeline from Shift + Lift; static output hosts anywhere |
| Routing | **TanStack Router** | Type-safe routes; tiny; no SSR baggage |
| Server state | **TanStack Query** | Sync/pull orchestration with retries and offline awareness |
| Local DB | **Dexie (IndexedDB)** | Event log + caches exceed localStorage comfort zone; Dexie gives typed tables and liveQuery for reactive reads |
| Backend | **Supabase** (Postgres + Auth + RLS) | Smallest real backend: relational DB (logs are relational), auth providers, row-level security, generous free tier |
| Engine | **Pure TS module (`src/engine/`)** | XP/level/stat math has zero imports of React/Dexie/Supabase → unit-testable, portable, replayable |
| Testing | **Vitest** (+ fast-check for replay property tests) | Native to Vite |
| Hosting | Netlify / Cloudflare Pages (static) | Same as Shift + Lift route A; HTTPS for PWA install |

**Rejected:** Next.js (SSR buys nothing for an offline-first installable client app),
Expo/React Native (loses the PWA deploy loop; two render targets for one developer),
Tauri/Electron (desktop-first, wrong shape), Firebase (Firestore poor fit for relational
logs; Supabase's Postgres + RLS is cleaner).

## 2. Architecture: event-sourced, offline-first

The single load-bearing decision: **the source of truth is an append-only event log.**
Game state (XP, level, stats, streaks, quest completion, relics) is **derived by replaying
events through a pure reducer** — never written directly.

```
user action ──► event appended to Dexie (events table, synced=false)
                     │
                     ├─► reducer replays log ──► derived GameState ──► UI (liveQuery)
                     │
                     └─► sync worker (online + authed):
                           push unsynced events ──► Supabase events table
                           pull events where server_seq > last_cursor ──► merge into Dexie
                           (replay now includes other devices' events → states converge)
```

Why this wins:

- **Offline is free:** writes never touch the network. Mid-Gate disconnect = nothing happens.
- **Sync conflicts mostly vanish:** events are immutable facts; merging two devices' facts is
  a set union. Derived state can't conflict because it isn't stored.
- **No CRDTs needed:** the only true conflict (editing the *same* logged set on two devices)
  resolves last-write-wins by `occurredAt` per `setKey`; both events stay in history.
- **Cheat/corruption resistance + auditability:** "System Records" is literally the log.
- **Determinism is testable:** property test — any permutation of the same event set replays
  to the identical state hash (AC-4.4, AC-7.2).

### 2.1 Event shape

```ts
interface AriseEvent<T extends EventType = EventType> {
  id: string;            // uuidv7 (time-ordered, generated on device)
  userId: string;        // auth uid; 'local' before first sign-in, rewritten on link
  deviceId: string;      // stable per-install id
  type: T;               // see below
  payload: PayloadFor<T>;
  occurredAt: string;    // ISO datetime, device clock
  schemaVersion: 1;
}

type EventType =
  | 'set_logged'         // { exerciseId, setIndex, weightKg, reps, sessionDate }
  | 'set_amended'        // corrections; LWW by occurredAt per (exerciseId, sessionDate, setIndex)
  | 'gate_cleared'       // { sessionId, sessionDate }
  | 'quest_completed'    // { questId, questTemplate, date }
  | 'shift_confirmed'    // { date }
  | 'rest_honored'       // { date } — emitted at first open after a clean rest day
  | 'bodyweight_logged'  // { kg, date }
  | 'history_imported';  // { source: 'shift-lift', entries: ImportedLog[] }
```

Derived (computed, never stored): XP totals, level, tier, stats, streaks, boss state, relics,
titles earned. The reducer in `src/engine/reduce.ts` implements every formula in the GDD.

### 2.2 Sync protocol (deliberately boring)

1. Push: `insert` all `synced=false` events (idempotent on `id`; server assigns `server_seq`).
2. Pull: `select * where user_id = me and server_seq > :cursor order by server_seq`.
3. Mark pushed events synced; advance cursor; re-run reducer.
4. Triggered by: app focus, post-Gate tally, connectivity regained, 15-min interval. Failures
   retry with backoff; the UI shows a quiet sync dot, never a blocking error.

Clock skew: `occurredAt` only orders LWW amendments and display; XP math is order-independent
(sums), so skew can't corrupt progression.

## 3. Data model

### 3.1 Supabase (Postgres, RLS: `user_id = auth.uid()` on everything)

```sql
create table events (
  id          uuid primary key,
  user_id     uuid not null references auth.users(id),
  device_id   text not null,
  type        text not null,
  payload     jsonb not null,
  occurred_at timestamptz not null,
  server_seq  bigint generated always as identity,
  created_at  timestamptz default now()
);
create index on events (user_id, server_seq);

create table profiles (
  user_id    uuid primary key references auth.users(id),
  username   text,
  settings   jsonb default '{}',     -- units, reduced-fx, equipped title
  created_at timestamptz default now()
);
```

No server-side game state. (A `snapshots` cache table is a post-v1 optimization if replay
ever gets slow server-side; client replay of ~5k events/year is microseconds.)

### 3.2 Dexie (client)

| Table | Key | Contents |
|---|---|---|
| `events` | `id` | all events (own + pulled), `synced` flag, indexed by `occurredAt` |
| `meta` | key | sync cursor, deviceId, last reducer state hash |
| `cache` | key | memoized GameState (invalidated on event append/merge) |

### 3.3 Program data (content, not state)

`src/data/program.ts` ports Shift + Lift's program verbatim (types, activation maps, cues,
poses) and adds game metadata:

```ts
interface Exercise {
  /* ...all Shift + Lift fields: id, name, scheme, activation, mindMuscle, form, pose... */
  cls: 'compound' | 'accessory';     // boss milestones + stat tagging
  statTags: StatTag[];               // e.g. ['str'] | ['agi']
}
interface Session { /* ...plus */ gateName: string; gateEpithet: string; }
```

The roster (`DayPlan[]`) also drives quest generation. Program stays code-as-content in v1;
the engine treats it as injected data, so a future editor only changes where it loads from.

## 4. Project layout

```
arise/
├── docs/                       # this documentation set + HANDOFF log
├── public/
│   ├── assets/characters/      # tiers.json + lvl_NNN.webp (dropped in over time)
│   └── icons/
├── src/
│   ├── main.tsx                # bootstrap, router, SW registration
│   ├── engine/                 # PURE — no React/Dexie/Supabase imports
│   │   ├── types.ts            # events, GameState
│   │   ├── xp.ts               # GDD §2 formulas
│   │   ├── reduce.ts           # event log → GameState
│   │   ├── quests.ts           # daily quest generation + auto-claim checks
│   │   ├── bosses.ts           # milestone detection → encounters
│   │   └── __tests__/          # unit + replay property tests
│   ├── data/
│   │   ├── program.ts          # the program (ported + game metadata)
│   │   └── strings.ts          # all System-voice copy
│   ├── store/
│   │   ├── db.ts               # Dexie schema
│   │   ├── append.ts           # the ONLY write path for events
│   │   ├── sync.ts             # push/pull worker
│   │   └── useGameState.ts     # liveQuery events → reducer → memoized state
│   ├── character/
│   │   ├── manifest.ts         # tiers.json loader + level→image/tier resolution
│   │   └── AuraPlaceholder.tsx # procedural silhouette + tier-themed particles
│   ├── body/                   # heatmap, ported from Shift + Lift (SVG + colormap)
│   ├── anim/                   # FK exercise demos, ported
│   ├── ui/                     # shared primitives (SystemText, XPBar, Card, ...)
│   └── routes/
│       ├── dashboard/          # status window, character card, today, quests
│       ├── gate/               # session flow, set logger, tally, ceremonies
│       ├── profile/            # stats, relics, tier gallery, records/charts
│       └── settings/           # auth, import, preferences
├── supabase/migrations/        # SQL above, versioned
├── index.html · vite.config.ts · package.json · .env.example
```

## 5. Asset management

- `manifest.ts` fetches `tiers.json` (precached), resolves `level → {imageUrl, tier}` via
  `imagePattern` (`lvl_{nnn}`, zero-padded). Extending past 100 = append a tier entry + drop
  files (AC-9.2).
- `<CharacterImage level={n}>` attempts the image; `onError` → `<AuraPlaceholder>` (AC-9.3).
  Placeholder = layered SVG silhouette + canvas particle aura using the tier's `aura.colors`
  and `intensity` scaled by within-tier progress — designed to remain *under* real images
  permanently, so art drops only ever upgrade the center of the card.
- Images are `.webp`, lazy-loaded, current ± adjacent levels prefetched; gallery virtualizes.

## 6. Auth & security

- Supabase Auth: Google OAuth + email magic link. Session persisted locally (offline OK).
- **Local-first onboarding:** the app is fully usable signed-out (`userId='local'`). On first
  sign-in, local events are rewritten to the real uid and pushed — no wall before the hook.
- RLS on every table; anon key in client is standard Supabase posture (RLS is the boundary).
  Keys in `.env`, never committed (`.env.example` documents shape).
- Sign-out wipes Dexie (AC-1.3). No PII beyond email/username; no third-party analytics.

## 7. Performance & PWA

- Code-split by route; ceremonies and charts lazy. Initial JS < 350 KB gz (AC-8.2).
- Precache: shell + fonts + `tiers.json` + current-tier images (runtime cache strategy
  `CacheFirst` for `assets/characters/*`).
- `registerType: 'prompt'` — the System announces updates (`[THE SYSTEM HAS EVOLVED]`)
  instead of silently reloading mid-Gate.
- Reducer memoized by (event count, last id); full replay benchmarked in CI (10k events
  < 50 ms target on desktop CI ≈ fine on phone).

## 8. Risks

| Risk | Mitigation |
|---|---|
| XP balance feels off in real use | All constants in one `xp.ts` config object; rebalancing is data; event log replays under new constants if ever needed (versioned formulas) |
| Replay slows after years | Snapshot-and-tail optimization documented; not built until measured |
| Supabase free tier limits | Single user ≈ thousands of rows/year; trivially safe. Multi-user later = paid tier decision |
| Device clock wrong | Only affects LWW amendments + display dates; sums are order-independent |
| Solo Leveling IP | No copyrighted assets, names, or characters in repo; "inspired aesthetic" only; own naming (Arise, tier names are original) |
| Scope creep into Phase 5 fantasies | Build plan gates each phase on exit criteria; HANDOFF.md records deferrals |
