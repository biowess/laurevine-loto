// 45a: Pagination intelligence rules as CSS for Paged.js. Table, caption, break and blank-page hooks run on the rendered DOM in shared/paged-boot.js and read the --lv-pg-* variables.
export function paginationCss(c) {
  const p = c.pagination, B = '.lv-body', one = c.columns.count === 1, on = (f, s) => (f ? s : '');
  return [
    on(p.headingKeep, `${B} h1,${B} h2,${B} h3,${B} h4,${B} h5,${B} h6{break-after:avoid}`),
    on(one, `${B} p,${B} li,${B} blockquote{orphans:${p.orphans};widows:${p.widows}}`),
    on(one && p.keepCode, `${B} pre,${B} .lt-code{break-inside:avoid}`),
    on(one && p.keepCallouts, `${B} .lt-callout{break-inside:avoid}`),
    '.lv-ti{break-inside:avoid}.lv-kn,.lv-ka{break-after:avoid}.lv-kb{break-before:avoid}',
    on(p.tableHeader, `${B} thead{display:table-header-group}`),
    `:root{--lv-pg-cap:${+p.captionKeep};--lv-pg-thead:${+p.tableHeader};--lv-pg-row:${+p.tableSingleRow};--lv-pg-small:${p.tableSmallKeep ? p.smallTableRows : 0};--lv-pg-brk:${+p.collapseBreaks};--lv-pg-empty:${+p.noEmptyPages}}`,
  ].filter(Boolean).join('\n');
}
