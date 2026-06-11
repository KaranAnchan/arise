/**
 * THE program — ported verbatim from Shift + Lift v2 (the training content is the crown
 * jewel; the game never alters it), extended with game metadata: gate names, exercise
 * class (compound/accessory) and stat tags. `ENGINE_PROGRAM` at the bottom is the
 * engine's injected view of this content.
 */
import type { EngineProgram } from '../engine/types';
import type { DayPlan, Session } from './types';

/** The weekly roster: 3× gym, 3× Lidl MoPro picking shift, 1× full rest. */
export const WEEK: DayPlan[] = [
  { key: 'push',  dow: 'MON', label: 'PUSH',  type: 'gym', session: 'push' },
  { key: 'work1', dow: 'TUE', label: 'SHIFT', type: 'work' },
  { key: 'pull',  dow: 'WED', label: 'PULL',  type: 'gym', session: 'pull' },
  { key: 'work2', dow: 'THU', label: 'SHIFT', type: 'work' },
  { key: 'work3', dow: 'FRI', label: 'SHIFT', type: 'work' },
  { key: 'legs',  dow: 'SAT', label: 'LEGS',  type: 'gym', session: 'legs' },
  { key: 'rest',  dow: 'SUN', label: 'REST',  type: 'rest' },
];

/** getDay() → roster key */
export const DOW_TO_KEY: Record<number, string> = {
  1: 'push', 2: 'work1', 3: 'pull', 4: 'work2', 5: 'work3', 6: 'legs', 0: 'rest',
};

