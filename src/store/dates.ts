/** Local-timezone date helpers. Training days are local calendar days, never UTC. */

export function dateIso(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d`. */
export function mondayOf(d: Date = new Date()): Date {
  const out = new Date(d);
  const dow = (out.getDay() + 6) % 7; // Mon=0..Sun=6
  out.setDate(out.getDate() - dow);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
