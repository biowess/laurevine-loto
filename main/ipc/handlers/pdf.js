import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { assetMime } from '../../app/asset-path.js';
import { DocError } from '../../services/fs/safe-path.js';
import { activeRoot } from '../../services/workspace/index.js';
import { cancelPdf, exportPdf, pickPdfDir } from '../../services/publish/pdf.js';
import { run } from './reply.js';

const within = (root, file) => { const r = path.relative(root, file); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };

export const exportDoc = (p, event) => run(() => exportPdf(event, p));

export const pickDir = (p, event) => run(() => pickPdfDir(event));

export const cancel = (p, event) => run(async () => { cancelPdf(event.sender, p.id); return {}; });

// One image inside the document folder or the active workspace, for inlining into the publication.
export const asset = (p, event) => run(async () => {
  const base = await fsp.realpath(p.baseDir), file = await fsp.realpath(path.resolve(base, p.rel)), mime = assetMime(file), root = activeRoot(event);
  if (!mime || !mime.startsWith('image/') || !(within(base, file) || (root && within(await fsp.realpath(root), file)))) throw new DocError('E_PATH', 'The image is not an image inside the document folder or workspace.');
  const st = await fsp.stat(file);
  if (!st.isFile() || st.size > 25000000) throw new DocError('E_TOOBIG', 'The image is too large.');
  return { mime, data: (await fsp.readFile(file)).toString('base64') };
});
