/**
 * Dev-only seeding: preview any level/tier without grinding 20 months. Simulates honest
 * training weeks (sessions, double progression, shifts, rest) through the real program
 * and the real XP rules, so seeded states are exactly what long-term play produces.
 *
 * Usage in the browser console (dev builds only):
 *   await arise.seed(27)   // reach level 27
 *   await arise.reset()    // wipe the local event log
 */
import { reduce } from '../engine/reduce';
import type { AriseEvent, EventType, PayloadFor } from '../engine/types';
import { ENGINE_PROGRAM, SESSIONS, WEEK } from '../data/program';
import { getManifest } from '../character/manifest';
import { db } from './../store/db';
import { appendEvents } from '../store/append';
import { addDays, dateIso, mondayOf } from '../store/dates';

interface Entry {
  type: EventType;
  payload: PayloadFor<EventType>;
  occurredAt?: string;
}

const DAY_OFFSET: Record<string, number> = { push: 0, work1: 1, pull: 2, work2: 3, work3: 4, legs: 5, rest: 6 };

function simulateWeeks(targetLevel: number, maxWeeks = 600): { entries: Entry[]; weeks: number } {
  const entries: Entry[] = [];
  const events: AriseEvent[] = [];
  let seq = 0;

  const push = (type: EventType, payload: PayloadFor<EventType>, date: string) => {
    seq += 1;
    const occurredAt = `${date}T10:${String(Math.floor(seq / 60) % 60).padStart(2, '0')}:${String(seq % 60).padStart(2, '0')}.000Z`;
    entries.push({ type, payload, occurredAt });
    events.push({ id: String(seq).padStart(10, '0'), userId: 'seed', deviceId: 'seed', type, payload, occurredAt, schemaVersion: 1 });
  };

  // per-exercise progression sim state: alternate hitting top of range, then +2.5 kg
  const weights: Record<string, { weightKg: number; atTop: boolean }> = {};
  for (const s of Object.values(SESSIONS))
    for (const ex of s.exercises) weights[ex.id] = { weightKg: 40, atTop: false };

  const cfg = { program: ENGINE_PROGRAM, tiers: getManifest().tiers };
  // simulate against week indexes from an arbitrary fixed Monday; dates get shifted later
  const epoch = new Date(2020, 0, 6); // a Monday

  for (let week = 0; week < maxWeeks; week++) {
    for (const day of WEEK) {
      const date = dateIso(addDays(epoch, week * 7 + DAY_OFFSET[day.key]));
      if (day.type === 'work') {
        push('shift_confirmed', { date }, date);
      } else if (day.type === 'rest') {
        push('rest_honored', { date }, date);
      } else if (day.session) {
        const session = SESSIONS[day.session];
        for (const ex of session.exercises) {
          const w = weights[ex.id];
          if (w.atTop) {
            w.weightKg += 2.5; // conditions were met last time → add weight, restart range
            w.atTop = false;
          } else {
            w.atTop = true;
          }
          const reps = w.atTop ? ex.scheme.repsHi : ex.scheme.repsLo;
          for (let setIndex = 0; setIndex < ex.scheme.sets; setIndex++) {
            push('set_logged', { exerciseId: ex.id, setIndex, weightKg: w.weightKg, reps, sessionDate: date }, date);
          }
        }
        push('gate_cleared', { sessionId: session.id, sessionDate: date }, date);
      }
    }
    if (reduce(events, cfg, dateIso(addDays(epoch, week * 7 + 6))).level >= targetLevel) {
      return { entries, weeks: week + 1 };
    }
  }
  return { entries, weeks: maxWeeks };
}

async function seed(targetLevel: number): Promise<void> {
  await db.events.clear();
  const { entries, weeks } = simulateWeeks(targetLevel);
  // shift dates so the simulation ends on the PREVIOUS week: nothing lands in the
  // future, the full target level is reached, and the streak reads as live
  const lastMonday = addDays(mondayOf(), -7);
  const simLastMonday = addDays(new Date(2020, 0, 6), (weeks - 1) * 7);
  const shiftDays = Math.round((lastMonday.getTime() - simLastMonday.getTime()) / 86_400_000);
  const today = dateIso();

  const shifted = entries
    .map((e) => {
      const p = e.payload as unknown as Record<string, unknown>;
      const move = (key: 'date' | 'sessionDate') => {
        if (typeof p[key] === 'string') {
          const d = dateIso(addDays(new Date(`${p[key]}T12:00:00`), shiftDays));
          p[key] = d;
        }
      };
      move('date');
      move('sessionDate');
      const occurredAt = e.occurredAt
        ? `${dateIso(addDays(new Date(`${e.occurredAt.slice(0, 10)}T12:00:00`), shiftDays))}T${e.occurredAt.slice(11)}`
        : undefined;
      return occurredAt ? { ...e, occurredAt } : e;
    })
    // don't seed facts from the future of the current week
    .filter((e) => {
      const p = e.payload as unknown as Record<string, string>;
      const d = p.sessionDate ?? p.date ?? today;
      return d <= today;
    });

  await appendEvents(shifted);
  console.info(`[ARISE:DEV] seeded ${shifted.length} events ≈ ${weeks} weeks of training`);
}

async function reset(): Promise<void> {
  await db.events.clear();
  console.info('[ARISE:DEV] event log cleared');
}

export function installDevTools(): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as Record<string, unknown>).arise = { seed, reset, db };
  console.info('[ARISE:DEV] window.arise = { seed(level), reset() }');
}
