import { h } from '../../kit/dom.js';
import { icon } from '../../kit/icons.js';
import { openDialog } from '../../kit/dialog.js';
import { register } from '../../../commands/registry.js';
import { runCommand } from '../../shell/panels.js';
import { store } from '../../../state/store.js';
import { uiActions } from '../../../state/slices/ui.js';
import { getSetting, setSetting } from '../../../services/settings-client.js';
import * as client from '../../../services/migration-client.js';
import { STRATEGIES, strategyReady } from '../../../core/migration/wizard.js';
import { needsKnowledge, suggestSettings } from '../../../core/migration/convert.js';
import { card } from '../page-kit.js';

const num = (n) => Number(n || 0).toLocaleString('en-US');
const msg = (e) => String((e && e.message) || e || 'Something went wrong.');
const ask = (title, text, label) => new Promise((resolve) => {
  let ok = false;
  openDialog({ title, icon: 'circle-help', width: 440, body: text, buttons: [{ label: 'Not Now' }, { label, primary: true, onClick: () => { ok = true; } }], onClose: () => resolve(ok) });
});

export function createApply({ get, set, go, btn, line }) {
  let prog = null;
  const R = (id, title, ic, run, extra) => register({ id, title, icon: ic, group: 'Migration', run, ...extra });
  const wikiCount = () => { const l = get().report.links; return l.wiki + l.embeds; };
  const choose = (strategy) => set({ strategy, dest: null, convert: false, result: null, tx: null, error: '', notice: '' });

  async function pickDestination() {
    try {
      const r = await client.pickDest(get().strategy === 'new-workspace' ? 'new' : 'copy');
      if (r.canceled) return;
      set({ dest: r, result: null, tx: null, error: r.empty || get().strategy !== 'new-workspace' ? '' : 'A new workspace needs an empty folder. Choose another one.' });
    } catch (e) { set({ error: msg(e) }); }
  }

  async function runApply() {
    const s = get();
    if (!strategyReady(s) || s.applying) return;
    if (s.strategy === 'in-place' || s.result) return go(5);
    set({ applying: true, error: '', notice: '' });
    let off = null;
    try {
      off = client.onCopyProgress((p) => { if (prog && prog.isConnected) prog.textContent = `${num(p.done)} of ${num(p.total)} files copied`; });
      const r = await client.copy({ source: s.source.path, dest: s.dest.path, mode: s.strategy === 'copy' ? 'copy' : 'new', convert: s.convert, name: s.source.name.replace(/\.zip$/i, '') });
      if (r.canceled) set({ applying: false, notice: 'The import was canceled. Nothing was kept.' });
      else set({ applying: false, result: r, tx: r.tx ? { ...r.tx, state: 'previewed' } : null, step: 5, error: '', notice: '' });
    } catch (e) { set({ applying: false, error: msg(e) }); } finally { if (off) { try { off(); } catch { /* already closed */ } } }
  }

  async function convertCopy(undo) {
    const s = get();
    try {
      const r = await (undo ? client.revert : client.convert)(s.result.root);
      set({ tx: { ...s.tx, state: undo ? 'undone' : 'applied' }, error: '', notice: `${undo ? 'Restored' : 'Converted'} ${num(r.done)} documents${r.skipped || r.failed ? `; ${num(r.skipped + r.failed)} skipped because they changed or could not be written` : ''}.` });
    } catch (e) { set({ error: msg(e) }); }
  }

  async function applySettings() {
    try { for (const [k, v] of suggestSettings(get().report)) await setSetting(k, v); set({ notice: 'Suggested settings applied.', error: '' }); } catch (e) { set({ error: msg(e) }); }
  }

  async function openFinal() {
    const s = get(), root = s.result ? s.result.root : s.source.path;
    const r = await runCommand('workspace.open', root);
    if (!r || !r.ok) return;
    store.dispatch(uiActions.panel('left', { view: 'files', open: true }));
    store.dispatch(uiActions.backstage(false));
    if (needsKnowledge(s.report) && getSetting('markdown.defaultProfile') !== 'knowledge'
      && await ask('Enable the Knowledge Profile?', 'This workspace uses wiki-links or callouts, which the Knowledge profile renders. You can change the profile any time in Preferences.', 'Enable Knowledge Profile')) {
      try { await setSetting('markdown.defaultProfile', 'knowledge'); } catch { /* the setting stays as it was */ }
    }
  }

  const at = (n) => () => get().step === n;
  R('migration.in-place', 'Open in Place', 'folder-input', () => choose('in-place'), { enabled: () => get().step === 3 && !!get().source && get().source.kind === 'folder' });
  R('migration.copy', 'Import as Copy', 'copy', () => choose('copy'), { enabled: at(3) });
  R('migration.new-workspace', 'Create a New Workspace', 'folder-plus', () => choose('new-workspace'), { enabled: at(3) });
  R('migration.pick-dest', 'Choose Migration Destination', 'folder-search', pickDestination, { enabled: () => get().step === 3 && ['copy', 'new-workspace'].includes(get().strategy) });
  R('migration.toggle-convert', 'Convert Wiki-links in the Copy', 'link', () => set({ convert: !get().convert, result: null, tx: null }), { enabled: () => get().step === 4 && get().strategy !== 'in-place' && !!get().report && wikiCount() > 0, checked: () => get().convert });
  R('migration.cancel-import', 'Cancel Import', 'x', () => client.cancelScan().catch(() => {}), { enabled: () => get().applying });
  R('migration.apply-conversion', 'Apply Link Conversion to the Copy', 'check', () => convertCopy(false), { enabled: () => !!get().tx && get().tx.state !== 'applied' && get().tx.state !== 'undone' });
  R('migration.undo-conversion', 'Undo Link Conversion', 'undo-2', () => convertCopy(true), { enabled: () => !!get().tx && get().tx.state === 'applied' });
  R('migration.apply-settings', 'Apply Suggested Workspace Settings', 'settings', applySettings, { enabled: () => get().step === 5 && !!get().report && suggestSettings(get().report).length > 0 });
  R('migration.open-workspace', 'Open Imported Workspace', 'folder-open', openFinal, { enabled: () => get().step === 5 });

  function strategyStep() {
    const s = get();
    const bad = s.strategy === 'in-place' && s.source.kind === 'zip' ? 'A ZIP archive cannot be opened in place. Choose Import as Copy.' : '';
    return [
      h('p', {}, 'Choose how the notes are brought in. Your originals are never rewritten.'),
      h('div', { class: 'lv-mig__opts', role: 'group', 'aria-label': 'Strategy' }, STRATEGIES.map(([id, title, desc, cmd]) => card(title, desc, cmd, null, s.strategy === id))),
      s.strategy === 'copy' || s.strategy === 'new-workspace' ? h('div', { class: 'lv-mig__dest' }, btn('migration.pick-dest', s.dest ? 'Change Destination…' : 'Choose Destination…', 'folder-search'), s.dest ? h('small', {}, s.dest.path) : h('small', {}, s.strategy === 'copy' ? 'The copy goes into a new subfolder of the folder you choose.' : 'Choose an empty folder.')) : null,
      line('is-error', bad || s.error), line('', s.notice),
    ];
  }

  function reviewStep() {
    const s = get(), t = s.report.totals, l = s.report.links, ip = s.strategy === 'in-place';
    const label = STRATEGIES.find((x) => x[0] === s.strategy)[1];
    const rows = [['Source', s.source.path], ['Strategy', label], ['Destination', ip ? 'The source folder itself' : s.dest.path],
      ['Files Copied', ip ? 'None' : `${num(t.documents)} documents, ${num(t.attachments)} attachments (relative paths kept)`],
      ['Files Written', ip ? 'None' : 'Destination folder only, plus an operation log'],
      ['Source Files Modified', 'None']];
    if (!ip) rows.push(['Files Not Copied', `${num(t.other + t.canvas + t.config)} other files (settings, canvases, plugins); nothing is run`]);
    const out = [h('p', { class: 'lv-mig__note' }, icon('shield-check'), ip ? 'Open in Place reads the source folder where it is. Nothing is copied, converted or written.' : 'Your source is read-only during import. Every file is copied or written in the destination only.'),
      h('dl', { class: 'lv-mig__sum' }, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]))];
    if (!ip && wikiCount() > 0) {
      out.push(h('p', {}, `${num(l.wiki)} wiki-links and ${num(l.embeds)} embeds in ${num(s.report.wikiDocuments)} documents can be converted to relative links in the copy. Embedded notes and unresolved links stay as they are.`),
        h('button', { type: 'button', class: 'btn lv-mig__toggle', dataset: { cmd: 'migration.toggle-convert' }, 'aria-pressed': String(s.convert), onclick: () => runCommand('migration.toggle-convert') }, 'Prepare link conversion for the copy'),
        h('p', { class: 'sub' }, 'The exact changes are previewed after the copy exists; you apply them there and can undo them. The source is never touched.'));
    }
    if (s.applying) { prog = h('p', { class: 'lv-mig__msg' }, 'Starting…'); out.push(h('progress', { 'aria-label': 'Import in progress' }), prog, h('div', { class: 'md-cta' }, btn('migration.cancel-import', 'Cancel Import', 'x'))); }
    out.push(line('is-error', s.error), line('', s.notice));
    return out;
  }

  function finalStep() {
    const s = get(), r = s.result, tx = s.tx, out = [];
    out.push(h('p', {}, r ? `The copy is ready in ${r.root}. ${num(r.copied)} files copied, ${num(r.skipped)} skipped. Operation log: ${r.logFile}.` : `${s.source.path} will be opened where it is. Nothing is copied or written.`));
    if (r && r.log.length) out.push(h('details', {}, h('summary', {}, `Operation Log (${num(r.logTotal)} entries)`), h('ul', { class: 'lv-mig__log' }, r.log.slice(0, 200).map((e) => h('li', {}, `${e.op}: ${e.path || ''}${e.reason ? ` (${e.reason})` : ''}`)))));
    if (tx) {
      out.push(h('h4', {}, `Link Conversion: ${tx.state[0].toUpperCase()}${tx.state.slice(1)}`), h('p', {}, `${num(tx.links)} links in ${num(tx.files)} documents, applied to the copy only.`),
        ...tx.samples.slice(0, 3).flatMap((f) => f.examples.slice(0, 2).map((e) => h('p', { class: 'lv-mig__diff' }, `${f.path}:${e.line} `, h('del', {}, e.from), ' → ', h('ins', {}, e.to)))),
        h('div', { class: 'md-cta' }, btn('migration.apply-conversion', 'Apply Conversion', 'check'), btn('migration.undo-conversion', 'Undo Conversion', 'undo-2')));
    }
    const sug = s.strategy === 'new-workspace' ? suggestSettings(s.report) : [];
    if (sug.length) out.push(h('h4', {}, 'Suggested Settings'), h('ul', {}, sug.map((x) => h('li', {}, x[2]))), h('div', { class: 'md-cta' }, btn('migration.apply-settings', 'Apply Suggested Settings', 'settings')));
    if (needsKnowledge(s.report)) out.push(h('p', { class: 'sub' }, 'Wiki-links or callouts were found: you will be asked whether to enable the Knowledge profile when the workspace opens.'));
    out.push(line('is-error', s.error), line('', s.notice), h('div', { class: 'md-cta' }, btn('migration.open-workspace', 'Open Workspace', 'folder-open', { primary: true })));
    return out;
  }

  return { strategyStep, reviewStep, finalStep, runApply };
}
