import { h } from '../kit/dom.js';
import { icon } from '../kit/icons.js';
import { openContextMenu } from '../kit/menu.js';
import { runCommand } from './panels.js';

export const MUTED = { fontSize: '11.5px', color: 'var(--text-2)' };
export const lbl = (t) => h('div', { class: 'md-lbl' }, t);
export const row = (ic, text, o = {}) => h('div', { class: 'md-row' + (o.on ? ' is-on' : ''), style: o.pad ? { paddingLeft: o.pad + 'px' } : null }, icon(ic, o.cls), text, o.small ? h('small', {}, o.small) : null);
export const kv = (k, v, plain) => h('div', { class: 'md-kv' }, h('span', {}, k), plain ? h('span', { style: { color: 'var(--text)', textAlign: 'right' } }, v) : v);
export const box = (...k) => h('div', { class: 'md-sbh' }, ...k);
export const field = (label, o) => box(h('input', { 'aria-label': label, ...o }));
export const hit = (f, parts, where, n) => h('div', { class: 'md-hit' }, h('b', {}, f + ' ', h('small', { style: { ...MUTED, fontWeight: '400' } }, String(n))), ...parts.map((p, i) => (i % 2 ? h('mark', {}, p) : p)), h('span', {}, where));
export const ctxMenu = (el, items) => { el.addEventListener('contextmenu', (e) => openContextMenu(e, items.map((i) => (i === '-' ? '-' : { label: i[1], onSelect: () => runCommand(i[0]) })))); return el; };
export const act = (ic, command) => ({ icon: ic, command });
