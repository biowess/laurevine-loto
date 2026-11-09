import { buildPublication } from '../../core/publish/index.js';
import { getTemplate } from '../../core/publish/templates/index.js';
import { docInput, envFor } from '../publish/index.js';
import { mountPagedFrame } from '../publish/paged-frame.js';
import { fontWarnings } from './font-warning.js';
import { paginationSummary } from '../../core/publish/pagination-report.js';
import { runPreflight, preflightSummary } from '../../core/publish/preflight.js';
import { getSetting } from '../../services/settings-client.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Live preview: real pipeline (buildPublication -> sandboxed Paged.js frame), debounced, cancellable.
// A new render paginates in the hidden back slot and swaps in when ready, so the old pages stay visible meanwhile.
export function createPreview(ctx, box, onChange, prefs) {
  const { h, runCommand } = ctx.ui;
  const slots = [h('div', { class: 'lv-slot' }), h('div', { class: 'lv-slot' })], frames = [null, null];
  const busy = h('div', { class: 'lv-busy' }, h('span', {}, 'Paginating…'), h('button', { type: 'button', class: 'btn btn--sm', dataset: { cmd: 'studio.cancel-preview' }, onclick: () => runCommand('studio.cancel-preview') }, 'Cancel'));
  box.replaceChildren(...slots, busy);
  const st = { pages: 0, page: 1, w: 0, h: 0, titles: [], issues: [], preflight: { findings: [], errors: [], warnings: [], blockingCount: 0 }, zoom: prefs.zoom, spread: prefs.spread, pct: 100, text: 'Waiting…', done: '', front: -1 };
  let seq = 0, timer = 0, cfg = null;

  const win = () => (st.front >= 0 && frames[st.front] ? frames[st.front].frame.contentWindow : null);
  const send = (m) => { const w = win(); if (w) w.postMessage({ lotoView: m }, '*'); };
  const scale = () => {
    if (typeof st.zoom === 'number') return st.zoom;
    if (!st.w) return 1;
    const cols = st.spread ? 2 : 1, fw = (box.clientWidth - 16) / (cols * st.w + (cols - 1) * 16 + 32);
    return clamp(st.zoom === 'page' ? Math.min(fw, (box.clientHeight - 24) / (st.h + 24)) : fw, 0.2, 3);
  };
  const apply = (page) => { const z = scale(); st.pct = Math.round(z * 100); send({ zoom: z, spread: st.spread, snap: st.zoom === 'page', page }); onChange(); };
  const busyOn = (v) => busy.classList.toggle('is-on', v);

  async function render() {
    const my = ++seq, d = docInput(ctx);
    if (!d) { st.text = 'No document to preview. Open or create a Markdown document before launching Studio.'; busyOn(false); return onChange(); }
    busyOn(true); st.text = 'Paginating export preview… Please wait.'; onChange();
    try {
      const pub = await buildPublication([d], cfg, await envFor(d.text, cfg, d));
      if (my !== seq) return;
      const i = st.front === 0 ? 1 : 0;
      if (frames[i]) frames[i].destroy();
      frames[i] = mountPagedFrame(slots[i], pub.html);
      const r = await frames[i].ready;
      if (my !== seq) return;
      if (r.lotoPaged === 'error') throw new Error(r.message);
      if (r.lotoPaged === 'canceled') return; // destroy() called mid-pagination
      const old = st.front, prevPages = st.pages;
      Object.assign(st, { front: i, pages: r.pages || 0, affected: r.affected || [], w: r.w, h: r.h, titles: r.titles || [], issues: r.issues || [] });
      slots.forEach((s, k) => s.classList.toggle('is-front', k === i));
      if (old >= 0 && frames[old]) { frames[old].destroy(); frames[old] = null; }
      st.page = clamp(st.page, 1, st.pages || 1);
      const fam = [...new Set(((getTemplate(cfg.template) || {}).fonts || []).map((f) => f.family))], n = pub.warnings.length, fw = fontWarnings(cfg, pub.html);
      st.preflight = runPreflight({ docs: [d], config: { ...cfg, preflightStrictness: getSetting('export.preflightStrictness') || 'warn' }, html: pub.html, buildWarnings: pub.warnings, paginationIssues: st.issues, fontWarningStrings: fw });
      const hasRules = cfg.sectionRules && cfg.sectionRules.length > 0;
      if (!hasRules || !st.basePages) st.basePages = hasRules && prevPages ? prevPages : r.pages;
      const diff = hasRules && st.basePages && st.basePages !== st.pages ? ` (${st.basePages} before)` : '';
      st.done = st.text = `${st.pages} page${st.pages === 1 ? '' : 's'}${diff} · Fonts: ${fam.join(', ') || cfg.typography.bodyFont} · ${paginationSummary(st.issues)} · ${preflightSummary(st.preflight)}`;
      apply(st.page);
    } catch (e) {
      if (my === seq) st.text = `Preview failed: ${e.message}. Check template settings or preflight warnings.`;
    } finally {

      if (my === seq) { busyOn(false); onChange(); }
    }
  }

  let zt = null, zr = 0;
  const queue = (f) => { zt = clamp(f(zt == null ? scale() : zt), 0.25, 3); zr = zr || requestAnimationFrame(() => { zr = 0; if (zt == null) return; st.zoom = Math.round(zt * 1000) / 1000; zt = null; apply(); }); };
  const zoomBy = (d) => queue((z) => Math.round((z + d) * 100) / 100), zoomWheel = (dy) => queue((z) => z * Math.exp(-clamp(dy, -120, 120) * 0.0015));
  const goto = (n) => { st.page = clamp(Math.round(n) || 1, 1, st.pages || 1); send({ page: st.page, smooth: true }); onChange(); };
  const on = (e) => {
    const w = win(), m = e.data;
    if (!w || e.source !== w || !m) return;
    if (m.lotoAt && m.lotoAt !== st.page) { st.page = m.lotoAt; onChange(); } else if (m.lotoWheel) zoomWheel(m.lotoWheel);
    else if (m.lotoKey) box.dispatchEvent(new KeyboardEvent('keydown', { ...m.lotoKey, bubbles: true }));
  };
  addEventListener('message', on);
  box.addEventListener('wheel', (e) => { if (e.ctrlKey) { e.preventDefault(); zoomWheel(e.deltaY); } }, { passive: false });
  const ro = new ResizeObserver(() => { if (typeof st.zoom !== 'number' && st.front >= 0) apply(); });
  ro.observe(box);

  return {
    st, goto, zoomBy,
    schedule(c, now) { cfg = c; clearTimeout(timer); if (now) render(); else timer = setTimeout(render, 350); },
    cancel() { seq++; clearTimeout(timer); busyOn(false); st.text = st.done || 'Preview canceled.'; onChange(); },
    step(d) { goto(st.page + d * (st.spread ? 2 : 1)); },
    setZoom(z) { zt = null; st.zoom = z; apply(); },
    toggleSpread() { st.spread = !st.spread; apply(st.page); },
    destroy() { seq++; clearTimeout(timer); cancelAnimationFrame(zr); removeEventListener('message', on); ro.disconnect(); frames.forEach((f) => f && f.destroy()); },
  };
}
