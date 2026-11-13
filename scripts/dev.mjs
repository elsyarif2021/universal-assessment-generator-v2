import './build.mjs';
import {createServer} from 'node:http';
import {parseArgs} from 'node:util';
const {values} = parseArgs({options:{host:{type:'string'},port:{type:'string'},strictPort:{type:'boolean'}}});
const {default: worker} = await import('../dist/server/index.js');
createServer(async (incoming, outgoing) => {
  try {
    const body = [];
    for await (const chunk of incoming) body.push(chunk);
    const request = new Request('http://localhost' + incoming.url, {method: incoming.method, headers:incoming.headers, ...(body.length && {body:Buffer.concat(body)})});
    const response = await worker.fetch(request, process.env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { outgoing.writeHead(500).end(); }
}).listen(Number(values.port || process.env.PORT || 3000), values.host || '0.0.0.0');
