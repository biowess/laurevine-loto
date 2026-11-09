import { h } from './dom.js';
import { icon } from './icons.js';
import { openDialog } from './dialog.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const hex2rgb = (x) => { x = String(x || '').replace('#', ''); if (x.length === 3) x = [...x].map((c) => c + c).join(''); return /^[0-9a-f]{6}$/i.test(x) ? [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) : null; };
const rgb2hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb2hsv = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); let x = 0; if (d) { x = (mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60; if (x < 0) x += 360; } return [x, mx ? d / mx : 0, mx]; };
const hsv2rgb = (x, s, v) => { const f = (n) => { const k = (n + x / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; }; return [f(5), f(3), f(1)]; };
const hsv2hsl = (s, v) => { const l = v * (1 - s / 2); return [l && l < 1 ? (v - l) / Math.min(l, 1 - l) : 0, l]; };
const hsl2hsv = (s, l) => { const v = l + s * Math.min(l, 1 - l); return [v ? 2 * (1 - l / v) : 0, v]; };
const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const grade = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Fail');
const STD = ['#C00000', '#FF0000', '#FFC000', '#FFFF00', '#92D050', '#00B050', '#00B0F0', '#0070C0', '#002060', '#7030A0', '#000000', '#FFFFFF', '#808080'];
const KEY = 'lv.colour.recent';
const recent = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((x) => hex2rgb(x)).slice(0, 10); } catch { return []; } };
const remember = (hex) => { try { localStorage.setItem(KEY, JSON.stringify([hex, ...recent().filter((x) => x !== hex)].slice(0, 10))); } catch { /* storage unavailable */ } };

