/**
 * The keystone determinism test (PRD AC-4.4 / AC-7.2): reducing any permutation of the
 * same event set must produce the identical GameState. This is what makes multi-device
 * sync trivially consistent — devices merge event sets, never states.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { AriseEvent } from '../types';
import { reduce } from '../reduce';
import { TIERS, makeProgram } from './fixtures';

const cfg = { program: makeProgram(), tiers: TIERS };

const exerciseIds = ['bench', 'curl', 'mystery'];
const dates = ['2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10', '2026-06-15'];
const times = ['08:00:00', '10:15:30', '12:00:00', '18:45:10'];

const arbEvent: fc.Arbitrary<AriseEvent> = fc
  .tuple(
    fc.nat({ max: 7 }),
    fc.constantFrom(...exerciseIds),
    fc.constantFrom(...dates),
    fc.constantFrom(...times),
    fc.nat({ max: 3 }), // setIndex
    fc.integer({ min: 0, max: 8 }).map((n) => 20 + n * 5), // weightKg
    fc.integer({ min: 1, max: 15 }), // reps
    fc.uuid(),
  )
  .map(([kind, exerciseId, date, time, setIndex, weightKg, reps, id]) => {
    const base = { id, userId: 'u', deviceId: 'd', occurredAt: `${date}T${time}.000Z`, schemaVersion: 1 as const };
    switch (kind) {
      case 0:
      case 1:
        return { ...base, type: 'set_logged' as const, payload: { exerciseId, setIndex, weightKg, reps, sessionDate: date } };
      case 2:
        return { ...base, type: 'set_amended' as const, payload: { exerciseId, setIndex, weightKg, reps, sessionDate: date } };
      case 3:
        return { ...base, type: 'gate_cleared' as const, payload: { sessionId: setIndex % 2 ? 'push' : 'pull', sessionDate: date } };
      case 4:
        return { ...base, type: 'quest_completed' as const, payload: { questId: `q-${date}-${setIndex}`, template: 'beat_tonnage', date } };
      case 5:
        return { ...base, type: 'shift_confirmed' as const, payload: { date } };
      case 6:
        return { ...base, type: 'rest_honored' as const, payload: { date } };
      default:
        return {
          ...base,
          type: 'history_imported' as const,
          payload: { source: 'shift-lift', entries: [{ exerciseId, date, weightKg, reps: [reps, reps] }] },
        };
    }
  });

describe('replay determinism', () => {
  it('any permutation of the same events reduces to the identical state', () => {
    fc.assert(
      fc.property(
        fc.array(arbEvent, { minLength: 0, maxLength: 60 }).chain((events) =>
          fc.tuple(fc.constant(events), fc.shuffledSubarray(events, { minLength: events.length })),
        ),
        ([events, shuffled]) => {
          expect(reduce(shuffled, cfg, '2026-06-20')).toEqual(reduce(events, cfg, '2026-06-20'));
        },
      ),
      { numRuns: 200 },
    );
  });

  it('duplicate event ids are idempotent', () => {
    fc.assert(
      fc.property(fc.array(arbEvent, { minLength: 1, maxLength: 30 }), (events) => {
        const doubled = [...events, ...events.map((e) => ({ ...e }))];
        expect(reduce(doubled, cfg, '2026-06-20')).toEqual(reduce(events, cfg, '2026-06-20'));
      }),
      { numRuns: 100 },
    );
  });
});
