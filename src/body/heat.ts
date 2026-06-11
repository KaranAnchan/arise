/**
 * Activation (0..1) → forge heat color.
 * 5-stop ramp: cold steel → warm → ember → flame → white-hot.
 */
const STOPS: [number, [number, number, number]][] = [
  [0.0, [0x25, 0x2c, 0x38]],
  [0.25, [0x4a, 0x2c, 0x22]],
  [0.5, [0xb2, 0x40, 0x1f]],
  [0.75, [0xff, 0x7a, 0x1a]],
  [1.0, [0xff, 0xd1, 0x66]],
];

function ramp(a: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, a));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [0, 1, 2].map(k => Math.round(c0[k] + (c1[k] - c0[k]) * f)) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const hex = (c: [number, number, number]) =>
  '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

export interface HeatColor {
  core: string;   // gradient center
  edge: string;   // gradient rim
  glow: number;   // 0..1 drop-shadow strength
}

export function heatColor(a: number): HeatColor {
  if (a < 0.05) {
    return { core: hex(STOPS[0][1]), edge: hex(STOPS[0][1]), glow: 0 };
  }
  // edge trails the core down the ramp → radial "hot center" look
  return {
    core: hex(ramp(a)),
    edge: hex(ramp(Math.max(0, a * 0.55 - 0.02))),
    glow: a >= 0.5 ? (a - 0.5) * 2 : 0,
  };
}
