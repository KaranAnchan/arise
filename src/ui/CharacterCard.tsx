import type { GameState } from '../engine/types';
import type { TierManifest } from '../character/manifest';
import { CharacterImage } from '../character/CharacterImage';
import { SYSTEM } from '../data/strings';
import { useEquippedTitle } from '../store/title';
import { XPBar } from './XPBar';
import { TierTease } from './TierTease';

interface Props {
  state: GameState;
  manifest: TierManifest;
}

export function CharacterCard({ state, manifest }: Props) {
  const tier = manifest.tiers[state.tierIndex];
  const title = useEquippedTitle(state.titles);
  return (
    <div>
      <CharacterImage level={state.level} manifest={manifest} />
      <div className="character-meta">
        <span className="level-label">{SYSTEM.dashboard.level}</span>
        <span className="level-numeral">{state.level}</span>
        <p className="tier-name">{tier.name}</p>
      </div>
      {title && title !== tier.name && <p className="equipped-title">「{title}」</p>}
      <XPBar xpIntoLevel={state.xpIntoLevel} xpToNext={state.xpToNext} totalXp={state.totalXp} />
      <TierTease currentTierIndex={state.tierIndex} manifest={manifest} />
    </div>
  );
}
