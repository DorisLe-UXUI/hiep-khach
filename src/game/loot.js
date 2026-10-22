/**
 * Chiến lợi phẩm: binh khí có tên (ảnh riêng), đồ ăn thức uống (hồi phục / tăng lực tạm thời)
 * và tạp vật quái rơi (bán lấy bạc). Ảnh ở /assets/thumbs/<thumb>.png, mô hình rơi ở /assets/loot/.
 */

// ───────── Binh khí có tên ─────────
// tier: bậc (0 → 9), quyết định cấp tối thiểu để rơi (tier × 3). thumb: ảnh trong /assets/thumbs.
export const NAMED_WEAPONS = [
  // KayKit
  { id: 'sword_a', name: 'Mộc kiếm', han: '木劍', tier: 0, thumb: 'wpn_sword_a' },
  { id: 'sword_b', name: 'Thanh đồng kiếm', han: '青銅劍', tier: 1, thumb: 'wpn_sword_b' },
  { id: 'sword_c', name: 'Thanh Sương kiếm', han: '青霜劍', tier: 3, thumb: 'wpn_sword_c' },
  { id: 'sword_d', name: 'Tử Điện kiếm', han: '紫電劍', tier: 5, thumb: 'wpn_sword_d' },
  { id: 'sword_e', name: 'Huyết Long kiếm', han: '血龍劍', tier: 7, thumb: 'wpn_sword_e' },
  { id: 'axe_a', name: 'Khai sơn phủ', han: '開山斧', tier: 1, thumb: 'wpn_axe_a' },
  { id: 'axe_b', name: 'Song nhận phủ', han: '雙刃斧', tier: 3, thumb: 'wpn_axe_b' },
  { id: 'axe_c', name: 'Phá Thiên phủ', han: '破天斧', tier: 6, thumb: 'wpn_axe_c' },
  { id: 'dagger_a', name: 'Liễu diệp chuỷ', han: '柳葉匕', tier: 0, thumb: 'wpn_dagger_a' },
  { id: 'dagger_b', name: 'Truy Hồn chuỷ', han: '追魂匕', tier: 4, thumb: 'wpn_dagger_b' },
  { id: 'fist_a', name: 'Thiết quyền sáo', han: '鐵拳套', tier: 1, thumb: 'wpn_fistweapon_a' },
  { id: 'fist_b', name: 'Hổ trảo', han: '虎爪', tier: 4, thumb: 'wpn_fistweapon_b' },
  { id: 'halberd', name: 'Phương Thiên hoạ kích', han: '方天畫戟', tier: 8, thumb: 'wpn_halberd' },
  { id: 'hammer_a', name: 'Lưu tinh chuỳ', han: '流星錘', tier: 2, thumb: 'wpn_hammer_a' },
  { id: 'hammer_b', name: 'Lôi Thần chuỳ', han: '雷神錘', tier: 6, thumb: 'wpn_hammer_b' },
  { id: 'hammer_c', name: 'Bát lăng chuỳ', han: '八稜錘', tier: 4, thumb: 'wpn_hammer_c' },
  { id: 'spear_a', name: 'Lượng ngân thương', han: '亮銀槍', tier: 3, thumb: 'wpn_spear_a' },
  { id: 'staff_a', name: 'Thiền trượng', han: '禪杖', tier: 2, thumb: 'wpn_staff_a' },
  { id: 'staff_b', name: 'Long đầu trượng', han: '龍頭杖', tier: 5, thumb: 'wpn_staff_b' },
  { id: 'wand_a', name: 'Phất trần', han: '拂塵', tier: 2, thumb: 'wpn_wand_a' },
  { id: 'bow_a', name: 'Trúc cung', han: '竹弓', tier: 0, thumb: 'wpn_bow_a_withstring' },
  { id: 'bow_b', name: 'Bá Vương cung', han: '霸王弓', tier: 5, thumb: 'wpn_bow_b_withstring' },
  // Quaternius
  { id: 'q_sword', name: 'Hàn thiết kiếm', han: '寒鐵劍', tier: 2, thumb: 'lt_q_sword', obj: 'Sword' },
  { id: 'q_sword2', name: 'Thất Tinh kiếm', han: '七星劍', tier: 4, thumb: 'lt_q_sword2', obj: 'Sword_2' },
  { id: 'q_swordbig', name: 'Cự Khuyết kiếm', han: '巨闕劍', tier: 6, thumb: 'lt_q_swordbig', obj: 'Sword_Big' },
  { id: 'q_swordgold', name: 'Kim Long kiếm', han: '金龍劍', tier: 9, thumb: 'lt_q_swordgold', obj: 'Sword_Golden' },
  { id: 'q_claymore', name: 'Trảm mã đao', han: '斬馬刀', tier: 7, thumb: 'lt_q_claymore', obj: 'Claymore' },
  { id: 'q_dagger', name: 'Phi đao', han: '飛刀', tier: 1, thumb: 'lt_q_dagger', obj: 'Dagger' },
  { id: 'q_dagger2', name: 'Nga mi thích', han: '峨嵋刺', tier: 3, thumb: 'lt_q_dagger2', obj: 'Dagger_2' },
  { id: 'q_axe', name: 'Tuyên hoa phủ', han: '宣花斧', tier: 4, thumb: 'lt_q_axe', obj: 'Axe' },
  { id: 'q_axedouble', name: 'Bàn Cổ phủ', han: '盤古斧', tier: 8, thumb: 'lt_q_axedouble', obj: 'Axe_Double' },
  { id: 'q_axesmall', name: 'Đoản phủ', han: '短斧', tier: 0, thumb: 'lt_q_axesmall', obj: 'Axe_Small' },
  { id: 'q_hammerdouble', name: 'Kim qua chuỳ', han: '金瓜錘', tier: 7, thumb: 'lt_q_hammerdouble', obj: 'Hammer_Double' },
  { id: 'q_hammersmall', name: 'Thiết chuỳ', han: '鐵錘', tier: 1, thumb: 'lt_q_hammersmall', obj: 'Hammer_Small' },
  { id: 'q_spear', name: 'Hồng anh thương', han: '紅纓槍', tier: 5, thumb: 'lt_q_spear', obj: 'Spear' },
  { id: 'q_scythe', name: 'Câu Hồn liêm', han: '勾魂鐮', tier: 8, thumb: 'lt_q_scythe', obj: 'Scythe' },
  { id: 'q_bow', name: 'Hoàng dương cung', han: '黃楊弓', tier: 2, thumb: 'lt_q_bow', obj: 'Bow_Wooden' },
  { id: 'q_bow2', name: 'Liễu mộc cung', han: '柳木弓', tier: 3, thumb: 'lt_q_bow2', obj: 'Bow_Wooden2' },
  { id: 'q_bowgold', name: 'Xạ Nhật cung', han: '射日弓', tier: 9, thumb: 'lt_q_bowgold', obj: 'Bow_Golden' },
  { id: 'q_bowevil', name: 'Huyết Sát cung', han: '血煞弓', tier: 7, thumb: 'lt_q_bowevil', obj: 'Bow_Evil' },
];

