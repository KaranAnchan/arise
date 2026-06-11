import { describe, expect, it } from 'vitest';
import manifestJson from '../../../public/assets/characters/tiers.json';
import type { TierManifest } from '../manifest';
import { imageUrlForLevel, maxLevel, tierForLevel, tierIndexForLevel, withinTierProgress } from '../manifest';

const m = manifestJson as TierManifest;

describe('tiers.json shape', () => {
  it('covers levels 1–100 in 10 contiguous tiers', () => {
    expect(m.tiers).toHaveLength(10);
    expect(m.tiers[0].levels[0]).toBe(1);
    expect(maxLevel(m)).toBe(100);
    for (let i = 1; i < m.tiers.length; i++) {
      expect(m.tiers[i].levels[0]).toBe(m.tiers[i - 1].levels[1] + 1);
    }
  });

  it('has strictly increasing stat multipliers', () => {
    for (let i = 1; i < m.tiers.length; i++) {
      expect(m.tiers[i].statMultiplier).toBeGreaterThan(m.tiers[i - 1].statMultiplier);
    }
  });
});

describe('resolution', () => {
  it('maps levels to tiers', () => {
    expect(tierForLevel(1, m).id).toBe('e-rank');
    expect(tierForLevel(10, m).id).toBe('e-rank');
    expect(tierForLevel(11, m).id).toBe('d-rank');
    expect(tierForLevel(100, m).id).toBe('shadow-deity');
  });

  it('clamps out-of-range levels to the nearest tier', () => {
    expect(tierIndexForLevel(0, m)).toBe(0);
    expect(tierIndexForLevel(999, m)).toBe(9);
  });

  it('builds zero-padded image urls', () => {
    expect(imageUrlForLevel(5, m)).toBe('/assets/characters/lvl_005.webp');
    expect(imageUrlForLevel(100, m)).toBe('/assets/characters/lvl_100.webp');
  });

  it('supports extension past level 100 by manifest append alone (AC-9.2)', () => {
    const extended: TierManifest = {
      ...m,
      tiers: [
        ...m.tiers,
        {
          id: 'beyond',
          name: 'Beyond the Veil',
          levels: [101, 110],
          statMultiplier: 9,
          aura: { theme: 'beyond', colors: ['#FFFFFF', '#FFFFFF', '#000000'], intensity: 1 },
          arc: 'beyond',
        },
      ],
    };
    expect(maxLevel(extended)).toBe(110);
    expect(tierForLevel(105, extended).id).toBe('beyond');
    expect(imageUrlForLevel(105, extended)).toBe('/assets/characters/lvl_105.webp');
  });

  it('computes within-tier progress', () => {
    const t1 = m.tiers[0]; // levels 1–10
    expect(withinTierProgress(1, t1)).toBe(0);
    expect(withinTierProgress(10, t1)).toBe(1);
    expect(withinTierProgress(5, t1)).toBeCloseTo(4 / 9);
  });
});

// ---------------------------------------------------------------------------
// WCAG contrast: every tier's aura accent must stay readable as a UI accent on
// the app backgrounds (≥3:1, AA for large text / graphical objects), and the
// highlight color must carry normal text (≥4.5:1).
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('aura palette accessibility', () => {
  const surfaces = { bg: '#07090E', panel: '#10141D' };

  for (const tier of m.tiers) {
    it(`${tier.id}: accent ≥3:1 and highlight ≥4.5:1 on app surfaces`, () => {
      const [aura, hi] = tier.aura.colors;
      for (const surface of Object.values(surfaces)) {
        expect(contrast(aura, surface)).toBeGreaterThanOrEqual(3);
        expect(contrast(hi, surface)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
