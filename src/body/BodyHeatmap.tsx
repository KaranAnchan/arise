/**
 * React wrapper around the ported Shift + Lift body map (framework-free DOM module).
 * Renders once, then re-colors gradients in place on activation changes — the SVG is
 * never rebuilt, so the 400 ms stop-color transitions carry the focus animation.
 */
import { useEffect, useRef } from 'react';
import type { Activation } from '../data/types';
import { renderBodyMap, updateBodyMap } from './bodymap';

interface Props {
  activation: Activation;
  /** caption under the map naming the current focus (session or exercise) */
  focusLabel: string;
}

export function BodyHeatmap({ activation, focusLabel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!host.current) return;
    if (!rendered.current) {
      renderBodyMap(host.current, activation);
      rendered.current = true;
    } else {
      updateBodyMap(host.current, activation);
    }
  }, [activation]);

  return (
    <div className="bodymap-card">
      <div ref={host} className="bodymap" />
      <div className="bodymap-legend" aria-hidden="true">
        <span>COLD</span>
        <div className="legend-ramp" />
        <span>PRIMARY</span>
      </div>
      <p className="bodymap-focus">[{focusLabel.toUpperCase()}]</p>
    </div>
  );
}
