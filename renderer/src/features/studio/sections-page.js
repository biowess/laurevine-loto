import { h } from '../../ui/kit/dom.js';
import { assignRules, clearRules, matchRules, outlineKeys, sectionBreakInfo } from '../../core/publish/section-rules.js';

const picked = new Set();
const INH = [['inherit', 'Inherit'], ['hide', 'Hide'], ['custom', 'Custom']];
const STYLES = [['none', 'None'], ['cover', 'Cover'], ['abstract', 'Abstract'], ['appendix', 'Appendix']];

// Selection of headings (by key) lives here; the Studio command `studio.sections-select` calls it.
export function selectSections(a) {
  if (a.none) picked.clear();
  else if (a.all) a.all.forEach((k) => picked.add(k));
  else if (picked.has(a.key)) picked.delete(a.key);
  else picked.add(a.key);
}

const tags = (r, prevR) => {
  if (!r) return [];
  const brk = sectionBreakInfo(r, prevR);
  return [
    r.cols !== 'auto' && `${r.cols} col`, r.gap > 0 && `gap ${r.gap}mm`, r.sep !== 'inherit' && `rule ${r.sep}`,
    brk.continuous && r.cols !== 'auto' && 'continuous', !brk.continuous && 'new page',
    r.mOn && 'margins', r.hdr !== 'inherit' && `header ${r.hdr}`, r.ftr !== 'inherit' && `footer ${r.ftr}`,
    r.noToc && 'no TOC', r.noNum && 'no number', r.style !== 'none' && r.style,
  ].filter(Boolean);
};

// Rules live only in ExportConfig.sectionRules; Markdown is read, never written.
export function sectionsPage(c, ed, { fld, chk, seg }) {
  const d = ed.doc(), hs = d ? outlineKeys(d.text) : [], rules = c.sectionRules, { byHead, stale } = matchRules(rules, hs);
  const idx = hs.map((x, i) => i).filter((i) => picked.has(hs[i].key));
  const cur = (idx.length && byHead.get(idx[0])) || {}, v = (k, def) => cur[k] ?? def;
  const prevCur = idx.length && idx[0] > 0 ? byHead.get(idx[0] - 1) : null;
  const brkInfo = idx.length ? sectionBreakInfo(cur, prevCur) : null;
  const go = (patch) => idx.length && ed.patch({ sectionRules: assignRules(rules, hs, byHead, idx, patch) });
  const num = (label, k, min, max, def) => fld(label, h('input', { type: 'number', min, max, step: 1, value: v(k, def), 'aria-label': label, onchange: (e) => go({ [k]: Math.min(max, Math.max(min, Math.round(+e.target.value || 0))) }) }));
  const txt = (label, k) => fld(label, h('input', { type: 'text', value: v(k, ''), maxlength: 200, 'aria-label': label, onchange: (e) => go({ [k]: e.target.value }) }));
  const btn = (label, on, dis) => h('button', { type: 'button', class: 'btn btn--sm', disabled: dis ? true : null, onclick: on }, label);
  const sub = (t) => h('p', { class: 'sub' }, t);

  return [h('h4', {}, 'Sections'),
    sub('Layout rules for parts of the current document. They are stored in this export configuration, never in the Markdown, and follow headings by slug, occurrence and nearby text.'),
    h('div', { class: 'lv-sr-bar' },
      btn('Select all', () => ed.run('studio.sections-select', { all: hs.map((x) => x.key) }), !hs.length), btn('Select none', () => ed.run('studio.sections-select', { none: true }), !idx.length),
      btn('Refresh outline', () => ed.patch({})), btn('Clear rules', () => ed.patch({ sectionRules: clearRules(rules, byHead, idx) }), !idx.some((i) => byHead.has(i)))),
    hs.length ? h('div', { class: 'lv-sr', role: 'group', 'aria-label': 'Document outline' }, ...hs.map((x, i) => h('label', { class: 'lv-sr-row', style: { paddingLeft: `${x.depth * 14}px` } },
      h('input', { type: 'checkbox', checked: picked.has(x.key) ? true : null, 'aria-label': x.text || x.slug, onchange: () => ed.run('studio.sections-select', { key: x.key }) }),
      h('span', { class: 'lv-sr-t' }, x.text || '(empty heading)'), ...tags(byHead.get(i), i > 0 ? byHead.get(i - 1) : null).map((t) => h('em', { class: 'lv-sr-tag' }, t))))) : sub(d ? 'This document has no headings.' : 'Open a document to see its sections.'),
    stale.length ? h('div', { class: 'lv-sr-stale' }, h('h5', {}, `Stale rules (${stale.length})`), sub('No heading matches these rules any more. Remove them or restore the heading.'),
      ...stale.map((r) => h('div', { class: 'lv-sr-srow' }, h('span', {}, r.text || r.slug), h('em', { class: 'lv-sr-tag' }, 'stale'), ...tags(r, null).map((t) => h('em', { class: 'lv-sr-tag' }, t)),
        btn('Remove', () => ed.patch({ sectionRules: rules.filter((o) => o.id !== r.id) }))))) : null,
    h('h5', {}, idx.length ? `Assign to ${idx.length} selected` : 'Assign (select sections first)'),
    h('fieldset', { class: 'lv-colset', disabled: idx.length ? null : true },
      fld('Columns', seg([['auto', 'Inherit'], ['1', '1'], ['2', '2'], ['3', '3']], v('cols', 'auto'), (x) => go({ cols: x }))),
      num('Column gap (mm, 0 = inherit)', 'gap', 0, 40, 0),
      fld('Separator', seg([['inherit', 'Inherit'], ['none', 'None'], ['line', 'Line']], v('sep', 'inherit'), (x) => go({ sep: x }))),
      chk('New page before', v('brBefore', false), (x) => go({ brBefore: x })), chk('New page after', v('brAfter', false), (x) => go({ brAfter: x })),
      chk('Override margins', v('mOn', false), (x) => go({ mOn: x })),
      num('Top (mm)', 'mt', 0, 100, 20), num('Right (mm)', 'mr', 0, 100, 20), num('Bottom (mm)', 'mb', 0, 100, 20), num('Left (mm)', 'ml', 0, 100, 20),
      fld('Header', seg(INH, v('hdr', 'inherit'), (x) => go({ hdr: x }))), v('hdr', 'inherit') === 'custom' ? txt('Header text', 'hdrText') : null,
      fld('Footer', seg(INH, v('ftr', 'inherit'), (x) => go({ ftr: x }))), v('ftr', 'inherit') === 'custom' ? txt('Footer text', 'ftrText') : null,
      chk('Exclude from table of contents', v('noToc', false), (x) => go({ noToc: x })), chk('Exclude from heading numbering', v('noNum', false), (x) => go({ noNum: x })),
      fld('Page style', seg(STYLES, v('style', 'none'), (x) => go({ style: x })))),
    brkInfo && !brkInfo.continuous ? h('p', { class: 'sub lv-sr-note' }, `ℹ Forces a new page: ${brkInfo.reason}.`) : (brkInfo && cur.cols !== 'auto' ? h('p', { class: 'sub lv-sr-note' }, 'ℹ Continuous column switch within page.') : null)];
}
