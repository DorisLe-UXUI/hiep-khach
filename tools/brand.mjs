// Chuẩn bị ảnh thương hiệu: tách nền ô vuông của logo, nén ảnh nền.
// Chạy: node tools/brand.mjs vendor_dl/brand_a.png vendor_dl/brand_b.png
import sharp from 'sharp';

const [logoIn, bgIn] = process.argv.slice(2);

async function cutCheckerboard(input, output) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
  // nền ô vuông: xám trung tính, sáng
  const isBg = (i) => {
    const [r, g, b] = px(i);
    return Math.max(r, g, b) - Math.min(r, g, b) < 14 && r > 110;
  };
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i] || !isBg(i)) continue;
    seen[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  // mảng ô vuông bị kẹt kín bên trong: xoá nếu gần như toàn điểm thuộc 2 tông xám của ô vuông
  const tone = (i) => { const r = data[i * 4]; return (r >= 126 && r <= 146) || (r >= 186 && r <= 206); };
  const comp = new Int32Array(W * H).fill(-1);
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || comp[s] !== -1 || !isBg(s)) continue;
    const list = [], st = [s];
    comp[s] = s;
    while (st.length) {
      const i = st.pop();
      list.push(i);
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < W * H && comp[j] === -1 && !seen[j] && isBg(j)) { comp[j] = s; st.push(j); }
      }
    }
    const hit = list.filter(tone).length / list.length;
    if (list.length > 80 && hit > 0.85) for (const i of list) seen[i] = 1;
  }
  // họa tiết ô vuông cục bộ: trong cửa sổ 20px có cả tông tối và tông sáng của ô vuông
  const dark = new Int32Array((W + 1) * (H + 1)), light = new Int32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, r = data[i * 4], n = isBg(i);
    const k = (y + 1) * (W + 1) + x + 1;
    dark[k] = (n && r >= 126 && r <= 146 ? 1 : 0) + dark[k - 1] + dark[k - W - 1] - dark[k - W - 2];
    light[k] = (n && r >= 186 && r <= 206 ? 1 : 0) + light[k - 1] + light[k - W - 1] - light[k - W - 2];
  }
  const box = (S, x0, y0, x1, y1) => S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0];
  const R = 10;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (seen[i] || !isBg(i)) continue;
    const x0 = Math.max(0, x - R), y0 = Math.max(0, y - R), x1 = Math.min(W, x + R + 1), y1 = Math.min(H, y + R + 1);
    const area = (x1 - x0) * (y1 - y0);
    if (box(dark, x0, y0, x1, y1) > area * 0.2 && box(light, x0, y0, x1, y1) > area * 0.2) seen[i] = 1;
  }
  // làm mềm viền: điểm sát nền nhận alpha trung gian
  const out = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    if (seen[i]) { out[i * 4 + 3] = 0; continue; }
    const x = i % W, y = (i / W) | 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && seen[yy * W + xx]) n++;
    }
    if (n) out[i * 4 + 3] = Math.round(255 * (1 - n / 12));
  }
  // cắt sát nội dung
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile(output);
}

await cutCheckerboard(logoIn, 'public/brand/logo.png');
await sharp(bgIn).removeAlpha().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toFile('public/brand/bg.jpg');
await sharp(bgIn).removeAlpha().resize({ width: 64 }).blur(2).jpeg({ quality: 60 }).toFile('public/brand/bg_tiny.jpg');
// favicon từ logo
await sharp('public/brand/logo.png').resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile('public/brand/icon.png');
console.log('ok');
