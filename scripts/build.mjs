import { createHash } from 'node:crypto';
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
const browserScript = [core, docs, client].join('\n');
const hash = content => createHash('sha256').update(content).digest('hex').slice(0,12);
const cssPath = '/style.' + hash(css) + '.css';
const scriptPath = '/app.' + hash(browserScript) + '.js';
const buildId = hash([html, css, browserScript, worker].join('\n'));
const page = html.replace('/style.css', cssPath).replace('/app.js', scriptPath);
const assets = { '/': page, [cssPath]: css, [scriptPath]: browserScript, '/style.css': css, '/app.js': browserScript };
await writeFile('dist/server/index.js', 'const assets = ' + JSON.stringify(assets) + ';\nconst buildId = ' + JSON.stringify(buildId) + ';\n' + core + '\n' + worker);
