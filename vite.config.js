import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/** Chỉ khi dev: cho trang tools/bake.html lưu ảnh impostor vào public/assets/impostors/ */
function saveEndpoint() {
  const dir = path.resolve('public/assets/impostors');
  return {
    name: 'save-impostor',
    configureServer(server) {
      server.middlewares.use('/__save', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') || '';
        if (req.method !== 'POST' || !/^[a-z0-9_]+\.(png|json)$/.test(name)) { res.statusCode = 400; return res.end('bad'); }
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

export default defineConfig({
  plugins: [saveEndpoint()],
  server: { port: 5180, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
});
