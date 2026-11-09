import { CH } from '../../../shared/channels.js';
import { invoke } from './ipc.js';

export const writeText = (text) => invoke(CH.CLIPBOARD_WRITE_TEXT, { text });
export const writeRich = (html, text) => invoke(CH.CLIPBOARD_WRITE_RICH, { html, text });
export const readText = async () => (await invoke(CH.CLIPBOARD_READ_TEXT)).text;
export const readImage = async () => (await invoke(CH.CLIPBOARD_READ_IMAGE)).data;
export const readHtml = async () => (await invoke(CH.CLIPBOARD_READ_HTML)).html;
