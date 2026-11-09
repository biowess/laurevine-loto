// Opt-in online grammar check (LanguageTool-compatible endpoint): disclosure + confirmation before enabling, only the paragraph at the caret is sent
// (masked: code, frontmatter, headings, tables, URLs blanked), per-document opt-out, findings appear in Problems. Nothing runs while the setting is off.
import { paragraphRange } from '../../core/writing/focus-range.js';
import { mask } from '../../core/proofread/prose.js';
import { toFindings } from '../../core/grammar/map.js';
import { parseEndpoint, GRAMMAR_LIMIT } from '../../../../shared/grammar.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { checkText, cancelCheck, setGrammarState, setFindings, getFindings, clearFindings } from '../../services/grammar-client.js';

export function register(ctx) {
  const { commands, store, services: { documents: D }, ui: { h, openDialog, toast } } = ctx;
  const tab = () => { const s = store.get().documents; return s.tabs.find((t) => t.id === s.activeId); };
  const view = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  const on = () => getSetting('grammar.enabled') === true;
  const outs = () => { try { const a = JSON.parse(getSetting('grammar.optOut')); return Array.isArray(a) ? a : []; } catch { return []; } };
  const mem = new Set();
  const opted = (t) => (t.path ? outs().includes(t.path) : mem.has(t.id));
  const put = (k, v) => Promise.resolve(setSetting(k, v)).catch(() => toast('Could not save the setting.'));
  const refresh = () => { if (commands.canRun('problems.refresh')) commands.execute('problems.refresh'); };
  let timer = 0, token = 0, sent = '', was = on(), warned = false;

  const status = () => { const t = tab(), u = parseEndpoint(getSetting('grammar.url')); setGrammarState({ enabled: on(), active: on() && !!t && !opted(t), host: u ? u.host : '' }); };
  const stop = () => { clearTimeout(timer); token++; sent = ''; cancelCheck().catch(() => {}); };
  const soon = () => { clearTimeout(timer); const t = tab(); if (on() && t && !opted(t)) timer = setTimeout(check, 1500); };

  async function check() {
    const t = tab(), v = view();
    if (!t || !v || !on() || opted(t) || !parseEndpoint(getSetting('grammar.url'))) return;
    const doc = v.state.doc, full = doc.toString();
    if (full.length > 500000) return;
    const [a, b] = paragraphRange(doc, v.state.selection.main.head), orig = full.slice(a, b), text = mask(full).slice(a, b).replace(/[\u0001\u0002]/g, ' ');
    if (text.trim().split(/\s+/).length < 3 || text.length > GRAMMAR_LIMIT || text === sent) return;
    sent = text;
    const my = ++token;
    let r;
    try { r = await checkText(text); } catch { r = { ok: false, error: { code: 'E_NET', message: 'The grammar service could not be reached.' } }; }
    if (my !== token) return;
    if (!r.ok) {
      if (r.error.code === 'E_CANCEL') return;
      sent = '';
      setGrammarState({ error: r.error.message });
      if (!warned) { warned = true; toast(r.error.message); }
      return;
    }
    setGrammarState({ error: '' });
    setFindings(t.id, [...getFindings(t.id).filter((f) => f.range.to <= a || f.range.from >= b), ...toFindings(r.matches, a, text, orig)]);
    refresh();
  }

  function enable() {
    const u = parseEndpoint(getSetting('grammar.url'));
    if (!u) { toast('Set a valid grammar endpoint (https, or http on this computer) first.'); return commands.execute('prefs.goto', { page: 'privacy' }); }
    openDialog({
      title: 'Send text to a grammar service?', icon: 'pen-line', width: 460,
      body: [
        h('p', {}, `Text of the checked paragraph is sent to ${u.host}; local checks send nothing.`),
        h('p', {}, 'Only the paragraph at the cursor is sent, shortly after you stop typing; code, frontmatter, headings, tables and URLs are blanked first. You can exclude single documents or turn this off at any time.'),
      ],
      buttons: [{ label: 'Cancel' }, { label: `Send text to ${u.host}`, primary: true, onClick: () => { put('grammar.enabled', true); } }],
    });
  }

  function toggleOpt() {
    const t = tab();
    if (!t) return;
    const now = !opted(t);
    if (!t.path) { if (now) mem.add(t.id); else mem.delete(t.id); } else { const a = outs().filter((p) => p !== t.path); if (now) a.push(t.path); put('grammar.optOut', JSON.stringify(a.slice(-200))); }
    if (now) { stop(); setFindings(t.id, []); refresh(); } else soon();
    status();
    commands.invalidate('grammar.doc-opt-out');
  }

  commands.register({ id: 'rev.grammar', title: 'Online Grammar Check', icon: 'pen-line', group: 'Review', checked: on, run: () => (on() ? put('grammar.enabled', false) : enable()) });
  commands.register({
    id: 'grammar.doc-opt-out', title: 'Exclude Document from Grammar Check', icon: 'pen-line', group: 'Review', checked: () => { const t = tab(); return !!t && opted(t); },
    enabled: () => !!tab() && on(), reason: 'Needs an open document and the online grammar check turned on', run: toggleOpt,
  });
  commands.register({ id: 'grammar.check', title: 'Check Paragraph with Online Grammar Check', icon: 'pen-line', group: 'Review', enabled: () => on() && !!view(), reason: 'Turn on the online grammar check first', run: () => { sent = ''; check(); } });

  D.onDocChange(soon);
  store.subscribe((s) => s.documents.activeId, () => { stop(); status(); soon(); commands.invalidate('grammar.doc-opt-out'); });
  subscribeSettings(() => {
    const n = on();
    status();
    commands.invalidate('rev.grammar'); commands.invalidate('grammar.doc-opt-out'); commands.invalidate('grammar.check');
    if (was && !n) { stop(); clearFindings(); refresh(); warned = false; setGrammarState({ error: '' }); } else if (n && !was) soon();
    was = n;
  });
  status();
}
