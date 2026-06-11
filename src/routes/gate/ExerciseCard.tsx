import type { Exercise } from '../../data/types';
import { schemeLabel } from '../../data/types';
import type { ExerciseSessionRecord } from '../../engine/types';
import { ExerciseDemo } from '../../anim/ExerciseDemo';
import { SYSTEM } from '../../data/strings';
import { SetLogger } from './SetLogger';

interface Props {
  exercise: Exercise;
  expanded: boolean;
  done: boolean;
  onToggle: () => void;
  prev?: ExerciseSessionRecord | undefined;
  today?: ExerciseSessionRecord | undefined;
}

export function ExerciseCard({ exercise, expanded, done, onToggle, prev, today }: Props) {
  return (
    <div className={`exercise-card${done ? ' exercise-card--done' : ''}`}>
      <button type="button" className="exercise-head" onClick={onToggle} aria-expanded={expanded}>
        <span className={`done-mark${done ? ' done-mark--on' : ''}`} aria-hidden="true">
          {done ? '▣' : '▢'}
        </span>
        <span className="exercise-title">
          <span className="exercise-name">{exercise.name}</span>
          <span className="exercise-scheme">{schemeLabel(exercise.scheme)}</span>
        </span>
        <span className="exercise-caret" aria-hidden="true">
          {expanded ? '▴' : '▾'}
        </span>
      </button>

      {expanded && (
        <div className="exercise-body">
          <ExerciseDemo pose={exercise.pose} playing={expanded} />
          <p className="cue-label">[{SYSTEM.gate.mindMuscle}]</p>
          <p className="cue-text">{exercise.mindMuscle}</p>
          <p className="cue-label">[{SYSTEM.gate.form}]</p>
          <p className="cue-text">{exercise.form}</p>
          <SetLogger exercise={exercise} prev={prev} today={today} />
        </div>
      )}
    </div>
  );
}
