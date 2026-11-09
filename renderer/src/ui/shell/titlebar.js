import { $, $$ } from '../kit/dom.js';
import { describeSave } from '../../core/documents/save-state.js';
import { icon } from '../kit/icons.js';
import { store } from '../../state/store.js';
import { uiActions } from '../../state/slices/ui.js';
import { register } from '../../commands/registry.js';
import { runCommand } from './panels.js';
import { CH } from '../../../../shared/channels.js';
import { on } from '../../services/ipc.js';
import { isMaximized, minimizeWindow, requestClose, toggleMaximize } from '../../services/window-client.js';

const LABEL = { light: ['sun', 'Light'], dark: ['moon', 'Dark'], system: ['monitor', 'System'] };


function applyTheme(t) {
  const b = $('[data-act=theme]'), [ic, name] = LABEL[t] || LABEL.light;
  if (!b) return;
  b.replaceChildren(icon(ic));
  b.title = `Theme: ${name} (click to change)`;
  b.setAttribute('aria-label', `Theme: ${name}`);
}

function applyDoc({ tabs, activeId }) {
  const t = tabs.find((x) => x.id === activeId);
  const name = $('.doc-title span'), st = $('.save-state'), tx = $('#saveStateText');
  if (name) name.textContent = t ? t.title : 'No document';
  $('.doc-title')?.setAttribute('aria-label', t ? `Rename document ${t.title}` : 'Rename document');
  const s = describeSave(t);
  if (st) {
    st.hidden = !t;
    st.dataset.state = s.state;
    st.title = `${s.tip} (click to save)`;
    if (!st._bound) {
      st._bound = true;
      st.style.cursor = 'pointer';
      st.setAttribute('role', 'button');
      st.setAttribute('tabindex', '0');
      st.setAttribute('aria-label', 'Save document');
      st.addEventListener('click', () => runCommand('file.save'));
      st.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); runCommand('file.save'); } });
    }
  }
  if (tx) tx.textContent = s.label;
}

export function mountTitlebar(root = $('#md')) {
  const dispatch = (a) => store.dispatch(a);
  const acts = {
    'toggle-left': () => runCommand('view.left-sidebar'),
    'toggle-right': () => runCommand('view.right-sidebar'),
    theme: () => runCommand('view.theme-cycle'),
    shortcuts: () => runCommand('help.shortcuts'),
    settings: () => dispatch(uiActions.backstage(true, 'preferences')),
    about: () => dispatch(uiActions.backstage(true, 'about')),
  };
  const offs = $$('[data-act]', root).filter((b) => acts[b.dataset.act]).map((b) => {
    const f = () => acts[b.dataset.act]();
    b.addEventListener('click', f);
    return () => b.removeEventListener('click', f);
  });
  const max = $('[data-wc=maximize]', root), soft = (f) => { try { return Promise.resolve(f()).catch(() => {}); } catch { return Promise.resolve(); } };
  const setMax = (m) => { if (!max) return; max.dataset.maximized = String(m); max.title = max.ariaLabel = m ? 'Restore' : 'Maximize'; max.setAttribute('aria-label', max.title); };
  const wc = { minimize: () => soft(minimizeWindow), maximize: () => soft(toggleMaximize).then((r) => r && setMax(!!r.maximized)), close: () => soft(requestClose) };
  for (const b of $$('[data-wc]', root)) { const f = () => wc[b.dataset.wc](); b.addEventListener('click', f); offs.push(() => b.removeEventListener('click', f)); }
  soft(isMaximized).then((r) => r && setMax(!!r.maximized));
  try { const off = on(CH.WINDOW_MAXIMIZED_CHANGED, (p) => setMax(!!(p && p.maximized))); if (typeof off === 'function') offs.push(off); } catch { /* bridge unavailable */ }
  const title = $('.doc-title', root), rename = () => runCommand('file.rename-document');
  if (title) { title.addEventListener('click', rename); offs.push(() => title.removeEventListener('click', rename)); }
  const pressed = (p) => { for (const side of ['left', 'right']) $(`[data-act=toggle-${side}]`, root)?.setAttribute('aria-pressed', String(p[side].open)); };
  offs.push(store.subscribe((s) => s.ui.panels, pressed), store.subscribe((s) => s.ui.theme, applyTheme), store.subscribe((s) => s.documents, applyDoc));
  pressed(store.get().ui.panels); applyTheme(store.get().ui.theme); applyDoc(store.get().documents);
  return () => offs.forEach((f) => f());
}