/** Chọn binh khí có tên hợp cấp: ưu tiên bậc cao nhất được phép, phẩm cấp càng cao càng nhích lên. */
export function pickNamedWeapon(lv, rarity) {
  const maxTier = Math.min(9, Math.floor(lv / 3) + (rarity >= 3 ? 1 : 0));
  const pool = NAMED_WEAPONS.filter((w) => w.tier <= maxTier && w.tier >= maxTier - 3);
  return pool[Math.floor(Math.random() * pool.length)] || NAMED_WEAPONS[0];
}

// ───────── Đồ ăn thức uống ─────────
// hp/mp: phần trăm hồi; buff: [chỉ số, giá trị, giây]. src: tệp Kenney food-kit.
const FOOD = [
  ['rice_ball', 'Cơm nắm', '飯糰', 'rice-ball', { hp: 0.25 }],
  ['dim_sum', 'Há cảo hấp', '蝦餃', 'dim-sum', { hp: 0.3 }],
  ['steamer', 'Lồng bánh bao', '包子籠', 'steamer', { hp: 0.5 }],
  ['chicken_soup', 'Canh gà hầm', '雞湯', 'bowl-soup', { hp: 0.35, mp: 0.2 }],
  ['herb_porridge', 'Cháo thuốc', '藥粥', 'bowl-broth', { hp: 0.2, mp: 0.35 }],
  ['roast_meat', 'Thịt nướng', '烤肉', 'meat-cooked', { hp: 0.4 }],
  ['ribs', 'Sườn nướng mật', '蜜汁排骨', 'meat-ribs', { hp: 0.45 }],
  ['ham', 'Đùi giăm bông', '火腿', 'whole-ham', { hp: 0.6 }],
  ['roast_chicken', 'Gà quay', '烤雞', 'turkey', { hp: 0.7 }],
  ['meat_skewer', 'Xiên thịt', '肉串', 'skewer', { hp: 0.3, buff: ['atk', 6, 60] }],
  ['veg_skewer', 'Xiên rau', '菜串', 'skewer-vegetables', { hp: 0.2, mp: 0.2 }],
  ['fried_fish', 'Cá chiên giòn', '炸魚', 'fish', { hp: 0.35 }],
  ['boiled_egg', 'Trứng luộc', '煮蛋', 'egg-cooked', { hp: 0.15 }],
  ['mantou', 'Bánh màn thầu', '饅頭', 'loaf-round', { hp: 0.2 }],
  ['shaobing', 'Bánh nướng', '燒餅', 'pie', { hp: 0.3 }],
  ['mooncake', 'Bánh trung thu', '月餅', 'mincemeat-pie', { hp: 0.4, mp: 0.4 }],
  ['apple', 'Táo đỏ', '紅蘋果', 'apple', { hp: 0.12 }],
  ['snow_pear', 'Lê tuyết', '雪梨', 'pear', { mp: 0.2 }],
  ['grapes', 'Nho tím', '葡萄', 'grapes', { mp: 0.25 }],
  ['watermelon', 'Dưa hấu', '西瓜', 'watermelon', { hp: 0.3, mp: 0.3 }],
  ['cherries', 'Anh đào', '櫻桃', 'cherries', { hp: 0.1, buff: ['crit', 0.05, 60] }],
  ['mandarin', 'Quýt ngọt', '柑橘', 'orange', { mp: 0.2 }],
  ['wild_berry', 'Dâu rừng', '野莓', 'strawberry', { hp: 0.1, buff: ['spd', 0.06, 60] }],
  ['spirit_mushroom', 'Nấm linh', '靈菇', 'mushroom', { mp: 0.3 }],
  ['radish', 'Củ cải trắng', '白蘿蔔', 'radish', { hp: 0.15 }],
  ['carrot', 'Cà rốt', '胡蘿蔔', 'carrot', { hp: 0.1 }],
  ['grilled_corn', 'Bắp nướng', '烤玉米', 'corn', { hp: 0.2 }],
  ['pumpkin', 'Bí đỏ', '南瓜', 'pumpkin', { hp: 0.25 }],
  ['cabbage', 'Cải thảo', '白菜', 'cabbage', { hp: 0.15 }],
  ['honey', 'Mật ong rừng', '蜂蜜', 'honey', { hp: 0.2, mp: 0.2 }],
  ['longjing', 'Trà Long Tỉnh', '龍井茶', 'cup-tea', { mp: 0.4 }],
  ['nuerhong', 'Nữ Nhi Hồng', '女兒紅', 'wine-red', { hp: 0.1, buff: ['atk', 10, 90] }],
  ['zhuyeqing', 'Trúc Diệp Thanh', '竹葉青', 'wine-white', { mp: 0.1, buff: ['crit', 0.08, 90] }],
  ['hotpot', 'Lẩu thập cẩm', '火鍋', 'pot-stew', { hp: 0.8, mp: 0.5 }],
  ['coconut', 'Dừa tươi', '椰子', 'coconut', { mp: 0.3 }],
  ['tea_egg', 'Trứng trà', '茶葉蛋', 'egg', { hp: 0.15, mp: 0.1 }],
];
export const BUFF_NAME = { atk: 'Công', crit: 'Bạo kích', spd: 'Thân pháp' };

