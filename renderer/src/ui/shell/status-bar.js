import { h, $ } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { store } from '../../state/store.js';
import { getEntry } from '../../services/documents.js';
import { execute } from '../../commands/registry.js';
import { counts, onProblems } from '../../services/problems.js';
import { describeSave } from '../../core/documents/save-state.js';
import { grammarState, onGrammar } from '../../services/grammar-client.js';

const MODES = { source: 'Source', preview: 'Live Preview', split: 'Split', previewLeft: 'Preview Left', previewRight: 'Preview Right', focus: 'Focus' };
const SAMPLE = { ln: 1, col: 1, sel: 0, words: 0, chars: 0 };
const n = (v) => Number(v).toLocaleString('en-US');

const PROB = [['error', 'errors'], ['warning', 'warnings'], ['info', 'info']];
const problemStats = () => PROB.map(([k, t]) => h('span', {
  class: 'lv-stat', role: 'button', tabindex: '0', title: `Show ${t} in Problems`, 'aria-label': `${counts()[k]} ${t}`, onclick: () => execute('problems.show', k),
  onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); execute('problems.show', k); } },
}, h('b', {}, n(counts()[k])), ` ${t}`));

const grammarBadge = () => {
  const g = grammarState(), go = () => execute('grammar.doc-opt-out');
  if (!g.enabled) return [];
  const tip = g.active ? `Online grammar check is on: the paragraph you edit is sent to ${g.host}. Click to exclude this document.` : 'Online grammar check is paused for this document. Click to include it.';
  return [h('span', {
    class: 'lv-stat', role: 'button', tabindex: '0', dataset: { s: 'grammar' }, title: g.error ? `${tip} ${g.error}` : tip, onclick: go,
    onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } },
  }, g.active ? `Grammar → ${g.host}` : 'Grammar: paused', g.error ? icon('triangle-alert', 'ic--chev') : null)];
};

// metrics(): { ln, col, words, chars }; the editor part supplies the real one.
export function mountStatusBar(el = $('#status'), { metrics = () => SAMPLE } = {}) {
  const draw = () => {
    const { ui, documents } = store.get(), m = metrics() || SAMPLE, sw = m.selWords != null;
    const stat = (...k) => h('span', { class: 'lv-stat', role: 'button', tabindex: '0', title: 'Statistics', onclick: () => execute('doc.stats'), onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); execute('doc.stats'); } } }, ...k);
    const t = documents.tabs.find((x) => x.id === documents.activeId);
    const d = t && getEntry(t.id)?.doc, dirty = !!(t && t.dirty), wk = store.get().workspace;
    el.replaceChildren(...[
      h('span', {}, 'Ln ', h('b', {}, n(m.ln)), ', Col ', h('b', {}, n(m.col))),
      m.sel ? h('span', {}, h('b', {}, n(m.sel)), ' selected') : null,
      stat(h('b', {}, n(sw ? m.selWords : m.words)), sw ? ' words selected' : ' words'),
      stat(`${n(sw ? m.selChars : m.chars)} characters`),
      ...(t ? [...problemStats(), ...grammarBadge()] : []),
      h('span', { class: 'sp' }),
      wk.name ? h('span', { class: 'lv-sp-path', title: wk.root }, wk.name) : null,
      t && t.path ? h('span', { class: 'lv-sp-path' }, t.path) : null,
      h('span', { class: 'lv-sp-meta' }, 'CommonMark + GFM'),
      h('span', { class: 'lv-sp-meta' }, d ? `${String(d.encoding).toUpperCase()} · ${String(d.eol).toUpperCase()}` : null),
      h('span', { 'data-s': 'mode' }, MODES[ui.mode] || ui.mode),
      t ? (() => { const s = describeSave(t); return h('span', { class: 'md-ok', title: s.tip, dataset: { state: s.state } }, h('i', { 'aria-hidden': 'true' }), s.label); })() : null,
    ].filter(Boolean));
  };
  const offs = [store.subscribe((s) => s.ui.mode, draw), store.subscribe((s) => s.documents, draw), store.subscribe((s) => s.workspace.name, draw), onProblems(draw), onGrammar(draw)];
  draw();
  return { refresh: draw, dispose: () => offs.forEach((f) => f()) };
}