export const SESSIONS: Record<string, Session> = {
  push: {
    id: 'push',
    name: 'Push',
    gateName: 'Crimson Forge',
    focus: 'chest · shoulders · triceps',
    why: 'You come off a full rest day. This is your freshest session: push the heavy bench hard.',
    exercises: [
      {
        id: 'bench', name: 'Barbell Bench Press', pose: 'bench', cls: 'compound', statTags: ['str'],
        scheme: { sets: 4, repsLo: 6, repsHi: 8, restSec: 180 },
        activation: { chest: 1, fdelt: 0.6, tricep: 0.7, abs: 0.15 },
        mindMuscle: 'External focus here: "bend the bar" and drive it off your chest to the ceiling. Don’t chase a chest pump on top sets — chase load.',
        form: 'Shoulder blades pinched and down, feet planted, bar touches lower chest. Last set 1–2 reps from failure, never to failure on free-weight pressing alone.',
      },
      {
        id: 'dbpress', name: 'Seated DB Shoulder Press', pose: 'dbShoulderPress', cls: 'compound', statTags: ['str'],
        scheme: { sets: 3, repsLo: 8, repsHi: 10, restSec: 120 },
        activation: { fdelt: 1, sdelt: 0.55, tricep: 0.6, traps: 0.2 },
        mindMuscle: 'Think "elbows drive up and slightly in". Feel front delts initiate, not triceps.',
        form: 'Back against pad, ribs down (don’t arch), stop just short of locking out to keep tension on delts.',
      },
      {
        id: 'incline', name: 'Incline DB Press (30°)', pose: 'inclineDbPress', cls: 'compound', statTags: ['str'],
        scheme: { sets: 3, repsLo: 10, repsHi: 12, restSec: 120 },
        activation: { chest: 0.9, fdelt: 0.7, tricep: 0.5 },
        mindMuscle: 'Visualize upper-chest fibers pulling your upper arms together. Squeeze the dumbbells "toward each other" without moving them inward.',
        form: 'Elbows ~45° from torso. 2-s lowering. If front delts take over, lower the incline.',
      },
      {
        id: 'lateral', name: 'Cable Lateral Raise', pose: 'cableLateral', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 12, repsHi: 15, perSide: true, restSec: 90 },
        activation: { sdelt: 1, traps: 0.25, fdelt: 0.15 },
        mindMuscle: 'Prime mind–muscle exercise. Lead with the elbow, imagine pouring water from a jug at the top. Feel only the side delt.',
        form: 'Light weight, zero swing. Cable from low/behind keeps tension at the bottom where DBs give none.',
      },
      {
        id: 'ohext', name: 'Overhead Cable Triceps Extension', pose: 'overheadTricep', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 10, repsHi: 12, restSec: 90 },
        activation: { tricep: 1, abs: 0.15 },
        mindMuscle: 'Feel the long head stretch behind your head, then "snap" the elbows straight and squeeze 1 s.',
        form: 'Elbows stay pointed forward and still. Stretch position is where growth happens — go deep, controlled.',
      },
      {
        id: 'pushdown', name: 'Triceps Rope Pushdown', pose: 'pushdown', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 2, repsLo: 12, repsHi: 15, restSec: 75 },
        activation: { tricep: 0.9, forearm: 0.2 },
        mindMuscle: 'Spread the rope apart at the bottom and squeeze like you’re flexing for a photo.',
        form: 'Pin elbows to your sides. This is a finisher — strict form, full lockout.',
      },
    ],
  },

  pull: {
    id: 'pull',
    name: 'Pull',
    gateName: 'Iron Abyss',
    focus: 'back · rear delts · biceps',
    why: 'Sits between two shifts. Chest-supported rowing on purpose: your lower back works tomorrow. Use straps — your grip is already trained 3 days a week by picking.',
    exercises: [
      {
        id: 'pulldown', name: 'Lat Pulldown (or Pull-ups)', pose: 'pulldown', cls: 'compound', statTags: ['str'],
        scheme: { sets: 4, repsLo: 6, repsHi: 10, restSec: 150 },
        activation: { lats: 1, bicep: 0.6, midback: 0.4, rdelt: 0.3, forearm: 0.35 },
        mindMuscle: '"Pull with your elbows, not your hands." Imagine your hands are hooks; drive elbows down into your back pockets.',
        form: 'Slight lean back, bar to upper chest, full stretch at top every rep. Add weight when 4×10 is clean.',
      },
      {
        id: 'chestrow', name: 'Chest-Supported Machine Row', pose: 'chestRow', cls: 'compound', statTags: ['str'],
        scheme: { sets: 3, repsLo: 8, repsHi: 10, restSec: 120 },
        activation: { midback: 1, lats: 0.7, traps: 0.6, rdelt: 0.5, bicep: 0.5 },
        mindMuscle: 'Squeeze shoulder blades together at the end of each pull, hold 1 s. Feel mid-back, not arms.',
        form: 'Chest stays glued to the pad — if it lifts, you’re cheating with momentum. Chosen over barbell row to spare your spine for Thursday’s shift.',
      },
      {
        id: 'cablerow', name: 'Single-Arm Cable Row', pose: 'cableRow', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 10, repsHi: 12, perSide: true, restSec: 90 },
        activation: { lats: 1, midback: 0.5, bicep: 0.5, obliques: 0.2 },
        mindMuscle: 'Let the lat stretch fully forward, then pull your elbow to your hip. One side at a time = best lat connection you’ll get.',
        form: 'Rotate slightly with the stretch, but row with the back, not by twisting.',
      },
      {
        id: 'facepull', name: 'Face Pull', pose: 'facePull', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 12, repsHi: 15, restSec: 75 },
        activation: { rdelt: 1, traps: 0.6, midback: 0.5 },
        mindMuscle: 'Pull the rope to your nose and finish like a double-biceps pose. Feel rear delts and the muscles between the blades.',
        form: 'Non-negotiable: this protects shoulders that press Monday and lift crates all week. Light, strict, high reps.',
      },
      {
        id: 'ezcurl', name: 'EZ-Bar Curl', pose: 'ezCurl', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 8, repsHi: 12, restSec: 90 },
        activation: { bicep: 1, forearm: 0.4 },
        mindMuscle: 'Squeeze the biceps to bend the arm; imagine touching forearm to biceps. Control 2–3 s down.',
        form: 'Elbows fixed at your sides. No hip swing — if you swing, the weight is ego, not stimulus.',
      },
      {
        id: 'hammer', name: 'Hammer Curl', pose: 'hammerCurl', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 2, repsLo: 10, repsHi: 12, restSec: 75 },
        activation: { bicep: 0.8, forearm: 0.9 },
        mindMuscle: 'Neutral grip; feel the outer arm (brachialis) and forearm doing the work.',
        form: 'Builds arm thickness + elbow resilience for crate handling. Strict, both arms together.',
      },
    ],
  },

  legs: {
    id: 'legs',
    name: 'Legs',
    gateName: "Titan's Foothold",
    focus: 'quads · hams · glutes · calves',
    why: 'Friday’s shift already loaded your spine, and Sunday absorbs the soreness before Tuesday’s shift. So: heavy legs, minimal spinal compression. No back squats or heavy deadlifts in this block — your lower back gets weekly volume from picking.',
    exercises: [
      {
        id: 'legpress', name: 'Leg Press', pose: 'legPress', cls: 'compound', statTags: ['str'],
        scheme: { sets: 4, repsLo: 8, repsHi: 12, restSec: 180 },
        activation: { quads: 1, glutes: 0.7, adductors: 0.5, hams: 0.3, calves: 0.2 },
        mindMuscle: 'External focus on top sets: "push the platform away". On the last set, think about quads stretching deep and driving.',
        form: 'Feet mid-platform, hip-width. Depth until pelvis is about to tuck — never let your lower back round off the pad.',
      },
      {
        id: 'split', name: 'Bulgarian Split Squat (DBs)', pose: 'splitSquat', cls: 'compound', statTags: ['str'],
        scheme: { sets: 3, repsLo: 8, repsHi: 10, perSide: true, restSec: 120 },
        activation: { quads: 0.9, glutes: 0.9, adductors: 0.4, hams: 0.3, abs: 0.2 },
        mindMuscle: 'Feel the front-leg quad and glute share the load. Drive through the whole foot.',
        form: 'Brutal but spine-friendly. Slight forward lean = more glute; upright = more quad. Hold something for balance the first weeks if needed.',
      },
      {
        id: 'legcurl', name: 'Seated Leg Curl', pose: 'legCurl', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 10, repsHi: 12, restSec: 90 },
        activation: { hams: 1, calves: 0.25 },
        mindMuscle: 'Imagine dragging your heels to your glutes. Squeeze hamstrings hard at full bend, 2–3 s back.',
        form: 'Seated beats lying — hamstrings work at a longer length, more growth. Replaces RDLs while the job loads your back.',
      },
      {
        id: 'legext', name: 'Leg Extension', pose: 'legExtension', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 12, repsHi: 15, restSec: 75 },
        activation: { quads: 1 },
        mindMuscle: 'Pure mind–muscle work: full lockout, squeeze the quad 1 s, watch the muscle if it helps — it genuinely does.',
        form: 'Controlled lowering. Mild knee discomfort → reduce range at the bottom, keep the squeeze at top.',
      },
      {
        id: 'hipthrust', name: 'Hip Thrust (barbell or machine)', pose: 'hipThrust', cls: 'compound', statTags: ['str'],
        scheme: { sets: 3, repsLo: 8, repsHi: 12, restSec: 120 },
        activation: { glutes: 1, hams: 0.5, lowback: 0.25, quads: 0.2, abs: 0.2 },
        mindMuscle: 'Posterior pelvic tuck at the top — squeeze glutes like cracking a walnut, 1–2 s hold.',
        form: 'Chin tucked, ribs down. Stronger glutes directly protect your lower back at work.',
      },
      {
        id: 'calf', name: 'Standing Calf Raise', pose: 'calfRaise', cls: 'accessory', statTags: ['agi'],
        scheme: { sets: 3, repsLo: 12, repsHi: 15, restSec: 60 },
        activation: { calves: 1, tibialis: 0.2 },
        mindMuscle: '2-s pause in the deep stretch at the bottom, then drive to full tiptoe and squeeze.',
        form: 'The stretch pause is the stimulus. No bouncing — bouncing is the tendon working, not the muscle.',
      },
    ],
  },
};

/** The engine's injected view of this content (keeps src/engine free of content imports). */
export const ENGINE_PROGRAM: EngineProgram = {
  gymSessions: WEEK.filter((d) => d.type === 'gym').map((d) => d.session as string),
  exercises: Object.fromEntries(
    Object.values(SESSIONS).flatMap((session) =>
      session.exercises.map((ex) => [
        ex.id,
        {
          id: ex.id,
          sessionId: session.id,
          cls: ex.cls,
          statTags: ex.statTags,
          scheme: { sets: ex.scheme.sets, repsLo: ex.scheme.repsLo, repsHi: ex.scheme.repsHi },
        },
      ]),
    ),
  ),
};
