import type { Demo, HotSegment } from './poses';
import { solve, lerpPose, easeInOut, LEN, type FigurePoints, type Pose } from './skeleton';

const NS = 'http://www.w3.org/2000/svg';

const C = {
  body: '#3a4452',
  rear: '#252d3a',
  hot: '#ff7a1a',
  equip: '#e8b84b',
  prop: '#222a36',
  floor: '#1d2430',
};

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function seg(width: number, color: string): SVGLineElement {
  return el('line', { stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' });
}

const setLine = (l: SVGLineElement, a: [number, number], b: [number, number]) => {
  l.setAttribute('x1', a[0].toFixed(1)); l.setAttribute('y1', a[1].toFixed(1));
  l.setAttribute('x2', b[0].toFixed(1)); l.setAttribute('y2', b[1].toFixed(1));
};

/** Builds the demo SVG inside `host` and drives the a↔b pose loop. */
export class DemoAnimator {
  private svg: SVGSVGElement;
  private raf = 0;
  private timer = 0;
  private t0 = performance.now();
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  private shadow: SVGEllipseElement;
  private floorY: number;
  private rearLegT: SVGLineElement; private rearLegS: SVGLineElement; private rearFoot: SVGLineElement;
  private rearArmU: SVGLineElement; private rearArmF: SVGLineElement;
  private torso: SVGLineElement; private head: SVGCircleElement;
  private legT: SVGLineElement; private legS: SVGLineElement; private foot: SVGLineElement;
  private armU: SVGLineElement; private armF: SVGLineElement;
  private equip: SVGGElement;

  private demo: Demo;

  constructor(host: HTMLElement, demo: Demo, label: string) {
    this.demo = demo;
    this.svg = el('svg', { viewBox: '0 0 160 100', role: 'img', 'aria-label': `Animation: ${label}` });

    const floor = demo.floor ?? 93;
    this.floorY = floor;
    this.svg.appendChild(el('line', { x1: 8, y1: floor, x2: 152, y2: floor, stroke: C.floor, 'stroke-width': 1.5 }));
    this.shadow = el('ellipse', { cy: floor + 2.5, rx: 26, ry: 3, fill: 'rgba(0,0,0,0.4)' });
    this.svg.appendChild(this.shadow);
    for (const [x1, y1, x2, y2, w] of demo.props ?? []) {
      this.svg.appendChild(el('line', { x1, y1, x2, y2, stroke: C.prop, 'stroke-width': w, 'stroke-linecap': 'round' }));
    }

    const hot = (s: HotSegment, w: number, base = C.body) =>
      seg(w, this.demo.hot.includes(s) ? C.hot : base);

    // rear (depth) limbs first, then equipment behind front limbs, then body
    this.rearLegT = seg(7, C.rear); this.rearLegS = seg(5.5, C.rear); this.rearFoot = seg(4, C.rear);
    this.rearArmU = seg(5.5, C.rear); this.rearArmF = seg(4.5, C.rear);
    this.equip = el('g', {});
    this.torso = hot('torso', 9);
    this.head = el('circle', { r: LEN.headR, fill: C.body });
    this.legT = hot('thigh', 8); this.legS = hot('shin', 6);
    this.foot = seg(4.5, C.body);
    this.armU = hot('uarm', 6); this.armF = hot('farm', 5);

    for (const e of [this.rearLegT, this.rearLegS, this.rearFoot, this.rearArmU, this.rearArmF,
      this.equip, this.torso, this.head, this.legT, this.legS, this.foot, this.armU, this.armF]) {
      this.svg.appendChild(e);
    }

    host.appendChild(this.svg);
    this.draw(solve(demo.a));
  }

  start(): void {
    this.stop();
    if (this.reduced) {
      // discrete two-pose toggle — no continuous limb motion
      let atB = false;
      this.timer = window.setInterval(() => {
        atB = !atB;
        this.draw(solve(atB ? this.demo.b : this.demo.a));
      }, 1600);
      return;
    }
    this.t0 = performance.now();
    const loop = () => {
      const cycle = (performance.now() - this.t0) % (this.demo.tempo * 2);
      let ph = cycle / this.demo.tempo;
      if (ph > 1) ph = 2 - ph;
      this.draw(solve(lerpPose(this.demo.a, this.demo.b, easeInOut(ph))));
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    clearInterval(this.timer);
    this.raf = 0; this.timer = 0;
  }

  private draw(p: FigurePoints): void {
    // grounded shadow follows the figure's center of mass, stretches when low
    const cx = (p.hip[0] + p.ankle[0] + p.shoulder[0]) / 3;
    const lowness = Math.min(1, Math.max(0, (p.hip[1] - 36) / (this.floorY - 36)));
    this.shadow.setAttribute('cx', cx.toFixed(1));
    this.shadow.setAttribute('rx', (22 + lowness * 14).toFixed(1));
    this.shadow.setAttribute('fill', `rgba(0,0,0,${(0.28 + lowness * 0.2).toFixed(2)})`);

    setLine(this.rearLegT, off(p.hip), off(p.knee2));
    setLine(this.rearLegS, off(p.knee2), off(p.ankle2));
    setLine(this.rearFoot, off(p.ankle2), off(p.toe2));
    setLine(this.rearArmU, off(p.shoulder), off(p.elbow));
    setLine(this.rearArmF, off(p.elbow), off(p.wrist));

    setLine(this.torso, p.hip, p.shoulder);
    this.head.setAttribute('cx', p.head[0].toFixed(1));
    this.head.setAttribute('cy', p.head[1].toFixed(1));
    setLine(this.legT, p.hip, p.knee);
    setLine(this.legS, p.knee, p.ankle);
    setLine(this.foot, p.ankle, p.toe);
    setLine(this.armU, p.shoulder, p.elbow);
    setLine(this.armF, p.elbow, p.wrist);

    this.drawEquipment(p);
  }

  private drawEquipment(p: FigurePoints): void {
    const g = this.equip;
    g.innerHTML = '';
    const [wx, wy] = p.wrist;
    const add = (e: SVGElement) => g.appendChild(e);

    switch (this.demo.equipment) {
      case 'barbell':
        add(el('circle', { cx: wx, cy: wy, r: 7.5, fill: 'none', stroke: C.equip, 'stroke-width': 2.5 }));
        add(el('circle', { cx: wx, cy: wy, r: 1.8, fill: C.equip }));
        break;
      case 'ezbar':
        add(el('circle', { cx: wx, cy: wy, r: 4.5, fill: 'none', stroke: C.equip, 'stroke-width': 2.2 }));
        add(el('circle', { cx: wx, cy: wy, r: 1.4, fill: C.equip }));
        break;
      case 'dumbbell': {
        // bell drawn along the forearm axis
        const [ex, ey] = p.elbow;
        const dx = wx - ex, dy = wy - ey;
        const n = Math.hypot(dx, dy) || 1;
        const ux = dx / n, uy = dy / n;
        add(el('line', {
          x1: wx - ux * 4.5, y1: wy - uy * 4.5, x2: wx + ux * 4.5, y2: wy + uy * 4.5,
          stroke: C.equip, 'stroke-width': 2,
        }));
        add(el('circle', { cx: wx - ux * 4.5, cy: wy - uy * 4.5, r: 2.6, fill: C.equip }));
        add(el('circle', { cx: wx + ux * 4.5, cy: wy + uy * 4.5, r: 2.6, fill: C.equip }));
        break;
      }
      case 'cable': case 'cableBar': case 'rope': {
        const [ax, ay] = p.anchor ?? [wx, 0];
        add(el('line', { x1: ax, y1: ay, x2: wx, y2: wy, stroke: C.equip, 'stroke-width': 1.2, 'stroke-dasharray': 'none', opacity: 0.85 }));
        add(el('circle', { cx: ax, cy: ay, r: 2, fill: 'none', stroke: C.equip, 'stroke-width': 1.2 }));
        if (this.demo.equipment === 'cableBar') {
          add(el('line', { x1: wx - 9, y1: wy, x2: wx + 9, y2: wy, stroke: C.equip, 'stroke-width': 2.4, 'stroke-linecap': 'round' }));
        }
        if (this.demo.equipment === 'rope') {
          add(el('line', { x1: wx, y1: wy, x2: wx + 3, y2: wy + 5, stroke: C.equip, 'stroke-width': 2, 'stroke-linecap': 'round' }));
          add(el('line', { x1: wx, y1: wy, x2: wx - 3, y2: wy + 5, stroke: C.equip, 'stroke-width': 2, 'stroke-linecap': 'round' }));
        }
        break;
      }
      case 'sled': {
        // leg-press plate: perpendicular to the 45° push axis, at the feet
        const [ax, ay] = p.anchor ?? p.toe;
        const d = 12;
        add(el('line', {
          x1: ax - d * 0.71, y1: ay - d * 0.71, x2: ax + d * 0.71, y2: ay + d * 0.71,
          stroke: C.equip, 'stroke-width': 3.5, 'stroke-linecap': 'round',
        }));
        break;
      }
      case 'pad':
        add(el('circle', { cx: p.ankle[0], cy: p.ankle[1], r: 3.5, fill: 'none', stroke: C.equip, 'stroke-width': 2 }));
        break;
      case 'hipbar':
        add(el('circle', { cx: p.hip[0], cy: p.hip[1] - 7, r: 6.5, fill: 'none', stroke: C.equip, 'stroke-width': 2.4 }));
        add(el('circle', { cx: p.hip[0], cy: p.hip[1] - 7, r: 1.6, fill: C.equip }));
        break;
      case 'none':
        break;
    }
  }
}

/** small parallax offset for rear limbs */
const off = (pt: [number, number]): [number, number] => [pt[0] - 2.2, pt[1] + 0.6];

export type { Pose };
