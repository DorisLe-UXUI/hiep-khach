// Điền địa chỉ đích và tiền tố khoá vào trang chuyển hướng.
// Dùng: node tools/move/make_redirect.mjs <target> <prefix> <outfile>
// Ví dụ: node tools/move/make_redirect.mjs https://hiepkhach.sentrystrategy.com/ "" index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [target, prefix, outfile] = process.argv.slice(2);
if (!target || prefix === undefined || !outfile) {
  console.error('Dùng: node tools/move/make_redirect.mjs <target> <prefix> <outfile>');
  process.exit(1);
}
let url;
try { url = new URL(target); } catch {
  console.error('Địa chỉ đích không hợp lệ:', target);
  process.exit(1);
}
if (url.protocol !== 'https:') {
  console.error('Địa chỉ đích phải dùng https:', target);
  process.exit(1);
}
if (!/^(dev_)?$/.test(prefix)) {
  console.error('Tiền tố không hợp lệ (chỉ nhận "" hoặc "dev_"):', prefix);
  process.exit(1);
}

// Chuỗi JS an toàn: JSON.stringify + thoát < > & để không phá thẻ <script>.
const jsString = (s) => JSON.stringify(String(s)).replace(
  /[<>&]/g,
  (c) => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026' })[c],
);

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'redirect.html'), 'utf8')
  .replace(/__TARGET__|__PREFIX__/g, (m) => jsString(m === '__TARGET__' ? target : prefix));

fs.mkdirSync(path.dirname(path.resolve(outfile)), { recursive: true });
fs.writeFileSync(outfile, html);
console.log('Đã tạo', outfile, '→', target, prefix ? `(tiền tố "${prefix}")` : '(không tiền tố)');
