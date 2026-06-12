/**
 * Two-device sync integration against real Dexie (fake-indexeddb) and an in-memory
 * server that mimics the Supabase contract: idempotent insert on id, monotonically
 * increasing server_seq, cursor pulls. AC-7.2 (convergence) and AC-7.4 (LWW amend)
 * live here.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from '../../engine/reduce';
import { TIERS, makeProgram } from '../../engine/__tests__/fixtures';
import type { AriseEvent, EventType, PayloadFor } from '../../engine/types';
import { AriseDB, type StoredEvent } from '../db';
import { PULL_LIMIT, getCursor, syncOnce, type ServerEventRow, type SyncTransport } from '../syncCore';

const cfg = { program: makeProgram(), tiers: TIERS };
const UID = 'uid-1';

let n = 0;
let dbSeq = 0;
const newDb = () => new AriseDB(`sync-test-${++dbSeq}`);

function stored<T extends EventType>(
  device: string,
  type: T,
  payload: PayloadFor<T>,
  occurredAt: string,
): StoredEvent {
  n += 1;
  return {
    id: String(n).padStart(8, '0'),
    userId: 'local',
    deviceId: device,
    type,
    payload,
    occurredAt,
    schemaVersion: 1,
    synced: 0,
  };
}

function makeServer() {
  const rows: ServerEventRow[] = [];
  let seq = 0;
  const transport: SyncTransport = {
    async push(batch) {
      for (const r of batch) {
        if (rows.some((x) => x.id === r.id)) continue; // idempotent on id
        rows.push({ ...r, server_seq: (seq += 1) });
      }
    },
    async pull(cursor) {
      return rows.filter((r) => r.server_seq > cursor).slice(0, PULL_LIMIT);
    },
  };
  return { rows, transport };
}

async function stateOf(db: AriseDB) {
  const events = (await db.events.toArray()) as AriseEvent[];
  return reduce(events, cfg, '2026-06-08');
}

beforeEach(() => {
  n = 0;
});

describe('syncOnce — two devices', () => {
  it('converges to the identical state after offline sessions on both (AC-7.2)', async () => {
    const { transport } = makeServer();
    const a = newDb();
    const b = newDb();

    // A trains bench offline, B trains curl offline
    await a.events.bulkAdd([
      stored('A', 'set_logged', { exerciseId: 'bench', setIndex: 0, weightKg: 60, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T10:00:00.000Z'),
      stored('A', 'set_logged', { exerciseId: 'bench', setIndex: 1, weightKg: 60, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T10:03:00.000Z'),
      stored('A', 'gate_cleared', { sessionId: 'push', sessionDate: '2026-06-01' }, '2026-06-01T10:30:00.000Z'),
    ]);
    await b.events.bulkAdd([
      stored('B', 'set_logged', { exerciseId: 'curl', setIndex: 0, weightKg: 20, reps: 12, sessionDate: '2026-06-03' }, '2026-06-03T10:00:00.000Z'),
      stored('B', 'shift_confirmed', { date: '2026-06-02' }, '2026-06-02T20:00:00.000Z'),
    ]);

    await syncOnce(a, transport, UID); // A pushes 3, pulls them back
    await syncOnce(b, transport, UID); // B pushes 2, pulls A's 3
    await syncOnce(a, transport, UID); // A pulls B's 2

    const sa = await stateOf(a);
    const sb = await stateOf(b);
    expect(sa.eventCount).toBe(5);
    expect(sa).toEqual(sb); // the whole derived state, not just XP
    expect(sa.totalXp).toBeGreaterThan(0);
  });

  it('resolves a same-set concurrent amend LWW with both events kept (AC-7.4)', async () => {
    const { rows, transport } = makeServer();
    const a = newDb();
    const b = newDb();

    const base = stored('A', 'set_logged', { exerciseId: 'bench', setIndex: 0, weightKg: 60, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T10:00:00.000Z');
    await a.events.add(base);
    await syncOnce(a, transport, UID);
    await syncOnce(b, transport, UID); // B now has the set

    // both devices amend the SAME set offline; B's edit is later
    await a.events.add(stored('A', 'set_amended', { exerciseId: 'bench', setIndex: 0, weightKg: 62.5, reps: 8, sessionDate: '2026-06-01' }, '2026-06-01T11:00:00.000Z'));
    await b.events.add(stored('B', 'set_amended', { exerciseId: 'bench', setIndex: 0, weightKg: 65, reps: 6, sessionDate: '2026-06-01' }, '2026-06-01T11:05:00.000Z'));

    await syncOnce(a, transport, UID);
    await syncOnce(b, transport, UID);
    await syncOnce(a, transport, UID);

    const sa = await stateOf(a);
    const sb = await stateOf(b);
    expect(sa).toEqual(sb);
    expect(sa.lastByExercise.bench.sets[0]).toEqual({ weightKg: 65, reps: 6 }); // later write won
    expect(rows.filter((r) => r.type === 'set_amended')).toHaveLength(2); // history keeps both
  });
});

describe('syncOnce — protocol details', () => {
  it('push is idempotent: re-running a cycle adds no server rows', async () => {
    const { rows, transport } = makeServer();
    const a = newDb();
    await a.events.add(stored('A', 'rest_honored', { date: '2026-06-07' }, '2026-06-07T08:00:00.000Z'));

    await syncOnce(a, transport, UID);
    const count = rows.length;
    // simulate "marked locally but client retries the whole cycle"
    await a.events.toCollection().modify((e) => {
      (e as StoredEvent).synced = 0;
    });
    await syncOnce(a, transport, UID);
    expect(rows.length).toBe(count);
  });

  it('advances the cursor and marks pushed rows synced', async () => {
    const { transport } = makeServer();
    const a = newDb();
    await a.events.add(stored('A', 'rest_honored', { date: '2026-06-07' }, '2026-06-07T08:00:00.000Z'));
    await syncOnce(a, transport, UID);

    expect(await getCursor(a)).toBe(1);
    expect(await a.events.where('synced').equals(0).count()).toBe(0);
  });

  it('normalizes Postgres timestamp offsets so string ordering stays sound', async () => {
    const { transport } = makeServer();
    const a = newDb();
    // a row that "came from the server" with a +00:00 offset
    await transport.push([
      {
        id: 'srv-0001',
        user_id: UID,
        device_id: 'B',
        type: 'shift_confirmed',
        payload: { date: '2026-06-02' },
        occurred_at: '2026-06-02T20:00:00+00:00',
      },
    ]);
    await syncOnce(a, transport, UID);
    const pulled = await a.events.get('srv-0001');
    expect(pulled?.occurredAt).toBe('2026-06-02T20:00:00.000Z');
  });

  it('leaves events appended during an in-flight push unsynced for the next cycle', async () => {
    const a = newDb();
    const { transport } = makeServer();
    const lateEvent = stored('A', 'shift_confirmed', { date: '2026-06-04' }, '2026-06-04T20:00:00.000Z');
    const racy: SyncTransport = {
      async push(batch) {
        await a.events.add(lateEvent); // user logs something mid-upload
        await transport.push(batch);
      },
      pull: (c) => transport.pull(c),
    };

    await a.events.add(stored('A', 'rest_honored', { date: '2026-06-07' }, '2026-06-07T08:00:00.000Z'));
    await syncOnce(a, racy, UID);

    const stillUnsynced = await a.events.where('synced').equals(0).toArray();
    expect(stillUnsynced.map((e) => e.id)).toEqual([lateEvent.id]);
  });
});
