// Export-time structure over rendered DOM (never touches Markdown): heading numbers, captions, cross-reference renumbering, page breaks.
import { isRefText, renumberRef } from '../crossref/numbering.js';
import { esc } from './document.js';

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const roman = (n) => { let s = ''; for (const [v, t] of ROMAN) while (n >= v) { s += t; n -= v; } return s; };
const alpha = (n) => { let s = ''; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const SCHEMES = { '1.1.1': [String], 'I.A.1': [roman, alpha, String, (n) => alpha(n).toLowerCase(), (n) => roman(n).toLowerCase(), String] };
const FRONT = /^(abstract|preface|foreword|contents|table of contents|acknowledg(?:e)?ments?|dedication)$/i;
const HEAD = 'h1,h2,h3,h4,h5,h6';
const anchorOnly = (p) => p && p.tagName === 'P' && !p.textContent.trim() && !p.querySelector('img');
const emOnly = (p) => p.children.length === 1 && p.firstElementChild.tagName === 'EM' && p.textContent.trim() === p.firstElementChild.textContent.trim();
const soloImg = (p) => p.querySelector('img') && [...p.childNodes].every((n) => (n.nodeType === 3 ? !n.data.trim() : n.nodeType === 1 && (n.matches('img,br,a:empty') || (n.tagName === 'A' && n.querySelector('img') && !n.textContent.trim()))));
const idsOf = (b) => { const p = b.previousElementSibling; return [b, ...b.querySelectorAll('[id]'), ...(anchorOnly(p) ? p.querySelectorAll('[id]') : [])].map((e) => e.id).filter(Boolean); };

function unnumbered(h) {
  let hit = false;
  for (const n of [...h.childNodes]) if (n.nodeType === 8 && /^\s*laurevine:nonumber\s*$/.test(n.data)) { n.remove(); hit = true; }
  const t = h.lastChild;
  if (t && t.nodeType === 3) { const s = t.data.replace(/\s*(?:\{-\}|<!--\s*laurevine:nonumber\s*-->)\s*$/, ''); if (s !== t.data) { t.data = s; hit = true; } }
  return hit;
}

export const structureCss = () => '.lt-pagebreak.lv-brk{display:block;height:0;margin:0;padding:0;overflow:hidden;font-size:0;break-after:page}.lv-h1pb{break-before:page}.lv-cap{margin:.4em 0 1em;text-indent:0;break-inside:avoid}.lv-cap-a{margin:1em 0 .4em;break-after:avoid}.lv-cap-b{break-before:avoid}.lv-cap-n{font-weight:600}';

export function createStructure(cfg) {
  const k = cfg.structure, c = [0, 0, 0, 0, 0, 0];
  const st = { targets: new Map(), caps: { figure: [], table: [] }, n: { figure: 0, table: 0 }, seq: 0, docs: 0, carry: false, chap: '' };
  const fmt = SCHEMES[k.numberScheme];

  function cap(kind, blk, el, above, move) {
    const num = (k.captionNumbering === 'chapter' && st.chap ? `${st.chap}.` : '') + ++st.n[kind];
    const text = el.textContent.trim(), n = document.createElement('span');
    n.className = 'lv-cap-n';
    n.textContent = `${k[`${kind}Label`]} ${num}`.trim();
    el.prepend(n, text ? k.captionSep : '');
    el.classList.add('lt-caption', 'lv-cap', above ? 'lv-cap-a' : 'lv-cap-b');
    el.id = `lv-cap-${++st.seq}`;
    if (move) blk[above ? 'before' : 'after'](el);
    st.caps[kind].push({ id: el.id, num, text });
    for (const id of idsOf(blk)) st.targets.set(id, { kind, num });
  }

  return {
    scan(root, startsPage) {
      if (k.numberRestart === 'document') c.fill(0);
      const hs = [...root.querySelectorAll(HEAD)], h1s = hs.filter((h) => h.tagName === 'H1');
      const title = k.skipTitle && hs[0] && hs[0].tagName === 'H1' && h1s.length === 1 ? hs[0] : null;
      const done = new Set(), nested = 'li,td,th,blockquote,figcaption,summary';
      const capLine = (p) => p && p.tagName === 'P' && !done.has(p) && (emOnly(p) || /^\s*(?:Table\s*\d*\s*)?:\s+\S/.test(p.textContent));
      const take = (p) => {
        done.add(p);
        if (emOnly(p)) p.replaceChildren(...p.firstElementChild.childNodes);
        else if (p.firstChild && p.firstChild.nodeType === 3) p.firstChild.data = p.firstChild.data.replace(/^\s*(?:Table\s*\d*\s*)?:\s+/, '');
        return p;
      };
      for (const el of root.querySelectorAll(`${HEAD},p,figure,table`)) {
        if (done.has(el)) continue;
        if (/^H\d$/.test(el.tagName)) {
          const level = +el.tagName[1];
          const skip = unnumbered(el) || el === title || level > k.numberDepth || (k.skipFront && FRONT.test(el.textContent.trim()));
          if (level === 1 && k.breakBeforeH1 && !(el === root.firstElementChild && (startsPage || !st.docs))) el.classList.add('lv-h1pb');
          if (!k.numberHeadings || skip) continue;
          c[level - 1]++;
          c.fill(0, level);
          const chain = c.slice(0, level);
          while (chain[0] === 0) chain.shift();
          const num = chain.map((v, i) => (fmt[i] || String)(v)).join('.');
          el.dataset.num = num;
          if (el.id) st.targets.set(el.id, { kind: 'section', num });
          if (chain.length === 1) { st.chap = num; st.n.figure = st.n.table = 0; }
        } else if (k.captions && !el.closest(nested)) {
          if (el.tagName === 'FIGURE') {
            const f = el.querySelector('figcaption');
            if (f && el.querySelector('img,svg')) cap('figure', el, f, false, false);
          } else if (el.tagName === 'P' && soloImg(el)) {
            const t = el.querySelector('img').title, nx = el.nextElementSibling, above = k.figurePos === 'above';
            if (t || capLine(nx) && emOnly(nx)) {
              let f;
              if (t) { f = document.createElement('p'); f.textContent = t; } else f = take(nx);
              cap('figure', el, f, above, true);
            }
          } else if (el.tagName === 'TABLE') {
            let pv = el.previousElementSibling;
            if (anchorOnly(pv)) pv = pv.previousElementSibling;
            const f = capLine(pv) ? pv : capLine(el.nextElementSibling) ? el.nextElementSibling : null;
            if (f) cap('table', el, take(f), k.tablePos === 'above', true);
          }
        }
      }
      const pb = startsPage || st.carry;
      st.carry = false;
      for (const b of [...root.querySelectorAll('.lt-pagebreak')]) {
        const prev = b.previousElementSibling, next = b.nextElementSibling;
        if (!k.pageBreakDirective) { b.remove(); continue; }
        if (k.avoidBlank) {
          if ((!prev && (pb || !st.docs)) || (prev && prev.classList.contains('lv-brk')) || (next && (next.classList.contains('lv-h1pb') || next.classList.contains('lv-brk')))) { b.remove(); continue; }
          if (!next) { b.remove(); st.carry = true; continue; }
        }
        b.textContent = '';
        b.className = 'lt-pagebreak lv-brk';
        b.setAttribute('aria-hidden', 'true');
      }
      st.docs++;
      return pb;
    },

    resolve(items, warn) {
      if (!k.crossrefs) return;
      const labels = { figure: k.figureLabel, table: k.tableLabel };
      for (const it of items) for (const a of it.root.querySelectorAll('a[href^="#"]')) {
        let id = a.getAttribute('href').slice(1);
        const t = st.targets.get(id) || (() => { try { return st.targets.get(decodeURIComponent(id)); } catch { return null; } })(), txt = a.textContent;
        const r = t && renumberRef(txt, t.kind, t.num, labels);
        if (r) a.textContent = r;
        else if (!t && isRefText(txt) && !it.root.querySelector(`[id="${CSS.escape(id)}"]`)) warn({ kind: 'crossref', message: `Cross-reference "${txt.trim()}" has no numbered target.`, docId: it.docId, sectionId: it.sectionId });
      }
    },

    lists(dir) {
      const one = (kind, on, title) => (on && st.caps[kind].length ? `<nav class="lv-toc lv-lo" aria-label="${esc(title)}"><div class="lv-toc-title" dir="${dir}">${esc(title)}</div><ol>${st.caps[kind].map((x) => `<li class="l1" dir="${dir}"><a href="#${x.id}">${esc(`${k[`${kind}Label`]} ${x.num}${x.text ? k.captionSep + x.text : ''}`.trim())}</a></li>`).join('')}</ol></nav>` : '');
      return one('figure', k.lof, k.lofTitle) + one('table', k.lot, k.lotTitle);
    },
  };
}
