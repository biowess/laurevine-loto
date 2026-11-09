import { execFile } from 'node:child_process';
import { cleanEnv, MAX_BUFFER } from '../../core/pandoc.js';

const jobs = new Map();

export function cancelJob(key) {
  const ac = jobs.get(key);
  if (ac) ac.abort('cancel');
  return Boolean(ac);
}

// execFile without a shell: `exe` is a resolved Pandoc path and `args` come from buildArgs. Never rejects.
export function runPandoc(exe, args, { input, timeoutMs = 60000, key, cwd, extraEnv } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now(), done = (r) => resolve({ stdout: '', stderr: '', code: null, spawnError: '', timedOut: false, canceled: false, truncated: false, ...r, ok: r.ok === true, ms: Date.now() - t0 });
    if (key && jobs.has(key)) return done({ spawnError: 'EBUSY', stderr: 'This Pandoc job is already running.' });
    const ac = new AbortController();
    let reason = '';
    if (key) jobs.set(key, ac);
    ac.signal.addEventListener('abort', () => { if (!reason) reason = ac.signal.reason === 'cancel' ? 'cancel' : 'timeout'; });
    const timer = setTimeout(() => ac.abort('timeout'), timeoutMs);
    const finish = (r) => { clearTimeout(timer); if (key) jobs.delete(key); done(r); };
    try {
      const child = execFile(exe, args, { shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: MAX_BUFFER, signal: ac.signal, env: { ...cleanEnv(process.env), ...extraEnv }, cwd }, (err, stdout, stderr) => {
        const spawnError = err && typeof err.code === 'string' ? err.code : '';
        finish({ ok: !err, stdout: stdout || '', stderr: stderr || '', code: err ? (typeof err.code === 'number' ? err.code : null) : 0, spawnError, timedOut: reason === 'timeout', canceled: reason === 'cancel', truncated: spawnError === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' });
      });
      child.stdin.on('error', () => {});
      child.stdin.end(typeof input === 'string' ? input : undefined);
    } catch (e) {
      finish({ spawnError: (e && e.code) || 'ESPAWN', stderr: (e && e.message) || 'Pandoc could not be started.' });
    }
  });
}
