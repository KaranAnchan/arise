import type { ReactNode } from 'react';

interface Props {
  label?: string;
  className?: string;
  children: ReactNode;
}

/** A System panel: matte surface with the aura inner border — the "magic UI" tell. */
export function SystemWindow({ label, className, children }: Props) {
  return (
    <section className={`system-window${className ? ` ${className}` : ''}`}>
      {label && <h2 className="window-label">[{label}]</h2>}
      {children}
    </section>
  );
}
