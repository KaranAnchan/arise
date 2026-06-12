/**
 * System Records: per-exercise progression from the full event timelines (the same
 * `buildTimelines` the reducer uses — the chart can never disagree with the XP).
 */
import type { ExerciseSessionRecord } from '../../engine/types';
import { SESSIONS } from '../../data/program';
import { SYSTEM } from '../../data/strings';
import { Sparkline } from '../../ui/Sparkline';
import { SystemWindow } from '../../ui/SystemWindow';

interface Props {
  timelines: Map<string, ExerciseSessionRecord[]>;
}

const topWeight = (rec: ExerciseSessionRecord) => Math.max(...rec.sets.map((s) => s.weightKg));

export function Records({ timelines }: Props) {
  // program order: push → pull → legs, exercises as scheduled; off-program ids last
  const ordered = Object.values(SESSIONS).flatMap((s) => s.exercises.map((e) => ({ id: e.id, name: e.name })));
  const extras = [...timelines.keys()]
    .filter((id) => !ordered.some((o) => o.id === id))
    .map((id) => ({ id, name: id }));
  const rows = [...ordered, ...extras].filter(({ id }) => timelines.has(id));

  return (
    <SystemWindow label={SYSTEM.profile.records}>
      {rows.length === 0 && (
        <p className="system-text system-text--muted">[{SYSTEM.profile.noRecords}]</p>
      )}
      {rows.map(({ id, name }) => {
        const records = timelines.get(id)!;
        const best = records
          .flatMap((r) => r.sets)
          .reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
        return (
          <div className="record-row" key={id}>
            <div className="record-meta">
              <p className="record-name">{name}</p>
              <p className="record-line">
                {SYSTEM.profile.sessions(records.length)} · {SYSTEM.profile.best(best.weightKg, best.reps)}
              </p>
            </div>
            <Sparkline values={records.map(topWeight)} />
          </div>
        );
      })}
    </SystemWindow>
  );
}
