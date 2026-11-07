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
try { new URL(target); } catch {
  console.error('Địa chỉ đích không hợp lệ:', target);
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'redirect.html'), 'utf8')
  .replaceAll('__TARGET__', () => JSON.stringify(target))
  .replaceAll('__PREFIX__', () => JSON.stringify(prefix));

fs.mkdirSync(path.dirname(path.resolve(outfile)), { recursive: true });
fs.writeFileSync(outfile, html);
console.log('Đã tạo', outfile, '→', target, prefix ? `(tiền tố "${prefix}")` : '(không tiền tố)');
