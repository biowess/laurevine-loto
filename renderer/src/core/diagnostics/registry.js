// Pure diagnostics engine and rule registry.
import { BUILTIN_RULES } from './rules.js';

export class DiagnosticRegistry {
  constructor(initialRules = BUILTIN_RULES) {
    this._rules = new Map();
    for (const rule of initialRules) {
      this.register(rule);
    }
  }

  register(rule) {
    if (!rule || typeof rule.id !== 'string') {
      throw new Error('A diagnostic rule must have a string "id" property');
    }
    if (typeof rule.run !== 'function') {
      throw new Error(`Diagnostic rule "${rule.id}" must implement a run(text, options) function`);
    }
    this._rules.set(rule.id, rule);
    return this;
  }

  unregister(id) {
    return this._rules.delete(id);
  }

  get(id) {
    return this._rules.get(id);
  }

  has(id) {
    return this._rules.has(id);
  }

  rules() {
    return Array.from(this._rules.values());
  }

  // Runs registered rules against document text.
  // options:
  // - rules: optional array of rule ids to run (defaults to all)
  // - from: docPath of current document (for link/image resolution)
  // - index: indexFiles(files) structure (for link/image resolution)
  // - anchors: (docPath) => headingIds function
  // - profile: profile id or object (for extension compatibility)
  // - strategy: slug strategy
  // -> Array of { id, severity, message, range: { from, to }, fix? } sorted by range.from ascending.
  run(text, options = {}) {
    const str = String(text ?? '');
    const enabled = Array.isArray(options.rules) ? new Set(options.rules) : null;
    const diagnostics = [];

    for (const rule of this._rules.values()) {
      if (enabled && !enabled.has(rule.id)) continue;
      try {
        const results = rule.run(str, options);
        if (Array.isArray(results)) {
          for (const item of results) {
            if (item && item.id && item.range && typeof item.range.from === 'number') {
              diagnostics.push(item);
            }
          }
        }
      } catch (err) {
        diagnostics.push({
          id: `${rule.id}.error`,
          severity: 'error',
          message: `Rule "${rule.id}" failed: ${err?.message || err}`,
          range: { from: 0, to: 0 },
        });
      }
    }

    return diagnostics.sort((a, b) => {
      const cmp = a.range.from - b.range.from;
      if (cmp !== 0) return cmp;
      return a.range.to - b.range.to;
    });
  }
}

export function createRegistry(initialRules) {
  return new DiagnosticRegistry(initialRules);
}

export const defaultRegistry = new DiagnosticRegistry();

export const runDiagnostics = (text, options) => defaultRegistry.run(text, options);
export const registerRule = (rule) => defaultRegistry.register(rule);
export const getRule = (id) => defaultRegistry.get(id);
export const listRules = () => defaultRegistry.rules();
