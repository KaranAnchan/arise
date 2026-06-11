/**
 * The ONLY write path for events. UI code never touches db.events directly — that
 * invariant keeps every fact uniform (id, device, clock) and keeps the Phase 4 sync
 * queue trustworthy.
 */
import type { AriseEvent, EventType, PayloadFor } from '../engine/types';
import { db, getDeviceId, uuidv7 } from './db';

const LOCAL_USER = 'local';

export async function appendEvent<T extends EventType>(
  type: T,
  payload: PayloadFor<T>,
): Promise<AriseEvent<T>> {
  const event: AriseEvent<T> = {
    id: uuidv7(),
    userId: LOCAL_USER, // rewritten to the auth uid on first sign-in (Phase 4)
    deviceId: await getDeviceId(),
    type,
    payload,
    occurredAt: new Date().toISOString(),
    schemaVersion: 1,
  };
  await db.events.add({ ...event, synced: 0 });
  return event;
}

export async function appendEvents(
  entries: Array<{ type: EventType; payload: PayloadFor<EventType>; occurredAt?: string }>,
): Promise<void> {
  const deviceId = await getDeviceId();
  const now = Date.now();
  await db.events.bulkAdd(
    entries.map((e, i) => {
      const ts = e.occurredAt ? Date.parse(e.occurredAt) : now + i;
      return {
        id: uuidv7(ts),
        userId: LOCAL_USER,
        deviceId,
        type: e.type,
        payload: e.payload,
        occurredAt: new Date(ts).toISOString(),
        schemaVersion: 1 as const,
        synced: 0 as const,
      };
    }),
  );
}
