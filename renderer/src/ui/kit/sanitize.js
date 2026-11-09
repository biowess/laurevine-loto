const TAGS = new Set('A B I EM STRONG CODE SPAN SMALL SUP SUB BR HR P DIV H1 H2 H3 H4 H5 H6 BLOCKQUOTE PRE UL OL LI TABLE THEAD TBODY TR TH TD'.split(' '));
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'SVG', 'MATH']);
const HREF = /^(https?:|mailto:|#)/i;
const ALIGN = /^\s*text-align\s*:\s*(left|right|center)\s*;?\s*$/i;

function copyAttrs(from, el) {
  for (const { name, value } of from.attributes) {
    if (name === 'class' && /^[\w -]*$/.test(value)) el.className = value;
    else if (name === 'align' && /^(left|right|center)$/i.test(value)) el.setAttribute('align', value.toLowerCase());
    else if ((name === 'colspan' || name === 'rowspan') && /^\d{1,2}$/.test(value)) el.setAttribute(name, value);
    else if (name === 'style' && ALIGN.test(value)) el.style.textAlign = value.match(ALIGN)[1].toLowerCase();
    else if (name === 'href' && from.tagName === 'A' && HREF.test(value.trim())) { el.setAttribute('href', value.trim()); el.setAttribute('rel', 'noopener noreferrer'); }
  }
}

// Rebuilds the markup from an allow-list of tags and attributes; everything else is dropped, text is kept.
export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  const out = document.createDocumentFragment();
  const walk = (from, to) => {
    for (const n of from.childNodes) {
      if (n.nodeType === 3) to.append(document.createTextNode(n.data));
      else if (n.nodeType !== 1 || DROP.has(n.tagName.toUpperCase())) continue;
      else if (TAGS.has(n.tagName)) {
        const el = document.createElement(n.tagName.toLowerCase());
        copyAttrs(n, el); walk(n, el); to.append(el);
      } else walk(n, to);
    }
  };
  walk(doc.body, out);
  return out;
}
