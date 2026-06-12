/**
 * The sync algorithm (TDD §2.2), deliberately boring and fully injectable:
 *   1. push every synced=0 event (server insert is idempotent on id)
 *   2. pull rows with server_seq > cursor, ascending, in batches
 *   3. mark pushed rows synced, advance the cursor after each batch
 * XP math is order-independent sums, so nothing here can corrupt progression —
 * the worst a partial failure produces is a retry that re-does idempotent work.
 */
import type { AriseDB } from './db';
import type { AriseEvent, EventType } from '../engine/types';

export interface ServerEventRow {
  id: string;
  user_id: string;
  device_id: string;
  type: string;
  payload: unknown;
  occurred_at: string;
  server_seq: number;
}

export const PULL_LIMIT = 1000;

export interface SyncTransport {
  /** Insert rows; duplicates on `id` must be ignored, never errors. */
  push(rows: Array<Omit<ServerEventRow, 'server_seq'>>): Promise<void>;
  /** Rows with server_seq > cursor, ascending, at most PULL_LIMIT. */
  pull(cursor: number): Promise<ServerEventRow[]>;
}

const CURSOR_KEY = 'syncCursor';

export async function getCursor(db: AriseDB): Promise<number> {
  return Number((await db.meta.get(CURSOR_KEY))?.value ?? '0');
}

/** One full push+pull cycle for `uid` against `transport`. Safe to re-run anytime. */
export async function syncOnce(db: AriseDB, transport: SyncTransport, uid: string): Promise<void> {
  // --- push --------------------------------------------------------------------
  const unsynced = await db.events.where('synced').equals(0).toArray();
  if (unsynced.length > 0) {
    await transport.push(
      unsynced.map((e) => ({
        id: e.id,
        user_id: uid,
        device_id: e.deviceId,
        type: e.type,
        payload: e.payload,
        occurred_at: e.occurredAt,
      })),
    );
    // only after the server acknowledged the batch — and only THESE ids: events
    // appended while the push was in flight must stay synced=0 for the next cycle
    await db.events
      .where('id')
      .anyOf(unsynced.map((e) => e.id))
      .modify((e) => {
        (e as { synced: 0 | 1 }).synced = 1;
      });
  }

  // --- pull (batched; cursor advances per batch so a failure resumes mid-stream) --
  for (;;) {
    const cursor = await getCursor(db);
    const rows = await transport.pull(cursor);
    if (rows.length === 0) break;
    await db.events.bulkPut(
      rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        deviceId: r.device_id,
        type: r.type as EventType,
        payload: r.payload as AriseEvent['payload'],
        // normalize: Postgres returns +00:00 offsets; sortEvents compares strings,
        // so every stored occurredAt must be the same Z-suffixed ISO shape
        occurredAt: new Date(r.occurred_at).toISOString(),
        schemaVersion: 1 as const,
        synced: 1 as const,
      })),
    );
    await db.meta.put({ key: CURSOR_KEY, value: String(rows[rows.length - 1].server_seq) });
    if (rows.length < PULL_LIMIT) break;
  }
}
