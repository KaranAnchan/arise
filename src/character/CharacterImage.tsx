import { useEffect, useState } from 'react';
import type { TierManifest } from './manifest';
import { imageUrlForLevel, tierForLevel, withinTierProgress } from './manifest';
import { AuraPlaceholder } from './AuraPlaceholder';

interface Props {
  level: number;
  manifest: TierManifest;
}

/**
 * The aura layer always renders; the level's image sits on top when the file exists.
 * A missing image silently leaves the placeholder visible (PRD AC-9.3) — never a
 * broken-image glyph.
 */
export function CharacterImage({ level, manifest }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [level]);

  const tier = tierForLevel(level, manifest);

  return (
    <div className="character-stage">
      <AuraPlaceholder tier={tier} progress={withinTierProgress(level, tier)} />
      {!failed && (
        <img
          className="character-img"
          src={imageUrlForLevel(level, manifest)}
          alt={`Hunter at level ${level} — ${tier.name}`}
          onError={() => setFailed(true)}
          draggable={false}
        />
      )}
    </div>
  );
}
