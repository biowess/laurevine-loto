// Statistics: doc.stats opens the dialog (document and selection columns); the status bar shares the same core.
import { docStats, selStats, optsFrom, fmtTime } from '../../core/text/stats.js';
import { getSetting } from '../../services/settings-client.js';

const num = (n) => Number(n).toLocaleString('en-US');
export const ROWS = [
  ['Words', (s) => num(s.words)], ['Characters', (s) => num(s.chars)], ['Characters (no spaces)', (s) => num(s.charsNoSpaces)],
  ['Paragraphs', (s) => num(s.paragraphs)], ['Headings', (s) => num(s.headings)],
  ['Reading time', (s) => fmtTime(s.words, s.wpm)], ['Speaking time', (s) => fmtTime(s.words, 130)],
];

export function register(ctx) {
  const { commands, store, services: { documents }, ui } = ctx;
  const { h } = ui;
  commands.register({
    id: 'doc.stats', title: 'Word Count', icon: 'text', group: 'Statistics', reason: 'Open a document first',
    enabled: () => !!documents.getEntry(store.get().documents.activeId),
    run: () => {
      const view = documents.editorRun('view'), st = view && view.state;
      const text = st ? st.doc.toString() : documents.getEntry(store.get().documents.activeId).doc.text;
      const parts = st ? st.selection.ranges.filter((r) => !r.empty).map((r) => st.sliceDoc(r.from, r.to)) : [];
      const o = optsFrom(getSetting), d = docStats(text, o), s = parts.length ? selStats(parts, o) : null;
      const note = [`Reading ${o.wpm} wpm · speaking 130 wpm`, o.noFront && 'frontmatter excluded', o.noCode && 'code blocks excluded'].filter(Boolean).join(' · ');
      ui.openDialog({
        title: 'Statistics', icon: 'bar-chart-3', width: 440,
        body: h('div', {},
          h('table', { class: 'lv-stats' },
            h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Document'), h('th', {}, 'Selection'))),
            h('tbody', {}, ...ROWS.map(([k, f]) => h('tr', {}, h('th', { scope: 'row' }, k), h('td', {}, f(d)), h('td', {}, s ? f(s) : '—'))))),
          h('p', { class: 'lv-stats-note' }, note)),
        buttons: [{ label: 'Close', primary: true }],
      });
    },
  });
}
