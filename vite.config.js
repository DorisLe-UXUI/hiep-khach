import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/** Chỉ khi dev: cho trang tools/bake.html lưu ảnh impostor vào public/assets/impostors/ */
function saveEndpoint() {
  const dirs = { impostors: path.resolve('public/assets/impostors'), thumbs: path.resolve('public/assets/thumbs') };
  return {
    name: 'save-impostor',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const q = new URL(req.url, 'http://x').searchParams;
        const name = q.get('name') || '';
        const dir = dirs[q.get('dir') || 'impostors'];
        if (req.method !== 'POST' || !dir || !/^[a-z0-9_]+\.(png|json)$/.test(name)) { res.statusCode = 400; return res.end('bad'); }
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

/** Tiền tố khoá localStorage trong script nội tuyến của index.html (bản dev: VITE_STORE_PREFIX=dev_) */
function storePrefix() {
  return { name: 'store-prefix', transformIndexHtml: (html) => html.replaceAll('__STORE_PREFIX__', process.env.VITE_STORE_PREFIX || '') };
}

export default defineConfig({
  plugins: [saveEndpoint(), storePrefix()],
  server: { port: 5180, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
