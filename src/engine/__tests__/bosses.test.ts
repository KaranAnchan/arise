import { beforeEach, describe, expect, it } from 'vitest';
import { achievedWeight, defeatedMilestones, pendingMilestone } from '../bosses';
import { reduce } from '../reduce';
import { tallyGate } from '../tally';
import type { AriseEvent } from '../types';
import { TIERS, ev, logSession, makeProgram, resetCounter } from './fixtures';

const cfg = { program: makeProgram(), tiers: TIERS };
const bench = cfg.program.exercises.bench; // compound, 2 sets, 6–8 reps → milestone step 10
const curl = cfg.program.exercises.curl; // accessory, 2 sets, 10–12 reps → step 5

beforeEach(resetCounter);

describe('bosses — detection primitives', () => {
  it('achievedWeight: all programmed sets at repsLo or better → min weight, else 0', () => {
    expect(achievedWeight(bench, { date: 'd', sets: [{ weightKg: 80, reps: 6 }, { weightKg: 80, reps: 6 }] })).toBe(80);
    expect(achievedWeight(bench, { date: 'd', sets: [{ weightKg: 80, reps: 6 }, { weightKg: 80, reps: 5 }] })).toBe(0); // below range
    expect(achievedWeight(bench, { date: 'd', sets: [{ weightKg: 80, reps: 6 }] })).toBe(0); // missing set
    expect(achievedWeight(bench, { date: 'd', sets: [{ weightKg: 82.5, reps: 6 }, { weightKg: 80, reps: 8 }] })).toBe(80);
  });

  it('defeatedMilestones: crossings above the prior all-time max, never on first log', () => {
    const rec = { date: 'd', sets: [{ weightKg: 80, reps: 6 }, { weightKg: 80, reps: 6 }] };
    expect(defeatedMilestones(bench, rec, 77.5)).toEqual([80]);
    expect(defeatedMilestones(bench, rec, 0)).toEqual([]); // baseline session — no farming
    expect(defeatedMilestones(bench, rec, 80)).toEqual([]); // already held
    // a big jump defeats every crossed milestone
    expect(defeatedMilestones(bench, { date: 'd', sets: [{ weightKg: 100, reps: 6 }, { weightKg: 100, reps: 6 }] }, 75)).toEqual([80, 90, 100]);
    // accessories use 5 kg steps
    expect(defeatedMilestones(curl, { date: 'd', sets: [{ weightKg: 25, reps: 10 }, { weightKg: 25, reps: 10 }] }, 22.5)).toEqual([25]);
  });

  it('pendingMilestone: announced only when within one clean +2.5 kg session', () => {
    expect(pendingMilestone(bench, 77.5, 77.5)).toBe(80);
    expect(pendingMilestone(bench, 80, 80)).toBeNull(); // next is 90, far away
    expect(pendingMilestone(bench, 75, 75)).toBeNull(); // 5 kg out — not yet
    expect(pendingMilestone(bench, 0, 0)).toBeNull(); // no history, no boss
    expect(pendingMilestone(curl, 22.5, 22.5)).toBe(25);
    // touched 80 in a failed attempt: the boss STANDS and stays announced
    expect(pendingMilestone(bench, 77.5, 80)).toBe(80);
    // never held anything cleanly → no baseline → no encounter
    expect(pendingMilestone(bench, 0, 80)).toBeNull();
  });
});

