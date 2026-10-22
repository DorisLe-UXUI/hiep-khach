// Bản rút gọn để đăng lên claude.ai: chỉ chibi, đường dẫn tương đối, JS/CSS nhúng thẳng vào trang.
// Chạy: node tools/build_lite.mjs  → dist-lite/ (index.html + assets/ + brand/)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist-lite');
fs.rmSync(OUT, { recursive: true, force: true });
execSync(`npx vite build --base ./ --outDir dist-lite --emptyOutDir --logLevel error`, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, VITE_LITE: '1' } });

// 1) giữ asset cần cho chế độ chibi
const KEEP_DIRS = ['audio', 'beasts', 'heroes', 'chibi', 'folk', 'kit', 'monsters', 'nature', 'thumbs', 'licenses'];
const keepList = fs.readFileSync(path.join(ROOT, 'tools/lite_models.txt'), 'utf8').split(/\s+/).filter(Boolean);
const A = path.join(OUT, 'assets');
for (const d of fs.readdirSync(A)) {
  const p = path.join(A, d);
  if (!fs.statSync(p).isDirectory() || KEEP_DIRS.includes(d)) continue;
  if (d === 'models' || d === 'textures') {
    for (const f of fs.readdirSync(p)) {
      const id = `${d}/${f.replace(/\.glb$/, '')}`;
      if (!keepList.includes(id)) fs.rmSync(path.join(p, f), { recursive: true });
    }
  } else fs.rmSync(p, { recursive: true });
}
// bỏ file không được code nhắc tới (kit, vũ khí OBJ, âm thanh thừa)
const walkSrc = (d) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? walkSrc(p) : p.endsWith('.js') ? [fs.readFileSync(p, 'utf8')] : []; });
const SRC = walkSrc(path.join(ROOT, 'src')).join('\n');
const used = (file) => { const b = path.basename(file).replace(/\.[^.]+$/, ''), c = b.replace(/^(w_|mon_b_|mon_|folk_|anim_)/, '').replace(/\d+$/, ''); return SRC.includes(b) || SRC.includes(c); };
fs.rmSync(path.join(A, 'kit/animals'), { recursive: true, force: true }); // ngựa/chó FBX cũ, nay dùng assets/beasts
const SFX_KEYS = [...SRC.match(/const SFX = \{([^}]+)\}/)[1].matchAll(/(\w+):/g)].map((m) => m[1]);
for (const f of fs.readdirSync(path.join(A, 'audio/sfx'))) if (!SFX_KEYS.includes(f.replace(/\d*\.mp3$/, ''))) fs.rmSync(path.join(A, 'audio/sfx', f));
for (const d of ['kit', 'kit/weapons']) for (const f of fs.readdirSync(path.join(A, d))) { const p = path.join(A, d, f); if (fs.statSync(p).isFile() && !used(f)) fs.rmSync(p); }
for (const f of fs.readdirSync(path.join(A, 'thumbs'))) if (f.startsWith('dbg_')) fs.rmSync(path.join(A, 'thumbs', f)); // ảnh chụp gỡ lỗi
// gộp giấy phép thành một file
const LIC = path.join(A, 'licenses');
const merged = fs.readdirSync(LIC).sort().map((f) => `===== ${f} =====\n${fs.readFileSync(path.join(LIC, f), 'utf8').trim()}\n`).join('\n');
fs.rmSync(LIC, { recursive: true });
fs.writeFileSync(path.join(OUT, 'LICENSES.txt'), merged);
fs.rmSync(path.join(OUT, 'brand/bg_tiny.jpg'), { force: true });
// vân bản đồ thấp (roughness) không dùng ở chibi; giữ diff/nor
for (const t of fs.readdirSync(path.join(A, 'textures'))) for (const f of fs.readdirSync(path.join(A, 'textures', t))) if (!/^(diff|nor)\.jpg$/.test(f)) fs.rmSync(path.join(A, 'textures', t, f));

