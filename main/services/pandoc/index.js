import { promises as fsp, constants as FS } from 'node:fs';
import path from 'node:path';
import { buildArgs, compareVersions, DEFAULT_TIMEOUT_S, exeNames, firstLine, isPandocName, MIN_VERSION, parseFormatList, parseVersion, PandocArgError, PROBE_TIMEOUT_MS, searchDirs, summarizeCapabilities } from '../../core/pandoc.js';
import { DocError } from '../fs/safe-path.js';
import { settingsService } from '../settings/index.js';
import { cancelJob, runPandoc } from './runner.js';

let cached = null;

async function isExe(file) {
  try {
    if (!(await fsp.stat(file)).isFile()) return false;
    if (process.platform !== 'win32') await fsp.access(file, FS.X_OK);
    return true;
  } catch { return false; }
}

async function locate(configured) {
  const names = exeNames(process.platform);
  if (configured) {
    if (configured.includes('\0') || !path.isAbsolute(configured)) return { status: 'invalid-path', message: 'Enter the full path to Pandoc, or leave the field empty.' };
    let file = configured;
    try { if ((await fsp.stat(file)).isDirectory()) file = path.join(file, names[0]); } catch { return { status: 'invalid-path', message: 'Nothing was found at that path.' }; }
    if (!isPandocName(file)) return { status: 'invalid-path', message: 'The file must be named pandoc (pandoc.exe on Windows).' };
    return (await isExe(file)) ? { exe: file } : { status: 'invalid-path', message: 'No runnable Pandoc program was found at that path.' };
  }
  for (const dir of searchDirs(process.platform, process.env)) {
    for (const name of names) {
      const file = path.join(dir, name);
      if (await isExe(file)) return { exe: file };
    }
  }
  return { status: 'not-found', message: 'Pandoc was not found on this computer.' };
}

async function probe(configured) {
  const source = configured ? 'setting' : 'auto', loc = await locate(configured);
  const base = { found: false, status: loc.status, path: '', source, version: '', supported: false, minVersion: MIN_VERSION, capabilities: null, message: loc.message || '' };
  if (!loc.exe) return base;
  const q = (args) => runPandoc(loc.exe, args, { timeoutMs: PROBE_TIMEOUT_MS });
  const v = await q(['--version']), version = v.ok ? parseVersion(v.stdout) : null;
  if (!version) return { ...base, path: loc.exe, status: 'broken', message: 'That program did not answer like Pandoc. Check the path.' };
  const [inp, out, sb] = await Promise.all([q(['--list-input-formats']), q(['--list-output-formats']), q(['--sandbox', '--version'])]);
  const supported = compareVersions(version, MIN_VERSION) >= 0;
  return {
    ...base, found: true, path: loc.exe, version, supported, status: supported ? 'ready' : 'too-old',
    capabilities: summarizeCapabilities(parseFormatList(inp.stdout), parseFormatList(out.stdout), sb.ok),
    message: supported ? `Pandoc ${version} is ready.` : `Pandoc ${version} is older than ${MIN_VERSION}. Install a newer version.`,
  };
}

export async function detect({ fresh = false } = {}) {
  const configured = String(settingsService().get('integrations.pandocPath') || '').trim();
  if (!fresh && cached && cached.configured === configured && cached.info.found) return cached.info;
  const info = await probe(configured);
  cached = { configured, info };
  return info;
}

export async function convert(sender, id, opts) {
  const info = await detect();
  if (!info.found || !info.supported) throw new DocError('E_PANDOC', info.message || 'Pandoc is not available.');
  let args;
  try { args = buildArgs(opts, info.capabilities); } catch (e) { if (e instanceof PandocArgError) throw new DocError('E_ARGS', e.message); throw e; }
  const secs = Number(settingsService().get('integrations.pandocTimeout')) || DEFAULT_TIMEOUT_S;
  return runPandoc(info.path, args, { input: opts.input, timeoutMs: secs * 1000, key: `${sender.id}:${id}`, extraEnv: opts.extraEnv });
}

export const cancel = (sender, id) => cancelJob(`${sender.id}:${id}`);

export async function selfTest(sender, id) {
  const info = await detect({ fresh: true });
  if (!info.found || !info.supported) return { passed: false, info, message: info.message, ms: 0 };
  const r = await convert(sender, id, { from: 'markdown', to: 'html5', input: '# Pandoc test\n\nHello **world**.\n' });
  const passed = r.ok && /<strong>world<\/strong>/.test(r.stdout);
  const message = passed ? `Test passed in ${r.ms} ms.` : r.canceled ? 'The test was canceled.' : r.timedOut ? 'The test timed out.' : r.truncated ? 'Pandoc produced too much output.' : r.spawnError && !r.code ? 'Pandoc could not be started.' : `Pandoc failed${firstLine(r.stderr) ? `: ${firstLine(r.stderr)}` : '.'}`;
  return { passed, info, message, ms: r.ms };
}
