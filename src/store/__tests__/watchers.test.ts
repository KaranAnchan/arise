/**
 * Pure parts of the watchers only — emission goes through Dexie and is exercised by
 * the browser smoke script, not here.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ev, logSession, resetCounter } from '../../engine/__tests__/fixtures';
import { dayTypeOf, pastUnhonoredRests } from '../watchers';

beforeEach(resetCounter);

describe('dayTypeOf — roster lookup (2026-06-01 is a Monday)', () => {
  it('maps local dates onto the weekly roster', () => {
    expect(dayTypeOf('2026-06-01')).toBe('gym'); // Mon push
    expect(dayTypeOf('2026-06-02')).toBe('work'); // Tue shift
    expect(dayTypeOf('2026-06-07')).toBe('rest'); // Sun
  });
});

describe('pastUnhonoredRests — Sanctuary back-fill', () => {
  it('returns nothing for an empty log (no history to honor)', () => {
    expect(pastUnhonoredRests([], '2026-06-10')).toEqual([]);
  });

  it('finds past rest days since the log began, oldest first', () => {
    const events = logSession('bench', '2026-05-20', [[60, 8]]);
    expect(pastUnhonoredRests(events, '2026-06-10')).toEqual([
      '2026-05-24',
      '2026-05-31',
      '2026-06-07',
    ]);
  });

  it('skips rest days that were trained on or already honored', () => {
    const events = [
      ...logSession('bench', '2026-05-20', [[60, 8]]),
      ...logSession('bench', '2026-05-24', [[60, 8]]), // trained through the Sanctuary
      ev('rest_honored', { date: '2026-05-31' }), // already honored
    ];
    expect(pastUnhonoredRests(events, '2026-06-10')).toEqual(['2026-06-07']);
  });

  it('never includes today — a rest day in progress is judged tomorrow', () => {
    const events = logSession('bench', '2026-06-06', [[60, 8]]);
    expect(pastUnhonoredRests(events, '2026-06-07')).toEqual([]);
    expect(pastUnhonoredRests(events, '2026-06-08')).toEqual(['2026-06-07']);
  });

  it('is idempotent: emitting its result leaves nothing further to honor', () => {
    const events = logSession('bench', '2026-05-20', [[60, 8]]);
    const honored = pastUnhonoredRests(events, '2026-06-10').map((date) =>
      ev('rest_honored', { date }),
    );
    expect(pastUnhonoredRests([...events, ...honored], '2026-06-10')).toEqual([]);
  });
});
