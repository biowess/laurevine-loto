// Review: `rev.repeated` (Problems, Repeated Words) and `rev.stats` (Writing Statistics dialog; passive/adverb/style numbers are English hints).
import { writingStats, band } from '../../core/proofread/writing-stats.js';
import { findRepeated } from '../../core/proofread/repeated-words.js';
import { docStats, optsFrom, fmtTime } from '../../core/text/stats.js';
import { getSetting } from '../../services/settings-client.js';

const num = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d });

export function register(ctx) {
  const { commands, store, services: { documents: D }, ui: { h, openDialog, toast } } = ctx;
  const entry = () => D.getEntry(store.get().documents.activeId);
  const view = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  const reg = (id, title, icon, run) => commands.register({ id, title, icon, group: 'Review', run, enabled: () => !!entry(), reason: 'Open a document first' });

  reg('rev.repeated', 'Repeated Words', 'repeat', () => commands.execute('problems.group', 'repeated-words'));
  reg('rev.stats', 'Writing Statistics', 'bar-chart-3', () => {
    const v = view(), text = v ? v.state.doc.toString() : entry().doc.text;
    const d = docStats(text, optsFrom(getSetting)), w = writingStats(text), n = (k) => w.style.filter((s) => s.kind === k).length;
    const rows = [
      ['Words', num(d.words)], ['Sentences', num(w.sentences)], ['Paragraphs', num(d.paragraphs)], ['Reading time', fmtTime(d.words, d.wpm)],
      ['Average sentence length', w.sentences ? `${num(w.avg, 1)} words` : '—'],
      ['Flesch reading ease', w.flesch == null ? '—' : `${num(w.flesch)} · ${band(w.flesch)}`],
      ['Flesch–Kincaid grade', w.grade == null ? '—' : num(Math.max(0, w.grade), 1)],
      ['Repeated words', num(findRepeated(text).length)],
    ];
    const hints = [['Passive voice', w.passive.length], ['Adverbs in -ly', w.adverbs.length], ['Long sentences', n('long')], ['Filler words', n('filler')], ['Repeated sentence starts', n('start')]];
    const dlg = openDialog({
      title: 'Writing Statistics', icon: 'bar-chart-3', width: 460,
      body: h('div', {},
        h('table', { class: 'lv-stats' }, h('tbody', {}, ...rows.map(([k, x]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, x))))),
        h('p', { class: 'pw-sec' }, 'Style hints (English, local heuristics — they can be wrong)'),
        h('table', { class: 'lv-stats' }, h('tbody', {}, ...hints.map(([k, x]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, num(x)))))),
        w.longest.length ? h('p', { class: 'pw-sec' }, 'Longest sentences') : '',
        h('ol', { class: 'pw-list' }, ...w.longest.map((s) => h('li', {}, h('button', {
          type: 'button', class: 'pw-go',
          onclick: () => {
            const e = view();
            if (!e) return toast('Open the document in Source or Split mode.');
            dlg.close();
            const len = e.state.doc.length, a = Math.min(s.from, len);
            e.dispatch({ selection: { anchor: a, head: Math.min(s.to, len) }, effects: e.constructor.scrollIntoView(a, { x: 'center', y: 'center' }) });
            e.focus();
          },
        }, `${s.words} words · ${text.slice(s.from, s.to).replace(/\s+/g, ' ').slice(0, 80)}…`)))),
        h('p', { class: 'lv-stats-note' }, 'Readability uses English syllable estimates. Turn on Problems → Problem Rules → Style Hints to see hints in the editor.')),
      buttons: [{ label: 'Close', primary: true }],
    });
  });
}
