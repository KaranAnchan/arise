import { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { applyTierTheme, getManifest } from '../../character/manifest';
import { collectFacts, sortEvents } from '../../engine/reduce';
import { buildTimelines } from '../../engine/reduce';
import { SYSTEM } from '../../data/strings';
import { equipTitle, useEquippedTitle } from '../../store/title';
import { useEvents, useGameState } from '../../store/useGameState';
import { Sparkline } from '../../ui/Sparkline';
import { SystemWindow } from '../../ui/SystemWindow';
import { Records } from './Records';
import { RelicGrid } from './RelicGrid';
import { StatPanel } from './StatPanel';
import { TierGallery } from './TierGallery';

/** One equippable honorific (earned at tier-ups); shown under the character name. */
function TitlePicker({ titles }: { titles: string[] }) {
  const equipped = useEquippedTitle(titles);
  if (titles.length < 2) return null; // nothing to choose until a second tier is reached
  return (
    <SystemWindow label={SYSTEM.titles.label}>
      <ul className="title-list">
        {titles.map((t) => (
          <li className="title-row" key={t}>
            <span className="quest-title">{t.toUpperCase()}</span>
            {t === equipped ? (
              <span className="quest-xp">{SYSTEM.titles.equipped}</span>
            ) : (
              <button className="quest-claim" onClick={() => void equipTitle(t)}>
                {SYSTEM.titles.equip}
              </button>
            )}
          </li>
        ))}
      </ul>
    </SystemWindow>
  );
}

export function Profile() {
  const state = useGameState();
  const events = useEvents();
  const manifest = getManifest();

  const timelines = useMemo(
    () => (events ? buildTimelines(collectFacts(sortEvents(events))) : new Map()),
    [events],
  );

  useEffect(() => {
    if (state) applyTierTheme(state.tierIndex, manifest);
  }, [state?.tierIndex, manifest, state]);

  if (!state) return null;

  return (
    <main className="profile">
      <header className="gate-head">
        <Link to="/" className="gate-back system-text">
          [{SYSTEM.profile.back}]
        </Link>
        <span className="rank-badge">{SYSTEM.profile.title}</span>
      </header>

      <StatPanel state={state} />
      <TitlePicker titles={state.titles} />
      <RelicGrid state={state} />
      <TierGallery manifest={manifest} currentTierIndex={state.tierIndex} />

      {state.bodyweights.length > 0 && (
        <SystemWindow label={SYSTEM.profile.bodyweight}>
          <p className="record-line">
            {state.bodyweights[state.bodyweights.length - 1].kg.toFixed(1)} kg ·{' '}
            {state.bodyweights[state.bodyweights.length - 1].date}
          </p>
          <Sparkline values={state.bodyweights.map((b) => b.kg)} wide />
        </SystemWindow>
      )}

      <Records timelines={timelines} />
    </main>
  );
}
