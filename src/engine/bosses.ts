/**
 * Bosses (GDD §6): auto-generated PR encounters, derived entirely from the set log —
 * no boss events exist. A milestone weight (every +10 kg on compounds, +5 kg on
 * accessories) is DEFEATED when a session holds it for every programmed set at the
 * bottom of the rep range. A first-ever log establishes a baseline and defeats
 * nothing — bosses only exist where there is a trajectory to beat.
 *
 * Failure changes nothing by construction: there is no "attempted" state to store,
 * only milestones that are crossed or aren't yet.
 */
import type { EngineExercise, ExerciseSessionRecord } from './types';
import { XP } from './xp';

export const milestoneStep = (cls: EngineExercise['cls']): number => (cls === 'compound' ? 10 : 5);

/** "Named" milestones (100 kg moments) carry a relic and bonus XP. */
export const isNamedMilestone = (milestone: number): boolean => milestone % 50 === 0;

export function bossXp(cls: EngineExercise['cls'], named: boolean): number {
  return (cls === 'compound' ? XP.boss.compound : XP.boss.accessory) + (named ? XP.boss.namedBonus : 0);
}

/**
 * The weight this session cleanly holds: all programmed sets present, every set at
 * the bottom of the rep range or better → the minimum weight across them. 0 otherwise.
 */
export function achievedWeight(ex: EngineExercise, rec: ExerciseSessionRecord): number {
  if (rec.sets.length < ex.scheme.sets) return 0;
  if (!rec.sets.every((s) => s.reps >= ex.scheme.repsLo)) return 0;
  return Math.min(...rec.sets.map((s) => s.weightKg));
}

/**
 * Milestones crossed by this session, ascending — measured against the previous CLEAN
 * baseline (best weight ever held for full sets in range), not the touched max.
 * Touching a weight in a failed attempt must not bury the boss: the kill still counts
 * when the weight is finally held cleanly. Requires a prior baseline (first-ever
 * session establishes one and defeats nothing).
 */
export function defeatedMilestones(
  ex: EngineExercise,
  rec: ExerciseSessionRecord,
  prevCleanMax: number,
): number[] {
  if (prevCleanMax <= 0) return [];
  const achieved = achievedWeight(ex, rec);
  const step = milestoneStep(ex.cls);
  const out: number[] = [];
  for (let m = Math.floor(prevCleanMax / step) * step + step; m <= achieved; m += step) {
    out.push(m);
  }
  return out;
}

/**
 * The encounter to announce: the next milestone above the clean baseline, visible when
 * the touched max is within one clean +2.5 kg session of it. A failed attempt keeps the
 * boss announced (`THE COLOSSUS STANDS`); a clean kill retires it until the next one.
 */
export function pendingMilestone(ex: EngineExercise, cleanMax: number, touchedMax: number): number | null {
  if (cleanMax <= 0 || touchedMax <= 0) return null; // no clean baseline → no encounter
  const step = milestoneStep(ex.cls);
  const m = Math.floor(cleanMax / step) * step + step;
  return m - touchedMax <= 2.5 ? m : null;
}

/** Epithet pool per session type — names need no authored content per boss. */
const EPITHETS: Record<string, string> = {
  push: 'COLOSSUS',
  pull: 'REVENANT',
  legs: 'TITAN',
};

export function bossEpithet(sessionId: string): string {
  return EPITHETS[sessionId] ?? 'WARDEN';
}
