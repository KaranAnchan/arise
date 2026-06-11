import type { MuscleId } from '../data/types';

/**
 * Anatomical path data for the front/back figures.
 *
 * Coordinate system per figure: x = 0 is the body's vertical axis; shapes are
 * defined for the +x side and mirrored with scale(-1,1). y = 0 at the top of
 * the head. Figure is ~300 units tall (~7.5 heads).
 */

/** Stadium/capsule path between two points with width w. */
export function capsule(x1: number, y1: number, x2: number, y2: number, w: number): string {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (w / 2), ny = (dx / len) * (w / 2);
  const r = w / 2;
  return [
    `M ${x1 + nx},${y1 + ny}`,
    `A ${r} ${r} 0 1 1 ${x1 - nx},${y1 - ny}`,
    `L ${x2 - nx},${y2 - ny}`,
    `A ${r} ${r} 0 1 1 ${x2 + nx},${y2 + ny}`,
    'Z',
  ].join(' ');
}

export const MUSCLE_NAMES: Record<MuscleId, string> = {
  traps: 'Trapezius', fdelt: 'Front delt', sdelt: 'Side delt', rdelt: 'Rear delt',
  chest: 'Chest', bicep: 'Biceps', tricep: 'Triceps', forearm: 'Forearms',
  abs: 'Abs', obliques: 'Obliques', lats: 'Lats', midback: 'Mid-back', lowback: 'Lower back',
  glutes: 'Glutes', quads: 'Quads', adductors: 'Adductors', hams: 'Hamstrings',
  calves: 'Calves', tibialis: 'Tibialis',
};

export interface MuscleShape {
  muscle: MuscleId;
  d: string;
  mirror: boolean; // also draw scale(-1,1) copy
}

/* ---------------- shared silhouette (drawn beneath the muscles) ---------------- */

// torso half: neck slope → shoulder cap → ribs taper → waist → hip flare → crotch
const TORSO_HALF =
  'M 0,48 L 7,49 Q 19,51 26,55 Q 30,58 30,64 L 28,89 Q 26,110 20,123 Q 24,136 25,149 L 23,166 Q 12,172 0,172 Z';

export const SILHOUETTE: { d: string; mirror: boolean }[] = [
  // head + neck
  { d: 'M -12.5,24 a 12.5,15 0 1 1 25,0 a 12.5,15 0 1 1 -25,0', mirror: false },
  { d: 'M -5.5,35 L 5.5,35 L 7,50 L -7,50 Z', mirror: false },
  // torso (two mirrored halves overlap seamlessly at x=0)
  { d: TORSO_HALF, mirror: true },
  // arm: shoulder→elbow→wrist + hand
  { d: capsule(26, 60, 36, 111, 13.5), mirror: true },
  { d: capsule(36, 111, 41, 151, 10), mirror: true },
  { d: 'M 37,151 a 5.5,6.5 0 1 1 11,0 a 5.5,6.5 0 1 1 -11,0', mirror: true },
  // leg: hip→knee→ankle + foot (slight knee taper via two capsules)
  { d: capsule(12, 163, 13, 226, 18), mirror: true },
  { d: 'M 8.5,222 a 5,5 0 1 1 9,0 Z', mirror: true },
  { d: capsule(13, 228, 14, 292, 11.5), mirror: true },
  { d: 'M 7,290 Q 14,286 21,290 L 22,299 Q 14,302 7,299 Z', mirror: true },
];

/* ---------------- FRONT figure muscles ---------------- */

