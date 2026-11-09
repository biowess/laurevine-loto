import { clipboard } from 'electron';

export const writeText = (text) => { clipboard.writeText(text); return {}; };
export const writeRich = (html, text) => { clipboard.write({ html, text }); return {}; };
export const readText = () => ({ text: clipboard.readText() });
export const readImage = () => { const i = clipboard.readImage(); return { data: i.isEmpty() ? '' : i.toPNG().toString('base64') }; };
export const readHtml = () => ({ html: clipboard.readHTML() });
