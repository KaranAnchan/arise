import type { PoseId } from '../data/types';
import type { Pose } from './skeleton';

export type Equipment =
  | 'barbell' | 'ezbar' | 'dumbbell' | 'cable' | 'cableBar' | 'rope'
  | 'sled' | 'pad' | 'hipbar' | 'none';

export type HotSegment = 'uarm' | 'farm' | 'torso' | 'thigh' | 'shin';

export interface Demo {
  a: Pose;
  b: Pose;
  equipment: Equipment;
  /** static prop lines: [x1, y1, x2, y2, strokeWidth] (benches, pads, posts) */
  props?: [number, number, number, number, number][];
  tempo: number;       // ms per half-cycle (a→b)
  hot: HotSegment[];   // limb segments tinted in flame color
  floor?: number;      // default 93
  label: string;
}

/** Canvas: viewBox 0 0 160 100, floor ≈ y 93. Standing hip ≈ y 42. */
export const DEMOS: Record<PoseId, Demo> = {

  /* ---------------- PUSH ---------------- */

  bench: {
    label: 'barbell bench press',
    equipment: 'barbell', tempo: 1500, hot: ['uarm', 'farm'], floor: 97,
    props: [[46, 74, 96, 74, 5], [52, 76, 52, 96, 2.5], [90, 76, 90, 96, 2.5]],
    a: { x: 84, y: 69, torso: -90, neck: 0, shoulder: 25, elbow: 180, hip: 75, knee: 18 },
    b: { x: 84, y: 69, torso: -90, neck: 0, shoulder: 172, elbow: 176, hip: 75, knee: 18 },
  },

  dbShoulderPress: {
    label: 'seated dumbbell shoulder press',
    equipment: 'dumbbell', tempo: 1400, hot: ['uarm', 'farm'],
    props: [[64, 70, 92, 70, 5], [91, 70, 95, 40, 4]],
    a: { x: 78, y: 64, torso: -5, shoulder: 25, elbow: 178, hip: 76, knee: 12 },
    b: { x: 78, y: 64, torso: -5, shoulder: 172, elbow: 178, hip: 76, knee: 12 },
  },

  inclineDbPress: {
    label: 'incline dumbbell press, 30 degrees',
    equipment: 'dumbbell', tempo: 1500, hot: ['uarm', 'farm'],
    props: [[60, 76, 98, 76, 5], [86, 74, 50, 44, 5]],
    a: { x: 80, y: 68, torso: -55, shoulder: -18, elbow: 195, hip: 70, knee: 12 },
    b: { x: 80, y: 68, torso: -55, shoulder: 198, elbow: 200, hip: 70, knee: 12 },
  },

  cableLateral: {
    label: 'cable lateral raise',
    equipment: 'cable', tempo: 1300, hot: ['uarm'],
    props: [[34, 93, 34, 62, 3]],
    a: { x: 72, y: 42, torso: 2, shoulder: 10, elbow: 14, hip: 2, knee: 2, anchor: [35, 88] },
    b: { x: 72, y: 42, torso: 2, shoulder: 96, elbow: 99, hip: 2, knee: 2, anchor: [35, 88] },
  },

  overheadTricep: {
    label: 'overhead cable triceps extension',
    equipment: 'rope', tempo: 1200, hot: ['farm'],
    props: [[36, 93, 36, 72, 3]],
    a: { x: 78, y: 42, torso: 10, shoulder: 190, elbow: 278, hip: 6, knee: 2, anchor: [38, 78] },
    b: { x: 78, y: 42, torso: 10, shoulder: 190, elbow: 192, hip: 6, knee: 2, anchor: [38, 78] },
  },

  pushdown: {
    label: 'triceps rope pushdown',
    equipment: 'rope', tempo: 1100, hot: ['farm'],
    props: [[114, 93, 114, 10, 3]],
    a: { x: 70, y: 42, torso: 8, shoulder: 14, elbow: 112, hip: 4, knee: 2, anchor: [110, 13] },
    b: { x: 70, y: 42, torso: 8, shoulder: 14, elbow: 8, hip: 4, knee: 2, anchor: [110, 13] },
  },

  /* ---------------- PULL ---------------- */

  pulldown: {
    label: 'lat pulldown',
    equipment: 'cableBar', tempo: 1400, hot: ['uarm', 'torso'],
    props: [[62, 68, 88, 68, 5], [70, 4, 78, 4, 3]],
    a: { x: 74, y: 62, torso: -8, shoulder: 184, elbow: 186, hip: 78, knee: 10, anchor: [72, 5] },
    b: { x: 74, y: 62, torso: -14, shoulder: -16, elbow: 152, hip: 78, knee: 10, anchor: [72, 5] },
  },

  chestRow: {
    label: 'chest-supported machine row',
    equipment: 'cable', tempo: 1300, hot: ['uarm', 'torso'],
    props: [[58, 67, 82, 67, 5], [90, 72, 78, 38, 5], [116, 93, 116, 52, 3]],
    a: { x: 68, y: 60, torso: 30, shoulder: 62, elbow: 64, hip: 62, knee: 14, anchor: [112, 58] },
    b: { x: 68, y: 60, torso: 30, shoulder: -32, elbow: 58, hip: 62, knee: 14, anchor: [112, 58] },
  },

  cableRow: {
    label: 'single-arm cable row',
    equipment: 'cable', tempo: 1300, hot: ['uarm', 'torso'],
    props: [[126, 93, 126, 42, 3]],
    a: { x: 72, y: 46, torso: 26, shoulder: 86, elbow: 89, hip: 24, knee: 6, hip2: -16, knee2: -8, anchor: [122, 58] },
    b: { x: 72, y: 46, torso: 14, shoulder: -12, elbow: 70, hip: 24, knee: 6, hip2: -16, knee2: -8, anchor: [122, 58] },
  },

  facePull: {
    label: 'rope face pull',
    equipment: 'rope', tempo: 1200, hot: ['uarm', 'farm'],
    props: [[122, 93, 122, 26, 3]],
    a: { x: 68, y: 42, torso: 4, shoulder: 88, elbow: 91, hip: 2, knee: 2, anchor: [118, 32] },
    b: { x: 68, y: 42, torso: 4, shoulder: 64, elbow: 198, hip: 2, knee: 2, anchor: [118, 32] },
  },

  ezCurl: {
    label: 'EZ-bar curl',
    equipment: 'ezbar', tempo: 1300, hot: ['farm'],
    a: { x: 75, y: 42, torso: 3, shoulder: 10, elbow: 13, hip: 2, knee: 2 },
    b: { x: 75, y: 42, torso: 3, shoulder: 10, elbow: 146, hip: 2, knee: 2 },
  },

  hammerCurl: {
    label: 'hammer curl',
    equipment: 'dumbbell', tempo: 1300, hot: ['farm'],
    a: { x: 75, y: 42, torso: 2, shoulder: 8, elbow: 10, hip: 2, knee: 2 },
    b: { x: 75, y: 42, torso: 2, shoulder: 8, elbow: 140, hip: 2, knee: 2 },
  },

  /* ---------------- LEGS ---------------- */

  legPress: {
    label: 'leg press',
    equipment: 'sled', tempo: 1500, hot: ['thigh', 'shin'],
    props: [[72, 74, 38, 46, 5], [56, 80, 80, 76, 4]],
    a: { x: 66, y: 66, torso: -52, shoulder: 30, elbow: 70, hip: 140, knee: 72, foot: 130, anchor: [109, 50] },
    b: { x: 66, y: 66, torso: -52, shoulder: 30, elbow: 70, hip: 120, knee: 116, foot: 160, anchor: [120, 36] },
  },

  splitSquat: {
    label: 'Bulgarian split squat',
    equipment: 'dumbbell', tempo: 1500, hot: ['thigh'],
    props: [[28, 80, 50, 80, 5], [32, 82, 32, 93, 2.5], [46, 82, 46, 93, 2.5]],
    a: { x: 70, y: 56, torso: 16, shoulder: 6, elbow: 9, hip: 45, knee: 350, hip2: 322, knee2: 290, foot2: 280 },
    b: { x: 74, y: 46, torso: 6, shoulder: 6, elbow: 9, hip: 15, knee: 355, hip2: 335, knee2: 285, foot2: 280 },
  },

  legCurl: {
    label: 'seated leg curl',
    equipment: 'pad', tempo: 1300, hot: ['shin'],
    props: [[58, 66, 84, 66, 5], [60, 66, 53, 40, 4]],
    a: { x: 72, y: 60, torso: -10, shoulder: 22, elbow: 52, hip: 88, knee: 92 },
    b: { x: 72, y: 60, torso: -10, shoulder: 22, elbow: 52, hip: 88, knee: 342 },
  },

  legExtension: {
    label: 'leg extension',
    equipment: 'pad', tempo: 1300, hot: ['shin', 'thigh'],
    props: [[58, 66, 84, 66, 5], [60, 66, 53, 40, 4]],
    a: { x: 72, y: 60, torso: -10, shoulder: 22, elbow: 52, hip: 88, knee: 8 },
    b: { x: 72, y: 60, torso: -10, shoulder: 22, elbow: 52, hip: 88, knee: 86 },
  },

  hipThrust: {
    label: 'barbell hip thrust',
    equipment: 'hipbar', tempo: 1400, hot: ['torso', 'thigh'],
    props: [[30, 70, 54, 70, 5], [34, 72, 34, 93, 2.5], [50, 72, 50, 93, 2.5]],
    a: { x: 72, y: 76, torso: -68, neck: 20, shoulder: 40, elbow: 30, hip: 104, knee: 2 },
    b: { x: 74, y: 64, torso: -86, neck: 30, shoulder: 50, elbow: 40, hip: 76, knee: 2 },
  },

  calfRaise: {
    label: 'standing calf raise',
    equipment: 'dumbbell', tempo: 1100, hot: ['shin'],
    props: [[64, 92, 88, 92, 5]],
    a: { x: 74, y: 44, torso: 2, shoulder: 5, elbow: 6, hip: 2, knee: 2, foot: 86 },
    b: { x: 74, y: 39, torso: 2, shoulder: 5, elbow: 6, hip: 2, knee: 2, foot: 58 },
  },
};
