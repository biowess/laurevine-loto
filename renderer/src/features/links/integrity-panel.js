// Link Integrity Panel: results table, click to jump, Fix... actions (pick replacement, create missing file, remove link), availability check.
import { h } from '../../ui/kit/dom.js';
import { icon } from '../../ui/kit/icons.js';
import { uiActions } from '../../state/slices/ui.js';
import * as W from '../../services/workspace-client.js';
import { checkDocumentIntegrity, replaceLinkInText, removeLinkInText } from '../../core/links/integrity.js';
import { humanSize } from '../../core/text/attach.js';
import { samePath, baseName } from '../../core/documents/paths.js';

export function createIntegrityPanel(ctx) {
  const { store, commands, services: { documents: D }, ui } = ctx;
  let scope = store.get().workspace.root ? 'workspace' : 'document';
  let tab = 'broken';
  let data = { brokenLinks: [], missingFiles: [], unusedAttachments: [], orphanedAssets: [], externalLinks: [] };
  let loading = false;
  let checkingAvailability = false;
  let abortController = null;
  const availabilityMap = new Map();

  const root = () => store.get().workspace.root;
  const absOf = (rel) => {
    const r = root();
    if (!r) return rel;
    const sep = r.includes('\\') ? '\\' : '/';
    return r.replace(/[\\/]+$/, '') + sep + String(rel).split('/').join(sep);
  };

  const els = new Map(); // one element per side so both panes can show the panel at once

  function setTab(t) {
    tab = t;
    render();
  }

  function setScope(s) {
    scope = s;
    refresh();
  }

  async function refresh() {
    loading = true;
    render();
    try {
      if (scope === 'document') {
        D.editorRun('flush');
        const s = store.get(), t = s.documents.tabs.find((x) => x.id === s.documents.activeId), e = t && D.getEntry(t.id);
        const text = e ? e.doc.text : '';
        const relPath = t && t.path && root() ? t.path.replace(/\\/g, '/').slice(root().replace(/\\/g, '/').length + 1) : (t && t.name) || '';

        let wsFiles = new Set(), headingsMap = new Map();
        if (root()) {
          try {
            const filesRes = await W.index('files');
            if (filesRes && filesRes.files) wsFiles = new Set(filesRes.files.map((f) => f.path));
            const headRes = await W.index('headings');
            if (headRes && headRes.files) {
              for (const f of headRes.files) headingsMap.set(f.path, f.headings);
            }
          } catch { /* index might not be ready */ }
        }

        const res = checkDocumentIntegrity(text, relPath, {
          workspaceFiles: wsFiles,
          headingsByFile: headingsMap,
          strategy: ctx.settings ? ctx.settings.get('markdown.anchorStrategy') : 'github',
        });
        data = { brokenLinks: res.brokenLinks, missingFiles: res.missingFiles, unusedAttachments: [], orphanedAssets: [], externalLinks: res.externalLinks };
      } else {
        if (!root()) {
          data = { brokenLinks: [], missingFiles: [], unusedAttachments: [], orphanedAssets: [], externalLinks: [] };
        } else {
          const res = await W.index('integrity');
          if (res) {
            data = {
              brokenLinks: res.brokenLinks || [],
              missingFiles: res.missingFiles || [],
              unusedAttachments: res.unusedAttachments || [],
              orphanedAssets: res.orphanedAssets || [],
              externalLinks: res.externalLinks || [],
            };
          }
        }
      }
    } catch (e) {
      ui.toast((e && e.message) || 'Integrity check failed.');
    } finally {
      loading = false;
      render();
    }
  }

  async function jump(it) {
    const targetPath = it.from || (it.kind !== 'media' && !it.isAsset && !it.inAttachmentDir ? it.path : '');
    if (!targetPath && it.path) {
      return W.reveal(absOf(it.path)).catch(() => {});
    }
    const r = root(), cur = D.getEntry(store.get().documents.activeId), curPath = cur && cur.doc && cur.doc.path;
    const same = scope === 'document' || (curPath && targetPath && samePath(curPath, absOf(targetPath)));
    if (targetPath && r && !same) await commands.execute('file.open-recent', absOf(targetPath));
    if (!it.line) return;
    const src = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
    if (!src() && store.get().ui.mode === 'preview') await commands.execute('view.mode-source');
    for (let i = 0; i < 20 && !src(); i++) await new Promise((res) => setTimeout(res, 25));
    const v = src();
    if (!v) return;
    const doc = v.state.doc, ln = doc.line(Math.min(Math.max(it.line, 1), doc.lines));
    v.dispatch({ selection: { anchor: ln.from }, effects: v.constructor.scrollIntoView(ln.from, { y: 'center' }) });
    v.focus();
  }

  async function createMissing(it) {
    const p = it.path || it.target;
    if (!p) return;
    const abs = absOf(p);
    const dir = abs.replace(/[\\/][^\\/]*$/, '');
    const name = abs.split(/[\\/]/).pop();
    try {
      await W.createFile(dir, name);
      ui.toast(`Created ${name}`);
      refresh();
    } catch (err) {
      ui.toast((err && err.message) || 'Could not create file.');
    }
  }

  async function removeLink(it) {
    const targetPath = it.from;
    const curEntry = D.getEntry(store.get().documents.activeId);
    const curPath = curEntry && curEntry.doc && curEntry.doc.path;
    const isCur = curPath && (samePath(curPath, absOf(targetPath)) || !targetPath);

    if (!isCur) await jump(it);
    const v = D.editorRun('view');
    if (v) {
      const txt = v.state.doc.toString();
      const updated = removeLinkInText(txt, it);
      if (updated !== txt) {
        v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: updated } });
        ui.toast('Link removed.');
        refresh();
      }
    }
  }

  async function pickReplacement(it) {
    let rep = it.target || '';
    ui.openDialog({
      title: 'Pick Replacement',
      icon: 'edit-3',
      width: 440,
      body: h('div', { class: 'lip__dlg' },
        h('label', { class: 'lip__lbl' }, 'Replacement path or anchor:'),
        h('input', {
          type: 'text', class: 'lip__inp', value: rep, placeholder: 'note.md, #heading or assets/photo.png',
          oninput: (e) => { rep = e.target.value.trim(); },
        })),
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Apply', primary: true,
          onClick: async () => {
            if (!rep) return false;
            await applyReplacement(it, rep);
          },
        },
      ],
    });
  }

  async function applyReplacement(it, replacement) {
    const targetPath = it.from;
    const curEntry = D.getEntry(store.get().documents.activeId);
    const curPath = curEntry && curEntry.doc && curEntry.doc.path;
    const isCur = curPath && (samePath(curPath, absOf(targetPath)) || !targetPath);

    if (!isCur) await jump(it);
    const v = D.editorRun('view');
    if (v) {
      const txt = v.state.doc.toString();
      const updated = replaceLinkInText(txt, it, replacement);
      if (updated !== txt) {
        v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: updated } });
        ui.toast('Replacement applied.');
        refresh();
      }
    }
  }

  function openFixMenu(btn, it) {
    const items = [];
    if (tab === 'unused') {
      items.push(
        { label: 'Show in Folder', icon: 'folder-open', onSelect: () => W.reveal(absOf(it.path)).catch((e) => ui.toast((e && e.message) || 'The folder could not be shown.')) },
        {
          label: 'Delete File', icon: 'trash-2',
          onSelect: async () => {
            if (await new Promise((res) => ui.openDialog({
              title: 'Delete Asset', icon: 'trash-2', width: 400,
              body: `Move ${baseName(it.path)} to trash?`,
              buttons: [{ label: 'Cancel' }, { label: 'Delete', primary: true, onClick: () => res(true) }],
              onClose: () => res(false),
            }))) {
              await W.del([absOf(it.path)]);
              ui.toast(`Deleted ${baseName(it.path)}`);
              refresh();
            }
          },
        },
      );
    } else if (tab === 'external') {
      items.push(
        { label: 'Open in Browser', icon: 'external-link', onSelect: () => window.open(it.url, '_blank', 'noopener') },
        { label: 'Jump to First Reference', icon: 'corner-down-right', onSelect: () => jump({ from: it.sources[0]?.from, line: it.sources[0]?.line, target: it.url }) },
      );
    } else {
      items.push({ label: 'Pick replacement…', icon: 'edit-3', onSelect: () => pickReplacement(it) });
      if (it.reason === 'missing-file') {
        items.push({ label: 'Create missing file', icon: 'file-plus', onSelect: () => createMissing(it) });
      }
      items.push({ label: 'Remove link', icon: 'trash-2', onSelect: () => removeLink(it) });
    }
    ui.openMenu(btn, items);
  }

  function promptCheckAvailability() {
    ui.openDialog({
      title: 'Check Link Availability',
      icon: 'globe',
      width: 440,
      body: h('div', { class: 'lip__dlg' },
        h('p', {}, 'Checking link availability connects to external servers and discloses your IP address to those servers.'),
        h('p', { class: 'lip__sub' }, 'Timeout per link is 5 seconds. You can cancel at any time.')),
      buttons: [
        { label: 'Cancel' },
        {
          label: 'Check Availability', primary: true,
          onClick: () => { startAvailabilityCheck(); },
        },
      ],
    });
  }

  async function startAvailabilityCheck() {
    checkingAvailability = true;
    abortController = new AbortController();
    render();

    const urls = data.externalLinks.map((x) => x.url);
    for (const url of urls) {
      if (abortController.signal.aborted) break;
      availabilityMap.set(url, { checking: true });
      render();
      try {
        const res = await W.index('check-url', { url, timeout: 5000 });
        if (abortController.signal.aborted) break;
        availabilityMap.set(url, { ok: res.ok, status: res.status, statusText: res.statusText });
      } catch (err) {
        if (abortController.signal.aborted) break;
        availabilityMap.set(url, { ok: false, status: 0, statusText: 'Error' });
      }
      render();
    }

    checkingAvailability = false;
    abortController = null;
    render();
  }

  function cancelAvailabilityCheck() {
    if (abortController) abortController.abort();
    checkingAvailability = false;
    render();
  }

  function renderRow(it) {
    if (tab === 'unused') {
      const isAst = it.inAttachmentDir ? 'Unused Attachment' : 'Orphaned Asset';
      return h('div', { class: 'lip__row', onclick: (e) => { if (!e.target.closest('.lip__fix')) jump(it); } },
        h('span', { class: 'lip__badge lip__badge--warn' }, isAst),
        h('div', { class: 'lip__info' },
          h('b', { class: 'lip__tgt' }, it.path),
          h('small', { class: 'lip__loc' }, it.size == null ? '' : humanSize(it.size))),
        h('button', { type: 'button', class: 'lip__fix', title: 'Fix…', onclick: (e) => { e.stopPropagation(); openFixMenu(e.currentTarget, it); } }, 'Fix…'));
    }

    if (tab === 'external') {
      const avail = availabilityMap.get(it.url);
      const bClass = !avail ? '' : avail.checking ? 'lip__badge--warn' : avail.ok ? 'lip__badge--ok' : 'lip__badge--bad';
      const bText = !avail ? null : avail.checking ? 'Checking…' : `${avail.status || ''} ${avail.statusText || ''}`.trim();
      return h('div', { class: 'lip__row', onclick: (e) => { if (!e.target.closest('.lip__fix')) jump({ from: it.sources[0]?.from, line: it.sources[0]?.line, target: it.url }); } },
        bText ? h('span', { class: `lip__badge ${bClass}` }, bText) : null,
        h('div', { class: 'lip__info' },
          h('b', { class: 'lip__tgt', title: it.url }, it.url),
          h('small', { class: 'lip__loc' }, `${it.count}× in ${it.sources.length ? baseName(it.sources[0].from) : ''}`)),
        h('button', { type: 'button', class: 'lip__fix', title: 'Options', onclick: (e) => { e.stopPropagation(); openFixMenu(e.currentTarget, it); } }, icon('more-horizontal')));
    }

    const isMissingAnchor = it.reason === 'missing-anchor';
    const badgeText = isMissingAnchor ? 'Missing Anchor' : tab === 'missing' ? 'Missing Media' : 'Missing File';
    const badgeCls = isMissingAnchor ? 'lip__badge--warn' : 'lip__badge--bad';
    const locText = it.line ? `${baseName(it.from || 'Document')}:${it.line}` : baseName(it.from || 'Document');

    return h('div', { class: 'lip__row', onclick: (e) => { if (!e.target.closest('.lip__fix')) jump(it); } },
      h('span', { class: `lip__badge ${badgeCls}` }, badgeText),
      h('div', { class: 'lip__info' },
        h('b', { class: 'lip__tgt', title: it.target }, it.target),
        h('small', { class: 'lip__loc' }, locText)),
      h('button', { type: 'button', class: 'lip__fix', title: 'Fix…', onclick: (e) => { e.stopPropagation(); openFixMenu(e.currentTarget, it); } }, 'Fix…'));
  }

  function render() {
    for (const e of els.values()) e.replaceChildren(...build());
  }

  function build() {
    const unusedList = [...data.unusedAttachments, ...data.orphanedAssets.filter((a) => !data.unusedAttachments.some((u) => u.path === a.path))];
    const counts = {
      broken: data.brokenLinks.length,
      missing: data.missingFiles.length,
      unused: unusedList.length,
      external: data.externalLinks.length,
    };

    const tabBtn = (id, label) => h('button', {
      type: 'button',
      class: `lip__tab${tab === id ? ' is-active' : ''}`,
      onclick: () => setTab(id),
    }, label, h('span', { class: 'lip__cnt' }, String(counts[id])));

    const scopeBtn = (s, label) => h('button', {
      type: 'button',
      class: `lip__sc-btn${scope === s ? ' is-active' : ''}`,
      onclick: () => setScope(s),
    }, label);

    const items = tab === 'broken' ? data.brokenLinks : tab === 'missing' ? data.missingFiles : tab === 'unused' ? unusedList : data.externalLinks;

    const emptyMsg = loading ? 'Checking link integrity…' : tab === 'broken' ? 'No broken links found.'
      : tab === 'missing' ? 'No missing media files found.'
      : tab === 'unused' ? 'No unused attachments found.'
      : 'No external links found.';

    let toolbar = null;
    if (tab === 'external') {
      toolbar = h('div', { class: 'lip__tb' },
        checkingAvailability
          ? h('button', { type: 'button', class: 'lip__btn lip__btn--cancel', onclick: cancelAvailabilityCheck }, icon('x'), 'Cancel Check')
          : h('button', { type: 'button', class: 'lip__btn', onclick: promptCheckAvailability }, icon('globe'), 'Check Availability'));
    }

    return [
      h('div', { class: 'lip__hdr' },
        h('div', { class: 'lip__scope' }, scopeBtn('document', 'Document'), scopeBtn('workspace', 'Workspace'))),
      h('div', { class: 'lip__tabs' },
        tabBtn('broken', 'Broken Links'),
        tabBtn('missing', 'Missing Files'),
        tabBtn('unused', 'Unused Assets'),
        tabBtn('external', 'External Links')),
      ...(toolbar ? [toolbar] : []), // replaceChildren(null) renders the text "null"
      h('div', { class: 'lip__body' },
        loading
          ? h('div', { class: 'lip__empty' }, icon('refresh-cw'), emptyMsg)
          : items.length
            ? h('div', { class: 'lip__list' }, ...items.map(renderRow))
            : h('div', { class: 'lip__empty' }, icon('shield-check'), emptyMsg)),
    ];
  }

  // Subscribe to document changes to refresh if in document mode
  store.subscribe((s) => s.documents.activeId, () => { if (scope === 'document') refresh(); });

  return {
    render(side = 'left') {
      let el = els.get(side);
      if (!el) {
        els.set(side, el = h('div', { class: 'lip' }));
        el.replaceChildren(...build());
        if (els.size === 1) refresh();
      }
      return el;
    },
    open(activeTab) {
      if (activeTab) tab = activeTab;
      refresh();
    },
    refresh,
  };
}