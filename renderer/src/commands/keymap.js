import { list, get, canRun, execute, invalidate, onChange, setShortcutResolver } from './registry.js';
import { getSetting, setSetting, subscribeSettings } from '../services/settings-client.js';

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const ALIAS = { ctrl: 'Ctrl', control: 'Ctrl', cmd: 'Ctrl', command: 'Ctrl', meta: 'Ctrl', mod: 'Ctrl', alt: 'Alt', option: 'Alt', shift: 'Shift' };
const NAMES = { esc: 'Esc', escape: 'Esc', ' ': 'Space', space: 'Space', up: 'Up', arrowup: 'Up', down: 'Down', arrowdown: 'Down', left: 'Left', arrowleft: 'Left', right: 'Right', arrowright: 'Right', del: 'Delete', delete: 'Delete', return: 'Enter', enter: 'Enter', tab: 'Tab', backspace: 'Backspace', home: 'Home', end: 'End', pageup: 'PageUp', pagedown: 'PageDown', insert: 'Insert', '+': 'Plus', plus: 'Plus' };
const KEEP = new Set(['Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X']);
const NATIVE = new Set([...KEEP, 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+Shift+Z', 'Ctrl+Shift+V']);
const EXTRA = { 'edit.redo': ['Ctrl+Y'] };
const keyName = (k) => NAMES[k.toLowerCase()] || (/^f\d{1,2}$/i.test(k) ? k.toUpperCase() : k.length === 1 ? k.toUpperCase() : '');
let over = {}, idx = null, freed = new Set(), paused = false, last = '{}';

export function normalize(s) {
  const m = new Set();
  let key = '';
  for (const p of String(s || '').trim().replace(/\+\+$/, '+Plus').split('+').map((x) => x.trim()).filter(Boolean)) {
    if (ALIAS[p.toLowerCase()]) m.add(ALIAS[p.toLowerCase()]);
    else if (key) return '';
    else key = keyName(p);
  }
  return key ? [...['Ctrl', 'Alt', 'Shift'].filter((x) => m.has(x)), key].join('+') : '';
}

export function fromEvent(e, mac = isMac) {
  if ((mac ? e.ctrlKey : e.metaKey) || (e.getModifierState && e.getModifierState('AltGraph'))) return '';
  const k = e.shiftKey && /^Digit\d$/.test(e.code || '') ? e.code.slice(5) : e.key;
  const key = k && !['Control', 'Shift', 'Alt', 'Meta', 'Dead', 'Process', 'Unidentified'].includes(k) ? keyName(k) : '';
  return key ? [(mac ? e.metaKey : e.ctrlKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', key].filter(Boolean).join('+') : '';
}

export const display = (c, mac = isMac) => (mac ? c.split('+').map((p) => ({ Ctrl: '⌘', Alt: '⌥', Shift: '⇧' }[p] || p)).join('') : c);

export function validate(c) {
  if (KEEP.has(c)) return `${display(c)} is reserved for Copy, Cut, Paste and Select All.`;
  const mods = c.split('+').slice(0, -1);
  return mods.includes('Ctrl') || mods.includes('Alt') || /^F\d+$/.test(c.split('+').pop()) ? '' : 'Use Ctrl (Cmd on Mac) or Alt with the key, or a function key.';
}

const ctxOf = (c) => c.keyWhen || (/^(fmt\.|edit\.(undo|redo)$)/.test(c.id) ? 'editor' : 'global');
const defaults = (c) => [...new Set([c.defaultShortcut, ...(EXTRA[c.id] || [])].map(normalize).filter(Boolean))];
const bound = (c) => (c.id in over ? over[c.id] : defaults(c));
export const effective = (id) => { const c = get(id); return c ? bound(c) : []; };
export const isOverridden = (id) => id in over;
export const pause = (on) => { paused = !!on; };

export function conflicts(combo, id) {
  const me = get(id), w = me ? ctxOf(me) : 'global';
  return list((c) => !c.planned && c.id !== id && (!me || c.title !== me.title) && bound(c).includes(combo) && (w === 'global' || ctxOf(c) === 'global' || ctxOf(c) === w));
}

function index() {
  if (idx) return idx;
  idx = new Map();
  for (const c of list((x) => !x.planned)) for (const b of bound(c)) if (c.id in over || !KEEP.has(b)) (idx.get(b) || idx.set(b, []).get(b)).push(c);
  freed = new Set(list((x) => !x.planned && x.id in over).flatMap(defaults).filter((b) => !idx.has(b) && !KEEP.has(b)));
  return idx;
}

const inEditor = (t) => !!(t && t.closest && t.closest('.cm-editor,#src'));
const inField = (t) => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable]'));

function fits(c, e, combo) {
  const ed = inEditor(e.target), w = ctxOf(c);
  if ((w === 'editor' && !ed) || (w === 'app' && ed)) return false;
  return ed || !inField(e.target) || !NATIVE.has(combo);
}

function onKey(e) {
  if (paused || e.isComposing) return;
  const combo = fromEvent(e);
  if (!combo || !/Ctrl|Alt|^F\d/.test(combo)) return;
  const hit = (index().get(combo) || []).filter((c) => fits(c, e, combo)), run = hit.find((c) => canRun(c.id));
  if (run || (!hit.length && freed.has(combo) && (inEditor(e.target) || !inField(e.target)))) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (run) execute(run.id);
  }
}

const clean = (o) => {
  const out = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) for (const [id, v] of Object.entries(o)) out[id] = [...new Set((Array.isArray(v) ? v : [v]).map(normalize).filter(Boolean))].slice(0, 3);
  return out;
};

function set(o) {
  over = o; idx = null; last = JSON.stringify(o);
  invalidate('keymap');
  setSetting('keymap.overrides', last).catch((e) => console.error('[keymap]', e));
}

export function assign(id, combos) {
  const c = get(id), next = [...new Set(combos.map(normalize).filter(Boolean))];
  if (!c) return;
  if (JSON.stringify(next) === JSON.stringify(defaults(c))) return reset(id);
  set({ ...over, [id]: next });
}
export function reset(id) { const o = { ...over }; delete o[id]; set(o); }
export const resetAll = () => { set({}); };
export const exportJson = () => JSON.stringify(over, null, 2);

export function importJson(text) {
  let o;
  try { o = JSON.parse(text); } catch { return { ok: false, error: 'Not valid JSON.' }; }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ok: false, error: 'Expected an object of command ids and shortcuts.' };
  const next = clean(o);
  for (const id of Object.keys(next)) if (!get(id)) delete next[id];
  if (JSON.stringify(next).length > 8000) return { ok: false, error: 'Too many overrides to store.' };
  set(next);
  return { ok: true, count: Object.keys(next).length };
}

function load() {
  const raw = String(getSetting('keymap.overrides') || '{}');
  if (raw === last && idx) return;
  last = raw; idx = null;
  try { over = clean(JSON.parse(raw)); } catch { over = {}; }
  invalidate('keymap');
}

export function mountKeymap() {
  setShortcutResolver((id, d) => (id in over ? display(over[id][0] || '') : isMac ? display(normalize(d)) || d : d));
  load();
  subscribeSettings(load);
  onChange((t) => { if (t.type !== 'change') idx = null; });
  window.addEventListener('keydown', onKey, true);
}
