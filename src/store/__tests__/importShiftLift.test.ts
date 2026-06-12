import { describe, expect, it } from 'vitest';
import { reduce } from '../../engine/reduce';
import { TIERS, makeProgram } from '../../engine/__tests__/fixtures';
import type { AriseEvent } from '../../engine/types';
import { parseShiftLiftExport } from '../importShiftLift';

const cfg = { program: makeProgram(), tiers: TIERS };

const LOG = [
  { date: '2026-05-04', weightKg: 55, reps: [8, 8] },
  { date: '2026-05-11', weightKg: 57.5, reps: [6, 6] },
];

const importEvent = (payload: ReturnType<typeof parseShiftLiftExport>, id: string): AriseEvent => ({
  id,
  userId: 'test',
  deviceId: 'test',
  type: 'history_imported',
  payload,
  occurredAt: '2026-06-01T10:00:00.000Z',
  schemaVersion: 1,
});

describe('parseShiftLiftExport — accepted shapes', () => {
  it('parses a raw localStorage dump (values are JSON strings, noise keys ignored)', () => {
    const dump = JSON.stringify({
      'sl2.day': 'push',
      'sl2.done.push.2026-W23': '[0,1]',
      'sl2.log.bench': JSON.stringify(LOG),
      'sl2.log.curl': JSON.stringify([{ date: '2026-05-06', weightKg: 20, reps: [12, 12] }]),
    });
    const payload = parseShiftLiftExport(dump);
    expect(payload.entries).toHaveLength(3);
    expect(payload.entries.filter((e) => e.exerciseId === 'bench')).toHaveLength(2);
    expect(payload.source).toMatch(/^shift-lift:[0-9a-f]{8}$/);
  });

  it('parses pre-parsed array values and bare exerciseId maps', () => {
    const withPrefix = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': LOG }));
    const bare = parseShiftLiftExport(JSON.stringify({ bench: LOG }));
    expect(withPrefix.entries).toEqual(bare.entries);
    expect(withPrefix.source).toBe(bare.source); // identity is content, not shape
  });

  it('rejects garbage with human messages', () => {
    expect(() => parseShiftLiftExport('not json')).toThrow(/expected a JSON object/i);
    expect(() => parseShiftLiftExport('{"sl2.day":"push"}')).toThrow(/no training history/i);
    expect(() => parseShiftLiftExport('{"bench":[{"date":"bad","weightKg":1,"reps":[1]}]}')).toThrow();
  });
});

describe('import → engine pipeline', () => {
  it('reproduces dated history with engine-rule XP', () => {
    const payload = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': LOG }));
    const s = reduce([importEvent(payload, 'imp-1')], cfg, '2026-06-01');
    // identical math to the reduce.test history-import case:
    // session 1: 2×10 + 50 progression; session 2: ratio sets + 120 weight-up
    expect(s.totalXp).toBe(70 + Math.round(15.681818181818182 + 120));
    expect(s.lastByExercise.bench.date).toBe('2026-05-11');
    expect(s.trainingDates).toEqual(['2026-05-04', '2026-05-11']);
  });

  it('is idempotent: identical paste twice = same source = no double XP', () => {
    const p1 = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': LOG }));
    const p2 = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': LOG }));
    const once = reduce([importEvent(p1, 'imp-1')], cfg, '2026-06-01');
    const twice = reduce([importEvent(p1, 'imp-1'), importEvent(p2, 'imp-2')], cfg, '2026-06-01');
    expect(twice.totalXp).toBe(once.totalXp);
  });

  it('overlapping different exports merge without double-counting shared sessions', () => {
    const p1 = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': [LOG[0]] }));
    const p2 = parseShiftLiftExport(JSON.stringify({ 'sl2.log.bench': LOG })); // superset
    expect(p1.source).not.toBe(p2.source);
    const merged = reduce([importEvent(p1, 'imp-1'), importEvent(p2, 'imp-2')], cfg, '2026-06-01');
    const supersetOnly = reduce([importEvent(p2, 'imp-2')], cfg, '2026-06-01');
    // shared session upserts the same (exercise, date, setIndex) keys — no doubling
    expect(merged.totalXp).toBe(supersetOnly.totalXp);
  });
});
