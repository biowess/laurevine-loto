// Validation and sanitization for user custom CSS in exports. Pure.
export function validateCustomCss(raw) {
  if (typeof raw !== 'string') return { valid: false, css: '', warnings: ['Custom CSS must be a string.'] };
  const text = raw.trim();
  if (!text) return { valid: true, css: '', warnings: [] };
  const warnings = [];
  if (text.length > 100000) warnings.push('Custom CSS exceeds 100 KB limit and was truncated.');
  let css = text.slice(0, 100000);

  if (/<\/(?:style|script)/i.test(css)) {
    warnings.push('Custom CSS contained HTML closing tags; neutralized.');
    css = css.replace(/<\/(style|script)/gi, '<\\/$1');
  }

  if (/javascript\s*:/i.test(css) || /expression\s*\(/i.test(css)) {
    warnings.push('Custom CSS contained unsafe JavaScript expressions; removed.');
    css = css.replace(/javascript\s*:[^;)]*/gi, 'about:blank').replace(/expression\s*\([^)]*\)/gi, 'none');
  }

  if (/@import\s+(?:url\s*\(\s*['"]?https?:|['"]https?:)/i.test(css)) {
    warnings.push('Remote @import directives cannot be loaded offline in export.');
  }

  let open = 0, balanced = true;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') open++;
    else if (css[i] === '}') {
      open--;
      if (open < 0) { balanced = false; break; }
    }
  }
  if (!balanced || open !== 0) {
    warnings.push('Custom CSS contains unbalanced braces.');
  }

  return { valid: balanced, css, warnings };
}
