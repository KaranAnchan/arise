import type { TierManifest } from '../../character/manifest';
import { SYSTEM } from '../../data/strings';
import { SystemWindow } from '../../ui/SystemWindow';

interface Props {
  manifest: TierManifest;
  currentTierIndex: number;
}

/** Ten tiers: reached ones show their aura and arc; the future stays classified. */
export function TierGallery({ manifest, currentTierIndex }: Props) {
  return (
    <SystemWindow label={SYSTEM.gallery.label}>
      <div className="tier-gallery">
        {manifest.tiers.map((tier, i) => {
          const reached = i <= currentTierIndex;
          const [accent, hi, deep] = tier.aura.colors;
          return (
            <div className={`tier-slot${reached ? '' : ' tier-slot--classified'}`} key={tier.id}>
              <div
                className="tier-slot-aura"
                style={
                  reached
                    ? { background: `radial-gradient(ellipse at 50% 100%, ${deep}, ${accent} 60%, ${hi})` }
                    : undefined
                }
              >
                {!reached && '?'}
              </div>
              <p className="tier-slot-name">
                {reached ? tier.name : SYSTEM.gallery.classified(tier.levels[0])}
              </p>
            </div>
          );
        })}
      </div>
    </SystemWindow>
  );
}
