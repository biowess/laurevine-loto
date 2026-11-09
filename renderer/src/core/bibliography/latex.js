// Pure LaTeX accent and symbol decoder for BibTeX entries.
// shortcut: covers standard academic diacritics and symbols, upgrade to full TeX engine if math macros required

const DIACRITICS = {
  '"': { a: 'ä', e: 'ë', i: 'ï', o: 'ö', u: 'ü', y: 'ÿ', A: 'Ä', E: 'Ë', I: 'Ï', O: 'Ö', U: 'Ü', Y: 'Ÿ' },
  "'": { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ć', n: 'ń', y: 'ý', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', C: 'Ć', N: 'Ń', Y: 'Ý', s: 'ś', S: 'Ś', z: 'ź', Z: 'Ź' },
  '`': { a: 'à', e: 'è', i: 'ì', o: 'ò', u: 'ù', A: 'À', E: 'È', I: 'Ì', O: 'Ò', U: 'Ù' },
  '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û', w: 'ŵ', y: 'ŷ', A: 'Â', E: 'Ê', I: 'Î', O: 'Ô', U: 'Û', W: 'Ŵ', Y: 'Ŷ' },
  '~': { a: 'ã', n: 'ñ', o: 'õ', u: 'ũ', A: 'Ã', N: 'Ñ', O: 'Õ', U: 'Ũ' },
  'c': { c: 'ç', C: 'Ç', s: 'ş', S: 'Ş', t: 'ţ', T: 'Ţ' },
  'v': { c: 'č', d: 'ď', e: 'ě', l: 'ľ', n: 'ň', r: 'ř', s: 'š', t: 'ť', z: 'ž', C: 'Č', D: 'Ď', E: 'Ě', L: 'Ľ', N: 'Ň', R: 'Ř', S: 'Š', T: 'Ť', Z: 'Ž' },
  'u': { a: 'ă', g: 'ğ', A: 'Ă', G: 'Ğ' },
  'H': { o: 'ő', u: 'ű', O: 'Ő', U: 'Ű' },
  'k': { a: 'ą', e: 'ę', A: 'Ą', E: 'Ę' },
  'r': { a: 'å', u: 'ů', A: 'Å', U: 'Ů' },
  '=': { a: 'ā', e: 'ē', i: 'ī', o: 'ō', u: 'ū', A: 'Ā', E: 'Ē', I: 'Ī', O: 'Ō', U: 'Ū' },
  '.': { z: 'ż', Z: 'Ż', c: 'ċ', C: 'Ċ', e: 'ė', E: 'Ė' },
};

const SYMBOLS = {
  aa: 'å', AA: 'Å',
  ae: 'æ', AE: 'Æ',
  oe: 'œ', OE: 'Œ',
  o: 'ø', O: 'Ø',
  l: 'ł', L: 'Ł',
  ss: 'ß', SS: 'SS',
  i: 'ı', j: 'ȷ',
  dag: '†', ddag: '‡',
  copyright: '©', pounds: '£',
  backslash: '\\',
};

// Replaces LaTeX accent commands like {\"a}, \"{a}, \"a, \v{s}, \c{c}
function replaceDiacritics(text) {
  // Pattern 1: {\command{char}} or {\command char} e.g. {\"a}, {\v{s}}, {\'E}
  let res = text.replace(/\{\\([\"'`^~cvuHkr=.]|\w+)\s*\{?([a-zA-Z])\}?\}/g, (match, cmd, char) => {
    return (DIACRITICS[cmd] && DIACRITICS[cmd][char]) || SYMBOLS[cmd] || match;
  });

  // Pattern 2: \command{char} or \command char e.g. \"{a}, \"a, \v{c}, \c{s}
  res = res.replace(/\\([\"'`^~cvuHkr=.]|\w+)\s*\{?([a-zA-Z])\}?/g, (match, cmd, char) => {
    return (DIACRITICS[cmd] && DIACRITICS[cmd][char]) || SYMBOLS[cmd] || match;
  });

  return res;
}

// Strip outer / inline curly braces used in BibTeX to protect capitalization
export function stripBraces(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;
  // Repeatedly remove balanced non-nested braces until stable
  let prev;
  do {
    prev = str;
    str = str.replace(/\{([^{}]*)\}/g, '$1');
  } while (str !== prev && str.includes('{'));
  return str.replace(/[{}\\]/g, '');
}

// Decode LaTeX accents, macros, dashes and ligatures into clean Unicode
export function decodeLatex(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // 1. Symbol commands like \aa, \ss, etc.
  for (const [cmd, rep] of Object.entries(SYMBOLS)) {
    // TeX control words consume following delimiter whitespace before another letter
    str = str.replace(new RegExp(`\\\\${cmd}(?![a-zA-Z])(?:\\{\\}|\\s+)?`, 'g'), rep);
  }

  // 2. Accents
  str = replaceDiacritics(str);

  // 3. Escaped special characters: \&, \%, \$, \_, \#, \{, \}
  str = str.replace(/\\([&%$#_{}])/g, '$1');

  // 4. Dashes, non-breaking spaces, quotes
  str = str.replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/``/g, '“')
    .replace(/''/g, '”')
    .replace(/(?<!\\)~/g, ' ')
    .replace(/\\ /g, ' ');

  // 5. Strip remaining capitalization/protection braces
  str = stripBraces(str);

  return str.trim();
}
