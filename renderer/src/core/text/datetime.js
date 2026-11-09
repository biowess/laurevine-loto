// Pure: current date/time strings; ISO is fixed, the rest follow the locale.
const p = (n) => String(n).padStart(2, '0');
export const FORMATS = [['iso', 'ISO date'], ['long', 'Long date'], ['time', 'Time'], ['datetime', 'Date and time'], ['weekday', 'Weekday']];
export function format(id, d, loc) {
  const L = (o) => d.toLocaleString(loc, o);
  if (id === 'iso') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  if (id === 'long') return L({ dateStyle: 'long' });
  if (id === 'time') return L({ timeStyle: 'short' });
  if (id === 'datetime') return L({ dateStyle: 'medium', timeStyle: 'short' });
  return L({ weekday: 'long' });
}
