import { h } from '../../ui/kit/dom.js';
import { runCommand } from '../../ui/shell/panels.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { allThemes, parseLibrary } from '../../core/themes/model.js';
import { SLOT } from '../themes/apply.js';

export const themePickerSection = Object.freeze({
  title: 'Interface theme',
  render() {
    const box = h('div', { class: 'lv-tp' });
    const paint = () => {
      const dark = document.documentElement.dataset.theme === 'dark', all = allThemes(parseLibrary(getSetting('themes.library')).themes);
      box.replaceChildren(...['light', 'dark'].map((base) => h('div', { class: 'lv-tp__grp' }, h('div', { class: 'lv-tp__lbl' }, base === 'dark' ? 'Dark themes' : 'Light themes'),
        h('div', { class: 'lv-tp__grid' }, ...all.filter((t) => t.base === base).map((t) => {
          const on = getSetting(SLOT[base]) === t.id && (base === 'dark') === dark;
          return h('button', { type: 'button', class: 'lv-tp__sw' + (on ? ' is-on' : ''), title: t.name, 'aria-pressed': String(on), onclick: () => runCommand('themes.apply', t.id) },
            h('span', { class: 'lv-tp__pal', 'aria-hidden': 'true' }, ['app-bg', 'surface', 'accent', 'sel-bg'].map((k) => h('i', { style: { background: t.vars[k] } }))), h('span', {}, t.name));
        })))));
    };
    paint();
    const mo = new MutationObserver(paint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const off = subscribeSettings(() => { if (!box.isConnected) { off(); mo.disconnect(); } else paint(); });
    return box;
  },
});
