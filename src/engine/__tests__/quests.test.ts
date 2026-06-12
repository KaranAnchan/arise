import { beforeEach, describe, expect, it } from 'vitest';
import type { AriseEvent } from '../types';
import { reduce } from '../reduce';
import { bodyweightDue, generateQuests, questConditionMet, questDone } from '../quests';
import { TIERS, ev, logSession, makeProgram, resetCounter } from './fixtures';

const program = makeProgram();
const cfg = { program, tiers: TIERS };
const state = (events: AriseEvent[], now: string) => reduce(events, cfg, now);

beforeEach(resetCounter);

describe('generateQuests — templates per day type', () => {
  it('gym day with no history: clear_gate + review_form + log_bodyweight', () => {
    const qs = generateQuests('gym', 'push', '2026-06-01', state([], '2026-06-01'), program);
    expect(qs.map((q) => q.template)).toEqual(['clear_gate', 'review_form', 'log_bodyweight']);
    expect(qs[0].subject).toBe('push');
    expect(qs[1].subject).toBe('bench'); // never-trained exercise of today's session
    expect(qs[1].claim).toBe('manual');
  });

  it('gym day with history: beat_tonnage replaces review_form, targets the trained compound', () => {
    const s = state(logSession('bench', '2026-05-25', [[60, 8], [60, 8]]), '2026-06-01');
    const qs = generateQuests('gym', 'push', '2026-06-01', s, program);
    expect(qs.map((q) => q.template)).toEqual(['clear_gate', 'beat_tonnage', 'log_bodyweight']);
    expect(qs[1].subject).toBe('bench');
    expect(qs[1].claim).toBe('auto');
  });

  it('work day: intrinsic endurance_trial (+ bodyweight when due)', () => {
    const qs = generateQuests('work', undefined, '2026-06-02', state([], '2026-06-02'), program);
    expect(qs.map((q) => q.template)).toEqual(['endurance_trial', 'log_bodyweight']);
    expect(qs[0].claim).toBe('intrinsic');
  });

  it('rest day: intrinsic honor_sanctuary', () => {
    const qs = generateQuests('rest', undefined, '2026-06-07', state([], '2026-06-07'), program);
    expect(qs[0].template).toBe('honor_sanctuary');
    expect(qs[0].claim).toBe('intrinsic');
  });

  it('omits log_bodyweight when one was logged within 7 days, offers it after', () => {
    const s = state([ev('bodyweight_logged', { kg: 78, date: '2026-06-01' })], '2026-06-02');
    expect(generateQuests('work', undefined, '2026-06-02', s, program).map((q) => q.template))
      .toEqual(['endurance_trial']);
    expect(bodyweightDue(s, '2026-06-08')).toBe(true); // 7 full days later
  });

  it('is deterministic with stable ids and never duplicates templates', () => {
    const s = state([], '2026-06-01');
    const a = generateQuests('gym', 'push', '2026-06-01', s, program);
    const b = generateQuests('gym', 'push', '2026-06-01', s, program);
    expect(a).toEqual(b);
    expect(new Set(a.map((q) => q.id)).size).toBe(a.length);
    expect(a[0].id).toBe('2026-06-01|clear_gate|push');
    expect(a.length).toBeLessThanOrEqual(3);
  });
});

describe('questConditionMet — auto-claim conditions', () => {
  it('clear_gate: met once today\'s gate is cleared', () => {
    const q = generateQuests('gym', 'push', '2026-06-01', state([], '2026-06-01'), program)[0];
    expect(questConditionMet(q, state([], '2026-06-01'), '2026-06-01')).toBe(false);
    const cleared = state([ev('gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' })], '2026-06-01');
    expect(questConditionMet(q, cleared, '2026-06-01')).toBe(true);
  });

  it('beat_tonnage: met only when today\'s tonnage exceeds the previous session', () => {
    const history = logSession('bench', '2026-05-25', [[60, 8], [60, 8]]); // 960 kg
    const q = generateQuests('gym', 'push', '2026-06-01', state(history, '2026-06-01'), program)
      .find((x) => x.template === 'beat_tonnage')!;
    const equal = state([...history, ...logSession('bench', '2026-06-01', [[60, 8], [60, 8]])], '2026-06-01');
    expect(questConditionMet(q, equal, '2026-06-01')).toBe(false); // 960 = 960
    const beat = state([...history, ...logSession('bench', '2026-06-01', [[62.5, 8], [60, 8]])], '2026-06-01');
    expect(questConditionMet(q, beat, '2026-06-01')).toBe(true); // 1000 > 960
  });

  it('endurance_trial: met by today\'s shift_confirmed; honor_sanctuary never live-claims', () => {
    const shift = state([ev('shift_confirmed', { date: '2026-06-02' })], '2026-06-02');
    const trial = generateQuests('work', undefined, '2026-06-02', shift, program)[0];
    expect(questConditionMet(trial, shift, '2026-06-02')).toBe(true);
    expect(questDone(trial, shift, '2026-06-02')).toBe(true); // intrinsic done = condition

    const sanctuary = generateQuests('rest', undefined, '2026-06-07', state([], '2026-06-07'), program)[0];
    expect(questConditionMet(sanctuary, state([], '2026-06-07'), '2026-06-07')).toBe(false);
  });

  it('log_bodyweight: met by a same-day bodyweight entry', () => {
    const q = generateQuests('work', undefined, '2026-06-02', state([], '2026-06-02'), program)[1];
    expect(q.template).toBe('log_bodyweight');
    const logged = state([ev('bodyweight_logged', { kg: 78, date: '2026-06-02' })], '2026-06-02');
    expect(questConditionMet(q, logged, '2026-06-02')).toBe(true);
  });
});

describe('questDone — display state', () => {
  it('auto/manual quests are done only once their quest_completed lands (then stay done)', () => {
    const q = generateQuests('gym', 'push', '2026-06-01', state([], '2026-06-01'), program)[0];
    const claimed = state(
      [ev('quest_completed', { questId: q.id, template: q.template, date: '2026-06-01' })],
      '2026-06-01',
    );
    expect(questDone(q, claimed, '2026-06-01')).toBe(true);
    expect(claimed.totalXp).toBe(25); // pays from the template table exactly once
  });

  it('expiry is silent: tomorrow generates different ids and no penalty event type exists', () => {
    const s = state([], '2026-06-02');
    const today = generateQuests('work', undefined, '2026-06-01', s, program);
    const tomorrow = generateQuests('work', undefined, '2026-06-02', s, program);
    expect(today.map((q) => q.id)).not.toEqual(tomorrow.map((q) => q.id));
    // the reducer only ever ADDS XP for quest_completed — there is nothing to lose
    expect(state([], '2026-06-02').totalXp).toBe(0);
  });
});
