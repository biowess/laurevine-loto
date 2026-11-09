import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { backstagePages } from '../../ui/backstage/registry.js';
import { page, heading, rows, cta } from '../../ui/backstage/page-kit.js';
import { uiActions } from '../../state/slices/ui.js';
import { render } from '../../core/markdown/renderer.js';
import { getProfile } from '../../core/markdown/profiles.js';
import { parseFrontmatter } from '../../core/markdown/frontmatter.js';
import { docStats, optsFrom } from '../../core/text/stats.js';
import { indexFiles } from '../../core/links/resolve.js';
import { describeInfo } from '../../core/backstage/doc-info.js';
import { getSetting } from '../../services/settings-client.js';
import { listFiles } from '../../services/workspace-client.js';
import * as docClient from '../../services/doc-client.js';
import { ROWS } from '../statistics/index.js';

const SHOWN = ['Words', 'Characters', 'Paragraphs', 'Headings'], CAP = 200;
const WHY = { 'missing-file': 'file not found', 'missing-anchor': 'heading not found', ambiguous: 'matches several files' };
const posix = (s) => s.replace(/\\/g, '/');
const note = (t) => h('p', { class: 'lv-note' }, t);
const notice = (kind, ic, title, text) => h('div', { class: `lv-notice is-${kind}`, role: 'status' }, icon(ic), h('div', {}, h('b', {}, title), h('span', {}, text)));

export function registerInfoPage(ctx) {
  const { store, settings, commands, services: { documents }, ui: { runCommand } } = ctx;

  commands.register({
    id: 'info.goto-line', title: 'Go to Link in Document', icon: 'corner-down-right', group: 'Document Information',
    run: (line) => {
      if (!Number.isInteger(line) || line < 1) return;
      store.dispatch(uiActions.backstage(false));
      setTimeout(() => {
        const v = documents.editorRun('view');
        if (!v) return;
        const l = v.state.doc.line(Math.min(line, v.state.doc.lines));
        v.dispatch({ selection: { anchor: l.from }, effects: v.constructor.scrollIntoView(l.from, { y: 'center' }), userEvent: 'select.goto' });
        v.focus();
      }, 150);
    },
  });

  const list = (items, row) => [...items.slice(0, CAP).map(row), items.length > CAP ? note(`…and ${items.length - CAP} more`) : null];

  async function load(host) {
    const s = store.get(), tab = s.documents.tabs.find((t) => t.id === s.documents.activeId), e = tab && documents.getEntry(tab.id);
    if (!e) return host.replaceChildren(note('Open or create a document to see its information.'));
    documents.editorRun('flush');
    const v = documents.editorRun('view'), text = v ? v.state.doc.toString() : e.doc.text;
    const root = posix(s.workspace.root || '').replace(/\/$/, ''), p = posix(tab.path || '');
    const rel = root && p.startsWith(`${root}/`) ? p.slice(root.length + 1) : null;
    const [disk, files] = await Promise.all([
      tab.path ? docClient.stat(tab.path).catch(() => null) : null,
      rel !== null ? listFiles({ showHidden: !!settings.get('explorer.showHidden'), refresh: true }).catch(() => null) : null,
    ]);
    if (!host.isConnected) return;
    const strat = settings.get('markdown.anchorStrategy'), profile = getProfile(e.profile || settings.get('markdown.defaultProfile'));
    const r = render(text, { profile: profile.id, anchorStrategy: strat }), ids = r.headings.map((x) => x.id), from = rel || '';
    const info = describeInfo({
      tab, doc: e.doc, disk, fm: parseFrontmatter(text), links: r.links, images: r.images, profile, from, strategy: strat,
      index: files ? indexFiles(files.files.map(posix)) : null, anchors: (q) => (q === from ? ids : null),
    });
    const st = docStats(text, optsFrom(getSetting)), num = ROWS.filter(([k]) => SHOWN.includes(k)).map(([k, f]) => ['text', k, f(st)]);
    const status = (a) => (a.status === 'missing-file' ? 'Missing' : a.status === 'ok' ? 'Found' : 'Not checked');
    host.replaceChildren(
      heading('File'), rows(info.file), heading('Content'), rows(num), heading('Format'), rows(info.format),
      heading('Front Matter'), rows([['list', 'Summary', info.front]]), h('div', { class: 'lv-info-actions' }, cta(['properties.edit', 'Edit Properties', 'pencil'], ['doc.stats', 'Statistics', 'bar-chart-3'])),
      heading('Referenced assets'),
      info.assets.length ? h('div', { class: 'md-list' }, ...list(info.assets, (a) => h('div', { class: `md-row${a.status === 'missing-file' ? ' info-warn' : ''}` },
        icon(a.status === 'missing-file' ? 'triangle-alert' : 'image'), h('b', { style: { fontWeight: '500' } }, a.src), h('small', {}, `${status(a)} · line ${a.line}`)))) : note('None'),
      heading('Broken links'),
      info.broken === null ? rows([['link', 'Broken links', '—']]) : rows([['link', 'Broken links', String(info.broken.length)]]),
      info.broken === null ? notice('info', 'info', 'Link check unavailable', 'Open this file inside a workspace folder to check its links and assets.')
        : info.broken.length ? h('div', { class: 'md-list' }, ...list(info.broken, (b) => h('button', { type: 'button', class: 'md-row info-link', title: `Go to line ${b.line}`, onclick: () => runCommand('info.goto-line', b.line) },
          icon('unlink'), h('b', { style: { fontWeight: '500' } }, `Line ${b.line}`), h('small', {}, `${b.href} — ${WHY[b.status]}`)))) : notice('ok', 'circle-check', 'No broken links', 'Every link in this document points to a file and heading that exist.'),
    );
  }

  backstagePages.register({
    id: 'info', title: 'Document Information', icon: 'info',
    render: () => {
      const host = h('div', { style: { maxWidth: '680px' } }, note('Loading…'));
      load(host).catch(() => host.replaceChildren(note('Could not read document information.')));
      return page('Document Information', 'Facts about the active document.', host);
    },
  });
}
