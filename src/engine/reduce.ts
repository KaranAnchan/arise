/**
 * The reducer: append-only event log → GameState.
 *
 * Determinism contract (property-tested): any permutation of the same event set
 * reduces to the identical state. Internally events are deduped by id and sorted by
 * (occurredAt, id) before anything else happens, and all XP awards are sums over
 * facts, not order-dependent accumulations.
 */
import type {
  AriseEvent,
  EngineExercise,
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

interface SessionFact {
  exerciseId: string;
  date: string;
  /** sparse by set index */
  sets: Map<number, LoggedSet>;
}

interface Facts {
  /** key: `${exerciseId}|${date}` */
  sessions: Map<string, SessionFact>;
  /** deduped `${sessionId}|${date}` → date */
  gateClears: Map<string, { sessionId: string; date: string }>;
  shiftDates: Set<string>;
  restDates: Set<string>;
  /** questId → template (deduped) */
  quests: Map<string, string>;
}

function sortEvents(events: AriseEvent[]): AriseEvent[] {
  const byId = new Map<string, AriseEvent>();
  for (const e of events) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) =>
    a.occurredAt === b.occurredAt ? (a.id < b.id ? -1 : 1) : a.occurredAt < b.occurredAt ? -1 : 1,
  );
}

function collectFacts(sorted: AriseEvent[]): Facts {
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

/** All sets at/above the top of the rep range, full set count, no weight drop = conditions met. */
function progressionMet(ex: EngineExercise, sets: LoggedSet[], prevMaxWeight: number): boolean {
  if (sets.length < ex.scheme.sets) return false;
  if (!sets.every((s) => s.reps >= ex.scheme.repsHi)) return false;
  const minWeight = Math.min(...sets.map((s) => s.weightKg));
  return prevMaxWeight === 0 || minWeight >= prevMaxWeight;
}

export function reduce(events: AriseEvent[], cfg: ReduceConfig, nowIso?: string): GameState {
  const sorted = sortEvents(events);
  const facts = collectFacts(sorted);

  const statPools: Record<StatTag, number> = { str: 0, vit: 0, agi: 0, rec: 0 };
  const addPools = (tags: StatTag[], amount: number) => {
    for (const t of tags) statPools[t] += amount;
  };

  // --- chronological per-exercise timelines -------------------------------------
  const byExercise = new Map<string, ExerciseSessionRecord[]>();
  for (const s of [...facts.sessions.values()].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const sets = [...s.sets.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
    if (sets.length === 0) continue;
    let list = byExercise.get(s.exerciseId);
    if (!list) byExercise.set(s.exerciseId, (list = []));
    list.push({ date: s.date, sets });
  }

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
      let sessionXp = 0;
      rec.sets.forEach((set, i) => {
        const prevSet = prev?.sets[i];
        const award = setXp(set.weightKg, set.reps, prevSet ? prevSet.weightKg * prevSet.reps : undefined);
        sessionXp += award;
        // AGI: accessory sets completed at full programmed reps
        if (ex && ex.cls === 'accessory' && set.reps >= ex.scheme.repsHi) statPools.agi += award;
      });
      if (ex) {
        if (progressionMet(ex, rec.sets, allTimeMax)) {
          sessionXp += XP.progression;
          if (ex.cls === 'compound') addPools(['str'], XP.progression);
        }
        const maxWeight = Math.max(...rec.sets.map((s) => s.weightKg));
        if (allTimeMax > 0 && maxWeight > allTimeMax) {
          sessionXp += XP.weightUp;
          if (ex.cls === 'compound') addPools(['str'], XP.weightUp);
        }
        allTimeMax = Math.max(allTimeMax, maxWeight);
      }
      addToDate(rec.date, sessionXp);
      prev = rec;
    }
  }

  for (const clear of facts.gateClears.values()) {
    addToDate(clear.date, XP.gateClear);
    statPools.vit += XP.gateClear;
  }

  // --- streaks: a week is honored when every scheduled gym session cleared -------
  const clearsByWeek = new Map<number, Set<string>>();
  for (const clear of facts.gateClears.values()) {
    const w = epochWeek(clear.date);
    let set = clearsByWeek.get(w);
    if (!set) clearsByWeek.set(w, (set = new Set()));
    set.add(clear.sessionId);
  }
  const honored = (w: number): boolean => {
    const set = clearsByWeek.get(w);
    return !!set && cfg.program.gymSessions.every((s) => set.has(s));
  };
  /** consecutive honored weeks strictly before week w */
  const streakBefore = (w: number): number => {
    let n = 0;
    while (honored(w - 1 - n)) n += 1;
    return n;
  };

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
  const nowWeek = epochWeek(nowIso ?? sorted[sorted.length - 1]?.occurredAt.slice(0, 10) ?? '1970-01-01');
  const streakWeeks = honored(nowWeek) ? streakBefore(nowWeek) + 1 : streakBefore(nowWeek);

  // --- last session per exercise (UI prefill) --------------------------------------
  const lastByExercise: Record<string, ExerciseSessionRecord> = {};
  for (const [exerciseId, records] of byExercise) {
    lastByExercise[exerciseId] = records[records.length - 1];
  }

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
    eventCount: sorted.length,
  };
}
