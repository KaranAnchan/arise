import { beforeEach, describe, expect, it } from 'vitest';
import type { AriseEvent } from '../types';
import { reduce } from '../reduce';
import { tallyGate } from '../tally';
import { gradeSet } from '../grade';
import { TIERS, ev, logSession, makeProgram, resetCounter } from './fixtures';

const cfg = { program: makeProgram(), tiers: TIERS };

beforeEach(resetCounter);

function gateDay(date: string): AriseEvent[] {
  return [
    ...logSession('bench', date, [[60, 8], [60, 8]]),
    ev('gate_cleared', { sessionId: 'push', sessionDate: date }, `${date}T11:00:00.000Z`),
  ];
}

describe('tallyGate', () => {
  it('itemizes a first session: flat sets + progression + gate clear', () => {
    const events = gateDay('2026-06-01');
    const t = tallyGate(events, cfg, 'push', '2026-06-01');
    expect(t.lines).toEqual([
      { kind: 'sets', ref: 'bench', xp: 20 },
      { kind: 'progression', ref: 'bench', xp: 50 },
      { kind: 'gateClear', ref: 'push', xp: 100 },
    ]);
    expect(t.multiplier).toBe(1);
    expect(t.total).toBe(170);
  });

  it('itemizes weight-up sessions with the streak multiplier applied', () => {
    const events = [
      ...gateDay('2026-06-01'),
      ev('gate_cleared', { sessionId: 'pull', sessionDate: '2026-06-03' }, '2026-06-03T11:00:00.000Z'),
      // honored week behind us → ×1.1 on this Monday's gate
      ...logSession('bench', '2026-06-08', [[62.5, 6], [62.5, 6]]),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }, '2026-06-08T11:00:00.000Z'),
    ];
    const t = tallyGate(events, cfg, 'push', '2026-06-08');
    expect(t.lines).toEqual([
      { kind: 'sets', ref: 'bench', xp: 15.625 },
      { kind: 'weightUp', ref: 'bench', xp: 120 },
      { kind: 'gateClear', ref: 'push', xp: 100 },
    ]);
    expect(t.multiplier).toBeCloseTo(1.1);
    expect(t.total).toBe(Math.round(235.625 * 1.1)); // 259
  });

  it('INVARIANT: tally total equals the reducer XP delta of the gate events', () => {
    const history = [
      ...gateDay('2026-06-01'),
      ev('gate_cleared', { sessionId: 'pull', sessionDate: '2026-06-03' }, '2026-06-03T11:00:00.000Z'),
      ev('shift_confirmed', { date: '2026-06-09' }, '2026-06-09T18:00:00.000Z'),
    ];
    const todayGate = [
      ...logSession('bench', '2026-06-08', [[62.5, 6], [62.5, 6]]),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }, '2026-06-08T11:00:00.000Z'),
    ];
    const before = reduce(history, cfg, '2026-06-08').totalXp;
    const after = reduce([...history, ...todayGate], cfg, '2026-06-08').totalXp;
    const t = tallyGate([...history, ...todayGate], cfg, 'push', '2026-06-08');
    expect(t.total).toBe(after - before);
  });

  it('omits the gate-clear line until the gate is actually cleared', () => {
    const events = logSession('bench', '2026-06-01', [[60, 8], [60, 8]]);
    const t = tallyGate(events, cfg, 'push', '2026-06-01');
    expect(t.lines.some((l) => l.kind === 'gateClear')).toBe(false);
  });
});

describe('gradeSet', () => {
  it('grades against the matching previous set by tonnage', () => {
    expect(gradeSet({ weightKg: 60, reps: 9 }, { weightKg: 60, reps: 8 })).toBe('beat');
    expect(gradeSet({ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 })).toBe('held');
    expect(gradeSet({ weightKg: 60, reps: 7 }, { weightKg: 60, reps: 8 })).toBe('regressed');
    expect(gradeSet({ weightKg: 62.5, reps: 8 }, { weightKg: 60, reps: 8 })).toBe('beat');
  });

  it('equal tonnage from different shapes counts as held (boundary)', () => {
    expect(gradeSet({ weightKg: 40, reps: 12 }, { weightKg: 60, reps: 8 })).toBe('held'); // 480 = 480
  });

  it('grades new when there is no baseline', () => {
    expect(gradeSet({ weightKg: 60, reps: 8 })).toBe('new');
  });
});

describe('reduce — exercise views for the Gate UI', () => {
  it('separates prev (before today) from today and last', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]]),
      ...logSession('bench', '2026-06-08', [[62.5, 6], [62.5, 6]]),
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.prevByExercise.bench.date).toBe('2026-06-01');
    expect(s.todayByExercise.bench.date).toBe('2026-06-08');
    expect(s.lastByExercise.bench.date).toBe('2026-06-08');
  });

  it('reports gates cleared today', () => {
    const events = [
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }),
      ev('gate_cleared', { sessionId: 'pull', sessionDate: '2026-06-03' }),
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.clearedToday).toEqual(['push']);
  });
});
