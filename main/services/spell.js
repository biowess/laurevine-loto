import { CH } from '../../shared/channels.js';

const hooked = new WeakSet();

// Forwards misspelling context menus (word + Chromium suggestions) to the renderer, once per window.
function hook(wc) {
  if (hooked.has(wc)) return;
  hooked.add(wc);
  wc.on('context-menu', (_e, p) => {
    if (!p.misspelledWord || wc.isDestroyed()) return;
    wc.send(CH.SPELL_CONTEXT, { word: p.misspelledWord, suggestions: p.dictionarySuggestions.slice(0, 6) });
  });
}

export function languages(wc) {
  hook(wc);
  return { available: [...wc.session.availableSpellCheckerLanguages].sort(), current: wc.session.getSpellCheckerLanguages() };
}

export function setLanguage(wc, language) {
  const ok = wc.session.availableSpellCheckerLanguages.includes(language);
  if (ok) wc.session.setSpellCheckerLanguages([language]);
  return { applied: ok };
}

export const addWord = (wc, word) => ({ done: wc.session.addWordToSpellCheckerDictionary(word) });
export const removeWord = (wc, word) => ({ done: wc.session.removeWordFromSpellCheckerDictionary(word) });
export const words = async (wc) => ({ words: await wc.session.listWordsInSpellCheckerDictionary() });
