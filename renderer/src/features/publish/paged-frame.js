import { pagedHtml } from '../../../../shared/paged-html.js';

const SCRIPTS = [
  new URL('../../../../shared/paged-boot.js', import.meta.url).href,
  new URL('../../../vendor/pagedjs/paged.polyfill.js', import.meta.url).href,
];

// Renders a publication (buildPublication().html) as real Paged.js pages (`.pagedjs_page`) in a sandboxed iframe.
// -> { frame, ready: Promise<{ lotoPaged: 'done'|'error'|'canceled', pages?, message? }>, destroy() }
export function mountPagedFrame(host, html) {
  const frame = document.createElement('iframe');
  frame.className = 'lv-paged';
  frame.title = 'Publication preview';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  let done;
  const ready = new Promise((resolve) => { done = resolve; });
  const on = (e) => { if (e.source === frame.contentWindow && e.data && e.data.lotoPaged) done(e.data); };
  window.addEventListener('message', on);
  frame.srcdoc = pagedHtml(html, SCRIPTS);
  host.replaceChildren(frame);
  return { frame, ready, destroy() { window.removeEventListener('message', on); done({ lotoPaged: 'canceled' }); frame.remove(); } };
}
