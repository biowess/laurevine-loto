// Core diagnostics public interface.
export {
  DiagnosticRegistry,
  createRegistry,
  defaultRegistry,
  runDiagnostics,
  registerRule,
  getRule,
  listRules,
} from './registry.js';

export {
  markdownSyntaxRule,
  headingStructureRule,
  linksRule,
  imagesRule,
  frontmatterRule,
  tableStructureRule,
  extensionCompatibilityRule,
  markerIntegrityRule,
  BUILTIN_RULES,
  lineIndex,
  findCodeRanges,
} from './rules.js';
