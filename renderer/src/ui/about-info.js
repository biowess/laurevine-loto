// Fills the About page's [data-about-info] slot with the real versions from app:info.
import { getAppInfo } from '../services/app-info.js';

const ROWS = [
  ['Application', 'name'],
  ['Version', 'version'],
  ['Platform', 'platform'],
  ['Electron', 'electron'],
  ['Chromium', 'chromium'],
  ['Node.js', 'node'],
];

function row(label, value) {
  const el = document.createElement('div');
  el.className = 'md-row';
  const name = document.createElement('b');
  name.style.fontWeight = '500';
  name.textContent = label;
  const detail = document.createElement('small');
  detail.textContent = value;
  el.append(name, detail);
  return el;
}

async function fill(slot) {
  try {
    const info = await getAppInfo();
    const list = document.createElement('div');
    list.className = 'md-list';
    for (const [label, key] of ROWS) list.append(row(label, String(info[key])));
    slot.replaceChildren(list);
  } catch {
    const message = document.createElement('small');
    message.textContent = 'Version details are unavailable.';
    slot.replaceChildren(message);
  }
}

export function initAboutInfo() {
  const host = document.getElementById('backstage');
  if (!host) return;
  const scan = () => {
    for (const slot of host.querySelectorAll('[data-about-info]:not([data-ready])')) {
      slot.dataset.ready = '1';
      fill(slot);
    }
  };
  new MutationObserver(scan).observe(host, { childList: true, subtree: true });
}
