// Biểu tượng giao diện 3D (ảnh nền trắng) → PNG trong suốt, cắt sát, 256px (khung avatar 512px).
// Chạy: node tools/ui_icons.mjs <thư mục ảnh> → public/assets/ui/<id>.png
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/assets/ui');
fs.mkdirSync(OUT, { recursive: true });
const MAP = {
  '3D_folded_treasure_map': 'map', '3D_speech_bubble': 'chat', 'Ancient_Chinese_gold_coins': 'coin', 'Ancient_monster_book': 'bestiary',
  'Bamboo_scroll_and_calligraphy': 'quest', 'Blue_spirit_flame': 'skill', 'Cartoon_sword_in_rocky_hill': 'm_new', 'Chinese_hanfu_robe': 'm_hero',
  'Chinese_warrior_helmet': 'gear', 'Dragon_game_avatar_frame': 'frame_vip', 'Gems_cluster': 'gem', 'Glossy_3D_bamboo_fishing_rod': 'life',
  'Glossy_3D_cream_envelope': 'mail', 'Glossy_3D_open_book': 'm_chapter', 'Glossy_ancient_Chinese_market_stall': 'shop', 'Glossy_bronze_alchemy_cauldron': 'craft',
  'Glossy_brown_horse': 'mount', 'Glossy_cartoon_shiba_inu_face': 'pet', 'Glossy_glass_potion_bottle': 'potion_blue', 'Glossy_red_gift_box': 'gift',
  'Golden_game_controller': 'm_controls', 'Golden_gear_icon': 'settings', 'Golden_laurel_badge': 'title', 'Golden_people_silhouettes': 'friends',
  'Golden_round_game_avatar_frame': 'frame', 'Golden_squares_menu': 'more', 'Golden_trophy': 'rank', 'Leather_adventurer_backpack': 'bag',
  'Meditating_figure': 'meridian', 'Red_and_gold_battle_flag': 'm_continue', 'Red_and_gold_war_banner': 'guild', 'Red_calendar': 'event',
  'Red_potion_bottle': 'potion_red', 'Two_chibi_heads': 'team', 'auto_swords': 'auto',
};

async function cut(file, id) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = (x, y) => (y * W + x) * 4;
  // màu nền = trung bình 4 góc
  const corners = [px(2, 2), px(W - 3, 2), px(2, H - 3), px(W - 3, H - 3)];
  const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + data[i + c], 0) / 4);
  const dist = (i) => Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
  const T = 26, SOFT = 60;
  const seen = new Uint8Array(W * H), stack = [];
  const seed = (x, y) => { stack.push(x, y); };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  const flood = (bgc) => { while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x]) continue;
    const i = px(x, y), d = Math.hypot(data[i] - bgc[0], data[i + 1] - bgc[1], data[i + 2] - bgc[2]);
    if (d > SOFT) continue;
    seen[y * W + x] = 1;
    data[i + 3] = d < T ? 0 : Math.round(((d - T) / (SOFT - T)) * 255);
    if (d < T) stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  } };
  flood(bg);
  if (id.startsWith('frame')) { // khung avatar: khoét luôn phần giữa theo màu ở tâm
    const c = px(W >> 1, H >> 1);
    seen.fill(0); seed(W >> 1, H >> 1); flood([data[c], data[c + 1], data[c + 2]]);
  }
  const size = id.startsWith('frame') ? 512 : 256;
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, id + '.png'));
}

for (const f of fs.readdirSync(SRC)) {
  const key = Object.keys(MAP).find((k) => f.startsWith(k));
  if (!key) continue;
  await cut(path.join(SRC, f), MAP[key]);
  console.log(MAP[key]);
}
