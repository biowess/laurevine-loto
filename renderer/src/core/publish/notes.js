// 44c: Export-time footnotes (Paged.js page-bottom floats or endnotes) and bibliography placement on rendered document fragments.
// Pure DOM work on the already sanitised fragment; Markdown is never touched.
const mk = (tag, text, id) => { const e = document.createElement(tag); e.textContent = text; if (id) e.id = id; return e; };
const key = (e) => e.textContent.replace(/^\s*\[\d+\]\s*/, '').replace(/\s+/g, ' ').trim();

export function createNotes(cfg) {
  const s = cfg.structure, ends = [], bibs = [];
  let off = 0;
  return {
    scan(root, n) {
      const fns = root.querySelector('.lt-footnotes');
      if (fns) {
        const items = [...fns.querySelectorAll(':scope > ol > li')], refs = [...root.querySelectorAll('sup.lt-fnref a')];
        const by = (a) => items.find((li) => li.id === a.getAttribute('href').slice(1));
        if (s.notes === 'page') {
          for (const a of refs) {
            const li = by(a);
            if (!li) continue;
            const span = document.createElement('span'), c = li.cloneNode(true);
            span.className = 'lv-fn';
            c.querySelectorAll('.lt-fnback').forEach((b) => b.remove());
            c.querySelectorAll('p').forEach((p) => p.replaceWith(...p.childNodes, ' '));
            span.append(...c.childNodes);
            (a.closest('sup') || a).replaceWith(span);
          }
          fns.remove();
        } else if (s.notes === 'document') {
          for (const a of refs) a.textContent = `[${(parseInt(a.textContent.replace(/\D/g, ''), 10) || 0) + off}]`;
          off += items.length;
          ends.push(...items);
          fns.remove();
        } else fns.prepend(mk('h2', s.notesTitle, `lv-notes-${n}`));
      }
      const bib = root.querySelector('.lt-bibliography');
      if (!bib) return;
      if (s.bibPlacement === 'none') bib.remove();
      else if (s.bibPlacement === 'end') { bibs.push(...bib.querySelectorAll('.csl-bib-body > *')); bib.remove(); }
      else bib.querySelector('.lt-bibliography-title')?.replaceWith(mk('h2', s.bibTitle, `lv-bib-${n}`));
    },
    // Document-level sections appended after the last document; their headings join `headings` (TOC, bookmarks).
    finish(headings) {
      const out = [], put = (cls, id, title, inner) => {
        headings.push({ id, level: 1, text: title, line: 0 });
        const sec = document.createElement('section');
        sec.className = `lv-section ${cls}`;
        sec.append(mk('h1', title, id), inner);
        const d = document.createElement('div');
        d.append(sec);
        out.push(d.innerHTML);
      };
      if (ends.length) { const ol = document.createElement('ol'); ol.append(...ends); put('lt-footnotes lv-endnotes', 'lv-notes', s.notesTitle, ol); }
      const seen = new Set(), list = bibs.filter((e) => !seen.has(key(e)) && seen.add(key(e)));
      if (list.length) { const b = document.createElement('div'); b.className = 'csl-bib-body'; b.append(...list); put('lt-bibliography', 'lv-bibliography', s.bibTitle, b); }
      return out;
    },
  };
}

export function notesCss(cfg) {
  const page = cfg.structure.notes === 'page' ? '.lv-fn{float:footnote;font-size:.85em;line-height:1.35;text-align:start}.lv-fn::footnote-call{content:counter(footnote);font-size:.7em;vertical-align:super;line-height:0}.lv-fn::footnote-marker{content:counter(footnote) ". ";font-variant-numeric:tabular-nums}@page{@footnote{border-top:.5pt solid var(--dv,#999);padding-top:2mm;max-height:35%}}' : '';
  return `${page}.lt-footnotes{font-size:.9em}.lt-footnotes ol{padding-inline-start:1.6em}.lt-bibliography .csl-bib-body>*{margin:0 0 .5em;padding-inline-start:2em;text-indent:-2em;text-align:start;break-inside:avoid;overflow-wrap:anywhere}`;
}
