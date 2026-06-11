import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { reduce } from '../engine/reduce';
import type { AriseEvent, GameState, ReduceConfig } from '../engine/types';
import { ENGINE_PROGRAM } from '../data/program';
import { getManifest } from '../character/manifest';
import { db } from './db';
import { dateIso } from './dates';

/** The reducer config used everywhere in the UI (program + manifest tiers). */
export function engineCfg(): ReduceConfig {
  return { program: ENGINE_PROGRAM, tiers: getManifest().tiers };
}

/** Raw live event log (undefined during the first IndexedDB read). */
export function useEvents(): AriseEvent[] | undefined {
  return useLiveQuery(() => db.events.toArray(), []);
}

/**
 * Live derived game state: any event append anywhere re-runs the reducer.
 * Returns undefined during the first IndexedDB read (render a boot state).
 */
export function useGameState(): GameState | undefined {
  const events = useEvents();
  return useMemo(() => {
    if (!events) return undefined;
    return reduce(events, engineCfg(), dateIso());
  }, [events]);
}
