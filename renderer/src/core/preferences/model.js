const inSection = (s, d) => !d.hidden && (s.keys ? s.keys.includes(d.id) : d.category === s.category);

export const isModified = (def, v) => v !== def.default;
export const sectionItems = (s, defs) => defs.filter((d) => inSection(s, d));
export const pageOf = (pages, d) => pages.find((p) => !p.planned && p.sections.some((s) => inSection(s, d)));

export function explain(d, v) {
  if (d.type === 'boolean') return typeof v === 'boolean' ? null : 'Choose on or off.';
  if (d.type === 'enum') return d.values.includes(v) ? null : `Choose one of: ${d.values.join(', ')}.`;
  if (d.type === 'string') return typeof v === 'string' && !(d.maxLength < v.length) ? null : `Use at most ${d.maxLength} characters.`;
  if (typeof v !== 'number' || !Number.isFinite(v)) return 'Enter a number.';
  if (d.integer && !Number.isInteger(v)) return 'Enter a whole number.';
  if (d.min != null && d.max != null && (v < d.min || v > d.max)) return `Enter a value from ${d.min} to ${d.max}.`;
  if (d.min != null && v < d.min) return `Enter ${d.min} or more.`;
  if (d.max != null && v > d.max) return `Enter ${d.max} or less.`;
  return null;
}

export function matchSetting(d, q) {
  const text = `${d.label || ''} ${d.description || ''} ${d.id} ${d.category || ''}`.toLowerCase();
  return String(q).toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.includes(w));
}
