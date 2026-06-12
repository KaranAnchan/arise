/** Minimal aura-stroked progression line. Pure SVG, no chart library — bundle stays lean. */
interface Props {
  values: number[];
  wide?: boolean;
}

export function Sparkline({ values, wide = false }: Props) {
  const W = 100;
  const H = 28;
  const PAD = 3;
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (values.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (values.length - 1));
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <span className={`sparkline${wide ? ' sparkline--wide' : ''}`} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {values.length > 1 && <polyline points={points} />}
        <circle cx={lastX} cy={lastY} r="2.4" />
      </svg>
    </span>
  );
}
