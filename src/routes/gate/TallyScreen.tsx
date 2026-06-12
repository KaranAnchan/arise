/**
 * The XP tally: itemized spoils for the cleared gate, then the bar fill, then — if a
 * threshold was crossed — the Ceremony. Both "before" and "after" states come from
 * the reducer over real events, so the screen can never disagree with the engine.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { reduce } from '../../engine/reduce';
import { tallyGate } from '../../engine/tally';
import type { AriseEvent, SetPayload, GateClearedPayload } from '../../engine/types';
import { bossEpithet } from '../../engine/bosses';
import { bossShortName } from '../../data/endgame';
import { SESSIONS } from '../../data/program';
import { SYSTEM } from '../../data/strings';
import { requestSync } from '../../store/sync';
import { engineCfg, useEvents } from '../../store/useGameState';
import { XPBar } from '../../ui/XPBar';
import { Ceremony } from './Ceremony';

interface Props {
  sessionId: string;
  date: string;
  onClose: () => void;
}

function exerciseName(ref: string, sessionId: string): string {
  return SESSIONS[sessionId]?.exercises.find((e) => e.id === ref)?.name ?? ref;
}

/** events belonging to this gate on this date (the ones the tally explains) */
function isGateEvent(e: AriseEvent, sessionId: string, date: string): boolean {
  if (e.type === 'set_logged' || e.type === 'set_amended') {
    const p = e.payload as SetPayload;
    return p.sessionDate === date && SESSIONS[sessionId]?.exercises.some((x) => x.id === p.exerciseId);
  }
  if (e.type === 'gate_cleared') {
    const p = e.payload as GateClearedPayload;
    return p.sessionId === sessionId && p.sessionDate === date;
  }
  return false;
}

export function TallyScreen({ sessionId, date, onClose }: Props) {
  const events = useEvents();
  const navigate = useNavigate();
  const [ceremony, setCeremony] = useState(false);

  // post-Gate tally is a sync trigger (TDD §2.2) — the session's spoils upload now
  useEffect(() => {
    void requestSync('tally');
  }, []);

  const computed = useMemo(() => {
    if (!events) return undefined;
    const cfg = engineCfg();
    const tally = tallyGate(events, cfg, sessionId, date);
    const before = reduce(events.filter((e) => !isGateEvent(e, sessionId, date)), cfg, date);
    const after = reduce(events, cfg, date);
    return { tally, before, after };
  }, [events, sessionId, date]);

  if (!computed) return null;
  const { tally, before, after } = computed;
  const leveledUp = after.level > before.level;

  const lineLabel = (kind: string, ref: string, milestone?: number): string => {
    switch (kind) {
      case 'sets':
        return SYSTEM.tally.sets(exerciseName(ref, sessionId));
      case 'progression':
        return SYSTEM.tally.progression(exerciseName(ref, sessionId));
      case 'weightUp':
        return SYSTEM.tally.weightUp(exerciseName(ref, sessionId));
      case 'boss':
        return SYSTEM.boss.felled(bossShortName(ref), bossEpithet(sessionId), milestone ?? 0);
      default:
        return SYSTEM.tally.gateClear;
    }
  };

  // boss XP sits outside the streak multiplier — render gate lines, the multiplier,
  // THEN the kills; new encounters announce at this tally (GDD: prior session's tally)
  const gateLines = tally.lines.filter((l) => l.kind !== 'boss');
  const bossLines = tally.lines.filter((l) => l.kind === 'boss');
  const announcements = after.pendingBosses.filter((b) => b.sessionId === sessionId);

  const finish = () => {
    if (leveledUp) setCeremony(true);
    else {
      onClose();
      void navigate({ to: '/' });
    }
  };

  if (ceremony) {
    return (
      <Ceremony
        before={before}
        after={after}
        onDone={() => {
          onClose();
          void navigate({ to: '/' });
        }}
      />
    );
  }

  return (
    <div className="overlay tally" role="dialog" aria-label="Gate tally">
      <div className="tally-window">
        <p className="system-text">[{SYSTEM.tally.title(SESSIONS[sessionId]?.gateName ?? sessionId)}]</p>
        <div className="tally-lines">
          {gateLines.map((l, i) => (
            <div className="tally-line" key={`${l.kind}-${l.ref}-${i}`} style={{ animationDelay: `${i * 90}ms` }}>
              <span>{lineLabel(l.kind, l.ref)}</span>
              <span className="tally-xp">+{Math.round(l.xp)}</span>
            </div>
          ))}
          {tally.multiplier > 1 && (
            <div className="tally-line" style={{ animationDelay: `${gateLines.length * 90}ms` }}>
              <span>{SYSTEM.tally.streak(tally.multiplier)}</span>
              <span className="tally-xp">×{tally.multiplier.toFixed(1)}</span>
            </div>
          )}
          {bossLines.map((l, i) => (
            <div
              className="tally-line tally-line--boss"
              key={`boss-${l.ref}-${i}`}
              style={{ animationDelay: `${(gateLines.length + 1 + i) * 90}ms` }}
            >
              <span>{lineLabel(l.kind, l.ref, l.milestone)}</span>
              <span className="tally-xp">+{l.xp}</span>
            </div>
          ))}
        </div>
        <div className="tally-total">
          <span>{SYSTEM.tally.total}</span>
          <span className="tally-xp">+{tally.total}</span>
        </div>
        {announcements.map((b) => (
          <p className="system-text boss-announce" key={b.exerciseId}>
            [{SYSTEM.boss.appeared(bossShortName(b.exerciseId), bossEpithet(sessionId), b.milestone, b.repsLo)}]
          </p>
        ))}
        <XPBar xpIntoLevel={after.xpIntoLevel} xpToNext={after.xpToNext} totalXp={after.totalXp} />
        <button type="button" className="cta" onClick={finish}>
          {SYSTEM.tally.continue}
        </button>
      </div>
    </div>
  );
}