// ───────── Tạp vật quái rơi ─────────
// [id, tên, Hán, kit, tệp, giá bán, mô tả]
const MATS = [
  ['soul_lamp', 'Hồn đăng', '魂燈', 'grave', 'candle', 12, 'Ngọn nến xanh lấy từ yêu hồn. Pháp sư thu mua.'],
  ['seven_candles', 'Thất tinh chúc', '七星燭', 'grave', 'candle-multiple', 26, 'Bảy ngọn nến bày trận chiêu hồn.'],
  ['ghost_lantern', 'Đèn lồng ma', '鬼燈籠', 'grave', 'lantern-candle', 34, 'Đèn lồng cháy lửa lạnh, đêm rằm hay thấy trôi trong rừng.'],
  ['evil_chalice', 'Tà ngọc bôi', '邪玉杯', 'grave', 'detail-chalice', 60, 'Chén ngọc tà giáo dùng uống máu thề.'],
  ['bronze_bowl', 'Cổ đồng bát', '古銅碗', 'grave', 'detail-bowl', 18, 'Bát đồng cổ, thương nhân đồ cổ rất thích.'],
  ['bronze_plate', 'Đồng bàn', '銅盤', 'grave', 'detail-plate', 15, 'Đĩa đồng chạm hoa văn mây.'],
  ['ash_urn', 'Cốt hôi đàn', '骨灰罈', 'grave', 'urn-round', 22, 'Bình tro cốt của kẻ vô danh. Đem chôn sẽ được phúc.'],
  ['seal_jar', 'Phong ấn đàn', '封印罈', 'grave', 'urn-square', 48, 'Hũ dán bùa, bên trong có gì đó cựa quậy.'],
  ['demon_gourd', 'Yêu qua', '妖瓜', 'grave', 'pumpkin-carved', 30, 'Quả bí bị yêu khí khắc mặt quỷ.'],
  ['tomb_shovel', 'Đạo mộ sạn', '盜墓鏟', 'grave', 'shovel', 20, 'Xẻng của bọn trộm mộ.'],
  ['brazier', 'Hoả lò', '火爐', 'grave', 'fire-basket', 28, 'Giỏ lửa sắt, vẫn còn ấm.'],
  ['bandit_wine', 'Rượu sơn tặc', '賊酒', 'surv', 'bottle', 9, 'Bình rượu mạnh bọn sơn tặc mang theo.'],
  ['wine_jar', 'Vò rượu lớn', '大酒罈', 'surv', 'bottle-large', 24, 'Vò rượu ủ lâu năm.'],
  ['agarwood', 'Trầm hương mộc', '沉香木', 'surv', 'resource-wood', 32, 'Khúc gỗ trầm thơm ngát.'],
  ['dark_stone', 'Huyền thạch', '玄石', 'surv', 'resource-stone', 16, 'Đá đen cứng, thợ rèn dùng mài kiếm.'],
  ['planks', 'Ván gỗ lim', '鐵木板', 'surv', 'resource-planks', 10, 'Ván gỗ lim chắc, dùng đóng thuyền.'],
  ['pickaxe', 'Cuốc chim', '礦鎬', 'surv', 'tool-pickaxe', 14, 'Cuốc của phu mỏ bị yêu quái bắt đi.'],
  ['wood_axe', 'Rìu đốn củi', '柴斧', 'surv', 'tool-axe', 12, 'Rìu tiều phu.'],
  ['smith_hammer', 'Búa thợ rèn', '鍛錘', 'surv', 'tool-hammer', 18, 'Búa rèn nặng tay.'],
  ['big_carp', 'Cá chép lớn', '大鯉魚', 'surv', 'fish-large', 20, 'Cá chép to bằng bắp tay.'],
  ['mortar', 'Dược cữu', '藥臼', 'food', 'mortar-pestle', 22, 'Cối giã thuốc của thầy lang.'],
  ['bronze_pot', 'Nồi đồng', '銅鍋', 'food', 'pot', 16, 'Nồi đồng nấu cơm.'],
  ['ivory_chopsticks', 'Đũa ngà', '象牙箸', 'food', 'chopstic-decorative', 40, 'Đôi đũa ngà của nhà giàu.'],
  ['rice_sack', 'Bao gạo', '米袋', 'food', 'bag', 11, 'Bao gạo trắng, cứu đói cho dân làng.'],
  ['wine_barrel', 'Thùng rượu', '酒桶', 'food', 'barrel', 26, 'Thùng gỗ đựng rượu.'],
  ['soy_jar', 'Hũ tương', '醬罈', 'food', 'soy', 8, 'Hũ tương đậu nành.'],
  ['tea_set', 'Bộ trà sứ', '茶具', 'food', 'cup-saucer', 35, 'Chén trà sứ men xanh.'],
];

