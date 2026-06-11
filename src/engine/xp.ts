/**
 * Every XP constant in the game lives in this one object (GDD §2). Rebalancing is a
 * data change here, never a logic change elsewhere.
 */
export const XP = {
  /** base XP for one logged set, scaled by tonnage ratio vs last session */
  setBase: 10,
  ratioMin: 0.5,
  ratioMax: 1.5,
  /** all sets at the top of the rep range — double-progression "conditions met" */
  progression: 50,
  /** working weight exceeded the all-time max for the exercise — the real win condition */
  weightUp: 120,
  gateClear: 100,
  shift: 30,
  rest: 25,
  quest: {
    clear_gate: 25,
    beat_tonnage: 20,
    endurance_trial: 30,
    honor_sanctuary: 25,
    log_bodyweight: 10,
    review_form: 10,
  } as Record<string, number>,
  /** streak: ×(1 + step × consecutiveWeeks), capped */
  streakStep: 0.1,
  streakCap: 1.5,
  /** level curve: xpToNext(n) = round(levelBase × levelGrowth^n) */
  levelBase: 150,
  levelGrowth: 1.04,
  /** stat display curve: floor(statBase + statScale × sqrt(pool) × tierMultiplier) */
  statBase: 10,
  statScale: 2,
} as const;

export function xpToNext(level: number): number {
  return Math.round(XP.levelBase * Math.pow(XP.levelGrowth, level));
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  /** 0 when at the cap */
  xpToNext: number;
}

/** Walk the curve from level 1. Levels are monotonic in totalXp and cap at maxLevel. */
export function levelFromTotalXp(totalXp: number, maxLevel: number): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (level < maxLevel) {
    const need = xpToNext(level);
    if (remaining < need) return { level, xpIntoLevel: remaining, xpToNext: need };
    remaining -= need;
    level += 1;
  }
  return { level: maxLevel, xpIntoLevel: 0, xpToNext: 0 };
}

/**
 * XP for one logged set. With a comparable previous set (same set index, previous
 * session of the same exercise) the award scales with the tonnage ratio, clamped so
 * junk volume can't farm and a deload doesn't zero out. Without history: flat base.
 */
export function setXp(weightKg: number, reps: number, prevTonnage?: number): number {
  const tonnage = weightKg * reps;
  if (!prevTonnage || prevTonnage <= 0 || tonnage <= 0) return XP.setBase;
  const ratio = Math.min(XP.ratioMax, Math.max(XP.ratioMin, tonnage / prevTonnage));
  return XP.setBase * ratio;
}

export function streakMultiplier(consecutiveWeeks: number): number {
  return Math.min(XP.streakCap, 1 + XP.streakStep * Math.max(0, consecutiveWeeks));
}

export function questXp(template: string): number {
  return XP.quest[template] ?? 0;
}

/** Display value for a stat pool at a given tier multiplier. */
export function statDisplay(pool: number, tierMultiplier: number): number {
  return Math.floor(XP.statBase + XP.statScale * Math.sqrt(Math.max(0, pool)) * tierMultiplier);
}
