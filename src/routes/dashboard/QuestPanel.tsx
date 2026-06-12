/**
 * The Daily Quests window. Auto quests tick themselves (the watcher claims them from
 * real events); manual quests claim on tap; intrinsic quests mirror their underlying
 * event. The bodyweight logger lives here because its quest is the only reason the
 * System asks for the number.
 */
import { useState } from 'react';
import type { QuestDef } from '../../engine/quests';
import { questDone } from '../../engine/quests';
import type { GameState } from '../../engine/types';
import { SESSIONS } from '../../data/program';
import { SYSTEM } from '../../data/strings';
import { appendEvent } from '../../store/append';
import { dateIso } from '../../store/dates';
import { useQuests } from '../../store/watchers';
import { SystemWindow } from '../../ui/SystemWindow';

const EXERCISE_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(SESSIONS).flatMap((s) => s.exercises.map((e) => [e.id, e.name])),
);

function questTitle(q: QuestDef): string {
  switch (q.template) {
    case 'clear_gate':
      return SYSTEM.quests.clear_gate(SESSIONS[q.subject ?? '']?.gateName ?? q.subject ?? '');
    case 'beat_tonnage':
      return SYSTEM.quests.beat_tonnage(EXERCISE_NAMES[q.subject ?? ''] ?? q.subject ?? '');
    case 'review_form':
      return SYSTEM.quests.review_form(EXERCISE_NAMES[q.subject ?? ''] ?? q.subject ?? '');
    case 'endurance_trial':
      return SYSTEM.quests.endurance_trial;
    case 'honor_sanctuary':
      return SYSTEM.quests.honor_sanctuary;
    case 'log_bodyweight':
      return SYSTEM.quests.log_bodyweight;
    default:
      return q.template.toUpperCase();
  }
}

function QuestRow({ q, state, today }: { q: QuestDef; state: GameState; today: string }) {
  const done = questDone(q, state, today);
  const pendingSanctuary = q.template === 'honor_sanctuary' && !done;
  return (
    <li className={`quest-row${done ? ' quest-row--done' : ''}`}>
      <span className={`quest-mark${done ? ' quest-mark--done' : ''}`}>{done ? '◆' : '◇'}</span>
      <span className="quest-title">{questTitle(q)}</span>
      {q.claim === 'manual' && !done ? (
        <button
          className="quest-claim"
          onClick={() =>
            void appendEvent('quest_completed', { questId: q.id, template: q.template, date: today })
          }
        >
          {SYSTEM.quests.claim} {SYSTEM.quests.xp(q.xp)}
        </button>
      ) : (
        <span className="quest-xp">
          {pendingSanctuary ? SYSTEM.quests.judgedAtDawn : SYSTEM.quests.xp(q.xp)}
        </span>
      )}
    </li>
  );
}

function BodyweightRow({ state, today }: { state: GameState; today: string }) {
  const logged = state.bodyweights.find((b) => b.date === today);
  const last = state.bodyweights[state.bodyweights.length - 1];
  const [kg, setKg] = useState(last?.kg ?? 75);

  if (logged) {
    return <p className="quest-bw-recorded system-text system-text--muted">[{SYSTEM.bodyweight.recorded(logged.kg)}]</p>;
  }
  return (
    <div className="quest-bw">
      <span className="quest-title">{SYSTEM.bodyweight.label}</span>
      <div className="stepper">
        <button onClick={() => setKg((v) => Math.max(30, v - 0.5))} aria-label="-0.5 kg">−</button>
        <span className="stepper-value">
          {kg.toFixed(1)}&nbsp;<small>kg</small>
        </span>
        <button onClick={() => setKg((v) => v + 0.5)} aria-label="+0.5 kg">＋</button>
      </div>
      <button
        className="log-btn"
        onClick={() => void appendEvent('bodyweight_logged', { kg, date: today })}
      >
        {SYSTEM.bodyweight.log}
      </button>
    </div>
  );
}

export function QuestPanel({ state }: { state: GameState }) {
  const quests = useQuests(state);
  const today = dateIso();
  if (quests.length === 0) return null;

  const wantsBodyweight = quests.some((q) => q.template === 'log_bodyweight');
  return (
    <SystemWindow label={SYSTEM.quests.label}>
      <ul className="quest-list">
        {quests.map((q) => (
          <QuestRow key={q.id} q={q} state={state} today={today} />
        ))}
      </ul>
      {wantsBodyweight && <BodyweightRow state={state} today={today} />}
    </SystemWindow>
  );
}
