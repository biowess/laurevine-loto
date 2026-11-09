// Fallback when printToPDF cannot write an outline: adds /Outlines (bookmarks) with pdf-lib (vendored, loaded on demand).
// items: [{ level 1-6, title, page (0-based) }] in document order -> Buffer.
export async function addOutline(buf, items) {
  const { PDFDocument, PDFHexString, PDFName } = await import('../../vendor/pdf-lib.js');
  const pdf = await PDFDocument.load(buf), ctx = pdf.context, pages = pdf.getPages();
  const top = [], stack = [];
  for (const it of items) {
    if (!pages[it.page]) continue;
    const n = { ...it, ref: ctx.nextRef(), kids: [] };
    while (stack.length && stack[stack.length - 1].level >= n.level) stack.pop();
    (stack.length ? stack[stack.length - 1].kids : top).push(n);
    stack.push(n);
  }
  if (!top.length) return buf;
  const size = (list) => list.reduce((s, k) => s + 1 + size(k.kids), 0);
  const link = (list, parent) => list.forEach((n, i) => {
    const d = { Title: PDFHexString.fromText(n.title), Parent: parent, Dest: [pages[n.page].ref, 'XYZ', null, null, null] };
    if (i) d.Prev = list[i - 1].ref;
    if (i < list.length - 1) d.Next = list[i + 1].ref;
    if (n.kids.length) Object.assign(d, { First: n.kids[0].ref, Last: n.kids[n.kids.length - 1].ref, Count: size(n.kids) });
    ctx.assign(n.ref, ctx.obj(d));
    link(n.kids, n.ref);
  });
  const root = ctx.nextRef();
  ctx.assign(root, ctx.obj({ Type: 'Outlines', First: top[0].ref, Last: top[top.length - 1].ref, Count: size(top) }));
  link(top, root);
  pdf.catalog.set(PDFName.of('Outlines'), root);
  pdf.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
  return Buffer.from(await pdf.save());
}
