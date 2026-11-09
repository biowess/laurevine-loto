import * as recents from '../../services/recents-client.js';
import { whenRestored } from '../../services/session-client.js';

// Shown in the editor area while no tab is open: New, Open and the five most recent documents.
export function mountEmptyState(ctx) {
  const { h, icon, runCommand } = ctx.ui, { store } = ctx, host = document.querySelector('.md-editor');
  if (!host) return;
  const list = h('ul', { class: 'lv-empty__list' });
  const btn = (id, label, ic, cls) => h('button', { type: 'button', class: `lv-empty__btn ${cls}`, onclick: () => runCommand(id) }, icon(ic), label);
  const box = h('section', { class: 'lv-empty', 'aria-label': 'No document open' },
    h('div', { class: 'lv-empty__panel' },
      h('h2', {}, 'No document open'),
      h('div', { class: 'lv-empty__acts' }, btn('file.new', 'New', 'file-plus-2', 'is-primary'), btn('file.open', 'Open…', 'file-up', '')),
      h('h3', {}, 'Recent'), list));
  box.hidden = true;
  host.append(box);

  const fill = async () => {
    let items = [];
    try { items = (await recents.list()).items; } catch { /* no bridge or no recents */ }
    items = [...items].sort((a, b) => b.openedAt - a.openedAt).slice(0, 5);
    list.replaceChildren(...(items.length ? items.map((i) => h('li', {},
      h('button', { type: 'button', class: 'lv-empty__rec', title: i.path, onclick: () => runCommand('file.open-recent', i.path) },
        h('span', {}, i.name), h('small', {}, i.path.replace(/[\\/][^\\/]*$/, '')))))
      : [h('li', { class: 'lv-empty__none' }, 'No recent documents')]));
  };
  let armed = false; // stay hidden until startup (welcome tab + session restore) has settled
  const apply = () => {
    const none = armed && !store.get().documents.tabs.length;
    host.toggleAttribute('data-empty', none);
    box.hidden = !none;
    if (none) fill();
  };
  store.subscribe((s) => s.documents.tabs.length, apply);
  setTimeout(() => whenRestored().then(() => { armed = true; apply(); }), 0);
}
