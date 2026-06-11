/**
 * 2-D forward kinematics for the side-view demo figure.
 *
 * Angle conventions (degrees):
 *  - torso: 0 = upright, positive = lean toward screen-right (the "front")
 *  - arm/leg segments: absolute, 0 = straight down, positive = swung forward
 *    (point = parent + length * (sin a, cos a))
 */

export interface Pose {
  x: number; y: number;          // hip (root) position
  torso: number;
  neck?: number | undefined;     // relative to torso
  shoulder: number;              // upper-arm absolute angle
  elbow: number;                 // forearm absolute angle
  hip: number;                   // thigh absolute angle
  knee: number;                  // shin absolute angle
  foot?: number | undefined;     // foot absolute angle (default 86 ≈ flat forward)
  hip2?: number | undefined; knee2?: number | undefined; foot2?: number | undefined; // rear leg (defaults: mirror front)
  anchor?: [number, number] | undefined; // cable anchor / sled position (lerped)
}

export const LEN = {
  torso: 30, neck: 4.5, headR: 6.5,
  upper: 19, fore: 17,
  thigh: 26, shin: 24, foot: 9,
};

const rad = (d: number) => (d * Math.PI) / 180;

export interface FigurePoints {
  hip: [number, number];
  shoulder: [number, number];
  head: [number, number];
  elbow: [number, number];
  wrist: [number, number];
  knee: [number, number];
  ankle: [number, number];
  toe: [number, number];
  knee2: [number, number];
  ankle2: [number, number];
  toe2: [number, number];
  anchor?: [number, number] | undefined;
}

export function solve(p: Pose): FigurePoints {
  const down = (from: [number, number], a: number, len: number): [number, number] =>
    [from[0] + len * Math.sin(rad(a)), from[1] + len * Math.cos(rad(a))];

  const hip: [number, number] = [p.x, p.y];
  const shoulder: [number, number] = [
    p.x + LEN.torso * Math.sin(rad(p.torso)),
    p.y - LEN.torso * Math.cos(rad(p.torso)),
  ];
  const headA = p.torso + (p.neck ?? 0);
  const head: [number, number] = [
    shoulder[0] + (LEN.neck + LEN.headR) * Math.sin(rad(headA)),
    shoulder[1] - (LEN.neck + LEN.headR) * Math.cos(rad(headA)),
  ];

  const elbow = down(shoulder, p.shoulder, LEN.upper);
  const wrist = down(elbow, p.elbow, LEN.fore);

  const knee = down(hip, p.hip, LEN.thigh);
  const ankle = down(knee, p.knee, LEN.shin);
  const toe = down(ankle, p.foot ?? 86, LEN.foot);

  const knee2 = down(hip, p.hip2 ?? p.hip, LEN.thigh);
  const ankle2 = down(knee2, p.knee2 ?? p.knee, LEN.shin);
  const toe2 = down(ankle2, p.foot2 ?? p.foot ?? 86, LEN.foot);

  return { hip, shoulder, head, elbow, wrist, knee, ankle, toe, knee2, ankle2, toe2, anchor: p.anchor };
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const n = (x: number, y: number) => x + (y - x) * t;
  const o = (x?: number, y?: number) =>
    x === undefined && y === undefined ? undefined : n(x ?? y ?? 0, y ?? x ?? 0);
  return {
    x: n(a.x, b.x), y: n(a.y, b.y),
    torso: n(a.torso, b.torso), neck: o(a.neck, b.neck),
    shoulder: n(a.shoulder, b.shoulder), elbow: n(a.elbow, b.elbow),
    hip: n(a.hip, b.hip), knee: n(a.knee, b.knee), foot: o(a.foot, b.foot),
    hip2: o(a.hip2, b.hip2), knee2: o(a.knee2, b.knee2), foot2: o(a.foot2, b.foot2),
    anchor: a.anchor && b.anchor
      ? [n(a.anchor[0], b.anchor[0]), n(a.anchor[1], b.anchor[1])]
      : a.anchor ?? b.anchor,
  };
}

export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
