// Phục vụ assets-build/ ở cổng 5180 với header giống bản chạy thật. Chạy: pnpm dev:assets
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets-build');
const PORT = Number(process.env.PORT ?? 5180);

const TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
};
const HASHED = /\.[0-9a-f]{8}\.[a-z0-9]+$/;

http
  .createServer(async (req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
      return;
    }
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
      const file = path.resolve(DIR, rel);
      if (file !== DIR && !file.startsWith(DIR + path.sep)) throw new Error('ngoài thư mục');
      if (path.basename(file).startsWith('.')) throw new Error('file ẩn');
      const s = await stat(file);
      if (!s.isFile()) throw new Error('không phải file');
      const name = path.basename(file);
      const cache = HASHED.test(name) ? 'public, max-age=31536000, immutable' : 'no-cache';
      res.writeHead(200, {
        ...cors,
        'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': s.size,
        'Cache-Control': cache,
      });
      if (req.method === 'HEAD') res.end();
      else createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { ...cors, 'Content-Type': 'text/plain; charset=utf-8' }).end('Không có file');
    }
  })
  .listen(PORT, () => console.log(`Đồ họa: http://localhost:${PORT}/manifest.json  (thư mục assets-build/)`));
