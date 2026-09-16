import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(fileURLToPath(new URL('../', import.meta.url)));
const root = join(project, 'dist');
const build = spawn(process.execPath, [join(project, 'scripts', 'build.mjs')], { cwd: project, stdio: 'inherit' });
let server;
const stop = () => {
  server?.close();
  if (!build.killed) build.kill();
  process.exit(0);
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
build.on('exit', (code) => {
  if (code !== 0) process.exit(code || 1);
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8' };
  server = createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method || 'GET')) { response.writeHead(405, { allow: 'GET, HEAD' }); response.end(); return; }
    let requestPath;
    try { requestPath = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname); }
    catch { response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }); response.end('请求路径无效'); return; }
    const base = resolve(root, requestPath.replace(/^\/+/, ''));
    if (base !== root && !base.startsWith(`${root}${sep}`)) { response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }); response.end('请求路径越界'); return; }
    const candidates = requestPath.endsWith('/') ? [resolve(base, 'index.html')] : [base, resolve(base, 'index.html')];
    let file = candidates[0];
    for (const candidate of candidates) { try { const info = await stat(candidate); if (info.isFile()) { file = candidate; break; } } catch {} }
    try { const data = await readFile(file); response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }); response.end(request.method === 'HEAD' ? undefined : data); } catch { const fallback = await readFile(join(root, '404.html')); response.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); response.end(request.method === 'HEAD' ? undefined : fallback); }
  });
  const port = Number(process.env.PORT || 4173);
  server.listen(port, '127.0.0.1', () => console.log(`预览地址：http://127.0.0.1:${port}/（Ctrl+C 停止）`));
});