const effDesc = (e) => [e.hp && `hồi ${Math.round(e.hp * 100)}% khí huyết`, e.mp && `hồi ${Math.round(e.mp * 100)}% nội lực`, e.buff && `${BUFF_NAME[e.buff[0]]} +${e.buff[0] === 'atk' ? e.buff[1] : Math.round(e.buff[1] * 100) + '%'} trong ${e.buff[2]} giây`].filter(Boolean).join(', ');
const KIT_DIR = { food: 'food', grave: 'grave', surv: 'surv' };

export const LOOT_ITEMS = {};
for (const [id, name, han, file, eff] of FOOD) {
  const lvl = (eff.hp || 0) + (eff.mp || 0) + (eff.buff ? 0.3 : 0);
  LOOT_ITEMS[id] = { name, han, icon: 'meal', type: 'consumable', food: eff, model: `/assets/loot/food/${file}.glb`, thumb: `lt_${id}`, price: Math.round(10 + lvl * 60), sell: Math.round(3 + lvl * 15), desc: `Ăn: ${effDesc(eff)}.` };
}
for (const [id, name, han, kit, file, sell, desc] of MATS) {
  LOOT_ITEMS[id] = { name, han, icon: 'bag', type: 'material', loot: true, model: `/assets/loot/${KIT_DIR[kit]}/${file}.glb`, thumb: `lt_${id}`, sell, desc: `${desc} Bán được ${sell} lượng.` };
}
export const FOOD_IDS = FOOD.map((f) => f[0]);
export const MAT_IDS = MATS.map((m) => m[0]);

/** Một món ăn ngẫu nhiên (món càng hồi nhiều càng hiếm) */
export function randomFood() {
  const w = FOOD.map(([, , , , e]) => 1 / (0.2 + (e.hp || 0) + (e.mp || 0)));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < FOOD.length; i++) { x -= w[i]; if (x <= 0) return FOOD[i][0]; }
  return FOOD[0][0];
}
/** Tạp vật ngẫu nhiên; quái mạnh rơi đồ đắt hơn */
export function randomMat(big) {
  const pool = big ? MATS.filter((m) => m[5] >= 20) : MATS;
  return pool[Math.floor(Math.random() * pool.length)][0];
}

/** Danh sách để chụp ảnh: [tên tệp ảnh, đường dẫn mô hình] */
export const THUMB_JOBS = [
  ...Object.entries(LOOT_ITEMS).map(([, it]) => [it.thumb, it.model]),
  ...NAMED_WEAPONS.filter((w) => w.obj).map((w) => [w.thumb, `/vendor_dl/quaternius_weapons/x/OBJ/${w.obj}.obj`]),
];
