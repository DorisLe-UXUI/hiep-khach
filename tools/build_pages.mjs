// Bản đầy đủ cho GitHub Pages (chạy ở thư mục con /<repo>/): đường dẫn tương đối, giữ nguyên file .glb.
// Chạy: node tools/build_pages.mjs → dist-pages/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist-pages');
fs.rmSync(OUT, { recursive: true, force: true });
execSync('npx vite build --base ./ --outDir dist-pages --emptyOutDir --logLevel error', { cwd: ROOT, stdio: 'inherit' });
const rel = (s) => s.replace(/(["'`(])\/(assets|brand)\//g, '$1./$2/');
const A = path.join(OUT, 'assets');
for (const f of fs.readdirSync(A)) {
  const p = path.join(A, f);
  if (f.endsWith('.js')) fs.writeFileSync(p, rel(fs.readFileSync(p, 'utf8')));
  if (f.endsWith('.css')) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/url\(\/(brand|assets)\//g, 'url(../$1/'));
}
fs.writeFileSync(path.join(OUT, 'index.html'), rel(fs.readFileSync(path.join(OUT, 'index.html'), 'utf8')));
// ảnh chụp gỡ lỗi không cần đưa lên
for (const f of fs.readdirSync(path.join(A, 'thumbs'))) if (f.startsWith('dbg_')) fs.rmSync(path.join(A, 'thumbs', f));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const sz = execSync(`du -sh "${OUT}"`).toString().split('\t')[0];
console.log('dist-pages', sz);
