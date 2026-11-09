import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { docInput, envFor, mountPagedFrame } from '../../../features/publish/index.js';
import { buildPublication } from '../../../core/publish/index.js';
import { STARTER_PRESETS, starterConfig } from '../../../../../shared/presets.js';
import { printDoc } from '../../../services/print-client.js';
import { getSetting } from '../../../services/settings-client.js';
import { runCommand } from '../../shell/panels.js';

const WIDTHS = [{ label: 'Desktop', w: '100%' }, { label: 'Tablet', w: '768px' }, { label: 'Mobile', w: '390px' }];
const SIZES = ['A4', 'Letter', 'A5', 'Legal'];
const MARGINS = { Normal: 20, Narrow: 10, Wide: 30 };

export function printView(ctx) {
  const { ui, store } = ctx;

  const slot = h('div', { class: 'lv-print__slot' });
  const statusEl = h('p', { class: 'sub lv-print__status' }, 'Building preview…');
  const printBtn = h('button', { type: 'button', class: 'btn btn--primary', disabled: true }, icon('printer'), ' Print…');
  const pdfBtn = h('button', { type: 'button', class: 'btn', disabled: true }, icon('file-output'), ' Export PDF');

  let mode = 'preset';
  let currentPreset = getSetting('export.defaultPreset') || 'Academic Style';
  if (!STARTER_PRESETS[currentPreset]) currentPreset = Object.keys(STARTER_PRESETS)[0];
  let pageSize = 'A4';
  let marginName = 'Normal';
  let headersOn = false;

  let pub = null, frame = null;

  function getConfig() {
    if (mode === 'preset') return starterConfig(currentPreset);
    const cfg = starterConfig('Minimal Print');
    cfg.page.size = pageSize;
    const m = MARGINS[marginName] || 20;
    cfg.page.margins = { top: m, right: m, bottom: m, left: m };
    cfg.headerFooter.header = { on: headersOn, left: '{title}', centre: '', right: '{date}' };
    cfg.headerFooter.footer = { on: headersOn, left: '', centre: '{page}', right: '' };
    cfg.headerFooter.rule = headersOn ? 'both' : 'none';
    return cfg;
  }

  const widthBtns = WIDTHS.map(({ label, w }, i) => {
    const btn = h('button', { type: 'button', class: 'btn btn--sm' + (i === 0 ? ' is-on' : ''), onclick: () => {
      widthBtns.forEach((b) => b.classList.remove('is-on'));
      btn.classList.add('is-on');
      slot.style.maxWidth = w;
    } }, label);
    return btn;
  });

  async function load() {
    const d = docInput(ctx);
    if (!d) { statusEl.textContent = 'No document open.'; return; }
    statusEl.textContent = 'Building preview…';
    printBtn.disabled = true; pdfBtn.disabled = true;
    printBtn.classList.remove('btn--danger');
    printBtn.replaceChildren(icon('printer'), ' Print…');
    try {
      const cfg = getConfig();
      pub = await buildPublication([d], cfg, await envFor(d.text, cfg, d));
      if (frame) frame.destroy();
      frame = mountPagedFrame(slot, pub.html);
      const r = await frame.ready;
      if (r.lotoPaged === 'error') throw new Error(r.message || 'pagination failed');
      statusEl.textContent = `${r.pages || 0} page${r.pages === 1 ? '' : 's'} · Preview is identical to the PDF export of this preset.`;
      printBtn.disabled = false; pdfBtn.disabled = false;
    } catch (e) {
      statusEl.textContent = `Preview error: ${e.message}`;
    }
  }

  printBtn.addEventListener('click', async () => {
    if (!pub) return;
    printBtn.disabled = true;
    printBtn.classList.remove('btn--danger');
    printBtn.replaceChildren(icon('printer'), ' Printing…');
    statusEl.textContent = 'Sending to printer…';
    try {
      const r = await printDoc(pub.html);
      if (r.ok && r.canceled) {
        statusEl.textContent = 'Print canceled.';
        printBtn.replaceChildren(icon('printer'), ' Print…');
      } else if (r.ok) {
        store.dispatch({ type: 'ui/backstage', open: false });
        ui.toast('Sent to printer.');
        printBtn.replaceChildren(icon('printer'), ' Print…');
      } else {
        const err = r.error?.message || 'Printer error';
        statusEl.textContent = `Print failed: ${err}`;
        printBtn.classList.add('btn--danger');
        printBtn.replaceChildren(icon('triangle-alert'), ` Error: ${err}`);
      }
    } catch (e) {
      statusEl.textContent = `Print error: ${e.message}`;
      printBtn.classList.add('btn--danger');
      printBtn.replaceChildren(icon('triangle-alert'), ` Error: ${e.message}`);
    } finally {
      printBtn.disabled = false;
    }
  });

  pdfBtn.addEventListener('click', () => {
    store.dispatch({ type: 'ui/backstage', open: false });
    runCommand('pub.export-pdf');
  });

  const presetRadio = h('input', { type: 'radio', name: 'print-mode', value: 'preset', checked: true });
  const simpleRadio = h('input', { type: 'radio', name: 'print-mode', value: 'simple' });
  const presetSelect = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { currentPreset = e.target.value; load(); } },
    ...Object.keys(STARTER_PRESETS).map((name) => {
      const opt = h('option', { value: name }, name);
      if (name === currentPreset) opt.selected = true;
      return opt;
    })
  );

  const sizeSelect = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { pageSize = e.target.value; load(); } },
    ...SIZES.map((s) => {
      const opt = h('option', { value: s }, s);
      if (s === pageSize) opt.selected = true;
      return opt;
    })
  );

  const marginSelect = h('select', { class: 'select', style: { width: 'auto' }, onchange: (e) => { marginName = e.target.value; load(); } },
    ...Object.keys(MARGINS).map((m) => {
      const opt = h('option', { value: m }, m);
      if (m === marginName) opt.selected = true;
      return opt;
    })
  );

  const headersCheck = h('input', { type: 'checkbox', onchange: (e) => { headersOn = e.target.checked; load(); } });

  const presetControls = h('div', { class: 'lv-print__mode-row' },
    h('label', { class: 'check' }, presetRadio, 'Use Export Studio preset:'),
    presetSelect
  );

  const simpleControls = h('div', { class: 'lv-print__mode-row', style: { opacity: '0.6', pointerEvents: 'none' } },
    h('label', { class: 'check' }, simpleRadio, 'Simple print:'),
    h('label', { class: 'field__label', style: { marginLeft: '8px' } }, 'Size:'),
    sizeSelect,
    h('label', { class: 'field__label', style: { marginLeft: '8px' } }, 'Margins:'),
    marginSelect,
    h('label', { class: 'check', style: { marginLeft: '8px' } }, headersCheck, 'Headers & footers')
  );

  presetRadio.onchange = () => {
    mode = 'preset';
    presetControls.style.opacity = '1';
    presetControls.style.pointerEvents = 'auto';
    simpleControls.style.opacity = '0.6';
    simpleControls.style.pointerEvents = 'none';
    load();
  };

  simpleRadio.onchange = () => {
    mode = 'simple';
    simpleControls.style.opacity = '1';
    simpleControls.style.pointerEvents = 'auto';
    presetControls.style.opacity = '0.6';
    presetControls.style.pointerEvents = 'none';
    load();
  };

  load();

  return h('div', { class: 'lv-print' },
    h('div', { class: 'lv-print__head' },
      h('h3', {}, 'Print Preview'),
      h('div', { class: 'lv-print__widths' }, ...widthBtns),
      h('div', { class: 'lv-print__actions' }, printBtn, pdfBtn)),
    h('div', { class: 'lv-print__settings', style: { display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2, var(--hover))' } },
      presetControls,
      simpleControls),
    statusEl, slot);
}
