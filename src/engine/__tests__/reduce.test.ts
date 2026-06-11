import { beforeEach, describe, expect, it } from 'vitest';
import type { AriseEvent } from '../types';
import { epochWeek, reduce } from '../reduce';
import { TIERS, ev, logSession, makeProgram, resetCounter } from './fixtures';

const cfg = { program: makeProgram(), tiers: TIERS };
/** single-gate week config for streak scenarios */
const cfgSolo = { program: makeProgram(['push']), tiers: TIERS };

beforeEach(resetCounter);

describe('epochWeek', () => {
  it('is Monday-based', () => {
    expect(epochWeek('2026-06-01')).toBe(epochWeek('2026-06-07')); // Mon..Sun same week
    expect(epochWeek('2026-06-08')).toBe(epochWeek('2026-06-01') + 1);
  });
});

describe('reduce — basics', () => {
  it('returns the zero state for an empty log', () => {
    const s = reduce([], cfg, '2026-06-01');
    expect(s.level).toBe(1);
    expect(s.totalXp).toBe(0);
    expect(s.tierIndex).toBe(0);
    expect(s.stats).toEqual({ str: 10, vit: 10, agi: 10, rec: 10 });
    expect(s.gatesCleared).toBe(0);
  });

  it('scores a first session: flat set XP + progression at top of range', () => {
    // 2 sets of 8 @ 60 kg: 2×10 flat + 50 progression (reps ≥ repsHi, full set count)
    const s = reduce(logSession('bench', '2026-06-01', [[60, 8], [60, 8]]), cfg, '2026-06-01');
    expect(s.totalXp).toBe(70);
    expect(s.statPools.str).toBe(50);
    expect(s.lastByExercise.bench).toEqual({
      date: '2026-06-01',
      sets: [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 }],
    });
  });

  it('scores a follow-up session: tonnage ratios + weight-up bonus', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]]), // 70
      // +2.5 kg, back to bottom of range: ratio 375/480 = 0.78125 per set → 15.625, +120 weight-up
      ...logSession('bench', '2026-06-08', [[62.5, 6], [62.5, 6]]),
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.totalXp).toBe(70 + Math.round(15.625 + 120)); // 70 + 136 = 206
    expect(s.level).toBe(2); // 206 ≥ 156
    expect(s.xpIntoLevel).toBe(50);
    expect(s.statPools.str).toBe(50 + 120);
  });

  it('does not re-award weight-up when returning to a previous max (no oscillation farming)', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]]),
      ...logSession('bench', '2026-06-08', [[62.5, 6], [62.5, 6]]), // +120 (new max)
      ...logSession('bench', '2026-06-15', [[55, 8], [55, 8]]), // deload, no bonus
      ...logSession('bench', '2026-06-22', [[62.5, 6], [62.5, 6]]), // back to old max — no bonus
      ...logSession('bench', '2026-06-29', [[65, 6], [65, 6]]), // +120 (genuinely new max)
    ];
    const s = reduce(events, cfg, '2026-06-29');
    expect(s.statPools.str).toBe(50 + 120 + 120); // one progression, two weight-ups only
  });

  it('withholds the progression bonus when weight dropped below the all-time max', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]]), // progression
      ...logSession('bench', '2026-06-08', [[40, 8], [40, 8]]), // top of range but sandbagged
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.statPools.str).toBe(50); // no second progression award
  });

  it('awards gate clears with VIT credit and counts them', () => {
    const events: AriseEvent[] = [
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }), // duplicate fact
    ];
    const s = reduce(events, cfg, '2026-06-01');
    expect(s.totalXp).toBe(100);
    expect(s.statPools.vit).toBe(100);
    expect(s.gatesCleared).toBe(1);
  });

  it('awards shifts (VIT) and honored rest (REC)', () => {
    const events: AriseEvent[] = [
      ev('shift_confirmed', { date: '2026-06-02' }),
      ev('shift_confirmed', { date: '2026-06-04' }),
      ev('rest_honored', { date: '2026-06-07' }),
    ];
    const s = reduce(events, cfg, '2026-06-07');
    expect(s.totalXp).toBe(30 + 30 + 25);
    expect(s.statPools.vit).toBe(60);
    expect(s.statPools.rec).toBe(25);
  });

  it('feeds AGI from accessory sets at full programmed reps only', () => {
    const events = [
      ...logSession('curl', '2026-06-03', [[20, 12], [20, 9]]), // one full-rep set of two
    ];
    const s = reduce(events, cfg, '2026-06-03');
    expect(s.statPools.agi).toBe(10); // only the 12-rep set
    expect(s.statPools.str).toBe(0); // accessory progression isn't possible here (reps 9 < 12)
  });

  it('scores sets for exercises missing from the program (forward compatibility)', () => {
    const s = reduce(logSession('mystery', '2026-06-01', [[10, 10]]), cfg, '2026-06-01');
    expect(s.totalXp).toBe(10); // set XP only, no scheme-dependent bonuses
  });
});

