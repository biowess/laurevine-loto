import * as api from '../../services/history-client.js';
import { diffLines } from '../../core/diff/line-diff.js';
import { render } from '../../core/markdown/renderer.js';
import { runCommand } from '../../ui/shell/panels.js';
import { confirmDialog } from '../files/dialogs.js';

export function openHistory(ctx, { title, ref, docId, restore, current, label = 'Restore Previous Version', onClose }) {
  const { h, openDialog, toast } = ctx.ui;
  let versions = [], sel = null, source = false, gen = 0, dead = false, loading = true, loadErr = null;
  const texts = new Map(), spans = new Map();
  const list = h('div', { class: 'lv-hist__list', role: 'listbox', 'aria-label': 'Versions' });
  const VIRT = 300, RH = 44;
  const sp = h('div', { class: 'lv-hist__sp', style: { position: 'relative', width: '100%' } });
  let isVirt = false, virtRaf = 0;
  const prev = h('div', { class: 'lv-hist__prev' });
  const btn = (id, text, extra = {}) => h('button', { type: 'button', class: 'btn' + (extra.primary ? ' btn--primary' : ''), dataset: { cmd: id }, title: extra.reason || '', disabled: true, onclick: () => runCommand(id) }, text);
  const B = { pin: btn('hist.pin', 'Pin'), del: btn('hist.delete', 'Delete'), cmp: btn('hist.compare', 'Compare'), src: btn('hist.toggle-source', 'Show Source'), res: btn('hist.restore-version', label, { primary: true }) };
  B.src.disabled = false;
  const cur = () => versions.find((v) => v.id === sel);
  const text = async (id) => { if (!texts.has(id)) texts.set(id, (await api.read(ref, id)).text); return texts.get(id); };
  const span = (id) => spans.get(id) ?? spans.set(id, h('span', {}, '…')).get(id);
  const safe = (f) => async () => { try { await f(); } catch (e) { toast(e.message || 'History action failed.', { timeout: 5000 }); } };

  const mkRow = (v, idx) => {
    const el = h('button', { type: 'button', role: 'option', class: 'lv-hist__row' + (v.id === sel ? ' is-sel' : ''), 'aria-selected': String(v.id === sel), onclick: () => select(v.id) },
      h('b', {}, new Date(v.at).toLocaleString()), h('span', {}, v.label + (v.pinned ? ' · Pinned' : '')), h('small', {}, `${api.size(v.size)} · `, span(v.id)));
    if (idx != null) {
      el.style.position = 'absolute';
      el.style.top = `${idx * RH}px`;
      el.style.left = '0';
      el.style.right = '0';
    }
    return el;
  };

  const paintVirt = () => {
    const n = versions.length, y = list.scrollTop, hgt = list.clientHeight || 400;
    sp.style.height = `${n * RH}px`;
    const a = Math.max(0, Math.floor(y / RH) - 4), b = Math.min(n, Math.ceil((y + hgt) / RH) + 6);
    const nodes = [];
    for (let i = a; i < b; i++) nodes.push(mkRow(versions[i], i));
    sp.replaceChildren(...nodes);
  };

  const paint = () => {
    if (loading) {
      list.replaceChildren(h('p', { class: 'lv-hist__empty' }, 'Loading version history… Please wait.'));
    } else if (loadErr) {
      list.replaceChildren(h('p', { class: 'lv-hist__empty' }, `Failed to load history: ${loadErr}. Check file permissions.`));
    } else if (versions.length > VIRT) {
      isVirt = true;
      if (!list.contains(sp)) list.replaceChildren(sp);
      paintVirt();
    } else {
      isVirt = false;
      list.replaceChildren(...(versions.length ? versions.map((v) => mkRow(v)) : [h('p', { class: 'lv-hist__empty' }, 'No saved versions found. Edit and save this document to create version snapshots.')]));
    }
    const v = cur();
    B.pin.textContent = v && v.pinned ? 'Unpin' : 'Pin';
    B.pin.disabled = B.del.disabled = B.res.disabled = !v;
    B.cmp.disabled = !v || !current || !ctx.services.compare;
    B.src.textContent = source ? 'Show Rendered' : 'Show Source';
  };

  list.tabIndex = 0;
  list.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const idx = versions.findIndex((x) => x.id === sel);
    const next = e.key === 'ArrowDown' ? Math.min(versions.length - 1, idx + 1) : Math.max(0, idx - 1);
    if (versions[next]) select(versions[next].id);
  });
  list.addEventListener('scroll', () => { if (isVirt) { cancelAnimationFrame(virtRaf); virtRaf = requestAnimationFrame(paintVirt); } }, { passive: true });

  const verInfo = h('div', { class: 'lv-hist__info', style: { fontSize: '12px', color: 'var(--text-2, #666)', padding: '2px 0 4px' } });
  const show = async () => {
    const id = sel;
    if (!id) { verInfo.replaceChildren(); return prev.replaceChildren(); }
    const v = cur();
    const t = (await text(id)).slice(0, 300000);
    if (id !== sel || dead) return;
    if (v) {
      let diffDesc = '';
      if (current) {
        try {
          const curText = await current();
          if (curText === t) diffDesc = ' · Matches current editor';
          else {
            const r = diffLines(t, curText);
            diffDesc = ` · Current has +${r.filter((x) => x.t === 'add').length} −${r.filter((x) => x.t === 'del').length} lines`;
          }
        } catch { /* ignore */ }
      }
      verInfo.textContent = `${new Date(v.at).toLocaleString()} (${v.label}${v.pinned ? ' · Pinned' : ''}) · ${api.size(v.size)}${diffDesc}`;
    }
    if (source) prev.replaceChildren(h('pre', {}, t));
    else {
      const res = render(t);
      prev.innerHTML = res && res.html ? res.html : String(res);
    }
  };
  const deltas = async () => {
    const my = ++gen;
    for (let i = 0; i < versions.length; i++) {
      let s = '—';
      try {
        if (!versions[i + 1]) {
          s = 'Initial snapshot';
        } else {
          const [a, b] = [await text(versions[i + 1].id), await text(versions[i].id)];
          if (a.length + b.length <= 400000) {
            const rows = diffLines(a, b);
            const adds = rows.filter((r) => r.t === 'add').length, dels = rows.filter((r) => r.t === 'del').length;
            s = (adds === 0 && dels === 0) ? 'No differences' : `+${adds} −${dels} lines`;
          }
        }
      } catch { /* version vanished */ }
      if (my !== gen || dead) return;
      span(versions[i].id).textContent = s;
    }
  };
  const select = (id) => {
    sel = id; paint(); show().catch(() => {});
    ['hist.restore-version', 'hist.compare', 'hist.pin', 'hist.delete'].forEach((c) => ctx.commands.invalidate(c));
  };
  const reload = async (keep) => {
    loading = true; loadErr = null; paint();
    try {
      versions = (await api.list(ref)).versions;
      sel = versions.some((v) => v.id === keep) ? keep : (versions[0] && versions[0].id) || null;
      loading = false;
      paint(); show().catch(() => {}); deltas();
    } catch (e) {
      loading = false; loadErr = e.message || 'Storage error';
      paint();
      toast(`Could not load history: ${loadErr}`);
    }
  };


  const dlg = openDialog({
    title, icon: 'history', width: 820, cls: 'lv-hist-dlg', buttons: [{ label: 'Close' }],
    onClose: () => { dead = true; if (onClose) onClose(); },
    body: h('div', { class: 'lv-hist' }, list, h('div', { class: 'lv-hist__side' }, h('div', { class: 'lv-hist__bar' }, B.src, B.pin, B.del, B.cmp, B.res), verInfo, prev)),
  });
  reload(null).catch((e) => toast(e.message || 'Could not load history.'));
  return {
    sel: () => sel,
    pin: safe(async () => { const v = cur(); await api.pin(ref, v.id, !v.pinned); await reload(v.id); }),
    del: safe(async () => {
      const v = cur();
      if (!(await confirmDialog(ctx, { title: 'Delete Version', text: `Delete the ${new Date(v.at).toLocaleString()} version? This cannot be undone.`, label: 'Delete' }))) return;
      await api.del(ref, v.id); texts.delete(v.id); await reload(null);
    }),
    restore: safe(async () => { if (await restore(sel)) dlg.close(); }),
    compare: safe(async () => {
      const v = cur();
      if (!v || !current || !ctx.services.compare) return;
      const [a, b] = [await text(v.id), await current()];
      const docName = title.replace(/^[^—]*— /, '');
      const t = `Compare — Version from ${new Date(v.at).toLocaleString()} vs Current`;
      const l = `Version from ${new Date(v.at).toLocaleString()} (${v.label})`;
      const rLabel = `Current document (${docName})`;
      if (docId && ctx.services.compareSides) ctx.services.compareSides(t, { label: l, text: a }, { id: docId, label: rLabel, text: b });
      else ctx.services.compare({ title: t, oldText: a, newText: b, oldLabel: l, newLabel: rLabel });
    }),
    toggleSource: () => { source = !source; paint(); show().catch(() => {}); },
    close: () => dlg.close(),
  };
}
