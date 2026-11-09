const URL_RE = /^(?:https?:\/\/|mailto:)[^\s<>]+$/i;

export const isUrl = (s) => URL_RE.test(String(s).trim());
export const normalize = (s) => String(s).replace(/\r\n?/g, '\n');

// Markdown link for a pasted URL over selected text; null when it cannot be a one-paragraph label.
export function asLink(label, text) {
  const url = String(text).trim();
  if (!label || !isUrl(url) || /\n\s*\n/.test(label)) return null;
  return `[${label.replace(/([[\]\\])/g, '\\$1')}](${/[()]/.test(url) ? `<${url}>` : url})`;
}

// Source lines a..b (1-based, inclusive).
export const sliceLines = (text, a, b) => String(text).split(/\r?\n/).slice(Math.max(0, a - 1), b).join('\n');
