/**
 * Local persistence: Dexie (IndexedDB). The events table is the on-device source of
 * truth; everything the user sees is derived from it. `synced` stays 0 until the
 * Phase 4 sync worker pushes the event to Supabase.
 */
import Dexie, { type Table } from 'dexie';
import type { AriseEvent } from '../engine/types';

export interface StoredEvent extends AriseEvent {
  /** 0 = pending push, 1 = acknowledged by server (Phase 4) */
  synced: 0 | 1;
}

export interface MetaRow {
  key: string;
  value: string;
}

class AriseDB extends Dexie {
  events!: Table<StoredEvent, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('arise');
    this.version(1).stores({
      events: 'id, occurredAt, synced',
      meta: 'key',
    });
  }
}

export const db = new AriseDB();

/** uuid v7: 48-bit ms timestamp + version/variant bits + crypto randomness. Time-ordered. */
export function uuidv7(now = Date.now()): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // timestamp into the first 6 bytes (big-endian)
  for (let i = 5; i >= 0; i--) {
    bytes[i] = now & 0xff;
    now = Math.floor(now / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await db.meta.get('deviceId');
  if (existing) return existing.value;
  const id = uuidv7();
  await db.meta.put({ key: 'deviceId', value: id });
  return id;
}
