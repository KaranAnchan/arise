/**
 * React wrapper for the ported FK demo animator. Plays only while mounted, visible,
 * and the tab is foregrounded (battery discipline carried over from Shift + Lift).
 */
import { useEffect, useRef } from 'react';
import type { PoseId } from '../data/types';
import { DEMOS } from './poses';
import { DemoAnimator } from './animator';

interface Props {
  pose: PoseId;
  playing: boolean;
}

export function ExerciseDemo({ pose, playing }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const anim = useRef<DemoAnimator | null>(null);

  useEffect(() => {
    if (!host.current) return;
    host.current.innerHTML = '';
    const demo = DEMOS[pose];
    anim.current = new DemoAnimator(host.current, demo, demo.label);
    return () => {
      anim.current?.stop();
      anim.current = null;
    };
  }, [pose]);

  useEffect(() => {
    if (!anim.current || !host.current) return;
    if (!playing) {
      anim.current.stop();
      return;
    }
    const visible = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) anim.current?.start();
      else anim.current?.stop();
    });
    visible.observe(host.current);
    const onVis = () => (document.hidden ? anim.current?.stop() : anim.current?.start());
    document.addEventListener('visibilitychange', onVis);
    return () => {
      visible.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      anim.current?.stop();
    };
  }, [playing]);

  return <div ref={host} className="demo-canvas" />;
}
