export const STEPS = Object.freeze([['source', 'Source'], ['scan', 'Scan'], ['report', 'Compatibility Report'], ['strategy', 'Strategy'], ['review', 'Review'], ['open', 'Open Workspace']]);

export const STRATEGIES = Object.freeze([
  ['in-place', 'Open in Place', 'Opens the folder where it is. Nothing is copied, converted or written.', 'migration.in-place'],
  ['copy', 'Import as Copy', 'Copies documents and attachments, with their relative paths, into a folder you choose.', 'migration.copy'],
  ['new-workspace', 'Create a New Workspace', 'Copies into an empty folder, registers it as a workspace and suggests settings.', 'migration.new-workspace'],
]);

export const initial = () => ({ step: 0, source: null, scanning: false, progress: null, report: null, error: '', notice: '', strategy: '', dest: null, convert: false, applying: false, result: null, tx: null });

export const strategyReady = (s) => !!s.source && (s.strategy === 'in-place' ? s.source.kind === 'folder' : s.strategy === 'copy' ? !!s.dest : s.strategy === 'new-workspace' ? !!s.dest && s.dest.empty : false);

export function canNext(s) {
  if (s.step === 0) return !!s.source;
  if (s.step === 1) return !!s.report && !s.scanning;
  if (s.step === 3) return strategyReady(s);
  if (s.step === 4) return strategyReady(s) && !s.applying;
  return s.step < STEPS.length - 1 && !!s.report;
}

export const canBack = (s) => s.step > 0 && !s.applying;

export const slug = (name) => String(name || '').replace(/\.zip$/i, '').replace(/[^\w.-]+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 60) || 'source';
