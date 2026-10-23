// Ảnh 16:9 chứa nhiều biểu tượng trên nền trắng → tách từng cái thành PNG trong suốt 256px.
// Chạy: node tools/sheet_icons.mjs <thư mục ảnh> → public/assets/ui/<id>.png
// Biểu tượng tròn (chiêu thức, huy hiệu): cắt theo hình tròn khít viền vàng; đồ vật: xoá nền từ mép vào.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/assets/ui');
// tiền tố tên tệp → danh sách id theo thứ tự trái→phải, trên→dưới; round = cắt tròn
const SHEETS = [
  ['Game_skill_icons_sprite_sheet_20261023142242_2', true, ['sk_kiem_q', 'sk_kiem_f', 'sk_kiem_u1', 'sk_kiem_u2', 'sk_thuong_q', 'sk_thuong_f', 'sk_thuong_u1', 'sk_thuong_u2', 'sk_roll', 'sk_jump']],
  ['Game_skill_icons_sprite_sheet_20261023142242', true, ['sk_cung_q', 'sk_cung_f', 'sk_cung_u1', 'sk_cung_u2', 'sk_phap_q', 'sk_phap_f', 'sk_phap_u1', 'sk_phap_u2', 'sk_block', 'sk_rage']],
  ['Game_icons_sprite_sheet_layout', true, ['sk_dao_q', 'sk_dao_f', 'sk_dao_u1', 'sk_dao_u2', 'cls_kiem', 'cls_thuong', 'cls_cung', 'cls_phap', 'cls_dao', 'sk_atk']],
  ['Wuxia_game_item_icons_sprite', false, ['eq_helm', 'eq_armor', 'eq_belt', 'eq_boots', 'eq_ring', 'eq_trinket', 'battlefield', 'duel', 'master', 'marry']],
  ['Game_UI_icons_sprite_sheet', false, ['family', 'auction', 'house', 'journal', 'enhance']],
  ['Status_effect_icon_sprite_sheet', true, ['st_atk', 'st_crit', 'st_spd', 'st_shield', 'st_regen', 'st_poison', 'st_burn', 'st_freeze', 'st_stun', 'st_bleed']],
  ['Game_resource_icons_sprite_sheet', false, ['rs_gold', 'rs_silver', 'rs_crystal', 'rs_qi', 'rs_exp', 'rs_contrib', 'rs_bounty', 'rs_vip', 'rs_chest', 'rs_key']],
  ['Game_achievement_badge_icons_grid', false, ['bd_bronze', 'bd_silver', 'bd_gold', 'bd_jade', 'bd_phoenix', 'bd_hunter', 'bd_tamer', 'bd_meridian', 'bd_gem', 'bd_crown']],
];

/** Tìm các cụm điểm khác nền trắng (trên lưới thu nhỏ), trả về khung bao theo thứ tự hàng rồi cột */
function blobs(data, W, H, want) {
  const S = 4, gw = Math.ceil(W / S), gh = Math.ceil(H / S), on = new Uint8Array(gw * gh);
  for (let y = 0; y < H; y += S) for (let x = 0; x < W; x += S) {
    const i = (y * W + x) * 3;
    if (255 * 3 - data[i] - data[i + 1] - data[i + 2] > 60) on[(y / S) * gw + x / S] = 1;
  }
  const lab = new Int32Array(gw * gh), out = [];
  for (let s = 0; s < on.length; s++) {
    if (!on[s] || lab[s]) continue;
    const st = [s]; lab[s] = out.length + 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (st.length) {
      const c = st.pop(), cx = c % gw, cy = (c / gw) | 0; n++;
      x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
      // nối cả điểm cách 2 ô để các phần rời của một món (vòng dây, tia lửa) gộp lại
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const k = ny * gw + nx;
        if (on[k] && !lab[k]) { lab[k] = lab[s]; st.push(k); }
      }
    }
    out.push({ x: x0 * S, y: y0 * S, w: (x1 - x0 + 1) * S, h: (y1 - y0 + 1) * S, n });
  }
  const big = out.sort((a, b) => b.n - a.n).slice(0, want);
  const rowH = H / 4;
  return big.sort((a, b) => Math.round((a.y + a.h / 2) / rowH) - Math.round((b.y + b.h / 2) / rowH) || a.x - b.x);
}

