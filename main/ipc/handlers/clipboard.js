import * as clip from '../../services/clipboard.js';

export const writeText = ({ text }) => clip.writeText(text);
export const writeRich = ({ html, text }) => clip.writeRich(html, text);
export const readText = () => clip.readText();
export const readImage = () => clip.readImage();
export const readHtml = () => clip.readHtml();
