/**
 * Auth: Supabase session ↔ local store. Local-first contract (TDD §6):
 * - signed out, everything works with userId='local'
 * - on first sign-in (or session restore) local events are ADOPTED — userId rewritten
 *   to the real uid, synced stays 0 so the next push uploads the full history
 * - sign-out is an explicit action that wipes this device (AC-1.3); a token expiring
 *   in the background must never destroy data, so the wipe lives here, not in the
 *   auth listener
 */
import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LOCAL_USER, setActiveUserId } from './append';
import { db } from './db';
import { supabase } from './supabase';

let session: Session | null = null;
const listeners = new Set<() => void>();

function setSession(next: Session | null): void {
  session = next;
  setActiveUserId(next?.user.id ?? LOCAL_USER);
  listeners.forEach((fn) => fn());
}

/** Rewrite userId='local' rows to the signed-in uid; they stay synced=0 → next push uploads. */
export async function adoptLocalEvents(uid: string): Promise<number> {
  return db.events.where('synced').equals(0).modify((e) => {
    if (e.userId === LOCAL_USER) e.userId = uid;
  });
}

/**
 * Wire the session lifecycle. Called once from boot; no-op without a backend.
 * `onUidChange(null)` means "stop syncing" — it must NOT wipe anything (a token
 * expiring offline is not a sign-out).
 */
export function initAuth(onUidChange: (uid: string | null) => void): void {
  if (!supabase) return;
  supabase.auth.onAuthStateChange((_evt, next) => {
    const wasUid = session?.user.id;
    setSession(next);
    if (next && next.user.id !== wasUid) {
      void adoptLocalEvents(next.user.id).then(() => onUidChange(next.user.id));
    } else if (!next && wasUid) {
      onUidChange(null);
    }
  });
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => session,
  );
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
}

export async function sendMagicLink(email: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** AC-1.3: signing out wipes this device. The synced log on the server is the backup. */
export async function signOutAndWipe(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
  await db.events.clear();
  await db.meta.delete('syncCursor');
  setSession(null);
}
