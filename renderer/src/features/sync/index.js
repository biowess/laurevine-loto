import { buildBlockMap, lineToOffset, offsetToLine } from '../../core/sync/block-map.js';

const MODES = ['split', 'previewLeft', 'previewRight'];

export function register(ctx) {
  const { commands, settings } = ctx;
  commands.register({
    id: 'sync.toggle', title: 'Synchronized Scrolling', group: 'View',
    checked: () => settings.get('editor.syncScroll'),
    run: () => settings.set('editor.syncScroll', !settings.get('editor.syncScroll')),
  });
  setTimeout(() => mountSync(ctx), 0);
}

function mountSync({ store, settings, services: { documents } }) {
  const src = document.getElementById('src'), prev = document.getElementById('prev');
  if (!src || !prev) return;
  let map = [], dirty = true, lock = null, raf = 0, from = null;
  const on = () => settings.get('editor.syncScroll') && MODES.includes(store.get().ui.mode);
  const scroller = () => src.querySelector('.cm-scroller');
  const view = () => documents.editorRun('view');
  const getMap = () => { if (dirty) { map = buildBlockMap(prev); dirty = false; } return map; };

  const srcLine = (v, sc) => {
    const b = v.lineBlockAtHeight(sc.scrollTop);
    return v.state.doc.lineAt(b.from).number + (b.height ? (sc.scrollTop - b.top) / b.height : 0);
  };
  const srcTop = (v, line) => {
    const d = v.state.doc, n = Math.min(d.lines, Math.max(1, Math.floor(line)));
    const b = v.lineBlockAt(d.line(n).from);
    return b.top + (line - n) * b.height;
  };
  const drive = (side, el, top) => {
    const before = el.scrollTop;
    el.scrollTop = top;
    if (el.scrollTop !== before) {
      lock = side;
      requestAnimationFrame(() => requestAnimationFrame(() => { lock = null; }));
    }
  };

  function apply() {
    raf = 0;
    const side = from, v = view(), sc = scroller();
    from = null;
    if (!side || !v || !sc || !on()) return;
    const m = getMap();
    if (side === 'src') drive('prev', prev, lineToOffset(m, srcLine(v, sc)));
    else drive('src', sc, srcTop(v, offsetToLine(m, prev.scrollTop)));
  }
  const queue = (side) => { from = side; if (!raf) raf = requestAnimationFrame(apply); };
  const onScroll = (side) => { if (lock === side) { lock = null; return; } queue(side); };

  src.addEventListener('scroll', (e) => { if (e.target.classList && e.target.classList.contains('cm-scroller')) onScroll('src'); }, true);
  prev.addEventListener('scroll', () => onScroll('prev'));
  prev.addEventListener('load', () => { dirty = true; }, true);

  new MutationObserver(() => {
    dirty = true;
    lock = 'prev';
    requestAnimationFrame(() => requestAnimationFrame(() => { lock = null; }));
    queue('src');
  }).observe(prev, { childList: true });
  new ResizeObserver(() => { dirty = true; }).observe(prev);
}
