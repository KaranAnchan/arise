/**
 * The level-up ceremony. Tier-ups extend it: the whole UI re-themes to the new aura
 * mid-ceremony and the tier's arc text stamps in. Skippable by tap; respects
 * prefers-reduced-motion via CSS (crossfades only).
 */
import { useEffect } from 'react';
import type { GameState, StatTag } from '../../engine/types';
import { applyTierTheme, getManifest } from '../../character/manifest';
import { CharacterImage } from '../../character/CharacterImage';
import { SYSTEM } from '../../data/strings';
import { SystemText } from '../../ui/SystemText';

interface Props {
  before: GameState;
  after: GameState;
  onDone: () => void;
}

const STATS: StatTag[] = ['str', 'vit', 'agi', 'rec'];

export function Ceremony({ before, after, onDone }: Props) {
  const manifest = getManifest();
  const tierUp = after.tierIndex > before.tierIndex;
  const tier = manifest.tiers[after.tierIndex];

  // the recolor IS the ceremony for tier-ups — apply as the overlay reveals
  useEffect(() => {
    applyTierTheme(after.tierIndex, manifest);
  }, [after.tierIndex, manifest]);

  return (
    <div className="overlay ceremony" role="dialog" aria-label="Level up" onClick={onDone}>
      <div className="ceremony-inner">
        <SystemText>{SYSTEM.ceremony.conditionsMet}</SystemText>
        <SystemText speed={22}>{tierUp ? SYSTEM.ceremony.tierUp : SYSTEM.ceremony.levelUp}</SystemText>

        <div className="ceremony-stage">
          <CharacterImage level={after.level} manifest={manifest} />
        </div>

        <div className="ceremony-level">
          <span className="ceremony-old">LV {before.level}</span>
          <span className="ceremony-arrow">→</span>
          <span className="ceremony-new">LV {after.level}</span>
        </div>

        {tierUp && (
          <>
            <p className="tier-name ceremony-tier">{tier.name}</p>
            <p className="ceremony-arc">{tier.arc}</p>
          </>
        )}

        <div className="ceremony-stats">
          {STATS.filter((k) => after.stats[k] !== before.stats[k]).map((k) => (
            <div className="ceremony-stat" key={k}>
              <span className="k">{SYSTEM.stats[k]}</span>
              <span className="v">
                {before.stats[k]} → {after.stats[k]}
              </span>
            </div>
          ))}
        </div>

        <p className="system-text system-text--muted ceremony-hint">[TAP TO CONTINUE]</p>
      </div>
    </div>
  );
}
