import type { GameState } from '../../engine/types';
import { relicKey, relicName } from '../../data/endgame';
import { SYSTEM } from '../../data/strings';
import { SystemWindow } from '../../ui/SystemWindow';

const GLYPHS: Record<string, string> = { pr: '◆', streak10: '⟁', import: '✦' };

/** The trophy case — every relic is a derived fact; nothing here can be lost. */
export function RelicGrid({ state }: { state: GameState }) {
  return (
    <SystemWindow label={SYSTEM.relics.label}>
      {state.relics.length === 0 ? (
        <p className="system-text system-text--muted">[{SYSTEM.relics.empty}]</p>
      ) : (
        <ul className="relic-grid">
          {state.relics.map((r) => (
            <li className="relic" key={relicKey(r)}>
              <span className="relic-glyph">{GLYPHS[r.kind]}</span>
              <span className="relic-name">{relicName(r)}</span>
              {r.kind === 'pr' && <span className="relic-date">{r.date}</span>}
            </li>
          ))}
        </ul>
      )}
    </SystemWindow>
  );
}
