import type { LoggedSet } from './types';

export type SetGrade = 'beat' | 'held' | 'regressed' | 'new';

/**
 * Grade a logged set against the matching set (same index) of the previous session.
 * Tonnage comparison — same rule that drives set XP, so the chip never lies about
 * what the XP will say.
 */
export function gradeSet(cur: LoggedSet, prev?: LoggedSet): SetGrade {
  if (!prev) return 'new';
  const a = cur.weightKg * cur.reps;
  const b = prev.weightKg * prev.reps;
  if (a > b) return 'beat';
  if (a === b) return 'held';
  return 'regressed';
}

export const GRADE_GLYPH: Record<SetGrade, string> = {
  beat: '▲ BEAT',
  held: '▶ HELD',
  regressed: '▼ DOWN',
  new: '◆ NEW',
};
