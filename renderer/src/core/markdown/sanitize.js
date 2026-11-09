import { DOMPurify } from '../../../vendor/dompurify.js';

export const SANITIZE_CONFIG = Object.freeze({
  USE_PROFILES: { html: true },
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'base', 'svg', 'math', 'frame', 'frameset'],
  FORBID_ATTR: ['style', 'srcset', 'formaction', 'action', 'target'],
  ADD_ATTR: ['data-src-line', 'data-src-end'],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|loto-asset):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
  // Off so heading ids like "title" survive; the hook below guards other ids/names.
  SANITIZE_DOM: false,
});

const URI_ATTRS = new Set(['href', 'src', 'cite', 'poster', 'background']);

if (DOMPurify.isSupported) {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const name = data.attrName;
    const value = data.attrValue;
    if (URI_ATTRS.has(name) && /^[\s\u0000-\u001f]*(?:data:|\/\/)/i.test(value)) data.keepAttr = false;
    else if ((name === 'id' || name === 'name') && !/^H[1-6]$/.test(node.nodeName) && (value in document || value in window)) data.keepAttr = false;
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && node.hasAttribute('href')) node.setAttribute('rel', 'noopener noreferrer');
  });
}

export const sanitize = (html) => (DOMPurify && typeof DOMPurify.sanitize === 'function' ? String(DOMPurify.sanitize(String(html ?? ''), SANITIZE_CONFIG)) : String(html ?? ''));

// KaTeX and Mermaid (strict) output: SVG, MathML and HTML labels. Scripts, event handlers and external URIs are stripped.
export const sanitizeEmbedded = (svg) => (DOMPurify && typeof DOMPurify.sanitize === 'function'
  ? String(DOMPurify.sanitize(String(svg ?? ''), { USE_PROFILES: { svg: true, svgFilters: true, mathMl: true, html: true }, ADD_TAGS: ['foreignObject'], FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'], FORBID_ATTR: ['srcset', 'formaction', 'action', 'target'], ALLOWED_URI_REGEXP: SANITIZE_CONFIG.ALLOWED_URI_REGEXP }))
  : '');
