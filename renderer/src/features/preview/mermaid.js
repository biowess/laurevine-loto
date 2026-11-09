// Mermaid in the preview: vendored bundle loaded on first `mermaid` fence, strict security, results cached by source hash + theme.
import { getMermaid, loadMermaid } from '../../services/lazy-libs.js';
import { setWarnings } from '../../services/warnings.js';

const cache = new Map();
let n = 0, chain = Promise.resolve(), run = 0;
const dark = () => document.documentElement.dataset.theme === 'dark';
const el = (tag, cls, text) => Object.assign(document.createElement(tag), { className: cls, ...(text == null ? {} : { textContent: text }) });

function show(box, key, r) {
  if (!r) return false;
  box.dataset.mmKey = key;
  if (r.svg) {
    const w = el('div', 'lt-mm-scroll');
    w.innerHTML = r.svg;
    box.replaceChildren(w);
    delete box.dataset.mmErr;
  } else {
    const src = box.querySelector('.lt-mm-src') || el('pre', 'lt-mm-src', box.dataset.mmSrc || '');
    const at = r.line ? (+box.dataset.srcLine || 0) + r.line : 0;
    const p = el('div', 'lt-mm-err');
    p.setAttribute('role', 'alert');
    p.append(el('strong', '', `Mermaid error${at ? ` (line ${at})` : ''}`), el('pre', '', r.error));
    box.replaceChildren(p, src);
    box.dataset.mmErr = JSON.stringify({ message: r.error, ...(at ? { line: at } : {}) });
  }
  return true;
}

async function draw(m, src) {
  const id = `lt-mm-${++n}`;
  try {
    const { svg } = await m.render(id, src);
    return { svg };
  } catch (e) {
    const msg = String((e && (e.str || e.message)) || e);
    return { error: msg.split('\n').slice(0, 8).join('\n'), line: +((/line (\d+)/i.exec(msg) || [])[1]) || 0 };
  } finally {
    document.getElementById(id)?.remove();
    document.getElementById(`d${id}`)?.remove();
  }
}

async function renderBoxes(todo, scope, boxes, my) {
  const theme = dark() ? 'd' : 'l';
  await (chain = chain.then(async () => {
    let m = getMermaid();
    try {
      m ||= await loadMermaid();
      m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark() ? 'dark' : 'default', suppressErrorRendering: true });
    } catch { m = null; }
    for (const b of todo) {
      const key = `${b.dataset.mm}:${theme}`;
      const r = cache.get(key) || (m ? await draw(m, b.dataset.mmSrc) : { error: 'Mermaid could not be loaded.' });
      if (m) { cache.set(key, r); if (cache.size > 60) cache.delete(cache.keys().next().value); }
      show(b, key, r);
    }
  }));
  if (my === run) setWarnings('mermaid', scope, boxes.filter((b) => b.dataset.mmErr).map((b) => ({ kind: 'mermaid', ...JSON.parse(b.dataset.mmErr) })));
}

export function hydrateMermaid(root, scope) {
  const boxes = [...root.querySelectorAll('.lt-mermaid')], my = ++run, theme = dark() ? 'd' : 'l';
  const todo = boxes.filter((b) => { b.dataset.mmSrc = b.textContent; return !show(b, `${b.dataset.mm}:${theme}`, cache.get(`${b.dataset.mm}:${theme}`)); });
  if (!todo.length) return;
  if (typeof IntersectionObserver === 'undefined') { renderBoxes(todo, scope, boxes, my); return; }
  const obs = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).map((e) => { obs.unobserve(e.target); return e.target; });
    if (visible.length) renderBoxes(visible, scope, boxes, my);
  }, { root: root.closest('#prev') || null, rootMargin: '400px' });
  todo.forEach((b) => obs.observe(b));
}