export function openColorPicker({ value = '#000000', title = 'Colors', onSelect } = {}) {
  const start = hex2rgb(value) || [0, 0, 0];
  let [H, S, V] = rgb2hsv(...start);
  const rgb = () => hsv2rgb(H, S, V).map(Math.round);
  const setRgb = (r, g, b) => { const [x, s, v] = rgb2hsv(r, g, b); if (s > 0 && v > 0) H = x; S = s; V = v; };
  const ink = (c) => (lum(c) > 0.4 ? '#000' : '#fff');

  const svTh = h('i', { class: 'cp__th' }), hueTh = h('i', { class: 'cp__th' });
  const sv = h('div', { class: 'cp__sv', tabindex: '0', role: 'slider', 'aria-label': 'Saturation and brightness' }, svTh);
  const hue = h('div', { class: 'cp__hue', tabindex: '0', role: 'slider', 'aria-label': 'Hue', 'aria-valuemin': '0', 'aria-valuemax': '360' }, hueTh);
  const curBox = h('span', {}, 'Current'), newBox = h('span', {}, 'New');
  curBox.style.background = rgb2hex(...start); curBox.style.color = ink(start);
  const field = (label, min, max, on, cls = '') => { const i = h('input', { class: 'input', type: 'number', min, max, 'aria-label': label }); i.addEventListener('input', () => { if (i.value !== '') { on(clamp(+i.value, min, max)); sync(i); } }); return [h('label', { class: 'cp__f ' + cls }, h('span', {}, label), i), i]; };
  const hexIn = h('input', { class: 'input', type: 'text', spellcheck: 'false', maxlength: '7', 'aria-label': 'Hex colour' });
  hexIn.addEventListener('input', () => { const c = hex2rgb(hexIn.value); if (c) { setRgb(...c); sync(hexIn); } });
  const rgbF = [['R', 0], ['G', 1], ['B', 2]].map(([l, k]) => field(l, 0, 255, (v) => { const c = rgb(); c[k] = v; setRgb(...c); }));
  const hslF = [field('H', 0, 360, (v) => { H = v; }), field('S %', 0, 100, (v) => { const l = hsv2hsl(S, V)[1]; [S, V] = hsl2hsv(v / 100, l); }), field('L %', 0, 100, (v) => { const s = hsv2hsl(S, V)[0]; [S, V] = hsl2hsv(s, v / 100); })];
  const ctW = h('b'), ctWg = h('em'), ctB = h('b'), ctBg = h('em'), aaW = h('span', { class: 'cp__aa' }, 'Aa'), aaB = h('span', { class: 'cp__aa' }, 'Aa');
  aaW.style.background = '#fff'; aaB.style.background = '#000';

  function sync(skip) {
    const c = rgb(), hx = rgb2hex(...c), [sl, l] = hsv2hsl(S, V);
    dlg.el.style.setProperty('--cp-h', Math.round(H));
    svTh.style.left = S * 100 + '%'; svTh.style.top = (1 - V) * 100 + '%'; hueTh.style.left = (H / 360) * 100 + '%';
    sv.setAttribute('aria-valuetext', `${Math.round(S * 100)}% saturation, ${Math.round(V * 100)}% brightness`); hue.setAttribute('aria-valuenow', Math.round(H));
    newBox.style.background = hx; newBox.style.color = ink(c); aaW.style.color = hx; aaB.style.color = hx;
    const set = (i, v) => { if (i !== skip) i.value = v; };
    set(hexIn, hx); c.forEach((v, k) => set(rgbF[k][1], v));
    [Math.round(H), Math.round(sl * 100), Math.round(l * 100)].forEach((v, k) => set(hslF[k][1], v));
    const w = ratio(c, [255, 255, 255]), b = ratio(c, [0, 0, 0]);
    ctW.textContent = w.toFixed(2); ctWg.textContent = '· ' + grade(w); ctB.textContent = b.toFixed(2); ctBg.textContent = '· ' + grade(b);
  }

  const drag = (el, fn) => {
    const mv = (e) => { const r = el.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); sync(); };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.focus(); el.setPointerCapture(e.pointerId); mv(e); el.onpointermove = mv; });
    el.addEventListener('pointerup', () => { el.onpointermove = null; });
  };
  drag(sv, (x, y) => { S = x; V = 1 - y; });
  drag(hue, (x) => { H = x * 360; });
  sv.addEventListener('keydown', (e) => { const d = (e.shiftKey ? 0.1 : 0.01), m = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] }[e.key]; if (m) { e.preventDefault(); S = clamp(S + m[0], 0, 1); V = clamp(V + m[1], 0, 1); sync(); } });
  hue.addEventListener('keydown', (e) => { const d = e.shiftKey ? 10 : 1, m = { ArrowLeft: -d, ArrowDown: -d, ArrowRight: d, ArrowUp: d }[e.key]; if (m) { e.preventDefault(); H = clamp(H + m, 0, 360); sync(); } });

  const eye = h('button', { type: 'button', class: 'btn cp__eye', title: 'Pick colour from screen', 'aria-label': 'Pick colour from screen', disabled: !window.EyeDropper }, icon('pipette'));
  eye.addEventListener('click', () => { new window.EyeDropper().open().then((r) => { const c = hex2rgb(r.sRGBHex); if (c) { setRgb(...c); sync(); } }).catch(() => {}); });
  const swatches = (label, list) => list.length ? h('div', { class: 'cp__grp' }, h('div', { class: 'cp__lbl' }, label), h('div', { class: 'cp__sws' }, list.map((x) => {
    const b = h('button', { type: 'button', class: 'cp__sw', title: x, 'aria-label': x }); b.style.background = x;
    b.addEventListener('click', () => { setRgb(...hex2rgb(x)); sync(); }); return b;
  }))) : null;

  const body = [
    h('div', { class: 'cp__main' },
      h('div', { class: 'cp__l' }, sv, hue),
      h('div', { class: 'cp__r' },
        h('div', { class: 'cp__pv' }, curBox, newBox),
        h('div', { class: 'cp__row' }, h('label', { class: 'cp__f cp__hex' }, h('span', {}, 'Hex'), hexIn), eye),
        h('div', { class: 'cp__trio' }, rgbF.map((f) => f[0])),
        h('div', { class: 'cp__trio' }, hslF.map((f) => f[0])),
        h('div', { class: 'cp__ct' }, aaW, h('span', {}, 'On white'), ctW, ctWg),
        h('div', { class: 'cp__ct' }, aaB, h('span', {}, 'On black'), ctB, ctBg))),
    h('div', { class: 'cp__sep' }),
    swatches('Recent', recent()), swatches('Standard', STD),
  ];
  const dlg = openDialog({
    title, icon: 'palette', width: 680, cls: 'cp', body, focus: '.cp__hex input',
    buttons: [{ label: 'Cancel' }, { label: 'Select', primary: true, onClick: () => { const hx = rgb2hex(...rgb()); remember(hx); if (onSelect) onSelect(hx.toLowerCase()); } }],
  });
  dlg.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); dlg.el.querySelector('.btn--primary').click(); } });
  sync();
  return dlg;
}

// Every <input type=color> opens the themed dialog instead of the OS picker; results flow back through normal input/change events.
export function mountColorPickers() {
  const on = (e) => {
    const i = e.target instanceof Element && e.target.closest('input[type=color]');
    if (!i) return;
    e.preventDefault();
    if (i.disabled || i.readOnly || document.querySelector('.dlg.cp')) return;
    openColorPicker({ value: i.value, onSelect: (hx) => { i.value = hx; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } });
  };
  document.addEventListener('click', on, true);
  return () => document.removeEventListener('click', on, true);
}
