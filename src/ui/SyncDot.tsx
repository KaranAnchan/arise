import { SYSTEM } from '../data/strings';
import { useSyncStatus } from '../store/sync';

/** The quiet sync indicator — a dot and a word, never a blocking error (TDD §2.2). */
export function SyncDot() {
  const status = useSyncStatus();
  if (status === 'off') return null;
  return (
    <span className={`sync-dot sync-dot--${status}`}>
      <span className="dot" aria-hidden="true" />
      {SYSTEM.settings.sync[status]}
    </span>
  );
}
