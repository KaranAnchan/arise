import { DOW_TO_KEY, WEEK } from '../data/program';

/** The 7-day roster: gym days carry your aura color, shifts are work-blue, rest is grey. */
export function RosterStrip() {
  const todayKey = DOW_TO_KEY[new Date().getDay()];
  return (
    <div className="roster" role="list" aria-label="Weekly roster">
      {WEEK.map((day) => (
        <div
          key={day.key}
          role="listitem"
          className={[
            'roster-chip',
            day.type === 'gym' && 'roster-chip--gym',
            day.type === 'work' && 'roster-chip--work',
            day.key === todayKey && 'roster-chip--today',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={day.key === todayKey ? 'date' : undefined}
        >
          <span className="dow">{day.dow}</span>
          <span>{day.label}</span>
        </div>
      ))}
    </div>
  );
}