async function cutRound(file, b, id) {
  const pad = 2, size = Math.max(b.w, b.h) + pad * 2;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const R = 256, r = R / 2 - 1;
  const mask = Buffer.from(`<svg width="${R}" height="${R}"><circle cx="${R / 2}" cy="${R / 2}" r="${r}" fill="#fff"/></svg>`);
  await sharp(file).extract({ left: Math.max(0, Math.round(cx - size / 2)), top: Math.max(0, Math.round(cy - size / 2)), width: Math.round(size), height: Math.round(size) })
    .resize(R, R).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png({ compressionLevel: 9 }).toFile(path.join(OUT, id + '.png'));
}

async function cutItem(file, b, id) {
  const pad = 14;
  const meta = await sharp(file).metadata();
  const left = Math.max(0, b.x - pad), top = Math.max(0, b.y - pad);
  const crop = { left, top, width: Math.min(meta.width - left, b.w + pad * 2), height: Math.min(meta.height - top, b.h + pad * 2) };
  const { data, info } = await sharp(file).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (x, y) => (y * W + x) * 4;
  const T = 22, SOFT = 70, seen = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) st.push(x, 0, x, H - 1);
  for (let y = 0; y < H; y++) st.push(0, y, W - 1, y);
  while (st.length) {
    const y = st.pop(), x = st.pop();
    if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x]) continue;
    const i = px(x, y), d = Math.hypot(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
    if (d > SOFT) continue;
    seen[y * W + x] = 1;
    data[i + 3] = d < T ? 0 : Math.round(((d - T) / (SOFT - T)) * 255);
    if (d < T) st.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  // quầng sáng trắng quanh món phát sáng: tách màu trắng ra thành độ trong (giữ ánh sáng có màu)
  if (GLOW.has(id)) {
    // chỉ xử lý quầng nối liền với nền bên ngoài (đi từ điểm đã trong suốt qua các điểm gần trắng)
    const diffW = (i) => Math.max(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
    const halo = new Uint8Array(W * H), q = [];
    for (let k = 0; k < W * H; k++) if (data[k * 4 + 3] === 0) { halo[k] = 1; q.push(k); }
    while (q.length) {
      const c = q.pop(), cx = c % W, cy = (c / W) | 0;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (!halo[k] && diffW(k * 4) < 70) { halo[k] = 2; q.push(k); }
      }
    }
    for (let k = 0; k < W * H; k++) {
      if (halo[k] !== 2) continue;
      const i = k * 4, a = diffW(i) / 70;
      for (let ch = 0; ch < 3; ch++) data[i + ch] = a > 0.02 ? Math.max(0, Math.min(255, Math.round((data[i + ch] - 255 * (1 - a)) / a))) : 255;
      data[i + 3] = Math.min(data[i + 3], Math.round(a * 255));
    }
  }
  // vùng trắng bị bao kín (lòng đai, vành mũ): xoá thêm các mảng trắng tinh đủ lớn
  if (HOLES.has(id)) {
    const done = new Uint8Array(W * H);
    for (let s0 = 0; s0 < W * H; s0++) {
      const i0 = s0 * 4;
      if (done[s0] || data[i0 + 3] === 0 || Math.hypot(255 - data[i0], 255 - data[i0 + 1], 255 - data[i0 + 2]) > 14) continue;
      const reg = [], q = [s0]; done[s0] = 1;
      while (q.length) {
        const c = q.pop(); reg.push(c);
        const cx = c % W, cy = (c / W) | 0;
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const k = ny * W + nx, j = k * 4;
          if (!done[k] && data[j + 3] && Math.hypot(255 - data[j], 255 - data[j + 1], 255 - data[j + 2]) <= 14) { done[k] = 1; q.push(k); }
        }
      }
      if (reg.length > 400) for (const c of reg) data[c * 4 + 3] = 0;
    }
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, id + '.png'));
}

const HOLES = new Set(['eq_helm', 'eq_belt', 'marry']);
const GLOW = new Set(['rs_gold', 'rs_crystal', 'rs_exp', 'rs_chest', 'bd_gem']);
const files = fs.readdirSync(SRC);
for (const [prefix, round, ids] of SHEETS) {
  // tên dài khớp trước (tránh "..._2" bị nhận nhầm)
  const f = files.filter((x) => x.startsWith(prefix)).sort((a, b) => a.length - b.length)[0];
  if (!f) { console.log('thiếu', prefix); continue; }
  const file = path.join(SRC, f);
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bs = blobs(data, info.width, info.height, ids.length);
  if (bs.length !== ids.length) console.log('cảnh báo', f, 'tìm thấy', bs.length);
  for (let i = 0; i < ids.length && i < bs.length; i++) await (round ? cutRound : cutItem)(file, bs[i], ids[i]);
  console.log(f, '→', ids.join(' '));
}
