// Pure BibTeX parser supporting @string macros, field quoting/bracing, LaTeX accents, and common quirks.
// shortcut: handles nested braces up to JS stack depth, upgrade if streaming megabyte-scale files

import { decodeLatex } from './latex.js';
import { normalizeEntry } from './model.js';

const STANDARD_MONTHS = {
  jan: 'January', feb: 'February', mar: 'March', apr: 'April',
  may: 'May', jun: 'June', jul: 'July', aug: 'August',
  sep: 'September', oct: 'October', nov: 'November', dec: 'December',
};

export function parseBibTeX(input) {
  if (!input || typeof input !== 'string') {
    return { entries: [], strings: {}, errors: [] };
  }

  const entries = [];
  const strings = { ...STANDARD_MONTHS };
  const errors = [];
  let i = 0;
  const len = input.length;

  function skipWhitespaceAndComments() {
    while (i < len) {
      const ch = input[i];
      if (/\s/.test(ch)) {
        i++;
      } else if (ch === '%') {
        // TeX line comment
        while (i < len && input[i] !== '\n') i++;
      } else {
        break;
      }
    }
  }

  function readIdentifier() {
    skipWhitespaceAndComments();
    const start = i;
    while (i < len && /[a-zA-Z0-9_.:\-+*/]/.test(input[i])) i++;
    return input.slice(start, i);
  }

  function readBraced() {
    i++; // consume '{'
    let depth = 1;
    const start = i;
    while (i < len && depth > 0) {
      if (input[i] === '\\') {
        i += 2;
        continue;
      }
      if (input[i] === '{') depth++;
      else if (input[i] === '}') depth--;
      if (depth === 0) break;
      i++;
    }
    const val = input.slice(start, i);
    if (i < len && input[i] === '}') i++;
    return val;
  }

  function readQuoted() {
    i++; // consume '"'
    let braceDepth = 0;
    const start = i;
    while (i < len) {
      if (input[i] === '\\') {
        i += 2;
        continue;
      }
      if (input[i] === '{') braceDepth++;
      else if (input[i] === '}' && braceDepth > 0) braceDepth--;
      else if (input[i] === '"' && braceDepth === 0) break;
      i++;
    }
    const val = input.slice(start, i);
    if (i < len && input[i] === '"') i++;
    return val;
  }

  function readValuePart() {
    skipWhitespaceAndComments();
    if (i >= len) return '';
    const ch = input[i];
    if (ch === '{') {
      return readBraced();
    }
    if (ch === '"') {
      return readQuoted();
    }
    // Bare word or number
    const token = readIdentifier();
    const lower = token.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(strings, lower)) {
      return strings[lower];
    }
    return token;
  }

  function readFieldValue() {
    let result = readValuePart();
    skipWhitespaceAndComments();
    // Handle string concatenation operator '#'
    while (i < len && input[i] === '#') {
      i++; // consume '#'
      const nextPart = readValuePart();
      result += nextPart;
      skipWhitespaceAndComments();
    }
    return decodeLatex(result);
  }

  function skipBalanced(closeDelim) {
    let depth = 1;
    const openDelim = closeDelim === '}' ? '{' : '(';
    while (i < len && depth > 0) {
      if (input[i] === '\\') {
        i += 2;
        continue;
      }
      if (input[i] === openDelim) depth++;
      else if (input[i] === closeDelim) depth--;
      i++;
    }
  }

  while (i < len) {
    skipWhitespaceAndComments();
    if (i >= len) break;

    // BibTeX entry starts with '@'
    if (input[i] !== '@') {
      i++;
      continue;
    }
    i++; // consume '@'

    const type = readIdentifier().toLowerCase();
    skipWhitespaceAndComments();
    if (i >= len) break;

    const openDelim = input[i];
    if (openDelim !== '{' && openDelim !== '(') {
      continue;
    }
    const closeDelim = openDelim === '{' ? '}' : ')';
    i++; // consume open delimiter

    // 1. Comments
    if (type === 'comment') {
      skipBalanced(closeDelim);
      continue;
    }

    // 2. Preamble
    if (type === 'preamble') {
      skipBalanced(closeDelim);
      continue;
    }

    // 3. String macro: @string{ key = "value" }
    if (type === 'string') {
      skipWhitespaceAndComments();
      const strKey = readIdentifier().toLowerCase();
      skipWhitespaceAndComments();
      if (i < len && input[i] === '=') i++;
      const strVal = readFieldValue();
      strings[strKey] = strVal;
      skipWhitespaceAndComments();
      if (i < len && input[i] === closeDelim) i++;
      continue;
    }

    // 4. Regular publication entry
    skipWhitespaceAndComments();
    // Read citation key up to ',' or whitespace or closing delimiter
    const keyStart = i;
    while (i < len && input[i] !== ',' && input[i] !== closeDelim && !/\s/.test(input[i])) {
      i++;
    }
    const citeKey = input.slice(keyStart, i).trim();
    skipWhitespaceAndComments();
    if (i < len && input[i] === ',') i++;

    const fields = {};

    // Read fields: name = value
    while (i < len) {
      skipWhitespaceAndComments();
      if (i >= len || input[i] === closeDelim) {
        if (i < len && input[i] === closeDelim) i++;
        break;
      }
      if (input[i] === ',') {
        i++;
        continue;
      }

      const fieldName = readIdentifier().toLowerCase();
      if (!fieldName) {
        if (input[i] === closeDelim) {
          i++;
          break;
        }
        i++;
        continue;
      }

      skipWhitespaceAndComments();
      if (i < len && input[i] === '=') {
        i++; // consume '='
      }

      const val = readFieldValue();
      fields[fieldName] = val;

      skipWhitespaceAndComments();
      if (i < len && input[i] === ',') {
        i++; // consume ','
      }
    }

    const entry = normalizeEntry({
      id: citeKey,
      key: citeKey,
      type,
      ...fields,
      raw: fields,
    });
    entries.push(entry);
  }

  return { entries, strings, errors };
}
