import * as spell from '../../services/spell.js';

export const languages = (_p, e) => spell.languages(e.sender);
export const setLanguage = ({ language }, e) => spell.setLanguage(e.sender, language);
export const addWord = ({ word }, e) => spell.addWord(e.sender, word);
export const removeWord = ({ word }, e) => spell.removeWord(e.sender, word);
export const words = (_p, e) => spell.words(e.sender);
