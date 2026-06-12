/**
 * Engine types — pure domain. This module (and everything in src/engine/) must never
 * import from React, Dexie, Supabase, or any UI/storage code. The engine receives
 * events + config and returns derived state; that purity is what makes the game's
 * math unit-testable and replayable on any device.
 */

export type StatTag = 'str' | 'vit' | 'agi' | 'rec';

// ---------------------------------------------------------------------------
// Events — the append-only facts. Derived values (XP, level, stats, streaks)
// are never stored as events.
// ---------------------------------------------------------------------------

export type EventType =
  | 'set_logged'
  | 'set_amended'
  | 'gate_cleared'
  | 'quest_completed'
  | 'shift_confirmed'
  | 'rest_honored'
  | 'bodyweight_logged'
  | 'history_imported';

export interface SetPayload {
  exerciseId: string;
  setIndex: number;
  weightKg: number;
  reps: number;
  /** YYYY-MM-DD — the training day this set belongs to */
  sessionDate: string;
}

export interface GateClearedPayload {
  sessionId: string;
  sessionDate: string;
}

export interface QuestCompletedPayload {
  /** unique per generated quest instance — deduplication key */
  questId: string;
  /** template key, maps to XP table */
  template: string;
  date: string;
}

export interface DatePayload {
  date: string;
}

export interface BodyweightPayload {
  kg: number;
  date: string;
}

export interface ImportedLogEntry {
  exerciseId: string;
  date: string;
  weightKg: number;
  reps: number[];
}

export interface HistoryImportedPayload {
  source: string;
  entries: ImportedLogEntry[];
}

export type PayloadFor<T extends EventType> = T extends 'set_logged' | 'set_amended'
  ? SetPayload
  : T extends 'gate_cleared'
    ? GateClearedPayload
    : T extends 'quest_completed'
      ? QuestCompletedPayload
      : T extends 'shift_confirmed' | 'rest_honored'
        ? DatePayload
        : T extends 'bodyweight_logged'
          ? BodyweightPayload
          : T extends 'history_imported'
            ? HistoryImportedPayload
            : never;

export interface AriseEvent<T extends EventType = EventType> {
  /** uuidv7 — time-ordered, generated on the originating device */
  id: string;
  userId: string;
  deviceId: string;
  type: T;
  payload: PayloadFor<T>;
  /** ISO datetime (device clock). Orders LWW amendments; XP sums are order-independent. */
  occurredAt: string;
  schemaVersion: 1;
}

// ---------------------------------------------------------------------------
// Config — the program and tier data the engine reasons against, injected so
// the engine has no content imports.
// ---------------------------------------------------------------------------

export interface EngineScheme {
  sets: number;
  repsLo: number;
  repsHi: number;
}

export interface EngineExercise {
  id: string;
  sessionId: string;
  cls: 'compound' | 'accessory';
  statTags: StatTag[];
  scheme: EngineScheme;
}

export interface EngineProgram {
  /** by exercise id */
  exercises: Record<string, EngineExercise>;
  /** session ids that constitute one fully-honored training week */
  gymSessions: string[];
}

export interface TierDef {
  id: string;
  name: string;
  /** inclusive level range [lo, hi] */
  levels: [number, number];
  statMultiplier: number;
  aura: {
    theme: string;
    /** [accent, highlight, deep] hex colors */
    colors: [string, string, string];
    intensity: number;
  };
  arc: string;
}

export interface ReduceConfig {
  program: EngineProgram;
  tiers: TierDef[];
}

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

export interface LoggedSet {
  weightKg: number;
  reps: number;
}

export interface ExerciseSessionRecord {
  date: string;
  sets: LoggedSet[];
}

export interface GameState {
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  /** 0 when at the level cap */
  xpToNext: number;
  /** 0-based index into config.tiers */
  tierIndex: number;
  /** raw stat XP pools, fed by tagged events */
  statPools: Record<StatTag, number>;
  /** display values (pool → curve → tier multiplier) */
  stats: Record<StatTag, number>;
  /** consecutive fully-honored training weeks ending at (or just before) `now` */
  streakWeeks: number;
  /** multiplier that will apply to the next gate's XP */
  multiplier: number;
  gatesCleared: number;
  /** most recent session per exercise (any date) — history views */
  lastByExercise: Record<string, ExerciseSessionRecord>;
  /** most recent session strictly before `now` — prefill + grading baseline */
  prevByExercise: Record<string, ExerciseSessionRecord>;
  /** today's (possibly in-progress) session per exercise */
  todayByExercise: Record<string, ExerciseSessionRecord>;
  /** session ids whose gate was cleared today */
  clearedToday: string[];
  /** questIds already counted (deduped) — auto-claim guard */
  completedQuests: string[];
  /** today's Mandatory Quest already confirmed */
  shiftConfirmedToday: boolean;
  /** every date with at least one logged set, sorted ascending */
  trainingDates: string[];
  lastTrainingDate?: string | undefined;
  /** bodyweight log, sorted by date ascending */
  bodyweights: Array<{ date: string; kg: number }>;
  eventCount: number;
}
