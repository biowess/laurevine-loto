// Fixture generator for performance benchmarks: 5 MB doc, 50k-line doc, 2 MB line, 10k-file workspace, 300-table doc.
import { promises as fsp } from 'node:fs';
import path from 'node:path';

export async function generateFixtures(outDir = 'fixtures/perf') {
  await fsp.mkdir(outDir, { recursive: true });

  // 1. 5 MB document
  const sample = '# Large Document\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\n';
  let doc5mb = '';
  while (Buffer.byteLength(doc5mb, 'utf8') < 5 * 1024 * 1024) {
    doc5mb += `## Section ${doc5mb.length}\n\n` + sample + '- Bullet point item\n- Another bullet point\n\n```js\nconsole.log("hello");\n```\n\n';
  }
  await fsp.writeFile(path.join(outDir, 'doc-5mb.md'), doc5mb);

  // 2. 50k-line document
  const lines50k = [];
  for (let i = 1; i <= 50000; i++) {
    lines50k.push(i % 50 === 1 ? `## Heading at line ${i}` : i % 5 === 0 ? `- List item at line ${i}` : `Line ${i}: paragraph content lorem ipsum dolor sit amet.`);
  }
  await fsp.writeFile(path.join(outDir, 'doc-50k-lines.md'), lines50k.join('\n'));

  // 3. Single 2 MB line
  const line2mb = 'A'.repeat(2 * 1024 * 1024);
  await fsp.writeFile(path.join(outDir, 'doc-2mb-line.md'), line2mb);

  // 4. 10k-file workspace (100 folders x 100 files)
  const wsDir = path.join(outDir, 'workspace-10k');
  await fsp.mkdir(wsDir, { recursive: true });
  for (let d = 0; d < 100; d++) {
    const sub = path.join(wsDir, `folder-${String(d).padStart(3, '0')}`);
    await fsp.mkdir(sub, { recursive: true });
    for (let f = 0; f < 100; f++) {
      await fsp.writeFile(path.join(sub, `file-${String(f).padStart(3, '0')}.md`), `# Note ${d}-${f}\n\nContent for note in folder ${d}.\n`);
    }
  }

  // 5. 300-table document
  const tables = ['# Document with 300 tables\n\n'];
  for (let t = 1; t <= 300; t++) {
    tables.push(`### Table ${t}\n\n| Column 1 | Column 2 | Column 3 |\n| :--- | :---: | ---: |\n| Data ${t}-1 | Value A | 100 |\n| Data ${t}-2 | Value B | 200 |\n\n`);
  }
  await fsp.writeFile(path.join(outDir, 'doc-300-tables.md'), tables.join(''));
}

if (process.argv[1] && process.argv[1].endsWith('gen-fixtures.mjs')) {
  generateFixtures(process.argv[2] || 'fixtures/perf').catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
