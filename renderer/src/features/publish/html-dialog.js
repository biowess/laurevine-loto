import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { buildPublication } from '../../core/publish/index.js';
import { docInput, envFor, exportHtml } from './index.js';
import { HTML_PALETTES, HTML_PALETTE_GROUPS, HTML_FONTS, HTML_MEASURES, htmlDefaults, htmlConfig } from './html-config.js';
import { reveal, openExternal } from '../../services/doc-client.js';
import { uiActions } from '../../state/slices/ui.js';
import { fontStack } from '../../core/publish/font-catalog.js';

const WIDTHS = [{ label: 'Desktop', w: '100%', ic: 'monitor' }, { label: 'Tablet', w: '768px', ic: 'tablet' }, { label: 'Mobile', w: '390px', ic: 'smartphone' }];

// scrollIntoView inside the srcdoc frame also scrolls the host app's containers (preview vanishes); scroll the frame's own window instead, and never let '#' links navigate the frame.
const ANCHOR_FIX = `Element.prototype.scrollIntoView=function(){var r=this.getBoundingClientRect();window.scrollTo(0,r.top+window.pageYOffset)};document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(a)e.preventDefault()},true);`;
const withAnchorFix = (html) => {
  html = html.replace(/<head[^>]*>/, (m) => `${m}<base href="about:srcdoc">`);
  const n = /script-src 'nonce-([^']+)'/.exec(html);
  const tag = `<script${n ? ` nonce="${n[1]}"` : ''}>${ANCHOR_FIX}</script>`;
  const i = html.lastIndexOf('</body>');
  return i < 0 ? html + tag : html.slice(0, i) + tag + html.slice(i);
};

let state = null;

const strip = (p) => h('i', { class: 'lv-hexp__strip' }, ...[p.background, p.text, p.heading, p.link, p.accent].map((x) => h('s', { style: { background: x } })));

// Shared dropdown (trigger + grouped popover) used by palettes and fonts; the chevron flips while open.
function dropdown(value, groups, row, onChange) {
  const trigger = h('button', { type: 'button', class: 'lv-hexp__pbtn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false' });
  const pop = h('div', { class: 'lv-hexp__pop', role: 'listbox', hidden: true });
  const root = h('div', { class: 'lv-hexp__pal' }, trigger, pop);
  const names = new Map(groups.flatMap(([, l]) => l));
  const paint = () => trigger.replaceChildren(row(value, names.get(value) || value), icon('chevron-down', 'ic--chev'));
  const away = (e) => { if (!root.contains(e.target)) close(); };
  function close() { pop.hidden = true; trigger.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', away, true); }
  pop.append(...groups.flatMap(([group, list]) => [h('div', { class: 'lv-hexp__pgroup' }, group), ...list.map(([id, name]) => h('button', { type: 'button', role: 'option', class: 'lv-hexp__popt' + (id === value ? ' is-on' : ''), dataset: { id }, onclick: () => {
    value = id; pop.querySelectorAll('.is-on').forEach((x) => x.classList.remove('is-on')); pop.querySelector(`[data-id="${CSS.escape(id)}"]`).classList.add('is-on');
    paint(); close(); onChange(id);
  } }, row(id, name)))]));
  trigger.onclick = () => {
    if (!pop.hidden) return close();
    pop.hidden = false; trigger.setAttribute('aria-expanded', 'true'); document.addEventListener('mousedown', away, true);
    const on = pop.querySelector('.is-on'); if (on) on.scrollIntoView({ block: 'center' });
  };
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); close(); trigger.focus(); } });
  paint();
  return root;
}

const paletteMenu = (value, onChange) => dropdown(value, HTML_PALETTE_GROUPS.map(([g, l]) => [g, l.map(([id, name]) => [id, name])]),
  (id, name) => h('span', { class: 'lv-hexp__row' }, strip(HTML_PALETTES[id]), h('span', { class: 'lv-hexp__pname' }, name)), onChange);

const fontSelect = (value, onChange) => dropdown(value, HTML_FONTS.map(([g, l]) => [g, l.map((n) => [n, n])]),
  (id, name) => h('span', { class: 'lv-hexp__row' }, h('span', { class: 'lv-hexp__pname', style: { fontFamily: fontStack(id) } }, name)), onChange);

