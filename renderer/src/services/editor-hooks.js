// Lets features intercept source-editor keydown events without touching CodeMirror setup.
let hook = null;
export const setKeyHook = (fn) => { hook = fn; };
const pre = [];
export const addKeyHook = (fn) => { pre.push(fn); };
export const keyHook = (e, view) => pre.some((f) => f(e, view)) || (hook ? hook(e, view) : false);
