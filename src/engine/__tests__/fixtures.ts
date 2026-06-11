import type { AriseEvent, EngineProgram, EventType, PayloadFor, TierDef } from '../types';

export function makeProgram(gymSessions: string[] = ['push', 'pull']): EngineProgram {
  return {
    gymSessions,
    exercises: {
      bench: {
        id: 'bench',
        sessionId: 'push',
        cls: 'compound',
        statTags: ['str'],
        scheme: { sets: 2, repsLo: 6, repsHi: 8 },
      },
      curl: {
        id: 'curl',
        sessionId: 'pull',
        cls: 'accessory',
        statTags: ['agi'],
        scheme: { sets: 2, repsLo: 10, repsHi: 12 },
      },
    },
  };
}

export const TIERS: TierDef[] = [
  {
    id: 't1',
    name: 'Tier 1',
    levels: [1, 10],
    statMultiplier: 1,
    aura: { theme: 'white', colors: ['#C9D4E0', '#EAF0F6', '#39414C'], intensity: 0.15 },
    arc: 'arc 1',
  },
  {
    id: 't2',
    name: 'Tier 2',
    levels: [11, 20],
    statMultiplier: 1.2,
    aura: { theme: 'blue', colors: ['#7FB3E8', '#B8D8F5', '#2A4A6E'], intensity: 0.25 },
    arc: 'arc 2',
  },
  {
    id: 't3',
    name: 'Tier 3',
    levels: [21, 100],
    statMultiplier: 2,
    aura: { theme: 'violet', colors: ['#7B3FE4', '#A06CF0', '#4A1F96'], intensity: 0.5 },
    arc: 'arc 3',
  },
];

let counter = 0;

/** Deterministic test event builder. */
export function ev<T extends EventType>(
  type: T,
  payload: PayloadFor<T>,
  occurredAt?: string,
): AriseEvent<T> {
  counter += 1;
  return {
    id: String(counter).padStart(8, '0'),
    userId: 'test',
    deviceId: 'test-device',
    type,
    payload,
    occurredAt: occurredAt ?? `2026-06-01T10:00:${String(counter % 60).padStart(2, '0')}.000Z`,
    schemaVersion: 1,
  };
}

export function resetCounter(): void {
  counter = 0;
}

/** Log a full exercise session as one event per set. */
export function logSession(
  exerciseId: string,
  date: string,
  sets: Array<[weightKg: number, reps: number]>,
): AriseEvent[] {
  return sets.map(([weightKg, reps], setIndex) =>
    ev(
      'set_logged',
      { exerciseId, setIndex, weightKg, reps, sessionDate: date },
      `${date}T10:0${setIndex}:00.000Z`,
    ),
  );
}
