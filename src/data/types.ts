/** Domain content types — ported from Shift + Lift v2 and extended with game metadata. */
import type { StatTag } from '../engine/types';

export type MuscleId =
  | 'traps' | 'fdelt' | 'sdelt' | 'rdelt' | 'chest'
  | 'bicep' | 'tricep' | 'forearm'
  | 'abs' | 'obliques' | 'lats' | 'midback' | 'lowback'
  | 'glutes' | 'quads' | 'adductors' | 'hams' | 'calves' | 'tibialis';

/** 0..1 — how hard an exercise (or session) works each muscle. Drives the heatmap. */
export type Activation = Partial<Record<MuscleId, number>>;

export type PoseId =
  | 'bench' | 'dbShoulderPress' | 'inclineDbPress' | 'cableLateral' | 'overheadTricep' | 'pushdown'
  | 'pulldown' | 'chestRow' | 'cableRow' | 'facePull' | 'ezCurl' | 'hammerCurl'
  | 'legPress' | 'splitSquat' | 'legCurl' | 'legExtension' | 'hipThrust' | 'calfRaise';

export interface Scheme {
  sets: number;
  repsLo: number;
  repsHi: number;
  perSide?: boolean;
  restSec: number;
}

export interface Exercise {
  id: string;
  name: string;
  scheme: Scheme;
  activation: Activation;
  mindMuscle: string;
  form: string;
  pose: PoseId;
  /** game metadata: drives boss milestones + stat tagging */
  cls: 'compound' | 'accessory';
  statTags: StatTag[];
}

export type SessionId = 'push' | 'pull' | 'legs';

export interface Session {
  id: SessionId;
  name: string;
  /** the Gate's canonical name, e.g. "Crimson Forge" */
  gateName: string;
  focus: string;
  why: string;
  exercises: Exercise[];
}

export type DayType = 'gym' | 'work' | 'rest';

export interface DayPlan {
  key: string;
  dow: string;
  label: string;
  type: DayType;
  session?: SessionId;
}

export function schemeLabel(s: Scheme): string {
  const reps = s.repsLo === s.repsHi ? `${s.repsLo}` : `${s.repsLo}–${s.repsHi}`;
  const rest = s.restSec >= 60
    ? `${Math.floor(s.restSec / 60)}${s.restSec % 60 ? ':' + String(s.restSec % 60).padStart(2, '0') : ' min'}`
    : `${s.restSec} s`;
  return `${s.sets} × ${reps}${s.perSide ? ' / side' : ''} · rest ${rest}`;
}

/** Session aggregate = per-muscle max over its exercises (not sum). */
export function sessionActivation(s: Session): Activation {
  const out: Activation = {};
  for (const ex of s.exercises) {
    for (const [m, a] of Object.entries(ex.activation) as [MuscleId, number][]) {
      out[m] = Math.max(out[m] ?? 0, a);
    }
  }
  return out;
}