export function htmlExportPage(ctx) {
  const { store } = ctx;
  if (!state) state = { ...htmlDefaults(), width: '100%' };

  const previewSlot = h('div', { class: 'lv-hexp__preview-slot', style: { maxWidth: state.width } });
  const sizeLbl = h('span', { class: 'lv-hexp__size' }, state.width === '100%' ? 'Fluid' : state.width);
  const note = (text) => previewSlot.replaceChildren(h('p', { class: 'lv-hexp__note' }, text));

  async function refreshPreview() {
    const d = docInput(ctx);
    if (!d) { note('Open a Markdown document to export.'); return; }
    note('Preparing preview…');
    try {
      const cfg = htmlConfig(state);
      const pub = await buildPublication([d], cfg, await envFor(d.text, cfg, d));
      const frame = document.createElement('iframe');
      frame.className = 'lv-hexp__frame';
      frame.title = 'HTML preview';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.srcdoc = withAnchorFix(pub.html);
      previewSlot.replaceChildren(frame);
    } catch (e) {
      note(`Preview failed: ${e.message}`);
    }
  }

  const widthBtns = WIDTHS.map(({ label, w, ic }) => {
    const isCurrent = state.width === w;
    const btn = h('button', {
      type: 'button',
      class: 'lv-hexp__wbtn' + (isCurrent ? ' is-on' : ''), title: `${label} (${w === '100%' ? 'full width' : w})`,
      onclick: () => {
        widthBtns.forEach((b) => b.classList.remove('is-on'));
        btn.classList.add('is-on');
        state.width = w;
        previewSlot.style.maxWidth = w;
        sizeLbl.textContent = w === '100%' ? 'Fluid' : w;
      },
    }, icon(ic), label);
    return btn;
  });

  const summaryBox = h('div', { class: 'lv-hexp__summary', style: { display: 'none' } });

  const exportBtn = h('button', { type: 'button', class: 'md-export', onclick: async () => {
    exportBtn.disabled = true;
    try {
      const res = await exportHtml(ctx, htmlConfig(state));
      if (res && res.path) {
        summaryBox.style.display = 'flex';
        summaryBox.replaceChildren(
          h('p', { class: 'lv-hexp__summary-path' }, `Saved: ${res.path}`),
          h('div', { class: 'lv-hexp__summary-btns' },
            h('button', { type: 'button', class: 'btn btn--sm', onclick: () => reveal(res.path).catch(() => {}) }, icon('folder-search'), 'Show in Folder'),
            h('button', { type: 'button', class: 'btn btn--sm', onclick: () => openExternal(res.path).catch(() => {}) }, icon('globe'), 'Open in Browser'),
          ),
        );
      }
    } finally {
      exportBtn.disabled = false;
    }
  } }, icon('globe'), 'Export HTML');

  const check = (label, key) => {
    const inp = h('input', { type: 'checkbox', onchange: (e) => { state[key] = e.target.checked; refreshPreview(); } });
    inp.checked = !!state[key];
    return h('label', { class: 'lv-hexp__opt' }, inp, h('span', {}, label));
  };

  const close = () => store.dispatch(uiActions.backstage(true, 'export'));
  const field = (label, ctl) => h('label', { class: 'lv-hexp__field' }, h('span', {}, label), ctl);

  const root = h('div', { class: 'lv-hexp', role: 'region', 'aria-label': 'HTML Export Studio' },
    h('div', { class: 'md-sthead' },
      h('button', { type: 'button', class: 'tbtn', title: 'Close', 'aria-label': 'Close HTML Export Studio', onclick: close }, icon('arrow-left')),
      h('h2', {}, 'HTML Export Studio'), h('span', { class: 'sp' }),
      h('button', { type: 'button', class: 'btn btn--sm', onclick: () => refreshPreview() }, icon('refresh-cw'), 'Refresh Preview')),
    h('div', { class: 'lv-hexp__body' },
      h('div', { class: 'lv-hexp__sidebar' },
        h('div', { class: 'lv-hexp__section' }, h('h4', {}, 'Appearance'),
          field('Palette', paletteMenu(state.palette, (id) => { state.palette = id; refreshPreview(); })),
          field('Headings', fontSelect(state.headingFont, (v) => { state.headingFont = v; refreshPreview(); })),
          field('Body', fontSelect(state.bodyFont, (v) => { state.bodyFont = v; refreshPreview(); }))),
        h('div', { class: 'lv-hexp__section' }, h('h4', {}, 'Page'),
          field('Reading width', h('div', { class: 'lv-hexp__seg lv-hexp__seg--full' }, ...HTML_MEASURES.map(([label, v]) => { const b = h('button', { type: 'button', class: 'lv-hexp__wbtn' + (state.measure === v ? ' is-on' : ''), title: `${v} characters per line`, onclick: () => { b.parentNode.querySelectorAll('.is-on').forEach((x) => x.classList.remove('is-on')); b.classList.add('is-on'); state.measure = v; refreshPreview(); } }, label); return b; }))),
          check('Credit line', 'watermark'))),
      h('div', { class: 'lv-hexp__preview' },
        h('div', { class: 'lv-hexp__widths' }, h('div', { class: 'lv-hexp__seg' }, ...widthBtns), sizeLbl),
        h('div', { class: 'lv-hexp__stage' }, previewSlot))),
    h('div', { class: 'md-stfoot' }, summaryBox, h('span', { class: 'sp', style: { flex: 1 } }), exportBtn));

  requestAnimationFrame(() => refreshPreview());
  return root;
}
