import { describe, expect, it } from 'vitest';
import { XP, levelFromTotalXp, questXp, setXp, statDisplay, streakMultiplier, xpToNext } from '../xp';

describe('xpToNext', () => {
  it('follows round(150 × 1.04^n)', () => {
    expect(xpToNext(1)).toBe(156);
    expect(xpToNext(10)).toBe(222);
    expect(xpToNext(50)).toBe(1066);
    expect(xpToNext(99)).toBe(7284);
  });

  it('totals roughly 185k XP across levels 1–99 (≈20 months at ~2,200 XP/week)', () => {
    let total = 0;
    for (let n = 1; n < 100; n++) total += xpToNext(n);
    expect(total).toBeGreaterThan(170_000);
    expect(total).toBeLessThan(200_000);
  });
});

describe('levelFromTotalXp', () => {
  it('starts at level 1 with 0 XP', () => {
    expect(levelFromTotalXp(0, 100)).toEqual({ level: 1, xpIntoLevel: 0, xpToNext: 156 });
  });

  it('levels exactly at the threshold', () => {
    expect(levelFromTotalXp(155, 100).level).toBe(1);
    expect(levelFromTotalXp(156, 100)).toEqual({ level: 2, xpIntoLevel: 0, xpToNext: xpToNext(2) });
  });

  it('caps at maxLevel and stays there', () => {
    const atCap = levelFromTotalXp(10_000_000, 100);
    expect(atCap).toEqual({ level: 100, xpIntoLevel: 0, xpToNext: 0 });
  });

  it('honors an extended cap (manifest beyond 100)', () => {
    expect(levelFromTotalXp(10_000_000, 110).level).toBe(110);
  });

  it('is monotonic in total XP', () => {
    let last = 0;
    for (let xp = 0; xp < 50_000; xp += 997) {
      const { level } = levelFromTotalXp(xp, 100);
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
    }
  });

  it('treats negative XP as zero', () => {
    expect(levelFromTotalXp(-50, 100).level).toBe(1);
    expect(levelFromTotalXp(-50, 100).xpIntoLevel).toBe(0);
  });
});

describe('setXp', () => {
  it('awards flat base with no history', () => {
    expect(setXp(60, 8)).toBe(10);
    expect(setXp(60, 8, 0)).toBe(10);
  });

  it('scales with tonnage ratio', () => {
    expect(setXp(60, 8, 480)).toBe(10); // identical tonnage
    expect(setXp(60, 10, 480)).toBeCloseTo(12.5); // 600/480
  });

  it('clamps the ratio so junk volume cannot farm and deloads do not zero out', () => {
    expect(setXp(200, 20, 480)).toBe(10 * XP.ratioMax); // 15
    expect(setXp(20, 5, 480)).toBe(10 * XP.ratioMin); // 5
  });

  it('awards flat base for a zero-tonnage set (bodyweight placeholder)', () => {
    expect(setXp(0, 10, 480)).toBe(10);
  });
});

describe('streakMultiplier', () => {
  it('grows by 0.1 per consecutive week and caps at 1.5', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(3)).toBeCloseTo(1.3);
    expect(streakMultiplier(5)).toBe(1.5);
    expect(streakMultiplier(50)).toBe(1.5);
  });

  it('never drops below 1 for nonsense input', () => {
    expect(streakMultiplier(-3)).toBe(1);
  });
});

describe('questXp', () => {
  it('reads the template table and defaults unknown templates to 0', () => {
    expect(questXp('clear_gate')).toBe(25);
    expect(questXp('log_bodyweight')).toBe(10);
    expect(questXp('not_a_quest')).toBe(0);
  });
});

describe('statDisplay', () => {
  it('applies the sqrt curve and tier multiplier', () => {
    expect(statDisplay(0, 1)).toBe(10);
    expect(statDisplay(100, 1)).toBe(30); // 10 + 2×10×1
    expect(statDisplay(100, 1.5)).toBe(40); // 10 + 2×10×1.5
  });

  it('clamps negative pools', () => {
    expect(statDisplay(-5, 1)).toBe(10);
  });
});
