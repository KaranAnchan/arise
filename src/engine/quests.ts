/**
 * Daily quest generation (GDD §4.1) — a pure function of (day type, date, state).
 * Quest ids are deterministic per (date, template, subject), so regeneration is free
 * and `quest_completed` dedup in the reducer makes claiming idempotent.
 *
 * Claim semantics (the part that keeps XP honest):
 * - 'auto'      → a store-side watcher emits `quest_completed` the moment the condition
 *                 is met by logged events. The engine never emits events.
 * - 'manual'    → the System cannot verify it; the user taps the row (UI emits).
 * - 'intrinsic' → the quest IS its underlying bonus (`shift_confirmed`/`rest_honored`
 *                 pay XP.shift/XP.rest). Emitting `quest_completed` for these would
 *                 double-pay — they never produce one.
 *
 * Unclaimed quests expire silently at midnight: tomorrow's ids are different, and no
 * penalty event type exists, so expiry is structurally incapable of costing anything.
 */
import type { EngineProgram, ExerciseSessionRecord, GameState } from './types';
import { questXp } from './xp';

export type QuestDayType = 'gym' | 'work' | 'rest';

export type QuestClaim = 'auto' | 'manual' | 'intrinsic';

export interface QuestDef {
  /** stable per (date, template, subject) — the dedupe key */
  id: string;
  /** key into XP.quest */
  template: string;
  /** exerciseId for exercise quests, sessionId for the gate quest */
  subject?: string | undefined;
  xp: number;
  claim: QuestClaim;
}

const DAY_MS = 86_400_000;
const dayNumber = (dateIso: string): number => Math.floor(Date.parse(`${dateIso}T00:00:00Z`) / DAY_MS);

const questId = (date: string, template: string, subject?: string): string =>
  subject ? `${date}|${template}|${subject}` : `${date}|${template}`;

const make = (date: string, template: string, claim: QuestClaim, subject?: string): QuestDef => ({
  id: questId(date, template, subject),
  template,
  subject,
  xp: questXp(template),
  claim,
});

const tonnage = (rec: ExerciseSessionRecord | undefined): number =>
  rec ? rec.sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0) : 0;

/** GDD: "Log body weight" is offered ≤ 1×/week — due when none in the last 7 days. */
export function bodyweightDue(state: GameState, date: string): boolean {
  const today = dayNumber(date);
  return !state.bodyweights.some((b) => today - dayNumber(b.date) < 7 && dayNumber(b.date) <= today);
}

/** Exercises of one session in program (insertion) order. */
function sessionExercises(program: EngineProgram, sessionId: string) {
  return Object.values(program.exercises).filter((e) => e.sessionId === sessionId);
}

/**
 * Generate today's 2–3 quests. Deterministic: same inputs ⇒ same quests, all day.
 * `sessionId` is today's roster session on gym days, undefined otherwise.
 */
export function generateQuests(
  dayType: QuestDayType,
  sessionId: string | undefined,
  date: string,
  state: GameState,
  program: EngineProgram,
): QuestDef[] {
  const out: QuestDef[] = [];

  if (dayType === 'gym' && sessionId) {
    out.push(make(date, 'clear_gate', 'auto', sessionId));
    const exercises = sessionExercises(program, sessionId);
    // beat_tonnage needs history: first compound with a previous session, else any exercise with one
    const withHistory =
      exercises.find((e) => e.cls === 'compound' && state.prevByExercise[e.id]) ??
      exercises.find((e) => state.prevByExercise[e.id]);
    if (withHistory) out.push(make(date, 'beat_tonnage', 'auto', withHistory.id));
    // review_form for a never-trained ("new-ish") exercise — unverifiable, manual claim
    const fresh = exercises.find((e) => !state.lastByExercise[e.id]);
    if (out.length < 3 && fresh) out.push(make(date, 'review_form', 'manual', fresh.id));
  }

  if (dayType === 'work') out.push(make(date, 'endurance_trial', 'intrinsic'));
  if (dayType === 'rest') out.push(make(date, 'honor_sanctuary', 'intrinsic'));

  if (out.length < 3 && bodyweightDue(state, date)) out.push(make(date, 'log_bodyweight', 'auto'));

  return out.slice(0, 3);
}

/**
 * The pure completion condition — what the auto-claim watcher evaluates.
 * honor_sanctuary is judged retroactively (rest_honored lands on a later boot),
 * so its live condition is always false; its XP can never be missed regardless.
 */
export function questConditionMet(q: QuestDef, state: GameState, date: string): boolean {
  switch (q.template) {
    case 'clear_gate':
      return q.subject !== undefined && state.clearedToday.includes(q.subject);
    case 'beat_tonnage': {
      if (!q.subject) return false;
      const prev = tonnage(state.prevByExercise[q.subject]);
      return prev > 0 && tonnage(state.todayByExercise[q.subject]) > prev;
    }
    case 'endurance_trial':
      return state.shiftConfirmedToday;
    case 'log_bodyweight':
      return state.bodyweights.some((b) => b.date === date);
    default:
      return false; // honor_sanctuary (retroactive), review_form (manual), unknown
  }
}

/** What the UI renders as the checkmark: claimed, or an intrinsic whose event landed. */
export function questDone(q: QuestDef, state: GameState, date: string): boolean {
  if (q.claim === 'intrinsic') return questConditionMet(q, state, date);
  return state.completedQuests.includes(q.id);
}
