import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const languages = () => invoke(CH.SPELL_LANGUAGES);
export const setLanguage = (language) => invoke(CH.SPELL_SET_LANGUAGE, { language });
export const addWord = (word) => invoke(CH.SPELL_ADD_WORD, { word });
export const removeWord = (word) => invoke(CH.SPELL_REMOVE_WORD, { word });
export const words = async () => (await invoke(CH.SPELL_WORDS)).words;
