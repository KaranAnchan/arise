import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { reduce } from '../engine/reduce';
import type { GameState } from '../engine/types';
import { ENGINE_PROGRAM } from '../data/program';
import { getManifest } from '../character/manifest';
import { db } from './db';
import { dateIso } from './dates';

/**
 * Live derived game state: any event append anywhere re-runs the reducer.
 * Returns undefined during the first IndexedDB read (render a boot state).
 */
export function useGameState(): GameState | undefined {
  const events = useLiveQuery(() => db.events.toArray(), []);
  return useMemo(() => {
    if (!events) return undefined;
    return reduce(events, { program: ENGINE_PROGRAM, tiers: getManifest().tiers }, dateIso());
  }, [events]);
}
