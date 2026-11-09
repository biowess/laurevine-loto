import { h } from '../../ui/kit/dom.js';
import { paginationRules } from './pagination-page.js';

const POS = [['above', 'Above'], ['below', 'Below']];
const DEPTH = ['1', '2', '3', '4', '5', '6'].map((v) => [v, `H1–H${v}`]);
const TOC_POS = [['after-cover', 'After cover'], ['start', 'At start'], ['none', 'None']];
const LEADER = [['dots', 'Dots'], ['line', 'Line'], ['none', 'None']];
const WEIGHTS = [['0', 'Template'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold']];
let curLvl = '1';

// kit = { fld, sel, range, chk, seg } from pages.js; every edit runs `studio.set` via ed.patch (structure only; Markdown is never edited).
export function structurePage(c, ed, { fld, sel, range, chk, seg }) {
  const s = c.structure, p = (v) => ed.patch({ structure: v });
  const txt = (label, key) => fld(label, h('input', { type: 'text', value: s[key], 'aria-label': label, onchange: (e) => p({ [key]: e.target.value }) }));
  const flag = (label, key) => chk(label, s[key], (v) => p({ [key]: v }));
  const help = (t) => h('p', { class: 'sub' }, t);
  const lvlKey = `l${curLvl}`, lvl = (s.tocLevels && s.tocLevels[lvlKey]) || {};
  const setLvl = (patch) => p({ tocLevels: { ...s.tocLevels, [lvlKey]: { ...lvl, ...patch } } });

  return [h('h4', {}, 'Structure'),
    h('h5', {}, 'Table of contents'),
    fld('Placement', seg(TOC_POS, s.tocPlacement || (s.toc ? 'after-cover' : 'none'), (v) => p({ tocPlacement: v, toc: v !== 'none' }))),
    txt('Title', 'tocTitle'),
    fld('Depth', sel(DEPTH, String(s.tocDepth), (v) => p({ tocDepth: +v }))),
    flag('Hierarchical indentation', 'tocIndent'),
    fld('Leader style', seg(LEADER, s.tocLeader || 'dots', (v) => p({ tocLeader: v }))),
    flag('Show page numbers', 'tocPageNumbers'),
    flag('Clickable links', 'tocLinks'),
    fld('Level typography', sel(DEPTH.map(([v]) => [v, `Level H${v}`]), curLvl, (v) => { curLvl = v; ed.patch({}); })),
    fld('Weight', sel(WEIGHTS, String(lvl.weight || 0), (v) => setLvl({ weight: +v }))),
    fld('Italic', seg([['auto', 'Auto'], ['italic', 'Italic'], ['normal', 'Upright']], lvl.italic || 'auto', (v) => setLvl({ italic: v }))),
    fld('Size (em)', ...(range ? range(0.5, 2.5, 0.05, lvl.size || 1, (v) => setLvl({ size: v })) : [])),
    h('h5', {}, 'Heading numbering'),
    flag('Number headings', 'numberHeadings'),
    fld('Scheme', seg([['1.1.1', '1.1.1'], ['I.A.1', 'I.A.1']], s.numberScheme, (v) => p({ numberScheme: v }))),
    fld('Number down to', sel(DEPTH, String(s.numberDepth), (v) => p({ numberDepth: +v }))),
    fld('Restart', seg([['parent', 'At each higher heading'], ['document', 'Also per document']], s.numberRestart, (v) => p({ numberRestart: v }))),
    flag('Skip the document title (a lone H1)', 'skipTitle'),
    flag('Skip front matter (Abstract, Preface, Contents…)', 'skipFront'),
    help('Add {-} at the end of a heading, or <!-- laurevine:nonumber --> on it, to leave it unnumbered.'),
    h('h5', {}, 'Figure and table captions'),
    flag('Number captions automatically', 'captions'),
    txt('Figure label', 'figureLabel'), txt('Table label', 'tableLabel'), txt('Separator', 'captionSep'),
    fld('Figure caption', seg(POS, s.figurePos, (v) => p({ figurePos: v }))),
    fld('Table caption', seg(POS, s.tablePos, (v) => p({ tablePos: v }))),
    fld('Numbering', seg([['continuous', '1, 2, 3'], ['chapter', 'By chapter (2.1)']], s.captionNumbering, (v) => p({ captionNumbering: v }))),
    flag('List of figures', 'lof'), txt('List of figures title', 'lofTitle'),
    flag('List of tables', 'lot'), txt('List of tables title', 'lotTitle'),
    help('Figures: an image with a title (![alt](pic.png "Caption")) or one followed by an italic-only line. Tables: an italic-only line or a “Table: …” line directly before or after the table.'),
    flag('Renumber cross-references at export', 'crossrefs'),
    help('A link such as [Figure 1](#fig-intro) shows the final number of the target with that anchor, e.g. <a id="fig-intro"></a> above the image or table.'),
    h('h5', {}, 'Page breaks'),
    flag('Honour the page-break directive', 'pageBreakDirective'),
    flag('Start every H1 on a new page', 'breakBeforeH1'),
    flag('Start each document on a new page', 'breakBetweenDocs'),
    flag('Avoid blank pages', 'avoidBlank'),
    help('Directive: <!-- laurevine:pagebreak -->. Avoiding blank pages drops breaks at the start or end of a document, repeated breaks and breaks before a heading that already starts a page.'),
    ...paginationRules(c, ed, { fld, sel, chk }, 'structure')];
}
