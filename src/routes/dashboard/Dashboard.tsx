import { useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { applyTierTheme, getManifest } from '../../character/manifest';
import { DOW_TO_KEY, SESSIONS, WEEK } from '../../data/program';
import { SYSTEM } from '../../data/strings';
import { useGameState } from '../../store/useGameState';
import { CharacterCard } from '../../ui/CharacterCard';
import { RosterStrip } from '../../ui/RosterStrip';
import { SystemText } from '../../ui/SystemText';
import { SystemWindow } from '../../ui/SystemWindow';

function TodayPanel() {
  const todayKey = DOW_TO_KEY[new Date().getDay()];
  const today = WEEK.find((d) => d.key === todayKey)!;

  if (today.type === 'gym' && today.session) {
    const session = SESSIONS[today.session];
    return (
      <SystemWindow label={SYSTEM.dashboard.todayGate}>
        <h3 className="gate-name">{session.gateName}</h3>
        <p className="gate-focus">{session.focus}</p>
        <Link to="/gate/$sessionId" params={{ sessionId: session.id }} className="cta cta--link">
          {SYSTEM.dashboard.enterGate}
        </Link>
      </SystemWindow>
    );
  }

  if (today.type === 'work') {
    return (
      <SystemWindow label={SYSTEM.dashboard.mandatoryQuest}>
        <p className="gate-focus">8 hours, cold environment. The System counts it. Confirm completion in Phase 3.</p>
      </SystemWindow>
    );
  }

  return (
    <SystemWindow label="THE SANCTUARY">
      <SystemText speed={0}>{SYSTEM.dashboard.sanctuary}</SystemText>
    </SystemWindow>
  );
}

export function Dashboard() {
  const state = useGameState();
  const manifest = getManifest();

  useEffect(() => {
    if (state) applyTierTheme(state.tierIndex, manifest);
  }, [state?.tierIndex, manifest, state]);

  if (!state) return null; // first IndexedDB read; sub-frame

  const tier = manifest.tiers[state.tierIndex];

  return (
    <main className="dashboard">
      <header className="app-header span-2">
        <h1 className="app-title">{SYSTEM.appName}</h1>
      </header>
      <div className="span-2">
        <SystemText>{SYSTEM.greeting(new Date().getHours())}</SystemText>
      </div>

      <SystemWindow label="STATUS WINDOW">
        <CharacterCard state={state} manifest={manifest} />
      </SystemWindow>

      <div>
        <RosterStrip />
        <TodayPanel />
        <SystemWindow label="HUNTER PROFILE">
          <div className="stat-row">
            {(['str', 'vit', 'agi', 'rec'] as const).map((k) => (
              <div className="stat-cell" key={k}>
                <div className="k">{SYSTEM.stats[k]}</div>
                <div className="v">{state.stats[k]}</div>
              </div>
            ))}
          </div>
          <p className="streak-line system-text system-text--muted">
            [{SYSTEM.dashboard.streak(state.streakWeeks, state.multiplier)}]
          </p>
          <p className="window-label" style={{ margin: 0, textAlign: 'center' }}>
            {tier.arc}
          </p>
        </SystemWindow>
      </div>
    </main>
  );
}
