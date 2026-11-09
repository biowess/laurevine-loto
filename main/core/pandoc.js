export const MIN_VERSION = '2.11';
export const DEFAULT_TIMEOUT_S = 60;
export const PROBE_TIMEOUT_MS = 10000;
export const MAX_BUFFER = 8 * 1024 * 1024;
export const MAX_INPUT = 64_000_000;

export class PandocArgError extends Error {}

const bad = (message) => { throw new PandocArgError(message); };
const FORMAT = /^[a-z][a-z0-9_]{0,30}([+-][a-z][a-z0-9_]{0,40}){0,12}$/;
const META_KEY = /^[A-Za-z][A-Za-z0-9_-]{0,40}$/;
const ABSOLUTE = /^([A-Za-z]:[\\/]|\/|\\\\[^\\/])/;
const ENV_KEEP = ['PATH', 'Path', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SYSTEMROOT', 'SystemRoot', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'USER', 'LOGNAME'];
const KEY_OUTPUTS = [['html', ['html5', 'html']], ['docx', ['docx']], ['odt', ['odt']], ['epub', ['epub3', 'epub']], ['latex', ['latex']], ['pptx', ['pptx']]];

export function parseVersion(text) {
  const m = /^pandoc(?:\.exe)?\s+(\d+(?:\.\d+){1,3})/m.exec(String(text || ''));
  return m ? m[1] : null;
}

export function compareVersions(a, b) {
  const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

export const parseFormatList = (text) => String(text || '').split(/\s+/).filter((s) => /^[A-Za-z][A-Za-z0-9_]*$/.test(s)).slice(0, 300);

export function summarizeCapabilities(input, output, sandbox) {
  const has = (names) => names.some((n) => output.includes(n));
  return { sandbox: sandbox === true, input, output, key: Object.fromEntries(KEY_OUTPUTS.map(([k, names]) => [k, has(names)])) };
}

export const exeNames = (platform) => (platform === 'win32' ? ['pandoc.exe'] : ['pandoc']);
export const isPandocName = (file) => /^pandoc(\.exe)?$/i.test(String(file).split(/[\\/]/).pop());

// Absolute folders only: a relative PATH entry such as "." would run a program from the working directory.
export function searchDirs(platform, env) {
  const own = String(env.PATH || env.Path || '').split(platform === 'win32' ? ';' : ':');
  const extra = platform === 'win32' ? [env.LOCALAPPDATA && `${env.LOCALAPPDATA}\\Pandoc`, env.ProgramFiles && `${env.ProgramFiles}\\Pandoc`]
    : platform === 'darwin' ? ['/opt/homebrew/bin', '/usr/local/bin']
      : ['/usr/local/bin', '/usr/bin', env.HOME && `${env.HOME}/.local/bin`];
  return [...new Set([...own, ...extra].map((s) => String(s || '').replace(/^"|"$/g, '')).filter((s) => ABSOLUTE.test(s)))];
}

export function cleanEnv(env) {
  const out = {};
  for (const k of ENV_KEEP) if (typeof env[k] === 'string') out[k] = env[k];
  return out;
}

const format = (v, label) => (typeof v === 'string' && FORMAT.test(v) ? v : bad(`${label} is not a valid Pandoc format name.`));
const absolute = (v, label) => (typeof v === 'string' && v.length <= 4096 && !v.includes('\0') && ABSOLUTE.test(v) ? v : bad(`${label} must be an absolute path.`));
const list = (v, max, label) => (Array.isArray(v) && v.length <= max ? v : bad(`${label} must be a list of at most ${max} items.`));

// One token per option ("--name=value"), never a shell string, never a filter, Lua script or program name.
export function buildArgs(o, caps) {
  if (!o || typeof o !== 'object') bad('Conversion options are required.');
  const a = [];
  if (o.sandbox !== false && caps && caps.sandbox === true) a.push('--sandbox');
  a.push(`--from=${format(o.from, 'The input format')}`, `--to=${format(o.to, 'The output format')}`);
  if (o.output != null) a.push(`--output=${absolute(o.output, 'The output file')}`);
  if (o.standalone) a.push('--standalone');
  if (o.toc) a.push('--toc');
  if (o.tocDepth !== undefined) a.push(Number.isInteger(o.tocDepth) && o.tocDepth >= 1 && o.tocDepth <= 6 ? `--toc-depth=${o.tocDepth}` : bad('The contents depth must be 1 to 6.'));
  if (o.numberSections) a.push('--number-sections');
  if (o.citeproc) a.push('--citeproc');
  if (o.failOnWarning) a.push('--fail-if-warnings');
  if (o.wrap !== undefined) a.push(['none', 'auto', 'preserve'].includes(o.wrap) ? `--wrap=${o.wrap}` : bad('The wrap mode must be none, auto or preserve.'));
  if (o.bibliography !== undefined) for (const f of list(o.bibliography, 10, 'Bibliography files')) a.push(`--bibliography=${absolute(f, 'A bibliography file')}`);
  if (o.csl !== undefined) a.push(`--csl=${absolute(o.csl, 'The citation style file')}`);
  if (o.referenceDoc !== undefined) a.push(`--reference-doc=${absolute(o.referenceDoc, 'The reference document')}`);
  if (o.resourcePath !== undefined) a.push(`--resource-path=${absolute(o.resourcePath, 'The resource folder')}`);
  if (o.metadata !== undefined) {
    const e = o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata) ? Object.entries(o.metadata) : bad('Metadata must be an object.');
    if (e.length > 30) bad('Metadata may hold at most 30 entries.');
    for (const [k, v] of e) a.push(META_KEY.test(k) && typeof v === 'string' && v.length <= 500 && !/[\0\r\n]/.test(v) ? `--metadata=${k}:${v}` : bad(`Metadata entry "${String(k).slice(0, 41)}" is not allowed.`));
  }
  if (o.inputFiles !== undefined) for (const f of list(o.inputFiles, 50, 'Input files')) a.push(absolute(f, 'An input file'));
  if (o.input !== undefined && (typeof o.input !== 'string' || o.input.length > MAX_INPUT)) bad('The input text is too large.');
  return a;
}

export const firstLine = (text, n = 300) => String(text || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean)?.slice(0, n) || '';
