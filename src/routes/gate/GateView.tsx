import { useMemo, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { SESSIONS } from '../../data/program';
import { SYSTEM } from '../../data/strings';
import { sessionActivation } from '../../data/types';
import { getManifest } from '../../character/manifest';
import { useGameState } from '../../store/useGameState';
import { appendEvent } from '../../store/append';
import { dateIso } from '../../store/dates';
import { BodyHeatmap } from '../../body/BodyHeatmap';
import { SystemText } from '../../ui/SystemText';
import { ExerciseCard } from './ExerciseCard';
import { TallyScreen } from './TallyScreen';

export function GateView() {
  const { sessionId } = useParams({ from: '/gate/$sessionId' });
  const session = SESSIONS[sessionId];
  const state = useGameState();
  const manifest = getManifest();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tallyOpen, setTallyOpen] = useState(false);

  const activation = useMemo(() => {
    if (!session) return {};
    const focused = session.exercises.find((e) => e.id === expanded);
    return focused ? focused.activation : sessionActivation(session);
  }, [session, expanded]);

  if (!session) return <main>[UNKNOWN GATE]</main>;
  if (!state) return null;

  const tier = manifest.tiers[state.tierIndex];
  const isDone = (id: string) =>
    (state.todayByExercise[id]?.sets.length ?? 0) >= (SESSIONS[sessionId].exercises.find((e) => e.id === id)?.scheme.sets ?? Infinity);
  const doneCount = session.exercises.filter((e) => isDone(e.id)).length;
  const allDone = doneCount === session.exercises.length;
  const cleared = state.clearedToday.includes(sessionId);

  const clearGate = async () => {
    await appendEvent('gate_cleared', { sessionId, sessionDate: dateIso() });
    setTallyOpen(true);
  };

  return (
    <main className="gate">
      <header className="gate-head">
        <Link to="/" className="gate-back system-text system-text--muted">
          {SYSTEM.gate.back}
        </Link>
        <span className="rank-badge">{tier.id.toUpperCase()}</span>
      </header>
      <h1 className="gate-name">{session.gateName}</h1>
      <SystemText>{session.why.toUpperCase()}</SystemText>

      <BodyHeatmap
        activation={activation}
        focusLabel={expanded ? session.exercises.find((e) => e.id === expanded)?.name ?? '' : `GATE: ${session.gateName}`}
      />

      <div className="exercise-list">
        {session.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            expanded={expanded === ex.id}
            done={isDone(ex.id)}
            onToggle={() => setExpanded(expanded === ex.id ? null : ex.id)}
            prev={state.prevByExercise[ex.id]}
            today={state.todayByExercise[ex.id]}
          />
        ))}
      </div>

      <footer className="gate-foot">
        <div className="gate-progress">
          <div className="gate-progress-fill" style={{ width: `${(doneCount / session.exercises.length) * 100}%` }} />
        </div>
        <p className="system-text system-text--muted">[{SYSTEM.gate.progress(doneCount, session.exercises.length)}]</p>
        {cleared ? (
          <button type="button" className="cta" onClick={() => setTallyOpen(true)}>
            {SYSTEM.gate.viewTally}
          </button>
        ) : (
          <button type="button" className="cta" disabled={!allDone} onClick={() => void clearGate()}>
            {SYSTEM.gate.clearGate}
          </button>
        )}
      </footer>

      {tallyOpen && <TallyScreen sessionId={sessionId} date={dateIso()} onClose={() => setTallyOpen(false)} />}
    </main>
  );
}
