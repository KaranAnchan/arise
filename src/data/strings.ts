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

  /** shown when the gap since the last logged training day exceeds the roster's rhythm */
  absence: (days: number) => `${days} DAYS SINCE YOUR LAST GATE. THE SYSTEM DOES NOT FORGET.`,
  /** streak dropped since last visit — XP/levels untouched, only the multiplier */
  streakSevered: 'YOUR STREAK HAS BEEN SEVERED. THE MULTIPLIER RESETS. THE RECORDS REMAIN.',

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

  quests: {
    label: 'DAILY QUESTS',
    xp: (n: number) => `+${n} XP`,
    clear_gate: (gate: string) => `CLEAR TODAY’S GATE: ${gate.toUpperCase()}`,
    beat_tonnage: (exercise: string) => `BEAT LAST SESSION’S TONNAGE — ${exercise.toUpperCase()}`,
    endurance_trial: 'COMPLETE THE ENDURANCE TRIAL',
    honor_sanctuary: 'HONOR THE SANCTUARY',
    log_bodyweight: 'LOG BODY WEIGHT',
    review_form: (exercise: string) => `REVIEW FORM NOTES — ${exercise.toUpperCase()}`,
    claim: 'CLAIM',
    judgedAtDawn: 'JUDGED AT DAWN',
  },

  shift: {
    confirm: 'TRIAL ENDURED',
    confirmed: 'ENDURANCE RECORDED. RECOVER. THE NEXT GATE APPROACHES.',
    intelLabel: 'QUEST INTEL',
    intel: [
      'THE SHIFT COUNTS: HOURS OF LIGHT-LOAD LIFTING IN THE COLD. TREAT IT AS TRAINING LOAD.',
      'LIFT CRATES LIKE DEADLIFTS — LOAD CLOSE, BRACE, NO ROUNDING. 8 HOURS OF BAD REPS BEATS ANY GYM SESSION, IN THE WRONG DIRECTION.',
      'EAT AND HYDRATE ON SHIFT. COLD SUPPRESSES THIRST. DO NOT ARRIVE AT THE EVENING 1,500 KCAL SHORT.',
    ],
  },

  sanctuaryNote: 'RECOVERY IS JUDGED AT DAWN. ENTER A GATE TODAY AND THE BONUS IS FORFEIT.',

  profile: {
    link: 'PROFILE',
    title: 'HUNTER PROFILE',
    back: '← RETURN',
    stats: 'STATS',
    records: 'SYSTEM RECORDS',
    bodyweight: 'BODY WEIGHT',
    noRecords: 'NO RECORDS YET. ENTER A GATE.',
    sessions: (n: number) => `${n} SESSION${n === 1 ? '' : 'S'}`,
    best: (kg: number, reps: number) => `BEST ${kg} KG × ${reps}`,
  },

  bodyweight: {
    label: 'BODY WEIGHT',
    log: 'LOG',
    recorded: (kg: number) => `${kg.toFixed(1)} KG — RECORDED.`,
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
