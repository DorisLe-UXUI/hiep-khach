// Bản đầy đủ của game (đường dẫn tương đối, nén ảnh, tối ưu .glb) cho máy chủ riêng (MSI). Máy chủ riêng gọi:
//   node tools/build_pages.mjs --out dist-msi-prod        (bản chính)   ·   --dev --out dist-msi-dev   (bản dev)
// Thử ở máy: npm run build:msi / npm run build:msi:dev. Game đã chuyển khỏi GitHub Pages: nhánh gh-pages giờ chỉ là trang
// chuyển hướng (kèm bản lưu) sang tên miền mới, nên công cụ này từ chối ghi vào dist-pages* (worktree gh-pages).
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// --dev: bản dev (tiền tố lưu riêng dev_, huy hiệu DEV)
const DEV = process.argv.includes('--dev');
// --out <thư mục>: thư mục kết quả (mặc định dist-msi-prod / dist-msi-dev)
const oi = process.argv.indexOf('--out');
const OUT_NAME = oi > 0 ? process.argv[oi + 1] : DEV ? 'dist-msi-dev' : 'dist-msi-prod';
if (!/^[\w.-]+$/.test(OUT_NAME || '') || OUT_NAME.startsWith('.')) throw new Error(`--out: tên thư mục không hợp lệ: ${OUT_NAME}`);
if (OUT_NAME.startsWith('dist-pages')) {
  console.error('build_pages: game đã chuyển sang máy chủ riêng; dist-pages* là trang chuyển hướng trên GitHub Pages, không được ghi đè.');
  console.error('Đẩy lên nhánh dev / main của repo: máy chủ riêng tự triển khai (dev-hiepkhach / hiepkhach.sentrystrategy.com).');
  process.exit(1);
}
const OUT = path.join(ROOT, OUT_NAME);
const env = { ...process.env };
if (DEV) {
  env.VITE_STORE_PREFIX = 'dev_';
  env.VITE_DEV_BUILD = '1';
  env.VITE_DEV_SHA = process.env.VITE_DEV_SHA || execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
}
execSync(`npx vite build --base ./ --outDir ${OUT_NAME} --emptyOutDir --logLevel error`, { cwd: ROOT, stdio: 'inherit', env });
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

// tệp không được src/ hay index.html tham chiếu: bỏ khỏi bản build (bản gốc trong public/ giữ nguyên)
const DEAD = [
  'hdri/misty_pines.hdr', 'hdri/sunset_forest.hdr', // không có trong TIMES của sky.js
  'monsters/fbx/Dragon.fbx', 'monsters/fbx/Skeleton.fbx', 'monsters/fbx/Slime.fbx', 'monsters/fbx/Snake_angry.fbx',
  'kit/animals/Zebra.fbx', 'kit/animals/Llama.fbx', 'kit/animals/Horse.fbx', 'kit/animals/Pug.fbx', // nay dùng assets/beasts
  // GLB nguồn đã bake thành impostor, chỉ còn tên trong vegetation.js
  'models/jacaranda_tree.glb', 'models/fir_tree_01.glb', 'models/island_tree_02.glb', 'models/tree_small_02.glb', 'models/fir_sapling.glb',
];
for (const f of DEAD) fs.rmSync(path.join(A, f), { force: true });

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
// impostor: atlas 4096 px → 2048, giữ nguyên PNG và tên tệp (meta là kích thước thế giới, không đổi)
for (const f of walk(path.join(A, 'impostors')).filter((f) => /_(color|normal)\.png$/.test(f)))
  jobs.push([f, 'imp2048', (b) => sharp(b).resize({ width: 2048, withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()]);
// nhân vật/sinh vật có khung xương: texture tối đa 1024 + WebP, không giản lược/ghép lưới
const CHAR_DIRS = ['heroes', 'characters', 'chibi', 'monsters', 'beasts', 'folk'];
for (const f of CHAR_DIRS.flatMap((d) => walk(path.join(A, d))).filter((f) => f.endsWith('.glb') && !/(^|\/)(anim_|w_)[^/]*\.glb$/.test(f)))
  jobs.push([f, 'char1024s', (b, file) => {
    const tmp = path.join(CACHE, 'tmp_' + crypto.createHash('md5').update(file).digest('hex') + '.glb');
    execSync(`npx gltf-transform optimize "${file}" "${tmp}" --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false --weld false --instance false --flatten false --palette false --resample false`, { cwd: ROOT, stdio: 'ignore' });
    const out = fs.readFileSync(tmp); fs.rmSync(tmp); return out;
  }]);
for (const [f] of jobs) before += fs.statSync(f).size;
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => { while (i < jobs.length) { const [f, k, fn] = jobs[i++]; await squeeze(f, k, fn); } }));
for (const [f] of jobs) after += fs.statSync(f).size;
console.log(`nén ${jobs.length} tệp: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
const sz = execSync(`du -sh "${OUT}"`).toString().split('\t')[0];
console.log(OUT_NAME, sz);
