interface Props {
  xpIntoLevel: number;
  xpToNext: number;
  totalXp: number;
}

export function XPBar({ xpIntoLevel, xpToNext, totalXp }: Props) {
  const atCap = xpToNext === 0;
  const pct = atCap ? 100 : Math.min(100, (xpIntoLevel / xpToNext) * 100);
  return (
    <div className="xp-bar">
      <div
        className="xp-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Experience toward next level"
      >
        <div className="xp-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="xp-meta">
        <span>{atCap ? 'MAX' : `${Math.round(xpIntoLevel)} / ${xpToNext} XP`}</span>
        <span>TOTAL {Math.round(totalXp).toLocaleString()}</span>
      </div>
    </div>
  );
}
