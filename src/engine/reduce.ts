/**
 * The reducer: append-only event log → GameState.
 *
 * Determinism contract (property-tested): any permutation of the same event set
 * reduces to the identical state. Internally events are deduped by id and sorted by
 * (occurredAt, id) before anything else happens, and all XP awards are sums over
 * facts, not order-dependent accumulations.
 *
 * The building blocks (sortEvents/collectFacts/buildTimelines/makeStreak) are exported
 * so tally.ts itemizes a single session with the SAME math — never a reimplementation.
 */
import type {
  AriseEvent,
  EngineExercise,
  EngineProgram,
  ExerciseSessionRecord,
  GameState,
  GateClearedPayload,
  HistoryImportedPayload,
  LoggedSet,
  QuestCompletedPayload,
  ReduceConfig,
  SetPayload,
  StatTag,
} from './types';
import { XP, levelFromTotalXp, questXp, setXp, statDisplay, streakMultiplier, xpToNext } from './xp';

const DAY_MS = 86_400_000;

/** Monday-based week index since epoch (1970-01-01 was a Thursday → shift 3 days). */
export function epochWeek(dateIso: string): number {
  const t = Date.parse(`${dateIso}T00:00:00Z`);
  return Math.floor((t / DAY_MS + 3) / 7);
}

export interface SessionFact {
  exerciseId: string;
  date: string;
  /** sparse by set index */
  sets: Map<number, LoggedSet>;
}

export interface Facts {
  /** key: `${exerciseId}|${date}` */
  sessions: Map<string, SessionFact>;
  /** deduped `${sessionId}|${date}` → fact */
  gateClears: Map<string, { sessionId: string; date: string }>;
  shiftDates: Set<string>;
  restDates: Set<string>;
  /** questId → template (deduped) */
  quests: Map<string, string>;
}

export function sortEvents(events: AriseEvent[]): AriseEvent[] {
  const byId = new Map<string, AriseEvent>();
  for (const e of events) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) =>
    a.occurredAt === b.occurredAt ? (a.id < b.id ? -1 : 1) : a.occurredAt < b.occurredAt ? -1 : 1,
  );
}

export function collectFacts(sorted: AriseEvent[]): Facts {
  const facts: Facts = {
    sessions: new Map(),
    gateClears: new Map(),
    shiftDates: new Set(),
    restDates: new Set(),
    quests: new Map(),
  };
  const importedSources = new Set<string>();

  const upsertSet = (p: SetPayload) => {
    const key = `${p.exerciseId}|${p.sessionDate}`;
    let s = facts.sessions.get(key);
    if (!s) {
      s = { exerciseId: p.exerciseId, date: p.sessionDate, sets: new Map() };
      facts.sessions.set(key, s);
    }
    // events arrive sorted by occurredAt, so plain overwrite = last-write-wins
    s.sets.set(p.setIndex, { weightKg: p.weightKg, reps: p.reps });
  };

  for (const e of sorted) {
    switch (e.type) {
      case 'set_logged':
      case 'set_amended':
        upsertSet(e.payload as SetPayload);
        break;
      case 'gate_cleared': {
        const p = e.payload as GateClearedPayload;
        facts.gateClears.set(`${p.sessionId}|${p.sessionDate}`, {
          sessionId: p.sessionId,
          date: p.sessionDate,
        });
        break;
      }
      case 'shift_confirmed':
        facts.shiftDates.add((e.payload as { date: string }).date);
        break;
      case 'rest_honored':
        facts.restDates.add((e.payload as { date: string }).date);
        break;
      case 'quest_completed': {
        const p = e.payload as QuestCompletedPayload;
        if (!facts.quests.has(p.questId)) facts.quests.set(p.questId, p.template);
        break;
      }
      case 'history_imported': {
        const p = e.payload as HistoryImportedPayload;
        if (importedSources.has(p.source)) break; // idempotent re-import
        importedSources.add(p.source);
        for (const entry of p.entries) {
          entry.reps.forEach((reps, i) =>
            upsertSet({
              exerciseId: entry.exerciseId,
              setIndex: i,
              weightKg: entry.weightKg,
              reps,
              sessionDate: entry.date,
            }),
          );
        }
        break;
      }
      case 'bodyweight_logged':
        break; // a fact for charts; XP comes via its quest
    }
  }
  return facts;
}

