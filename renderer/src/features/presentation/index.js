import { parseLibrary } from '../../core/themes/model.js';
import { adaptPreview } from '../themes/preview-adapt.js';

const THEMES = [['editorial', 'Editorial'], ['academic', 'Academic'], ['manuscript', 'Manuscript'], ['literary', 'Literary'], ['journal', 'Journal'], ['magazine', 'Magazine'], ['plain', 'Plain'], ['modern', 'Modern'], ['technical', 'Technical'], ['business', 'Business']];
const FONTS = {
  theme: ['Theme default', ''], serif: ['Georgia', 'Georgia,"Times New Roman",serif'],
  palatino: ['Palatino', 'Palatino,"Palatino Linotype","TeX Gyre Pagella","URW Palladio L",P052,"Book Antiqua",Georgia,serif'], sans: ['Sans', 'var(--font)'], mono: ['Mono', 'var(--mono)'],
};
const SIZES = [14, 15, 16, 17, 18, 20, 22];
const LINES = [1.4, 1.5, 1.62, 1.75, 1.9];
const WIDTHS = { narrow: ['Narrow', '60ch'], medium: ['Medium', '72ch'], wide: ['Wide', '90ch'], full: ['Full', '100%'] };

export function register(ctx) {
  const { commands, settings, ui } = ctx;
  const get = (k) => settings.get(`preview.${k}`);
  const set = (k, v) => settings.set(`preview.${k}`, v);
  const reg = (def) => commands.register({ group: 'Presentation', ...def });
  const anchor = () => { const e = document.activeElement; return e && e !== document.body && document.contains(e) ? e : document.getElementById('prev'); };
  const opt = (label, k, v) => ({ label, checked: () => get(k) === v, onSelect: () => set(k, v) });
  const menu = (id, title, icon, items) => reg({ id, title, icon, run: () => ui.openMenu(anchor(), items()) });

  const custom = () => settings.get('themes.preview');
  const pickPreset = async (v) => { if (custom()) await settings.set('themes.preview', ''); return set('theme', v); };
  THEMES.forEach(([v, label]) => reg({ id: `view.pv-${v}`, title: label, icon: 'palette', checked: () => get('theme') === v && !custom(), run: () => pickPreset(v) }));
  menu('view.preview-theme', 'Preview Theme', 'palette', () => {
    const mine = parseLibrary(settings.get('themes.library')).themes;
    return [
      ...THEMES.map(([v, label]) => ({ label, checked: () => get('theme') === v && !custom(), onSelect: () => pickPreset(v) })),
      ...(mine.length ? ['-', { head: 'Custom Themes' }, ...mine.map((t) => ({ label: t.name, checked: () => custom() === t.id, onSelect: () => settings.set('themes.preview', t.id) }))] : []),
      '-', { label: 'Manage Themes…', onSelect: () => ui.runCommand('custom.themes') },
    ];
  });
  menu('view.typography', 'Typography', 'type', () => [
    { head: 'Font' }, ...Object.entries(FONTS).map(([v, [label]]) => opt(label, 'fontFamily', v)),
    '-', { head: 'Size' }, ...SIZES.map((n) => opt(`${n} px`, 'fontSize', n)),
    '-', { head: 'Line height' }, ...LINES.map((n) => opt(String(n), 'lineHeight', n)),
  ]);
  menu('view.pv-width', 'Content Width', 'ruler', () => Object.entries(WIDTHS).map(([v, [label, w]]) => opt(`${label} (${w})`, 'width', v)));
  menu('view.pv-images', 'Images', 'image', () => [opt('Fit to width', 'images', 'fit'), opt('Original size', 'images', 'original')]);
  menu('view.pv-tables', 'Tables', 'table', () => [opt('Plain', 'tables', 'plain'), opt('Ruled', 'tables', 'ruled'), opt('Striped', 'tables', 'striped')]);
  menu('view.pv-code', 'Code Appearance', 'code', () => [
    opt('Compact', 'codeDensity', 'compact'), opt('Comfortable', 'codeDensity', 'comfortable'), '-',
    { label: 'Wrap long lines', checked: () => get('codeWrap') === true, onSelect: () => set('codeWrap', !get('codeWrap')) },
    { label: 'Line numbers', checked: () => get('codeLineNumbers') === true, onSelect: () => set('codeLineNumbers', !get('codeLineNumbers')) },
  ]);

  const all = () => [...document.querySelectorAll('#prev')];
  const apply = () => all().forEach((p, i) => {
    const ff = FONTS[get('fontFamily')][1];
    p.dataset.pvTheme = get('theme'); p.dataset.pvImg = get('images'); p.dataset.pvTbl = get('tables'); p.dataset.pvCode = get('codeDensity');
    p.classList.toggle('pv-wrap', get('codeWrap') === true);
    p.classList.toggle('pv-ln', get('codeLineNumbers') === true);
    p.style.setProperty('--pv-size', `${get('fontSize')}px`);
    p.style.setProperty('--pv-lh', String(get('lineHeight')));
    p.style.setProperty('--pv-measure', WIDTHS[get('width')][1]);
    if (ff) p.style.setProperty('--pv-ff', ff); else p.style.removeProperty('--pv-ff');
    if (i) requestAnimationFrame(() => adaptPreview(p));
  });
  const c2 = document.createElement('canvas').getContext('2d');
  const fit = () => all().forEach((p) => {
    if (!p.offsetWidth) return;
    const cs = getComputedStyle(p), w = p.offsetWidth, m = WIDTHS[get('width')][1], min = Math.min(28, Math.max(12, w * 0.035));
    c2.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const mp = m.endsWith('ch') ? parseFloat(m) * c2.measureText('0').width : Infinity;
    p.style.setProperty('--pv-pad', `${Math.round(Math.max(min, (w - mp) / 2))}px`);
  });
  const run = () => { apply(); fit(); };
  setTimeout(() => {
    const ro = window.ResizeObserver ? new ResizeObserver(fit) : null, seen = new WeakSet();
    const watch = () => { run(); all().forEach((p) => { if (ro && !seen.has(p)) { seen.add(p); ro.observe(p); } }); };
    watch();
    const g = document.getElementById('groups');
    if (g) new MutationObserver(watch).observe(g, { childList: true });
  }, 0);
  settings.subscribe(run);
}
