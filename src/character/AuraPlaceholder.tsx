/**
 * Procedural character placeholder: a dark silhouette wrapped in the tier's aura.
 * This is not a temporary hack — it is the permanent bottom layer of the character
 * card. Real art (lvl_NNN.webp) renders on top of it when present, so dropping in
 * images only ever upgrades the center of the card.
 */
import type { TierDef } from '../engine/types';

interface Props {
  tier: TierDef;
  /** 0..1 within-tier progress — scales aura strength so even non-tier levels feel like growth */
  progress: number;
}

/** Deterministic pseudo-random in [0,1) per particle index — stable across renders. */
function jitter(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function AuraPlaceholder({ tier, progress }: Props) {
  const [accent, hi, deep] = tier.aura.colors;
  const strength = tier.aura.intensity * (0.55 + 0.45 * progress);
  const particleCount = Math.round(4 + tier.aura.intensity * 12);

  return (
    <div className="aura-stage" aria-hidden="true">
      <div
        className="aura-glow"
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 78%, ${accent} 0%, ${deep} 45%, transparent 72%)`,
          opacity: strength,
        }}
      />
      {Array.from({ length: particleCount }, (_, i) => (
        <span
          key={i}
          className="aura-particle"
          style={{
            left: `${12 + jitter(i, 1) * 76}%`,
            width: `${2 + jitter(i, 2) * 3}px`,
            height: `${2 + jitter(i, 2) * 3}px`,
            background: i % 3 === 0 ? hi : accent,
            opacity: 0.25 + strength * 0.6,
            animationDuration: `${3.5 + jitter(i, 3) * 4}s`,
            animationDelay: `${-jitter(i, 4) * 6}s`,
          }}
        />
      ))}
      <svg className="aura-silhouette" viewBox="0 0 120 200" role="img" aria-label="">
        <path
          d="M60 22c-9 0-15 7-15 16 0 6 3 11 7 14l-2 6c-12 4-20 12-22 24l-6 38c-1 6 3 8 6 5l10-14-2 26-6 50c-1 5 2 7 6 7h8c3 0 5-2 5-5l8-44h3l8 44c0 3 2 5 5 5h8c4 0 7-2 6-7l-6-50-2-26 10 14c3 3 7 1 6-5l-6-38c-2-12-10-20-22-24l-2-6c4-3 7-8 7-14 0-9-6-16-15-16z"
          fill="#0D1118"
          stroke={deep}
          strokeWidth="1.5"
        />
      </svg>
      <div
        className="aura-floor"
        style={{
          background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${accent} 0%, transparent 70%)`,
          opacity: strength * 0.7,
        }}
      />
    </div>
  );
}
