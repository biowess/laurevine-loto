import { isTextName } from '../../core/documents/paths.js';

export function mountDrop(ctx, openPaths) {
  const { h, toast } = ctx.ui;
  const ov = h('div', { class: 'lv-drop', 'aria-hidden': 'true', hidden: true }, h('div', { class: 'lv-drop__box' }, 'Drop Markdown or text files to open'));
  document.body.append(ov);
  let depth = 0;
  const files = (e) => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  const hide = () => { depth = 0; ov.hidden = true; };
  document.addEventListener('dragenter', (e) => { if (files(e)) { e.preventDefault(); depth++; ov.hidden = false; } }, true);
  document.addEventListener('dragover', (e) => { if (files(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }, true);
  document.addEventListener('dragleave', (e) => { if (files(e) && --depth <= 0) hide(); }, true);
  document.addEventListener('drop', (e) => {
    if (!files(e)) return;
    hide();
    if (e.target.closest?.('#src,#prev') && Array.from(e.dataTransfer.files).some((f) => f.type.startsWith('image/'))) return;
    e.preventDefault(); e.stopPropagation();
    const all = Array.from(e.dataTransfer.files), ok = all.filter((f) => isTextName(f.name)), bad = all.filter((f) => !isTextName(f.name));
    if (bad.length) toast(`Can't open ${bad.map((f) => f.name).join(', ')}: only .md, .markdown, .mdown and .txt files are supported.`, { timeout: 5000 });
    const paths = ok.map((f) => (window.loto?.pathForFile ? window.loto.pathForFile(f) : '')).filter(Boolean);
    if (ok.length && !paths.length) toast('Could not read the dropped file path.');
    if (paths.length) openPaths(paths);
  }, true);
}
