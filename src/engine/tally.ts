/**
 * Gate tally: itemized XP breakdown for one session on one date, computed from the
 * same building blocks as the reducer. Invariant (tested): the tally total equals the
 * reducer's totalXp delta from removing that gate's events — the tally screen can
 * never disagree with the bar.
 */
import type { AriseEvent, ReduceConfig } from './types';
import {
  buildTimelines,
  collectFacts,
  epochWeek,
  exerciseSessionXp,
  makeStreak,
  sortEvents,
} from './reduce';
import { XP, streakMultiplier } from './xp';

export interface TallyLine {
  kind: 'sets' | 'progression' | 'weightUp' | 'gateClear';
  /** exercise id for exercise lines; sessionId for the gate line */
  ref: string;
  xp: number;
}

export interface GateTally {
  sessionId: string;
  date: string;
  lines: TallyLine[];
  /** streak multiplier applied to this date's gate XP */
  multiplier: number;
  baseTotal: number;
  /** round(baseTotal × multiplier) — what the bar actually gains */
  total: number;
}

export function tallyGate(
  events: AriseEvent[],
  cfg: ReduceConfig,
  sessionId: string,
  date: string,
): GateTally {
  const facts = collectFacts(sortEvents(events));
  const byExercise = buildTimelines(facts);
  const lines: TallyLine[] = [];

  const sessionExercises = Object.values(cfg.program.exercises).filter(
    (ex) => ex.sessionId === sessionId,
  );

  for (const ex of sessionExercises) {
    const records = byExercise.get(ex.id);
    if (!records) continue;
    const idx = records.findIndex((r) => r.date === date);
    if (idx < 0) continue;
    const rec = records[idx];
    const prev = idx > 0 ? records[idx - 1] : undefined;
    const allTimeMaxBefore = records
      .slice(0, idx)
      .reduce((m, r) => Math.max(m, ...r.sets.map((s) => s.weightKg)), 0);

    const r = exerciseSessionXp(ex, rec, prev, allTimeMaxBefore);
    lines.push({ kind: 'sets', ref: ex.id, xp: r.setXpSum });
    if (r.progression) lines.push({ kind: 'progression', ref: ex.id, xp: XP.progression });
    if (r.weightUp) lines.push({ kind: 'weightUp', ref: ex.id, xp: XP.weightUp });
  }

  if (facts.gateClears.has(`${sessionId}|${date}`)) {
    lines.push({ kind: 'gateClear', ref: sessionId, xp: XP.gateClear });
  }

  const { streakBefore } = makeStreak(facts, cfg.program);
  const multiplier = streakMultiplier(streakBefore(epochWeek(date)));
  const baseTotal = lines.reduce((s, l) => s + l.xp, 0);

  return { sessionId, date, lines, multiplier, baseTotal, total: Math.round(baseTotal * multiplier) };
}
