import { useEffect, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { applyTierTheme, getManifest } from '../../character/manifest';
import { collectFacts, sortEvents } from '../../engine/reduce';
import { buildTimelines } from '../../engine/reduce';
import { SYSTEM } from '../../data/strings';
import { useEvents, useGameState } from '../../store/useGameState';
import { Sparkline } from '../../ui/Sparkline';
import { SystemWindow } from '../../ui/SystemWindow';
import { Records } from './Records';
import { StatPanel } from './StatPanel';

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
