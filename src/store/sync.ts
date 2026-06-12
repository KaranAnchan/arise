/**
 * Sync wiring: Supabase transport + status store + triggers + backoff.
 * The algorithm itself lives in syncCore.ts (injectable, unit-tested); this module
 * is the only place that knows about the real backend and the browser lifecycle.
 * Failures show a quiet dot and retry — never a blocking error (TDD §2.2).
 */
import { useSyncExternalStore } from 'react';
import { initAuth } from './auth';
import { db } from './db';
import { supabase } from './supabase';
import { PULL_LIMIT, syncOnce, type ServerEventRow, type SyncTransport } from './syncCore';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

let status: SyncStatus = 'off';
let uid: string | null = null;
let failures = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let inFlight = false;
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((fn) => fn());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => status,
  );
}

function supabaseTransport(): SyncTransport {
  return {
    async push(rows) {
      const { error } = await supabase!
        .from('events')
        .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw error;
    },
    async pull(cursor) {
      const { data, error } = await supabase!
        .from('events')
        .select('id, user_id, device_id, type, payload, occurred_at, server_seq')
        .gt('server_seq', cursor)
        .order('server_seq', { ascending: true })
        .limit(PULL_LIMIT);
      if (error) throw error;
      return (data ?? []) as ServerEventRow[];
    },
  };
}

/** Run a sync cycle if signed in; coalesces concurrent requests; backs off on failure. */
export async function requestSync(_reason?: string): Promise<void> {
  if (!supabase || !uid || inFlight) return;
  clearTimeout(retryTimer);
  inFlight = true;
  setStatus('syncing');
  try {
    await syncOnce(db, supabaseTransport(), uid);
    failures = 0;
    setStatus('idle');
  } catch {
    failures += 1;
    setStatus('error');
    // 5s, 10s, 20s … capped at 5 min
    const delay = Math.min(5_000 * 2 ** (failures - 1), 300_000);
    retryTimer = setTimeout(() => void requestSync('retry'), delay);
  } finally {
    inFlight = false;
  }
}

/** Boot-time wiring: auth lifecycle + the four triggers. No-op without a backend. */
export function initSync(): void {
  if (!supabase) return;
  setStatus('idle');

  initAuth((nextUid) => {
    uid = nextUid;
    if (nextUid) {
      void requestSync('signed-in');
    } else {
      clearTimeout(retryTimer);
      failures = 0;
      setStatus('idle');
    }
  });

  window.addEventListener('focus', () => void requestSync('focus'));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void requestSync('visible');
  });
  window.addEventListener('online', () => void requestSync('online'));
  setInterval(() => void requestSync('interval'), 15 * 60 * 1000);
}
