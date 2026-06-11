import type { TierManifest } from '../character/manifest';
import { SYSTEM } from '../data/strings';

interface Props {
  currentTierIndex: number;
  manifest: TierManifest;
}

/**
 * The locked slot for the next tier: name classified, but its aura color already
 * leaks through the edges — you can see the color of what you're becoming.
 */
export function TierTease({ currentTierIndex, manifest }: Props) {
  const next = manifest.tiers[currentTierIndex + 1];
  if (!next) {
    return <div className="tier-tease">{SYSTEM.dashboard.maxTier}</div>;
  }
  return (
    <div className="tier-tease" style={{ '--tease-color': next.aura.colors[0] } as React.CSSProperties}>
      ▸ {SYSTEM.dashboard.nextTier(next.levels[0])} ◂
    </div>
  );
}
