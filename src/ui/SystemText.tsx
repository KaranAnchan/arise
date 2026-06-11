import { useEffect, useRef, useState } from 'react';

interface Props {
  children: string;
  /** ms per character; 0 disables the effect */
  speed?: number;
  muted?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The System speaks: mono, bracketed, typewriter-revealed. Tap to skip. */
export function SystemText({ children, speed = 14, muted = false }: Props) {
  const instant = speed === 0 || prefersReducedMotion();
  const [shown, setShown] = useState(instant ? children.length : 0);
  const done = shown >= children.length;
  const text = useRef(children);

  useEffect(() => {
    if (text.current !== children) {
      text.current = children;
      setShown(instant ? children.length : 0);
    }
    if (instant || shown >= children.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), speed);
    return () => clearTimeout(t);
  }, [children, shown, speed, instant]);

  return (
    <p
      className={`system-text${muted ? ' system-text--muted' : ''}`}
      onClick={() => setShown(children.length)}
      aria-label={children}
    >
      [{children.slice(0, shown)}
      {!done && <span className="cursor">▮</span>}]
    </p>
  );
}
