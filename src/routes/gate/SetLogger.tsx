/**
 * Per-set logging. Pre-filled from the previous session so the common case is
 * tap-LOG, tap-LOG, tap-LOG (AC-3.2: ≤3 taps per set). Logged rows grade themselves
 * against the matching set of the previous session; tapping a logged row reopens it
 * and saving emits set_amended.
 */
import { useState } from 'react';
import type { Exercise } from '../../data/types';
import type { ExerciseSessionRecord, LoggedSet } from '../../engine/types';
import { GRADE_GLYPH, gradeSet } from '../../engine/grade';
import { SYSTEM } from '../../data/strings';
import { appendEvent } from '../../store/append';
import { dateIso } from '../../store/dates';

interface Props {
  exercise: Exercise;
  prev?: ExerciseSessionRecord | undefined;
  today?: ExerciseSessionRecord | undefined;
}

interface Draft {
  weightKg: number;
  reps: number;
}

function Stepper({
  value,
  unit,
  step,
  min,
  onChange,
}: {
  value: number;
  unit: string;
  step: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <span className="stepper">
      <button type="button" aria-label={`decrease ${unit}`} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <span className="stepper-value">
        {value}
        <small>{unit}</small>
      </span>
      <button type="button" aria-label={`increase ${unit}`} onClick={() => onChange(value + step)}>
        +
      </button>
    </span>
  );
}

export function SetLogger({ exercise, prev, today }: Props) {
  const { scheme } = exercise;
  const loggedCount = today?.sets.length ?? 0;
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const defaultsFor = (i: number): Draft => {
    const samePrev = prev?.sets[i];
    const lastToday = today?.sets[loggedCount - 1];
    return {
      weightKg: samePrev?.weightKg ?? lastToday?.weightKg ?? prev?.sets[0]?.weightKg ?? 20,
      reps: samePrev?.reps ?? scheme.repsLo,
    };
  };

  const open = (i: number, from?: LoggedSet) => {
    setEditing(i);
    setDraft(from ? { weightKg: from.weightKg, reps: from.reps } : defaultsFor(i));
  };

  const commit = async (i: number, amend: boolean) => {
    if (!draft) return;
    await appendEvent(amend ? 'set_amended' : 'set_logged', {
      exerciseId: exercise.id,
      setIndex: i,
      weightKg: draft.weightKg,
      reps: draft.reps,
      sessionDate: dateIso(),
    });
    setEditing(null);
    setDraft(null);
  };

  const rows = [];
  for (let i = 0; i < scheme.sets; i++) {
    const logged = today?.sets[i];
    const isActive = editing === i || (editing === null && !logged && i === loggedCount);

    if (isActive) {
      const d = draft ?? defaultsFor(i);
      if (!draft) setDraft(d);
      rows.push(
        <div className="set-row set-row--active" key={i}>
          <span className="set-label">{SYSTEM.gate.set(i + 1)}</span>
          <Stepper value={d.weightKg} unit="kg" step={2.5} min={0} onChange={(weightKg) => setDraft({ ...d, weightKg })} />
          <Stepper value={d.reps} unit="" step={1} min={1} onChange={(reps) => setDraft({ ...d, reps })} />
          <button type="button" className="log-btn" onClick={() => void commit(i, !!logged)}>
            {logged ? SYSTEM.gate.save : SYSTEM.gate.log}
          </button>
        </div>,
      );
    } else if (logged) {
      const grade = gradeSet(logged, prev?.sets[i]);
      rows.push(
        <button type="button" className="set-row set-row--logged" key={i} onClick={() => open(i, logged)}>
          <span className="set-label">{SYSTEM.gate.set(i + 1)}</span>
          <span className="set-data">
            {logged.weightKg}kg × {logged.reps}
          </span>
          <span className={`grade grade--${grade}`}>{GRADE_GLYPH[grade]}</span>
        </button>,
      );
    } else {
      rows.push(
        <div className="set-row set-row--pending" key={i}>
          <span className="set-label">{SYSTEM.gate.set(i + 1)}</span>
          <span className="set-data">—</span>
        </div>,
      );
    }
  }

  const lastLine = prev
    ? `${SYSTEM.gate.last}: ${Math.max(...prev.sets.map((s) => s.weightKg))}kg × (${prev.sets.map((s) => s.reps).join(',')}) · ${prev.date}`
    : SYSTEM.gate.firstEncounter;

  return (
    <div className="set-logger">
      {rows}
      <p className="set-last">[{lastLine}]</p>
    </div>
  );
}