describe('bosses — reducer integration', () => {
  const trajectory = [
    ...logSession('bench', '2026-06-01', [[77.5, 8], [77.5, 8]]), // baseline (no boss; prevMax 0)
    ...logSession('bench', '2026-06-08', [[80, 6], [80, 6]]), // crosses 80 → boss
  ];

  it('awards boss XP at face value (never streak-multiplied) and feeds STR', () => {
    const withBoss = reduce(trajectory, cfg, '2026-06-08');
    const baselineOnly = reduce(trajectory.slice(0, 2), cfg, '2026-06-08');
    // session 2 on its own: sets ratio 480/620 → 2×7.741…, weight-up +120, boss +300
    const sessionXp = Math.round(2 * ((80 * 6) / (77.5 * 8)) * 10 + 120);
    expect(withBoss.totalXp).toBe(baselineOnly.totalXp + sessionXp + 300);
    expect(withBoss.bossesDefeated).toEqual([
      { exerciseId: 'bench', date: '2026-06-08', milestone: 80, named: false, xp: 300 },
    ]);
    expect(withBoss.statPools.str).toBe(baselineOnly.statPools.str + 120 + 300);
  });

  it('named milestones (50 kg multiples) pay the bonus and mint a PR relic', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[97.5, 8], [97.5, 8]]),
      ...logSession('bench', '2026-06-08', [[100, 6], [100, 6]]),
    ];
    const s = reduce(events, cfg, '2026-06-08');
    expect(s.bossesDefeated[0]).toMatchObject({ milestone: 100, named: true, xp: 400 });
    expect(s.relics).toContainEqual({ kind: 'pr', exerciseId: 'bench', milestone: 100, date: '2026-06-08' });
  });

  it('announces the pending encounter when the trajectory closes in', () => {
    const s = reduce(logSession('bench', '2026-06-01', [[77.5, 8], [77.5, 8]]), cfg, '2026-06-01');
    expect(s.pendingBosses).toEqual([
      { exerciseId: 'bench', sessionId: 'push', milestone: 80, repsLo: 6 },
    ]);
    // after the kill, nothing pending until the next milestone is close again
    expect(reduce(trajectory, cfg, '2026-06-08').pendingBosses).toEqual([]);
  });

  it('a failed attempt changes nothing and the encounter re-announces', () => {
    const failed = [
      ...logSession('bench', '2026-06-01', [[77.5, 8], [77.5, 8]]),
      ...logSession('bench', '2026-06-08', [[80, 6], [80, 5]]), // second set below range
    ];
    const s = reduce(failed, cfg, '2026-06-08');
    expect(s.bossesDefeated).toEqual([]);
    expect(s.pendingBosses[0]?.milestone).toBe(80); // still standing, still announced
  });

  it('a touched-but-failed weight still counts as a kill when finally held cleanly', () => {
    const events = [
      ...logSession('bench', '2026-06-01', [[77.5, 8], [77.5, 8]]), // clean baseline 77.5
      ...logSession('bench', '2026-06-08', [[80, 6], [80, 5]]), // touches 80, fails the hold
      ...logSession('bench', '2026-06-15', [[80, 6], [80, 6]]), // holds it — the kill lands
    ];
    const s = reduce(events, cfg, '2026-06-15');
    expect(s.bossesDefeated).toEqual([
      { exerciseId: 'bench', date: '2026-06-15', milestone: 80, named: false, xp: 300 },
    ]);
  });

  it('tally itemizes boss lines outside the multiplier and total matches the reducer delta', () => {
    const history: AriseEvent[] = [
      // a fully-honored prior week so the gate XP is multiplied (×1.1) but boss XP is not
      ...logSession('bench', '2026-06-01', [[77.5, 8], [77.5, 8]]),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }),
      ev('gate_cleared', { sessionId: 'pull', sessionDate: '2026-06-03' }),
    ];
    const gateEvents: AriseEvent[] = [
      ...logSession('bench', '2026-06-08', [[80, 6], [80, 6]]),
      ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-08' }),
    ];
    const all = [...history, ...gateEvents];

    const tally = tallyGate(all, cfg, 'push', '2026-06-08');
    expect(tally.multiplier).toBeCloseTo(1.1);
    expect(tally.lines.find((l) => l.kind === 'boss')).toMatchObject({ ref: 'bench', xp: 300, milestone: 80 });
    expect(tally.bossTotal).toBe(300);
    expect(tally.total).toBe(Math.round(tally.baseTotal * 1.1) + 300);

    const delta =
      reduce(all, cfg, '2026-06-08').totalXp - reduce(history, cfg, '2026-06-08').totalXp;
    expect(tally.total).toBe(delta); // the invariant, now with bosses in play
  });
});

describe('relics & titles', () => {
  it('Gatebreaker: 10 consecutive honored weeks ever, even if the streak later broke', () => {
    const soloCfg = { program: makeProgram(['push']), tiers: TIERS };
    const mondays = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 5 + i * 7)); // 2026-01-05 is a Monday
      return d.toISOString().slice(0, 10);
    });
    const events = mondays.map((d) => ev('gate_cleared', { sessionId: 'push', sessionDate: d }));
    // streak is long dead by "now" — the relic is permanent anyway
    const s = reduce(events, soloCfg, '2026-06-08');
    expect(s.maxStreakWeeks).toBe(10);
    expect(s.relics).toContainEqual({ kind: 'streak10' });
    expect(s.streakWeeks).toBe(0);
  });

  it('Imported Soul: any history import mints the relic', () => {
    const s = reduce(
      [ev('history_imported', { source: 'shift-lift:abc', entries: [{ exerciseId: 'bench', date: '2026-05-04', weightKg: 50, reps: [8] }] })],
      cfg,
      '2026-06-08',
    );
    expect(s.relics).toContainEqual({ kind: 'import' });
  });

  it('titles accumulate per tier reached', () => {
    expect(reduce([], cfg, '2026-06-08').titles).toEqual(['Tier 1']);
    const manyGates = Array.from({ length: 30 }, (_, i) =>
      ev('gate_cleared', { sessionId: 'push', sessionDate: `2026-0${1 + Math.floor(i / 25)}-${String((i % 25) + 1).padStart(2, '0')}` }),
    );
    const s = reduce(manyGates, cfg, '2026-06-08');
    expect(s.tierIndex).toBe(1);
    expect(s.titles).toEqual(['Tier 1', 'Tier 2']);
  });
});