export const FRONT_MUSCLES: MuscleShape[] = [
  // upper traps visible above the clavicle line
  { muscle: 'traps', mirror: true, d: 'M 5,41 Q 16,44 26,53 L 7,52 Q 5,46 5,41 Z' },
  // deltoids: anterior teardrop + lateral cap
  { muscle: 'fdelt', mirror: true, d: 'M 23,56 Q 30,55 31.5,62 Q 32.5,70 28.5,76 Q 24.5,71 23,63 Z' },
  { muscle: 'sdelt', mirror: true, d: 'M 30.5,58 Q 35.5,61 36,70 Q 35.5,76 32.5,79 Q 29.5,73 29.5,64 Z' },
  // pectoral: fuller lower lobe, slight clavicular plateau
  { muscle: 'chest', mirror: true, d: 'M 1.5,57 Q 12,54.5 21,58 Q 26,61.5 25.5,71 Q 25,84 14,88.5 Q 4,88.5 2,80 Z' },
  // arms
  { muscle: 'bicep', mirror: true, d: capsule(29.5, 82, 34, 105, 10) },
  { muscle: 'forearm', mirror: true, d: 'M 33,116 Q 39,114 41.5,122 Q 42.5,134 40.5,145 L 35.5,145 Q 32,131 33,116 Z' },
  // core (rectus is a single central column)
  { muscle: 'abs', mirror: false, d: 'M -10,93 Q 0,90 10,93 L 9,140 Q 5,148 0,149 Q -5,148 -9,140 Z' },
  { muscle: 'obliques', mirror: true, d: 'M 12,96 Q 16.5,98 17,108 Q 17,124 13,137 Q 10.5,136 10.5,124 L 11,100 Z' },
  // legs: main quad sweep + vastus medialis teardrop near the knee
  { muscle: 'quads', mirror: true, d: 'M 8,166 Q 4.5,192 8,214 Q 10.5,222 15,221 Q 20.5,210 21,188 Q 21,170 16,163.5 Q 11,161 8,166 Z' },
  { muscle: 'quads', mirror: true, d: 'M 7,206 Q 4.5,216 8.5,222.5 Q 12.5,223 13.5,215 Q 12,206.5 7,206 Z' },
  { muscle: 'adductors', mirror: true, d: capsule(4.5, 170, 7.5, 197, 7) },
  { muscle: 'tibialis', mirror: true, d: capsule(13.5, 238, 14.5, 281, 7) },
];

/** Definition lines drawn over the front figure. */
export const FRONT_CUTS: string[] = [
  // ab segments
  'M -9,105 Q 0,108 9,105',
  'M -9,118 Q 0,121 9,118',
  'M -8.5,131 Q 0,134 8.5,131',
  'M 0,93 L 0,147',
  // sternum gap
  'M 0,57 L 0,88',
  // quad sweep hints
  'M 12,176 Q 14,194 13,210', 'M -12,176 Q -14,194 -13,210',
];

/* ---------------- BACK figure muscles ---------------- */

export const BACK_MUSCLES: MuscleShape[] = [
  // trapezius kite (single symmetric shape)
  {
    muscle: 'traps', mirror: false,
    d: 'M 0,40 Q 10,44 26,55 Q 13,61 6,83 Q 2,95 0,97 Q -2,95 -6,83 Q -13,61 -26,55 Q -10,44 0,40 Z',
  },
  { muscle: 'rdelt', mirror: true, d: 'M 25,58 Q 32,59 33.5,67 Q 33.5,75 29.5,79 Q 25,73 24,64 Z' },
  { muscle: 'tricep', mirror: true, d: 'M 29,80 Q 35,79 37,88 Q 38.5,100 35.5,109 Q 30.5,110 28.5,101 Q 27.5,89 29,80 Z' },
  { muscle: 'forearm', mirror: true, d: capsule(36.5, 117, 40, 145, 8) },
  // lats: wing from armpit narrowing into the waist
  { muscle: 'lats', mirror: true, d: 'M 8,80 Q 17,84 25,77 Q 28,94 21,109 Q 15,121 8,127 Q 4.5,110 5,93 Z' },
  // mid-back (rhomboids/teres) between blade and spine
  { muscle: 'midback', mirror: true, d: capsule(5, 88, 11, 106, 9) },
  // erectors
  { muscle: 'lowback', mirror: false, d: 'M -7.5,116 Q 0,112 7.5,116 L 6.5,148 Q 0,153 -6.5,148 Z' },
  // glutes
  { muscle: 'glutes', mirror: true, d: 'M 2,153 Q 13,149 21,157 Q 25,169 19,179 Q 9,185 3,179 Q 0,166 2,153 Z' },
  // hamstrings: biceps femoris + semi head
  { muscle: 'hams', mirror: true, d: 'M 7,186 Q 5,206 8.5,222 Q 11,226 13.5,222 Q 15,205 13.5,188 Q 10,183 7,186 Z' },
  { muscle: 'hams', mirror: true, d: 'M 15.5,188 Q 19,190 19.5,202 Q 19,214 16,221 Q 14.5,212 14.5,200 Z' },
  // calves: two gastroc heads
  { muscle: 'calves', mirror: true, d: 'M 9.5,240 Q 7.5,254 10,268 Q 12,272 13.5,268 Q 15,253 13.5,241 Q 11,237 9.5,240 Z' },
  { muscle: 'calves', mirror: true, d: 'M 15.5,241 Q 18.5,244 18.8,256 Q 18.5,266 16.5,271 Q 14.8,262 14.8,251 Z' },
];

export const BACK_CUTS: string[] = [
  'M 0,40 L 0,97',        // spine through traps
  'M 0,116 L 0,150',      // spine through erectors
  'M 0,153 Q 0,170 0,182', // glute split
];
