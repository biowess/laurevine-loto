import { parseEndpoint, GRAMMAR_LIMIT } from '../../shared/grammar.js';
import { settingsService } from './settings/index.js';

// The only code path that sends document text over the network. Runs only while grammar.enabled is true; one request per window, 8 s timeout, 1 MB response cap.
const TIMEOUT = 8000, MAX_RES = 1_000_000, jobs = new Map();
const fail = (code, message) => ({ ok: false, error: { code, message } });

export function cancel(wc) {
  const ac = jobs.get(wc.id);
  if (ac) ac.abort('cancel');
  jobs.delete(wc.id);
}

export async function check(wc, text) {
  const S = settingsService();
  if (S.get('grammar.enabled') !== true) return fail('E_OFF', 'The online grammar check is off.');
  const url = parseEndpoint(S.get('grammar.url'));
  if (!url) return fail('E_URL', 'The grammar endpoint is not a valid https address.');
  if (typeof text !== 'string' || !text.trim() || text.length > GRAMMAR_LIMIT) return fail('E_SIZE', 'The text is empty or too long.');
  cancel(wc);
  const ac = new AbortController(), timer = setTimeout(() => ac.abort('timeout'), TIMEOUT);
  jobs.set(wc.id, ac);
  try {
    const res = await fetch(url, {
      method: 'POST', signal: ac.signal, redirect: 'error', credentials: 'omit',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ text, language: S.get('grammar.language') || 'auto' }),
    });
    if (!res.ok) return fail('E_HTTP', `The grammar service answered ${res.status}.`);
    const rd = res.body.getReader(), parts = [];
    let n = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) break;
      n += value.length;
      if (n > MAX_RES) { ac.abort('size'); return fail('E_SIZE', 'The grammar service response is too large.'); }
      parts.push(value);
    }
    const raw = JSON.parse(Buffer.concat(parts).toString('utf8'));
    const matches = (Array.isArray(raw.matches) ? raw.matches : []).slice(0, 200).filter((m) => m && Number.isInteger(m.offset) && Number.isInteger(m.length) && m.offset >= 0 && m.length > 0).map((m) => ({
      offset: m.offset, length: m.length, message: String(m.message || '').slice(0, 300), rule: String((m.rule && m.rule.id) || '').slice(0, 60), type: String((m.rule && m.rule.issueType) || '').slice(0, 30),
      replacements: (Array.isArray(m.replacements) ? m.replacements : []).slice(0, 5).map((r) => String(r && r.value).slice(0, 100)),
    }));
    return { ok: true, matches };
  } catch (e) {
    const why = ac.signal.reason;
    return why === 'cancel' ? fail('E_CANCEL', 'Canceled.') : why === 'timeout' ? fail('E_TIMEOUT', 'The grammar service did not answer in time.') : e instanceof SyntaxError ? fail('E_DATA', 'The grammar service sent an unreadable answer.') : fail('E_NET', 'The grammar service could not be reached.');
  } finally {
    clearTimeout(timer);
    if (jobs.get(wc.id) === ac) jobs.delete(wc.id);
  }
}
