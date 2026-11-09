// Downloads the bundled Noto fonts (SIL OFL 1.1) from the google/fonts repository into renderer/fonts/. Run once: node tools/fonts.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'renderer', 'fonts');
const RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl';
const FILES = [
  ['noto-serif/NotoSerif.ttf', 'notoserif/NotoSerif[wdth,wght].ttf'],
  ['noto-serif/NotoSerif-Italic.ttf', 'notoserif/NotoSerif-Italic[wdth,wght].ttf'],
  ['noto-sans/NotoSans.ttf', 'notosans/NotoSans[wdth,wght].ttf'],
  ['noto-sans/NotoSans-Italic.ttf', 'notosans/NotoSans-Italic[wdth,wght].ttf'],
  ['noto-naskh-arabic/NotoNaskhArabic.ttf', 'notonaskharabic/NotoNaskhArabic[wght].ttf'],
];

for (const [dest, src] of FILES) {
  const res = await fetch(`${RAW}/${src.split('/').map(encodeURIComponent).join('/')}`);
  if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
  const file = path.join(OUT, dest);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  console.log('fonts:', dest);
}
