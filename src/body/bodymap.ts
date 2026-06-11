import type { Activation, MuscleId } from '../data/types';
import { heatColor } from './heat';
import { SILHOUETTE, FRONT_MUSCLES, BACK_MUSCLES, FRONT_CUTS, BACK_CUTS } from './shapes';

const NS = 'http://www.w3.org/2000/svg';

/**
 * Front + back anatomical figures in one SVG.
 * Each muscle is filled with a radial gradient whose stop colors encode
 * activation on the forge heat ramp; updates transition via CSS on <stop>.
 */
export function renderBodyMap(
  host: HTMLElement,
  activation: Activation,
  onPick?: (muscle: MuscleId) => void,
): void {
  const FRONT_X = 96, BACK_X = 284, Y = 9;

  const muscleIds = new Set<MuscleId>();
  for (const s of [...FRONT_MUSCLES, ...BACK_MUSCLES]) muscleIds.add(s.muscle);

  const defs = [...muscleIds].map(m => {
    const h = heatColor(0);
    return `<radialGradient id="hg-${m}" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="${h.core}"/>
      <stop offset="100%" stop-color="${h.edge}"/>
    </radialGradient>`;
  }).join('');

  const figure = (cx: number, muscles: typeof FRONT_MUSCLES, cuts: string[]) => {
    const sil = SILHOUETTE.map(s =>
      `<path class="sil" d="${s.d}"/>${s.mirror ? `<path class="sil" d="${s.d}" transform="scale(-1,1)"/>` : ''}`
    ).join('');
    const mus = muscles.map(s =>
      `<path class="m" data-m="${s.muscle}" fill="url(#hg-${s.muscle})" d="${s.d}"/>` +
      (s.mirror ? `<path class="m" data-m="${s.muscle}" fill="url(#hg-${s.muscle})" d="${s.d}" transform="scale(-1,1)"/>` : '')
    ).join('');
    const cut = cuts.map(d => `<path class="cut" d="${d}"/>`).join('');
    return `<g transform="translate(${cx},${Y})">${sil}${mus}${cut}</g>`;
  };

  host.innerHTML =
    `<svg viewBox="0 0 380 322" role="img" aria-label="Muscle activation heat map, front and back view" xmlns="${NS}">
      <defs>${defs}</defs>
      ${figure(FRONT_X, FRONT_MUSCLES, FRONT_CUTS)}
      ${figure(BACK_X, BACK_MUSCLES, BACK_CUTS)}
    </svg>`;

  if (onPick) {
    host.addEventListener('click', e => {
      const m = (e.target as Element).closest?.('.m') as SVGPathElement | null;
      if (m?.dataset.m) onPick(m.dataset.m as MuscleId);
    });
  }

  updateBodyMap(host, activation);
}

/** Re-color all muscles for a new activation map (gradient stops + glow). */
export function updateBodyMap(host: HTMLElement, activation: Activation): void {
  const svg = host.querySelector('svg');
  if (!svg) return;

  svg.querySelectorAll<SVGGradientElement>('radialGradient').forEach(grad => {
    const m = grad.id.replace('hg-', '') as MuscleId;
    const h = heatColor(activation[m] ?? 0);
    const stops = grad.querySelectorAll('stop');
    stops[0]?.setAttribute('stop-color', h.core);
    stops[1]?.setAttribute('stop-color', h.edge);
  });

  svg.querySelectorAll<SVGPathElement>('.m').forEach(p => {
    const a = activation[p.dataset.m as MuscleId] ?? 0;
    const h = heatColor(a);
    p.style.filter = h.glow > 0
      ? `drop-shadow(0 0 ${3 + h.glow * 4}px rgba(255,122,26,${(0.25 + h.glow * 0.3).toFixed(2)}))`
      : 'none';
  });
}