// thu nhỏ để tải nhanh: texture 512px, ảnh trong model đồ đạc 512px, ảnh nền nén lại
const FF = path.join(ROOT, 'node_modules/ffmpeg-static/ffmpeg');
for (const t of fs.readdirSync(path.join(A, 'textures'))) for (const f of fs.readdirSync(path.join(A, 'textures', t))) {
  const p = path.join(A, 'textures', t, f), tmp = p + '.tmp.jpg';
  execSync(`"${FF}" -v error -y -i "${p}" -vf scale=512:-1 -q:v 5 "${tmp}"`); fs.renameSync(tmp, p);
}
for (const f of fs.readdirSync(path.join(A, 'models'))) {
  const p = path.join(A, 'models', f), tmp = p.replace(/\.glb$/, '.tmp.glb');
  execSync(`npx gltf-transform optimize "${p}" "${tmp}" --compress meshopt --texture-compress webp --texture-size 512 --simplify false`, { cwd: ROOT, stdio: 'ignore' });
  if (fs.existsSync(tmp) && fs.statSync(tmp).size < fs.statSync(p).size) fs.renameSync(tmp, p); else fs.rmSync(tmp, { force: true });
}
{ const p = path.join(OUT, 'brand/logo.png'), tmp = p + '.tmp.png'; execSync(`"${FF}" -v error -y -i "${p}" -vf scale=880:-1 -pix_fmt rgba "${tmp}"`); fs.renameSync(tmp, p); }
{ const p = path.join(OUT, 'brand/bg.jpg'), tmp = p + '.tmp.jpg'; execSync(`"${FF}" -v error -y -i "${p}" -vf "scale='min(1600,iw)':-1" -q:v 6 "${tmp}"`); fs.renameSync(tmp, p); }

// model nhị phân → base64 văn bản (claude.ai chỉ phục vụ các kiểu web chuẩn)
const toB64 = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) toB64(p); else if (/\.(glb|fbx)$/i.test(f)) { fs.writeFileSync(p + '.b64.txt', fs.readFileSync(p).toString('base64')); fs.rmSync(p); } } };
toB64(A);

// 2) đường dẫn tuyệt đối → tương đối (trang nằm ở gốc thư mục)
const rel = (s) => s.replace(/(["'`(])\/(assets|brand)\//g, '$1./$2/');
let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
// nhúng JS + CSS của Vite
const js = [], css = [];
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g, (_, f) => { js.push(f); return ''; });
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (_, f) => { css.push(f); return ''; });
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
let inlineCss = css.map((f) => fs.readFileSync(path.join(OUT, f), 'utf8')).join('\n').replace(/url\(\.\.\/brand\//g, 'url(./brand/').replace(/url\(\/brand\//g, 'url(./brand/');
let inlineJs = js.map((f) => rel(fs.readFileSync(path.join(OUT, f), 'utf8'))).join('\n');
for (const f of [...js, ...css]) fs.rmSync(path.join(OUT, f));
for (const f of fs.readdirSync(A)) if (/\.(js|css|map)$/.test(f)) fs.rmSync(path.join(A, f));
html = rel(html)
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<body([^>]*)>/i, '')
  .replace(/<\/body>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<title>[^<]*<\/title>/i, '<title>Thiên Kiếm Giang Hồ</title>')
  .replace(/<link rel="preconnect"[^>]*>/g, '');
html = html.replace('</title>', `</title>\n<style>${inlineCss}</style>`);
html += `\n<script type="module">${inlineJs.replace(/<\/script/gi, '<\\/script')}</script>\n`;
fs.writeFileSync(path.join(OUT, 'index.html'), html.trim() + '\n');

// 3) thống kê
const all = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : all.push(p); } };
walk(OUT);
const total = all.reduce((s, p) => s + fs.statSync(p).size, 0);
console.log(`files ${all.length}, total ${(total / 1048576).toFixed(1)} MB, page ${(fs.statSync(path.join(OUT, 'index.html')).size / 1048576).toFixed(2)} MB`);
