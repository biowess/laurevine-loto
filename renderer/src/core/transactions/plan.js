export const OPS = Object.freeze(['write', 'create', 'delete', 'rename']);
export const MAX_OPS = 500;
export const TX_ID = /^[a-z0-9]+-[0-9a-f]{8}$/;

// Returns null when valid, otherwise a message.
export function checkOps(ops) {
  if (!Array.isArray(ops) || !ops.length || ops.length > MAX_OPS) return `Expected 1 to ${MAX_OPS} operations.`;
  const seen = new Set();
  for (const o of ops) {
    if (!o || !OPS.includes(o.op) || typeof o.path !== 'string') return 'Invalid operation.';
    if (o.op === 'rename') {
      if (typeof o.newPath !== 'string' || !o.newPath) return 'Invalid operation.';
    } else if (o.op === 'delete' ? o.text !== undefined : typeof o.text !== 'string') {
      return 'Invalid operation.';
    }
    const key = o.path.toLowerCase();
    if (seen.has(key)) return 'A path appears twice.';
    seen.add(key);
  }
  return null;
}

// `cur` is the sha256 of the file on disk now, or null when it is missing.
export const canApply = (e, cur) => (e.op === 'create' ? cur === null : cur === e.before);
export const canUndo = (e, cur) => (e.op === 'delete' ? cur === null : cur === e.after);

export const statusOf = (entries) => (entries.some((e) => e.state === 'applied') ? 'applied' : entries.some((e) => e.state === 'undone') ? 'undone' : 'skipped');

// items: [{ id, createdAt, bytes }]. Returns ids to delete: everything beyond the `keep` newest, then the oldest until under `maxBytes`. `protect` is never dropped.
export function prune(items, keep, maxBytes, protect) {
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt);
  const drop = [];
  let total = sorted.reduce((s, i) => s + (i.bytes || 0), 0);
  for (let i = sorted.length - 1; i >= 0 && (sorted.length - drop.length > keep || total > maxBytes); i--) {
    if (sorted[i].id === protect) continue;
    drop.push(sorted[i].id);
    total -= sorted[i].bytes || 0;
  }
  return drop;
}
