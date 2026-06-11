/**
 * Tier manifest loading and resolution. `public/assets/characters/tiers.json` is the
 * single source of truth for tiers, level→image mapping, stat multipliers, and the
 * aura palette that themes the whole UI. Extending the game past level 100 (or adding
 * a new transformation tree) means editing that JSON and dropping image files — never
 * touching code (PRD AC-9.x). All functions take the manifest as an argument so they
 * stay pure and testable.
 */
import type { TierDef } from '../engine/types';

export interface TierManifest {
  version: number;
  /** e.g. "/assets/characters/lvl_{nnn}.webp" — {nnn} is the zero-padded level */
  imagePattern: string;
  tiers: TierDef[];
}

let cached: TierManifest | null = null;

export async function loadManifest(): Promise<TierManifest> {
  if (cached) return cached;
  const res = await fetch('/assets/characters/tiers.json');
  if (!res.ok) throw new Error(`tiers.json failed to load: ${res.status}`);
  cached = (await res.json()) as TierManifest;
  return cached;
}

/** Synchronous access after boot (main.tsx awaits loadManifest before rendering). */
export function getManifest(): TierManifest {
  if (!cached) throw new Error('Tier manifest accessed before loadManifest()');
  return cached;
}

export function maxLevel(m: TierManifest): number {
  return Math.max(...m.tiers.map((t) => t.levels[1]));
}

export function tierIndexForLevel(level: number, m: TierManifest): number {
  const i = m.tiers.findIndex((t) => level >= t.levels[0] && level <= t.levels[1]);
  if (i >= 0) return i;
  // out of range: clamp to nearest defined tier
  return level < m.tiers[0].levels[0] ? 0 : m.tiers.length - 1;
}

export function tierForLevel(level: number, m: TierManifest): TierDef {
  return m.tiers[tierIndexForLevel(level, m)];
}

export function imageUrlForLevel(level: number, m: TierManifest): string {
  return m.imagePattern.replace('{nnn}', String(level).padStart(3, '0'));
}

/** 0..1 position within the current tier — drives placeholder aura intensity. */
export function withinTierProgress(level: number, tier: TierDef): number {
  const [lo, hi] = tier.levels;
  if (hi === lo) return 1;
  return Math.min(1, Math.max(0, (level - lo) / (hi - lo)));
}

/**
 * Bind the tier's aura palette to CSS custom properties on <html>. Every aura-colored
 * element in the app reads these vars, so a tier-up literally recolors the interface.
 */
export function applyTierTheme(tierIndex: number, m: TierManifest): void {
  const tier = m.tiers[Math.min(tierIndex, m.tiers.length - 1)];
  const [aura, hi, deep] = tier.aura.colors;
  const root = document.documentElement;
  root.dataset.tier = String(tierIndex + 1);
  root.style.setProperty('--aura', aura);
  root.style.setProperty('--aura-hi', hi);
  root.style.setProperty('--aura-deep', deep);
  root.style.setProperty('--aura-intensity', String(tier.aura.intensity));
}
