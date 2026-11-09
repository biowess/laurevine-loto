import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { render } from '../../core/markdown/renderer.js';
import { getProfile, PROFILES, PROFILE_IDS } from '../../core/markdown/profiles.js';
import { parseFrontmatter } from '../../core/markdown/frontmatter.js';
import { docStats, optsFrom } from '../../core/text/stats.js';
import { indexFiles, summarize } from '../../core/links/resolve.js';
import { getSetting, subscribeSettings } from '../../services/settings-client.js';
import { listFiles } from '../../services/workspace-client.js';
import { ROWS } from '../statistics/index.js';

const TTL = 15000;
const show = (v) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));

export function createProperties(ctx) {
  const { store, settings, services: { documents }, ui: { kit, runCommand } } = ctx;
  const el = h('div', { class: 'pp' });
  let info = null, key = '', index = null, stamp = 0, root = '', loading = false, t = 0;

  const entry = () => { const id = store.get().documents.activeId; return id ? documents.getEntry(id) : null; };
  const relPath = (e) => {
    const r = (store.get().workspace.root || '').replace(/\\/g, '/').replace(/\/$/, ''), p = (e.doc.path || '').replace(/\\/g, '/');
    return r && p.startsWith(`${r}/`) ? p.slice(r.length + 1) : null;
  };

  function loadIndex(r) {
    if (loading || !r || (r === root && Date.now() - stamp < TTL)) return;
    loading = true;
    listFiles({ showHidden: !!settings.get('explorer.showHidden') }).then((f) => {
      index = indexFiles(f.files.map((x) => x.replace(/\\/g, '/'))); root = r; stamp = Date.now(); key = '';
    }).catch(() => { index = null; root = r; stamp = Date.now(); }).finally(() => { loading = false; if (el.isConnected) refresh(); });
  }

  function refresh() {
    const e = entry();
    if (!e) { info = null; key = ''; return draw(); }
    const rel = relPath(e), wsRoot = store.get().workspace.root;
    if (rel !== null) loadIndex(wsRoot);
    const strat = settings.get('markdown.anchorStrategy'), prof = getProfile(e.profile || settings.get('markdown.defaultProfile')), text = e.doc.text;
    const k = `${e.doc.id}|${strat}|${prof.id}|${rel}|${stamp}|${text.length}`;
    if (!info || k !== key || info.text !== text) {
      key = k;
      const r = render(text, { profile: prof.id, anchorStrategy: strat }), ids = r.headings.map((x) => x.id), from = rel || '';
      info = {
        text, prof, strat, fm: parseFrontmatter(text), stats: docStats(text, optsFrom(getSetting)),
        refs: summarize(r.links, r.images, { from, index: rel !== null ? index : null, anchors: (p) => (p === from ? ids : null), strategy: strat }),
      };
    }
    draw();
  }

  const sel = (label, opts, cur, run) => h('label', { class: 'pp__sel' }, h('span', {}, label),
    h('select', { onchange: (ev) => run(ev.target.value) }, ...opts.map(([v, l]) => h('option', { value: v, selected: v === cur }, l))));

  const copy = (k, text) => h('button', { type: 'button', class: 'pp__cp', title: `Copy ${k}`, 'aria-label': `Copy ${k}`, onclick: () => runCommand('properties.copy', text) }, icon('copy'));

  function draw() {
    if (!info) return el.replaceChildren(h('div', { class: 'pp__empty' }, 'No document open'));
    const { fm, stats, refs, prof, strat } = info, out = [];
    if (settings.get('properties.showStats')) out.push(kit.lbl('Statistics'), ...ROWS.map(([k, f]) => kit.kv(k, f(stats))));
    out.push(kit.lbl('Frontmatter'));
    if (!fm.present) out.push(h('div', { class: 'pp__empty' }, 'No frontmatter'), h('button', { type: 'button', class: 'btn pp__add', onclick: () => runCommand('properties.edit') }, 'Add properties'));
    else if (fm.error) out.push(h('div', { class: 'pp__warn' }, 'The frontmatter is not simple YAML. Edit it as raw YAML.'));
    else {
      const rows = Object.entries(fm.data);
      if (!rows.length) out.push(h('div', { class: 'pp__empty' }, 'Frontmatter is empty'));
      for (const [k, v] of rows) {
        out.push(h('div', { class: 'pp__kv' }, h('span', { class: 'pp__k' }, k),
          h('span', { class: 'pp__v', title: show(v) }, ...(Array.isArray(v) ? v.map((x) => h('span', { class: 'md-tag' }, show(x))) : [show(v)])), copy(k, show(v))));
      }
    }
    out.push(kit.lbl('Document settings'),
      sel('Profile', PROFILE_IDS.map((id) => [id, PROFILES[id].label]), prof.id, (v) => runCommand(`preview.profile-${v}`)),
      sel('Heading Anchors', [['github', 'GitHub'], ['ascii', 'ASCII']], strat, (v) => runCommand('properties.set-anchor', v)));
    const n = (v) => (v === null ? '—' : String(v));
    out.push(kit.lbl('References'), kit.kv('Links', String(refs.links)), kit.kv('Internal', String(refs.internal)), kit.kv('External', String(refs.external)),
      kit.kv('Broken links', n(refs.broken)), kit.kv('Local assets', String(refs.assets)), kit.kv('Missing assets', n(refs.missing)), kit.kv('Remote images', String(refs.remote)));
    if (refs.broken === null) out.push(h('div', { class: 'pp__empty' }, 'Open this file inside a workspace to check links and assets.'));
    el.replaceChildren(...out);
  }

  function wire() {
    const later = () => { clearTimeout(t); t = setTimeout(() => { if (el.isConnected) refresh(); }, 250); };
    documents.onDocChange((id) => { if (id === store.get().documents.activeId) later(); });
    store.subscribe((s) => s.documents.activeId, later);
    subscribeSettings(later);
  }

  return { wire, mount() { refresh(); return el; } };
}