/** Per-exercise chronological session timelines (dense, sorted by set index). */
export function buildTimelines(facts: Facts): Map<string, ExerciseSessionRecord[]> {
  const byExercise = new Map<string, ExerciseSessionRecord[]>();
  for (const s of [...facts.sessions.values()].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const sets = [...s.sets.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    if (sets.length === 0) continue;
    let list = byExercise.get(s.exerciseId);
    if (!list) byExercise.set(s.exerciseId, (list = []));
    list.push({ date: s.date, sets });
  }
  return byExercise;
}

/** All sets at/above the top of the rep range, full set count, no weight drop = conditions met. */
export function progressionMet(ex: EngineExercise, sets: LoggedSet[], prevMaxWeight: number): boolean {
  if (sets.length < ex.scheme.sets) return false;
  if (!sets.every((s) => s.reps >= ex.scheme.repsHi)) return false;
  const minWeight = Math.min(...sets.map((s) => s.weightKg));
  return prevMaxWeight === 0 || minWeight >= prevMaxWeight;
}

/** Streak helpers: a week is honored when every scheduled gym session cleared. */
export function makeStreak(facts: Facts, program: EngineProgram) {
  const clearsByWeek = new Map<number, Set<string>>();
  for (const clear of facts.gateClears.values()) {
    const w = epochWeek(clear.date);
    let set = clearsByWeek.get(w);
    if (!set) clearsByWeek.set(w, (set = new Set()));
    set.add(clear.sessionId);
  }
  const honored = (w: number): boolean => {
    const set = clearsByWeek.get(w);
    return !!set && program.gymSessions.every((s) => set.has(s));
  };
  /** consecutive honored weeks strictly before week w */
  const streakBefore = (w: number): number => {
    let n = 0;
    while (honored(w - 1 - n)) n += 1;
    return n;
  };
  return { honored, streakBefore };
}

/**
 * Per-exercise XP for one session record given its history position.
 * Single source of truth — used by both the full reducer and the gate tally.
 */
export function exerciseSessionXp(
  ex: EngineExercise | undefined,
  rec: ExerciseSessionRecord,
  prev: ExerciseSessionRecord | undefined,
  allTimeMaxBefore: number,
): { setXpSum: number; progression: boolean; weightUp: boolean; agiXp: number } {
  let setXpSum = 0;
  let agiXp = 0;
  rec.sets.forEach((set, i) => {
    const prevSet = prev?.sets[i];
    const award = setXp(set.weightKg, set.reps, prevSet ? prevSet.weightKg * prevSet.reps : undefined);
    setXpSum += award;
    if (ex && ex.cls === 'accessory' && set.reps >= ex.scheme.repsHi) agiXp += award;
  });
  if (!ex) return { setXpSum, progression: false, weightUp: false, agiXp };
  const maxWeight = Math.max(...rec.sets.map((s) => s.weightKg));
  return {
    setXpSum,
    progression: progressionMet(ex, rec.sets, allTimeMaxBefore),
    weightUp: allTimeMaxBefore > 0 && maxWeight > allTimeMaxBefore,
    agiXp,
  };
}

export function reduce(events: AriseEvent[], cfg: ReduceConfig, nowIso?: string): GameState {
  const sorted = sortEvents(events);
  const facts = collectFacts(sorted);
  const byExercise = buildTimelines(facts);

  const statPools: Record<StatTag, number> = { str: 0, vit: 0, agi: 0, rec: 0 };

  // --- gate-derived XP, bucketed per training date for the streak multiplier ----
  const dateBuckets = new Map<string, number>();
  const addToDate = (date: string, amount: number) => {
    dateBuckets.set(date, (dateBuckets.get(date) ?? 0) + amount);
  };

  for (const [exerciseId, records] of byExercise) {
    const ex = cfg.program.exercises[exerciseId];
    let prev: ExerciseSessionRecord | undefined;
    let allTimeMax = 0;
    for (const rec of records) {
      const r = exerciseSessionXp(ex, rec, prev, allTimeMax);
      let sessionXp = r.setXpSum;
      statPools.agi += r.agiXp;
      if (r.progression) {
        sessionXp += XP.progression;
        if (ex?.cls === 'compound') statPools.str += XP.progression;
      }
      if (r.weightUp) {
        sessionXp += XP.weightUp;
        if (ex?.cls === 'compound') statPools.str += XP.weightUp;
      }
      if (ex) allTimeMax = Math.max(allTimeMax, ...rec.sets.map((s) => s.weightKg));
      addToDate(rec.date, sessionXp);
      prev = rec;
    }
  }

  for (const clear of facts.gateClears.values()) {
    addToDate(clear.date, XP.gateClear);
    statPools.vit += XP.gateClear;
  }

  const { honored, streakBefore } = makeStreak(facts, cfg.program);

  // --- total XP -------------------------------------------------------------------
  let totalXp = 0;
  for (const [date, bucket] of dateBuckets) {
    totalXp += Math.round(bucket * streakMultiplier(streakBefore(epochWeek(date))));
  }
  totalXp += facts.shiftDates.size * XP.shift;
  statPools.vit += facts.shiftDates.size * XP.shift;
  totalXp += facts.restDates.size * XP.rest;
  statPools.rec += facts.restDates.size * XP.rest;
  for (const template of facts.quests.values()) totalXp += questXp(template);

  // --- level / tier ----------------------------------------------------------------
  const maxLevel = Math.max(...cfg.tiers.map((t) => t.levels[1]));
  const progress = levelFromTotalXp(totalXp, maxLevel);
  const tierIndex = Math.max(
    0,
    cfg.tiers.findIndex((t) => progress.level >= t.levels[0] && progress.level <= t.levels[1]),
  );
  const tierMultiplier = cfg.tiers[tierIndex]?.statMultiplier ?? 1;

  // --- current streak (relative to `now`; current week counts once honored) --------
  const nowDate = nowIso ?? sorted[sorted.length - 1]?.occurredAt.slice(0, 10) ?? '1970-01-01';
  const nowWeek = epochWeek(nowDate);
  const streakWeeks = honored(nowWeek) ? streakBefore(nowWeek) + 1 : streakBefore(nowWeek);

  // --- exercise views for the UI ----------------------------------------------------
  // last:  most recent record overall (history charts)
  // prev:  most recent record BEFORE today (prefill + grading baseline)
  // today: today's in-progress/finished record
  const lastByExercise: Record<string, ExerciseSessionRecord> = {};
  const prevByExercise: Record<string, ExerciseSessionRecord> = {};
  const todayByExercise: Record<string, ExerciseSessionRecord> = {};
  for (const [exerciseId, records] of byExercise) {
    lastByExercise[exerciseId] = records[records.length - 1];
    const before = records.filter((r) => r.date < nowDate);
    if (before.length) prevByExercise[exerciseId] = before[before.length - 1];
    const today = records.find((r) => r.date === nowDate);
    if (today) todayByExercise[exerciseId] = today;
  }

  const clearedToday = [...facts.gateClears.values()]
    .filter((c) => c.date === nowDate)
    .map((c) => c.sessionId);

  return {
    totalXp,
    level: progress.level,
    xpIntoLevel: progress.xpIntoLevel,
    xpToNext: progress.level === maxLevel ? 0 : xpToNext(progress.level),
    tierIndex,
    statPools,
    stats: {
      str: statDisplay(statPools.str, tierMultiplier),
      vit: statDisplay(statPools.vit, tierMultiplier),
      agi: statDisplay(statPools.agi, tierMultiplier),
      rec: statDisplay(statPools.rec, tierMultiplier),
    },
    streakWeeks,
    multiplier: streakMultiplier(streakWeeks),
    gatesCleared: facts.gateClears.size,
    lastByExercise,
    prevByExercise,
    todayByExercise,
    clearedToday,
    eventCount: sorted.length,
  };
}
