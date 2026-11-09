import { dropCheck } from '../../core/explorer/move.js';

const dirOf = (p) => p.slice(0, Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')));

export function attachDnd(list, v) {
  let drag = null, hot = null;
  const clear = () => {
    if (hot) { hot.classList.remove('is-drop', 'is-nodrop'); delete hot.dataset.reason; }
    hot = null;
  };
  const where = (e) => {
    const el = e.target.closest('.ex-row'), r = el && v.nav()[+el.dataset.i], root = v.ws().root;
    if (r && r.pin) return null;
    const dir = !r ? root : r.dir ? r.path : dirOf(r.path);
    const node = dir === root ? list : [...list.querySelectorAll('.ex-row')].find((x) => x.dataset.path === dir && !x.dataset.pin) || list;
    return { dir, node };
  };
  const copying = (e) => e.altKey || e.ctrlKey;

  list.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.ex-row'), r = el && !e.target.closest('input') && v.nav()[+el.dataset.i];
    drag = null;
    if (!r || r.pin) return;
    drag = v.many().has(r.path) && v.many().size > 1 ? [...v.many()] : [r.path];
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', drag.join('\n'));
  });
  list.addEventListener('dragover', (e) => {
    if (!drag) return;
    clear();
    const w = where(e);
    if (!w) { e.dataTransfer.dropEffect = 'none'; return; }
    const copy = copying(e), bad = dropCheck(drag, w.dir, v.ws().root, copy);
    hot = w.node;
    hot.classList.add(bad ? 'is-nodrop' : 'is-drop');
    if (bad) { hot.dataset.reason = bad; e.dataTransfer.dropEffect = 'none'; return; }
    e.preventDefault();
    e.dataTransfer.dropEffect = copy ? 'copy' : 'move';
  });
  list.addEventListener('dragleave', (e) => { if (!list.contains(e.relatedTarget)) clear(); });
  list.addEventListener('dragend', () => { clear(); drag = null; });
  list.addEventListener('drop', (e) => {
    if (!drag) return;
    e.preventDefault();
    const w = where(e), copy = copying(e), src = drag;
    clear();
    drag = null;
    if (w && !dropCheck(src, w.dir, v.ws().root, copy)) v.drop(copy ? 'copy' : 'move', src, w.dir);
  });
}
