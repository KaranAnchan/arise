/**
 * Equipped title: a display preference, not game state — lives in the meta table
 * (per-device, like the sync cursor), never in the event log. Cross-device title
 * sync via profiles.settings is a post-v1 nicety.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const KEY = 'equippedTitle';

/** The stored choice, validated against the earned list; defaults to the newest title. */
export function useEquippedTitle(earned: string[]): string | undefined {
  const stored = useLiveQuery(async () => (await db.meta.get(KEY))?.value, []);
  if (earned.length === 0) return undefined;
  return stored && earned.includes(stored) ? stored : earned[earned.length - 1];
}

export async function equipTitle(title: string): Promise<void> {
  await db.meta.put({ key: KEY, value: title });
}
