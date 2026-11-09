const LABEL = { heading: 'stranded heading', fragment: 'single-line fragment', empty: 'near-empty page' };

export const paginationSummary = (issues) => {
  if (!issues.length) return 'No pagination defects';
  const list = issues.slice(0, 4).map((i) => `p${i.page} ${LABEL[i.kind]}`).join(', ');
  return `${issues.length} pagination defect${issues.length === 1 ? '' : 's'}: ${list}${issues.length > 4 ? '…' : ''}`;
};