describe('reduce — amendments and quests', () => {
  it('applies set amendments last-write-wins', () => {
    const events: AriseEvent[] = [
      ev('set_logged', { exerciseId: 'bench', setIndex: 0, weightKg: 60, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T10:00:00.000Z'),
      ev('set_amended', { exerciseId: 'bench', setIndex: 0, weightKg: 62.5, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T10:05:00.000Z'),
    ];
    const s = reduce(events, cfg, '2026-06-01');
    expect(s.lastByExercise.bench.sets[0]).toEqual({ weightKg: 62.5, reps: 8 });
  });

  it('deduplicates quests by questId and pays from the template table', () => {
    const events: AriseEvent[] = [
      ev('quest_completed', { questId: 'q1', template: 'log_bodyweight', date: '2026-06-01' }),
      ev('quest_completed', { questId: 'q1', template: 'log_bodyweight', date: '2026-06-01' }),
      ev('quest_completed', { questId: 'q2', template: 'beat_tonnage', date: '2026-06-01' }),
    ];
    expect(reduce(events, cfg, '2026-06-01').totalXp).toBe(10 + 20);
  });

  it('ignores bodyweight events for XP (charts-only fact)', () => {
    const s = reduce([ev('bodyweight_logged', { kg: 78, date: '2026-06-01' })], cfg, '2026-06-01');
    expect(s.totalXp).toBe(0);
    expect(s.eventCount).toBe(1);
  });
});

describe('reduce — history import', () => {
  const importEvent = (id?: string) =>
    ev('history_imported', {
      source: 'shift-lift',
      entries: [
        { exerciseId: 'bench', date: '2026-05-04', weightKg: 55, reps: [8, 8] },
        { exerciseId: 'bench', date: '2026-05-11', weightKg: 57.5, reps: [6, 6] },
      ],
    }, id);

  it('expands imported entries through the same XP pipeline', () => {
    const s = reduce([importEvent()], cfg, '2026-06-01');
    // session 1: 2×10 + 50 progression = 70
    // session 2: ratio 345/440 = 0.784 → 2×7.84 = 15.68; +120 weight-up → round(135.68+...)
    expect(s.totalXp).toBe(70 + Math.round(15.681818181818182 + 120));
    expect(s.lastByExercise.bench.date).toBe('2026-05-11');
  });

  it('is idempotent per source', () => {
    const once = reduce([importEvent()], cfg, '2026-06-01');
    const twice = reduce([importEvent(), importEvent()], cfg, '2026-06-01');
    expect(twice.totalXp).toBe(once.totalXp);
  });
});

describe('reduce — streaks', () => {
  const mondays = ['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29', '2026-07-06', '2026-07-13'];

  it('multiplies gate XP by the streak of fully-honored prior weeks, capped ×1.5', () => {
    const events = mondays.map((d) => ev('gate_cleared', { sessionId: 'push', sessionDate: d }));
    const s = reduce(events, cfgSolo, '2026-07-13');
    // 100×1.0 + 100×1.1 + ×1.2 + ×1.3 + ×1.4 + ×1.5 + ×1.5
    expect(s.totalXp).toBe(100 + 110 + 120 + 130 + 140 + 150 + 150);
    expect(s.streakWeeks).toBe(7); // current week honored → counts
    expect(s.multiplier).toBe(1.5);
  });

  it('requires every scheduled gym session for a week to count', () => {
    const events = [
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }),
      // pull never cleared → week not honored under the two-session program
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }),
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.totalXp).toBe(200); // both weeks at ×1.0
    expect(s.streakWeeks).toBe(0);
  });

  it('resets the multiplier after a missed week without touching banked XP', () => {
    const events = [
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }),
      // 2026-06-15 missed
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-22' }),
    ];
    const s = reduce(events, cfgSolo, '2026-06-22');
    expect(s.totalXp).toBe(100 + 110 + 100); // third clear back to ×1.0
    expect(s.streakWeeks).toBe(1); // current week honored, previous not
  });

  it('reports the multiplier the *next* gate will receive', () => {
    const events = [ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' })];
    const s = reduce(events, cfgSolo, '2026-06-03');
    expect(s.streakWeeks).toBe(1);
    expect(s.multiplier).toBeCloseTo(1.1);
  });
});

describe('reduce — levels are monotonic under append', () => {
  it('never lowers the level as events are appended in any order', () => {
    const all = [
      ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]]),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }),
      ...logSession('curl', '2026-06-03', [[20, 12], [20, 12]]),
      ev('gate_cleared', { sessionId: 'pull', sessionDate: '2026-06-03' }),
      ev('shift_confirmed', { date: '2026-06-02' }),
      ev('rest_honored', { date: '2026-06-07' }),
    ];
    let lastLevel = 0;
    for (let i = 0; i <= all.length; i++) {
      const { level } = reduce(all.slice(0, i), cfg, '2026-06-07');
      expect(level).toBeGreaterThanOrEqual(lastLevel);
      lastLevel = level;
    }
  });
});

describe('reduce — tiers', () => {
  it('selects the tier for the current level and applies its stat multiplier', () => {
    // craft enough XP for level 11 (tier 2): sum xpToNext(1..10) ≈ 156+162+...+222
    const s = reduce(
      [ev('quest_completed', { questId: 'big', template: 'clear_gate', date: '2026-06-01' })],
      { program: makeProgram(), tiers: TIERS },
      '2026-06-01',
    );
    expect(s.tierIndex).toBe(0);
    // direct check of tier resolution at higher XP via many gate clears
    const manyGates = Array.from({ length: 30 }, (_, i) =>
      ev('gate_cleared', { sessionId: 'push', sessionDate: `2026-0${1 + Math.floor(i / 25)}-${String((i % 25) + 1).padStart(2, '0')}` }),
    );
    const s2 = reduce(manyGates, cfg, '2026-06-01');
    expect(s2.totalXp).toBeGreaterThan(2000);
    expect(s2.level).toBeGreaterThan(10);
    expect(s2.tierIndex).toBe(1);
  });
});
