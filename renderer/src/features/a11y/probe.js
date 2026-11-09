// Measures rendered preview colours (text, link, code, callouts) in light and dark for a preview theme.
import { checkPairs, parseColor, blend } from '../../core/a11y/contrast.js';

const callout = (t) => `<div class="lt-callout lt-callout-${t}"><div class="lt-callout-title">T</div><p>x</p></div>`;
const SAMPLES = [
  ['Body text', '<p>Text</p>', 'p'],
  ['Link', '<p><a href="#">Link</a></p>', 'a'],
  ['Inline code', '<p><code>c</code></p>', 'code'],
  ['Code block', '<pre><code>c</code></pre>', 'code'],
  ['Quote', '<blockquote><p>q</p></blockquote>', 'p'],
  ['Callout text', callout('note'), 'p'],
  ...['note', 'tip', 'important', 'warning', 'caution'].map((t) => [`Callout ${t} title`, callout(t), '.lt-callout-title']),
];

function bgOf(el) {
  const layers = [];
  for (let n = el; n; n = n.parentElement) {
    const c = parseColor(getComputedStyle(n).backgroundColor);
    if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
  }
  return layers.reverse().reduce((o, c) => blend(c, o), [255, 255, 255, 1]);
}

function sample(mode, theme) {
  const wrap = document.createElement('div'), prev = document.createElement('div');
  wrap.style.cssText = 'position:absolute;left:-9999px;top:0;width:600px';
  prev.id = 'prev';
  prev.dataset.pvTheme = theme || 'editorial';
  prev.innerHTML = SAMPLES.map((s, i) => `<div data-s="${i}">${s[1]}</div>`).join('');
  wrap.append(prev);
  document.body.append(wrap);
  const out = SAMPLES.map((s, i) => {
    const el = prev.querySelector(`[data-s="${i}"] ${s[2]}`);
    return { name: s[0], mode, fg: getComputedStyle(el).color, bg: bgOf(el) };
  });
  wrap.remove();
  return out;
}

export function contrastResults(theme) {
  const root = document.documentElement, was = root.dataset.theme, st = document.createElement('style'), pairs = [];
  st.textContent = '*,*::before,*::after{transition:none!important}';
  document.head.append(st);
  try {
    for (const mode of ['light', 'dark']) {
      root.dataset.theme = mode;
      pairs.push(...sample(mode, theme));
    }
  } finally {
    if (was == null) delete root.dataset.theme; else root.dataset.theme = was;
    getComputedStyle(document.body).color;
    st.remove();
  }
  return checkPairs(pairs.map((p) => ({ ...p, theme })));
}
