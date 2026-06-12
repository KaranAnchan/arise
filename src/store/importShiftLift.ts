/**
 * Shift + Lift history import. Accepted shapes (the user pastes whatever they have):
 * - a full localStorage dump: `{"sl2.log.bench": "[{...}]", "sl2.day": "push", ...}`
 *   (values may be JSON strings — that's what JSON.stringify(localStorage) produces)
 * - the same with already-parsed array values
 * - a bare `{ "bench": [ {date, weightKg, reps[]} ] }` map
 *
 * Output feeds `history_imported`, whose reducer expansion is upsert-by-(exercise,
 * date, setIndex) — so overlapping imports can never double XP. The `source` carries
 * a content hash: identical re-imports dedupe outright, different exports merge safely.
 */
import type { HistoryImportedPayload, ImportedLogEntry } from '../engine/types';

const LOG_PREFIX = 'sl2.log.';

interface RawEntry {
  date: string;
  weightKg: number;
  reps: number[];
}

function isRawEntry(v: unknown): v is RawEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.weightKg === 'number' &&
    Array.isArray(e.reps) &&
    e.reps.length > 0 &&
    e.reps.every((r) => typeof r === 'number' && r > 0)
  );
}

function entryList(value: unknown): RawEntry[] | null {
  const parsed = typeof value === 'string' ? safeJson(value) : value;
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return parsed.every(isRawEntry) ? (parsed as RawEntry[]) : null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** FNV-1a over the canonical entry list — stable identity for idempotent re-imports. */
function contentHash(entries: ImportedLogEntry[]): string {
  const canonical = JSON.stringify(
    [...entries].sort((a, b) =>
      a.exerciseId === b.exerciseId
        ? a.date < b.date
          ? -1
          : 1
        : a.exerciseId < b.exerciseId
          ? -1
          : 1,
    ),
  );
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Parse pasted text into the import payload. Throws with a human message on garbage. */
export function parseShiftLiftExport(text: string): HistoryImportedPayload {
  const raw = safeJson(text.trim());
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('Not a Shift + Lift export — expected a JSON object.');
  }

  const entries: ImportedLogEntry[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const exerciseId = key.startsWith(LOG_PREFIX) ? key.slice(LOG_PREFIX.length) : key;
    if (!exerciseId || exerciseId.includes('.')) continue; // sl2.day, sl2.done.* etc.
    const list = entryList(value);
    if (!list) continue;
    for (const e of list) {
      entries.push({ exerciseId, date: e.date, weightKg: e.weightKg, reps: e.reps });
    }
  }

  if (entries.length === 0) {
    throw new Error('No training history found — expected sl2.log.* entries.');
  }
  return { source: `shift-lift:${contentHash(entries)}`, entries };
}
