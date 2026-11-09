// Mode-bar indicator: constructs in the active document that the selected profile does not render; click lists them with jump-to-line.
import { CONSTRUCTS, LEVELS, detect, beyondProfile } from '../../core/markdown/portability.js';
import { getProfile } from '../../core/markdown/profiles.js';
import { openPopover } from '../../ui/kit/popover.js';
import { icon } from '../../ui/kit/icons.js';

const MAX_ROWS = 100;

export function mountPortability(ctx) {
  const { commands, store, settings, services: { documents }, ui: { h } } = ctx;
  const host = document.getElementById('profbtn');
  if (!host) return;
  const btn = h('button', { type: 'button', id: 'portbtn', class: 'md-prof md-port', hidden: true, 'aria-haspopup': 'dialog', onclick: () => commands.execute('port.list') });
  host.after(btn);
  let list = [], profile = '', timer = 0;

  function refresh() {
    const id = store.get().documents.activeId, e = id && documents.getEntry(id);
    profile = e ? getProfile(e.profile || settings.get('markdown.defaultProfile')) : null;
    list = e ? beyondProfile(detect(e.doc.text), profile, { wiki: settings.get('markdown.wikiLinks'), html: settings.get('markdown.htmlPassthrough') }) : [];
    const kinds = new Set(list.map((x) => x.id)).size;
    btn.hidden = !kinds;
    btn.replaceChildren(icon('triangle-alert', 'ic--chev'), ` ${kinds}`);
    btn.title = kinds ? `${kinds} construct${kinds > 1 ? 's' : ''} beyond the ${profile.label} profile` : '';
    btn.setAttribute('aria-label', btn.title);
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(refresh, 300); };
  documents.onDocChange(later);
  store.subscribe((s) => s.documents.activeId, later);
  settings.subscribe(later);
  refresh();

  commands.register({
    id: 'port.goto-line', title: 'Go to Line', group: 'Compatibility',
    run: (line) => {
      const v = documents.editorRun('view');
      if (!Number.isInteger(line) || line < 1) return;
      if (store.get().ui.mode === 'preview') commands.execute('view.mode-split');
      setTimeout(() => {
        const ev = documents.editorRun('view') || v;
        if (!ev) return;
        const l = ev.state.doc.line(Math.min(line, ev.state.doc.lines));
        ev.dispatch({ selection: { anchor: l.from }, effects: ev.constructor.scrollIntoView(l.from, { y: 'center' }), userEvent: 'select.goto' });
        ev.focus();
      }, 0);
    },
  });

  commands.register({
    id: 'port.list', title: 'Constructs Beyond Profile', icon: 'triangle-alert', group: 'Compatibility',
    enabled: () => list.length > 0, reason: 'Everything in this document is supported by the selected profile',
    run: () => {
      if (!list.length) return;
      const groups = new Map();
      for (const f of list) (groups.get(f.id) || groups.set(f.id, []).get(f.id)).push(f.line);
      let rows = 0;
      const body = [h('div', { class: 'ct-head' }, `Not rendered by ${profile.label}`)];
      for (const [id, lines] of groups) {
        const c = CONSTRUCTS[id];
        body.push(h('div', { class: 'ct-head', title: c.note }, `${c.label} · ${LEVELS[c.level].label}`), h('div', { class: 'pt-note' }, c.note));
        for (const n of lines) {
          if (rows++ >= MAX_ROWS) break;
          body.push(h('button', { type: 'button', class: 'ct-opt', onclick: () => { commands.execute('port.goto-line', n); } }, `Line ${n}`));
        }
      }
      if (rows > MAX_ROWS) body.push(h('div', { class: 'pt-note' }, `Showing the first ${MAX_ROWS} lines.`));
      openPopover(btn, h('div', { class: 'ct-pop pt-pop popover--list' }, h('div', { class: 'ct-list' }, ...body)));
    },
  });
}
