import { readFile, writeFile, mkdir } from 'node:fs/promises';
const source = name => readFile(new URL('../src/' + name, import.meta.url), 'utf8');
const [html, css, client, docs, core, worker] = await Promise.all(['index.html','style.css','client.js','documents.js','core.js','worker.js'].map(source));
await mkdir('dist/server', { recursive:true });
try {
  const hosting = await readFile('.openai/hosting.json');
  await mkdir('dist/.openai', { recursive:true });
  await writeFile('dist/.openai/hosting.json', hosting);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const assets = { '/': html, '/style.css': css, '/app.js': core + '\n' + docs + '\n' + client };
await writeFile('dist/server/index.js', 'const assets = ' + JSON.stringify(assets) + ';\n' + core + '\n' + worker);
