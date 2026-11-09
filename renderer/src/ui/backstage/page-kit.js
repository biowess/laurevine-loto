import { h } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { runCommand } from '../shell/panels.js';

export const page = (title, sub, ...body) => [h('h2', {}, title), h('p', { class: 'sub' }, sub), ...body];
export const heading = (t) => h('h4', {}, t);
export const rows = (list, style) => h('div', { class: 'md-list', style }, ...list.map(([ic, n, d]) => h('div', { class: 'md-row' }, icon(ic), h('b', { style: { fontWeight: '500' } }, n), h('small', {}, d))));
export const cta = (...items) => h('div', { class: 'md-cta' }, ...items.map(([id, label, ic, primary]) => h('button', { type: 'button', class: 'btn' + (primary ? ' btn--primary' : ''), dataset: { cmd: id }, onclick: () => runCommand(id) }, ic ? icon(ic) : null, label)));
export const gallery = (list, style) => h('div', { class: 'md-gal', style }, ...list.map((c, i) => { c.style.setProperty('--i', i); return c; }));
export const card = (title, desc, cmd, body, on) => h('button', { type: 'button', class: 'md-card' + (on ? ' is-on' : ''), dataset: { cmd }, onclick: () => runCommand(cmd) }, body, h('b', {}, title), h('span', {}, desc));
