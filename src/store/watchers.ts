/**
 * Store-side watchers — the ONLY place quest/rest events are emitted automatically.
 * The engine stays pure (it never writes); these observe derived state and append
 * through the single write path. Every emission is idempotent twice over: questIds /
 * rest dates are deduped facts in the reducer, and guards here keep the log tidy.
 */
import { useEffect, useMemo } from 'react';
import { collectFacts, sortEvents } from '../engine/reduce';
import { generateQuests, questConditionMet, type QuestDef } from '../engine/quests';
import type { AriseEvent, GameState } from '../engine/types';
import type { DayType } from '../data/types';
import { DOW_TO_KEY, ENGINE_PROGRAM, WEEK } from '../data/program';
import { appendEvent, appendEvents } from './append';
import { addDays, dateIso } from './dates';
import { db } from './db';

/** Roster day type for a local calendar date. */
export function dayTypeOf(date: string): DayType {
  const [y, m, d] = date.split('-').map(Number);
  const key = DOW_TO_KEY[new Date(y, m - 1, d).getDay()];
  return WEEK.find((w) => w.key === key)!.type;
}

/** Today's roster entry (type + session). */
export function todayPlan() {
  const key = DOW_TO_KEY[new Date().getDay()];
  return WEEK.find((w) => w.key === key)!;
}

/**
 * Sanctuary back-fill: past roster rest days (since the log began, up to yesterday)
 * with no training logged and no rest_honored yet. Pure — unit-testable.
 */
export function pastUnhonoredRests(events: AriseEvent[], todayIso: string): string[] {
  if (events.length === 0) return [];
  const facts = collectFacts(sortEvents(events));
  const trained = new Set([...facts.sessions.values()].map((s) => s.date));
  const factDates = [
    ...trained,
    ...facts.shiftDates,
    ...facts.restDates,
    ...[...facts.gateClears.values()].map((c) => c.date),
    ...facts.bodyweights.keys(),
  ].filter((d) => d <= todayIso);
  if (factDates.length === 0) return [];
  const first = factDates.reduce((a, b) => (a < b ? a : b));

  const out: string[] = [];
  const [y, m, d] = first.split('-').map(Number);
  for (let cur = new Date(y, m - 1, d); ; cur = addDays(cur, 1)) {
    const date = dateIso(cur);
    if (date >= todayIso) break; // strictly past days; today is judged tomorrow
    if (dayTypeOf(date) === 'rest' && !trained.has(date) && !facts.restDates.has(date)) {
      out.push(date);
    }
  }
  return out;
}

let restsBackfilled = false;

/** Run once per boot: emit rest_honored for every past unhonored rest day. */
export async function honorPastRests(): Promise<void> {
  if (restsBackfilled) return;
  restsBackfilled = true;
  const events = (await db.events.toArray()) as AriseEvent[];
  const dates = pastUnhonoredRests(events, dateIso());
  if (dates.length > 0) {
    await appendEvents(dates.map((date) => ({ type: 'rest_honored', payload: { date } })));
  }
}

/** Ids already emitted this session — keeps the effect from double-appending while
 *  the liveQuery state is still catching up. The reducer dedupes anyway. */
const claimed = new Set<string>();

/**
 * Today's quests + the auto-claim watcher: the moment an 'auto' quest's condition is
 * met by real events, its quest_completed is appended. Intrinsic/manual quests are
 * never claimed here.
 */
export function useQuests(state: GameState | undefined): QuestDef[] {
  const today = dateIso();
  const plan = todayPlan();

  const quests = useMemo<QuestDef[]>(
    () => (state ? generateQuests(plan.type, plan.session, today, state, ENGINE_PROGRAM) : []),
    [state, plan.type, plan.session, today],
  );

  useEffect(() => {
    if (!state) return;
    for (const q of quests) {
      if (q.claim !== 'auto' || claimed.has(q.id) || state.completedQuests.includes(q.id)) continue;
      if (questConditionMet(q, state, today)) {
        claimed.add(q.id);
        void appendEvent('quest_completed', { questId: q.id, template: q.template, date: today });
      }
    }
  }, [state, quests, today]);

  return quests;
}

/** Mount once at the app root. */
export function useWatchers(): void {
  useEffect(() => {
    void honorPastRests();
  }, []);
}
