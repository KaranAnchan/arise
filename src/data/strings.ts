/**
 * Every word the System speaks lives here — the voice is swappable and translatable.
 * Tone: terse, imperative, omniscient. Brackets are rendered by SystemText, not here.
 */

export const SYSTEM = {
  appName: 'ARISE',

  greeting(hour: number, name?: string): string {
    const who = name ? `, ${name.toUpperCase()}` : ', HUNTER';
    if (hour < 5) return `THE SYSTEM NEVER SLEEPS${who}.`;
    if (hour < 12) return `GOOD MORNING${who}. THE GATE IS WAITING.`;
    if (hour < 18) return `GOOD AFTERNOON${who}.`;
    return `GOOD EVENING${who}.`;
  },

  dashboard: {
    todayGate: 'TODAY’S GATE',
    enterGate: 'ENTER GATE',
    gateSealed: 'GATE ACCESS UNLOCKS IN PHASE 2',
    mandatoryQuest: 'MANDATORY QUEST: ENDURANCE TRIAL',
    sanctuary: 'SANCTUARY ACTIVE. RECOVERY IS A COMMAND, NOT A SUGGESTION.',
    streak: (weeks: number, mult: number) =>
      weeks > 0 ? `STREAK ×${mult.toFixed(1)} · WEEK ${weeks}` : 'NO ACTIVE STREAK. BEGIN.',
    level: 'LV',
    xp: 'XP',
    nextTier: (level: number) => `CLASSIFIED — REACH LEVEL ${level}`,
    maxTier: 'THERE IS NOTHING ABOVE YOU.',
  },

  stats: {
    str: 'STR',
    vit: 'VIT',
    agi: 'AGI',
    rec: 'REC',
  },

  gate: {
    back: '← WITHDRAW',
    cleared: 'GATE CLEARED',
    clearGate: 'CLEAR GATE',
    viewTally: 'VIEW SPOILS',
    progress: (done: number, total: number) => `${done}/${total} CLEARED`,
    firstEncounter: 'FIRST ENCOUNTER — ESTABLISH THE BASELINE.',
    last: 'LAST',
    mindMuscle: 'MIND–MUSCLE',
    form: 'FORM',
    log: 'LOG',
    save: 'SAVE',
    set: (n: number) => `S${n}`,
  },

  tally: {
    title: (gate: string) => `GATE CLEARED: ${gate.toUpperCase()}`,
    sets: (name: string) => `SETS — ${name.toUpperCase()}`,
    progression: (name: string) => `CONDITIONS MET — ${name.toUpperCase()}`,
    weightUp: (name: string) => `WEIGHT INCREASED — ${name.toUpperCase()}`,
    gateClear: 'GATE CLEAR',
    streak: (mult: number) => `STREAK MULTIPLIER ×${mult.toFixed(1)}`,
    total: 'TOTAL',
    continue: 'CONTINUE',
  },

  ceremony: {
    conditionsMet: 'CONDITIONS MET.',
    levelUp: 'LEVEL UP.',
    tierUp: 'YOUR RANK HAS CHANGED.',
  },

  update: 'THE SYSTEM HAS EVOLVED. RELOAD TO ASCEND.',
} as const;
