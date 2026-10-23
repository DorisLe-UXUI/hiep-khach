// Bản đầy đủ cho GitHub Pages (chạy ở thư mục con /<repo>/): đường dẫn tương đối, giữ nguyên file .glb.
// Chạy: node tools/build_pages.mjs → dist-pages/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist-pages');
// giữ thư mục .git của nhánh gh-pages (Vite --emptyOutDir không xoá .git)
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

// ───── nén cho web (bản gốc trong public/ giữ nguyên); kết quả lưu đệm theo nội dung tệp ─────
const CACHE = path.join(ROOT, '.cache-pages');
fs.mkdirSync(CACHE, { recursive: true });
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
async function squeeze(file, kind, fn) {
  const buf = fs.readFileSync(file);
  const key = path.join(CACHE, crypto.createHash('md5').update(kind).update(buf).digest('hex') + path.extname(file));
  if (!fs.existsSync(key)) {
    const out = await fn(buf, file);
    fs.writeFileSync(key, out && out.length < buf.length ? out : buf);
  }
  fs.copyFileSync(key, file);
}
let before = 0, after = 0;
const jobs = [];
// texture nền/tường/mái: JPEG 1024 chất lượng 74, map pháp tuyến/độ nhám/AO thu về 512
for (const f of walk(path.join(A, 'textures')).filter((f) => f.endsWith('.jpg'))) {
  const small = !/diff\.jpg$/.test(f);
  jobs.push([f, 'tex' + small, (b) => sharp(b).resize({ width: small ? 512 : 1024, withoutEnlargement: true }).jpeg({ quality: small ? 80 : 74, mozjpeg: true }).toBuffer()]);
}
// biểu tượng UI và logo: thu nhỏ, PNG bảng màu
for (const f of walk(path.join(A, 'ui')).filter((f) => f.endsWith('.png')))
  jobs.push([f, 'ui', (b) => sharp(b).resize({ width: 256, height: 256, fit: 'inside', withoutEnlargement: true }).png({ palette: true, quality: 90, effort: 8 }).toBuffer()]);
for (const f of walk(path.join(OUT, 'brand')).filter((f) => f.endsWith('.png')))
  jobs.push([f, 'brand', (b) => sharp(b).resize({ width: 1100, withoutEnlargement: true }).png({ palette: true, quality: 90, effort: 8 }).toBuffer()]);
// đồ vật Polyhaven: ảnh trong glb thu về 512
for (const f of [...walk(path.join(A, 'models')), ...walk(path.join(A, 'nature'))].filter((f) => f.endsWith('.glb')))
  jobs.push([f, 'glbopt512s', (b, file) => {
    const tmp = path.join(CACHE, 'tmp_' + path.basename(file));
    // giản lược lưới: đồ vật Polyhaven rất chi tiết (vd. thanh katana 20k đỉnh) → ~1/5 mà nhìn không khác
    const err = file.includes('/models/') ? 0.004 : 0.002;
    execSync(`npx gltf-transform optimize "${file}" "${tmp}" --compress meshopt --texture-compress webp --texture-size 512 --simplify-error ${err}`, { cwd: ROOT, stdio: 'ignore' });
    const out = fs.readFileSync(tmp); fs.rmSync(tmp); return out;
  }]);
for (const [f] of jobs) before += fs.statSync(f).size;
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) { const [f, k, fn] = jobs[i++]; await squeeze(f, k, fn); } }));
for (const [f] of jobs) after += fs.statSync(f).size;
console.log(`nén ${jobs.length} tệp: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
const sz = execSync(`du -sh "${OUT}"`).toString().split('\t')[0];
console.log('dist-pages', sz);
