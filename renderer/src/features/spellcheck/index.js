// Spellcheck: Chromium checks the source editor; main supplies suggestions, languages and the custom dictionary over IPC.
import * as S from '../../services/spell-client.js';
import { on } from '../../services/ipc.js';
import { getSetting, setSetting, subscribeSettings } from '../../services/settings-client.js';
import { spellIgnore } from '../../ui/editor/spell-skip.js';
import { openMenu } from '../../ui/kit/menu.js';
import { h } from '../../ui/kit/dom.js';
import { openDialog } from '../../ui/kit/dialog.js';
import { CH } from '../../../../shared/channels.js';

const WORD = /[\p{L}\p{M}\p{N}'’]+/gu;
const DN = (() => { try { return new Intl.DisplayNames(undefined, { type: 'language', languageDisplay: 'dialect' }); } catch { return null; } })();
const nameOf = (c) => { try { return (DN && DN.of(c)) || c; } catch { return c; } };
const saved = () => { try { const a = JSON.parse(getSetting('editor.spellWords')); return Array.isArray(a) ? a.filter((w) => typeof w === 'string') : []; } catch { return []; } };
const keep = (list) => Promise.resolve(setSetting('editor.spellWords', JSON.stringify([...new Set(list)].sort().slice(0, 500))));
const addWord = async (w) => { await S.addWord(w); await keep([...saved(), w]); };
const dropWord = async (w) => { await S.removeWord(w); await keep(saved().filter((x) => x !== w)); };
const allWords = async () => [...new Set([...saved(), ...(await S.words())])].sort((a, b) => a.localeCompare(b));
const anchorOf = (id) => document.querySelector(`[data-cmd="${id}"]`) || { x: 120, y: 120 };

export function register(ctx) {
  const { commands, ui: { toast }, services: { documents: D } } = ctx;
  const view = () => { const v = D.editorRun('view'); return v && v.dom.offsetParent ? v : null; };
  let at = null;
  document.addEventListener('contextmenu', (e) => { at = { x: e.clientX, y: e.clientY, t: Date.now(), src: !!(e.target.closest && e.target.closest('.cm-editor')) }; }, true);

  function replace(v, x, y, word, to) {
    const pos = v.posAtCoords({ x, y });
    if (pos == null) return;
    const line = v.state.doc.lineAt(pos), off = pos - line.from;
    let best = null, dist = Infinity;
    for (const m of line.text.matchAll(WORD)) {
      const t = m[0].replace(/^['’]+|['’]+$/g, ''), from = m.index + m[0].indexOf(t), to2 = from + t.length;
      const d = off < from ? from - off : off > to2 ? off - to2 : 0;
      if (t === word && d < dist) { best = from; dist = d; }
    }
    if (best == null) return;
    v.dispatch({ changes: { from: line.from + best, to: line.from + best + word.length, insert: to }, userEvent: 'input.spell' });
    v.focus();
  }

  commands.register({ id: 'spell.replace', title: 'Replace Misspelling', group: 'Review', run: (a) => { const v = a && view(); if (v) replace(v, a.x, a.y, a.word, a.to); } });
  commands.register({
    id: 'spell.add-word', title: 'Add to Dictionary', icon: 'book-plus', group: 'Review',
    run: async (word) => { if (typeof word !== 'string') return; await addWord(word); toast(`Added “${word}” to the dictionary`); },
  });
  commands.register({
    id: 'spell.ignore', title: 'Ignore Word', icon: 'eye-off', group: 'Review',
    run: (word) => { if (typeof word !== 'string') return; spellIgnore.words.add(word); spellIgnore.ver++; const v = view(); if (v) v.dispatch({}); },
  });

  on(CH.SPELL_CONTEXT, ({ word, suggestions }) => {
    const v = view();
    if (!v || !at || !at.src || Date.now() - at.t > 2000) return;
    const { x, y } = at, run = (id, arg) => () => commands.execute(id, arg);
    openMenu({ x, y, restore: v.contentDOM }, [
      ...(suggestions.length ? suggestions.map((to) => ({ label: to, onSelect: run('spell.replace', { word, to, x, y }) })) : [{ label: 'No suggestions', disabled: true }]),
      '-',
      { label: 'Add to Dictionary', icon: 'book-plus', onSelect: run('spell.add-word', word) },
      { label: 'Ignore', icon: 'eye-off', onSelect: run('spell.ignore', word) },
    ]);
  });

  commands.register({
    id: 'rev.spellcheck', title: 'Spellcheck', icon: 'spell-check', group: 'Review', shortcut: 'F7',
    checked: () => getSetting('editor.spellcheck') === true,
    run: () => setSetting('editor.spellcheck', !getSetting('editor.spellcheck')),
  });
  subscribeSettings(() => commands.invalidate('rev.spellcheck'));

  commands.register({
    id: 'rev.lang-set', title: 'Spellcheck Language', icon: 'languages', group: 'Review',
    run: async (code) => {
      if (typeof code !== 'string') return;
      const r = await S.setLanguage(code);
      if (!r.applied) return toast('That language is not available');
      await setSetting('editor.spellLanguage', code);
    },
  });
  commands.register({
    id: 'rev.language', title: 'Language', icon: 'languages', group: 'Review',
    run: async () => {
      const { available, current } = await S.languages();
      const items = available.map((c) => ({ label: nameOf(c), hint: c, checked: current.includes(c), onSelect: () => commands.execute('rev.lang-set', c) }))
        .sort((a, b) => a.label.localeCompare(b.label));
      openMenu(anchorOf('rev.language'), items.length ? items : [{ label: 'This system uses its own spellchecker language', disabled: true }]);
    },
  });
  commands.register({
    id: 'rev.dictionary', title: 'Custom Dictionary', icon: 'book-a', group: 'Review',
    run: async () => {
      let words = await allWords(), q = '';
      const v = view(), sel = v ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to).trim() : '';
      const inp = h('input', { type: 'text', class: 'input', 'aria-label': 'New word', placeholder: 'Add a word', maxlength: '100', spellcheck: 'false' });
      const flt = h('input', { type: 'search', class: 'input', 'aria-label': 'Filter words', placeholder: 'Filter words' });
      const err = h('div', { class: 'lv-pf__err', role: 'alert' }), note = h('p', { class: 'dict__n', 'aria-live': 'polite' }), list = h('ul', { class: 'dict__list', 'aria-label': 'Dictionary words' });
      if (/^\S{1,100}$/.test(sel)) inp.value = sel;
      const paint = () => {
        const f = q.toLowerCase(), shown = words.filter((w) => w.toLowerCase().includes(f));
        note.textContent = !words.length ? 'The dictionary is empty. Words you add are kept between sessions.' : `${shown.length} of ${words.length} word${words.length === 1 ? '' : 's'}`;
        list.replaceChildren(...shown.map((w) => h('li', {}, h('span', {}, w), h('button', {
          type: 'button', class: 'btn', 'aria-label': `Remove ${w}`,
          onclick: async () => { try { await dropWord(w); } catch { return void (err.textContent = 'Could not remove the word.'); } err.textContent = ''; words = words.filter((x) => x !== w); paint(); },
        }, 'Remove'))));
      };
      const add = async () => {
        const w = inp.value.trim();
        if (!w) return;
        if (/\s/.test(w) || w.length > 100) return void (err.textContent = 'Enter a single word of up to 100 characters.');
        try { await addWord(w); } catch { return void (err.textContent = 'Could not save the word.'); }
        err.textContent = '';
        if (!words.includes(w)) words = [...words, w].sort((a, b) => a.localeCompare(b));
        inp.value = '';
        paint();
        inp.focus();
      };
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
      flt.addEventListener('input', () => { q = flt.value; paint(); });
      paint();
      openDialog({
        title: 'Custom Dictionary', icon: 'book-a', width: 440, focus: 'input',
        body: [h('div', { class: 'dict__add' }, inp, h('button', { type: 'button', class: 'btn btn--primary', onclick: add }, 'Add')), err, flt, note, list],
        buttons: [{ label: 'Close', primary: true }],
      });
    },
  });

  // Re-apply saved words so the dictionary survives profile resets and works on platforms with a system checker.
  S.words().then((cur) => saved().filter((w) => !cur.includes(w)).forEach((w) => S.addWord(w))).catch(() => {});
  S.languages().then(() => { const l = getSetting('editor.spellLanguage'); if (l) return S.setLanguage(l); }).catch(() => {});
}
