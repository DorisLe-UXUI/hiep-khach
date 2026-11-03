import { loadGLTF } from './assets.js';
import { MESHY_MODELS, MESHY_DEFAULT, meshyFile } from '../actors/meshy.js';

/**
 * Model cần có trước khi hiện menu. Gọi tải song song ngay lúc khởi động để các bước dựng cảnh
 * (vốn chờ từng file một) lấy thẳng từ bộ đệm, không phải xếp hàng chờ mạng.
 * Danh sách đo từ lượt tải thực tế của màn hình chính (chế độ chibi).
 */
const H = '/assets/heroes/';
const BOOT = [
  // thiên nhiên: buildStylizedVegetation chờ từng file ngay lúc dựng cảnh
  '/assets/nature/pine_1.glb',
  '/assets/nature/pine_2.glb',
  '/assets/nature/pine_3.glb',
  '/assets/nature/pine_4.glb',
  '/assets/nature/pine_5.glb',
  '/assets/nature/commontree_1.glb',
  '/assets/nature/commontree_2.glb',
  '/assets/nature/commontree_3.glb',
  '/assets/nature/commontree_4.glb',
  '/assets/nature/commontree_5.glb',
  '/assets/nature/twistedtree_1.glb',
  '/assets/nature/twistedtree_3.glb',
  '/assets/nature/twistedtree_5.glb',
  '/assets/nature/deadtree_1.glb',
  '/assets/nature/deadtree_3.glb',
  '/assets/nature/deadtree_4.glb',
  '/assets/nature/bush_common.glb',
  '/assets/nature/bush_common_flowers.glb',
  '/assets/nature/rock_medium_1.glb',
  '/assets/nature/rock_medium_2.glb',
  '/assets/nature/rock_medium_3.glb',
  '/assets/nature/grass_common_short.glb',
  '/assets/nature/grass_common_tall.glb',
  '/assets/nature/grass_wispy_short.glb',
  '/assets/nature/grass_wispy_tall.glb',
  '/assets/nature/flower_3_group.glb',
  '/assets/nature/flower_4_group.glb',
  '/assets/nature/flower_3_single.glb',
  '/assets/nature/flower_4_single.glb',
  '/assets/nature/mushroom_common.glb',
  '/assets/nature/mushroom_laetiporus.glb',
  '/assets/nature/fern_1.glb',
  '/assets/nature/plant_1_big.glb',
  '/assets/nature/plant_7_big.glb',
  '/assets/nature/clover_1.glb',
  '/assets/nature/clover_2.glb',
  '/assets/nature/pebble_round_1.glb',
  '/assets/nature/pebble_round_3.glb',
  '/assets/nature/pebble_square_2.glb',
  '/assets/nature/pebble_square_5.glb',
  // chibi: animation dùng chung + model mặc định của người chơi/NPC
  '/assets/chibi/knight.glb',
  '/assets/chibi/anim_general.glb',
  '/assets/chibi/anim_movementbasic.glb',
  '/assets/chibi/anim_movementadvanced.glb',
  '/assets/chibi/anim_combatmelee.glb',
  '/assets/chibi/anim_combatranged.glb',
  '/assets/chibi/anim_special.glb',
  '/assets/chibi/anim_simulation.glb',
  '/assets/chibi/anim_tools.glb',
  '/assets/chibi/w_sword_1handed.glb',
  '/assets/chibi/barbarian.glb',
  '/assets/chibi/mage.glb',
  '/assets/chibi/rogue.glb',
  '/assets/chibi/ranger.glb',
  // nhân vật Meshy dựng ngay trong game.init(): NPC trấn, dịch vụ, cốt truyện
  H + 'barbarian_warrior.glb',
  H + 'dwarf_warrior.glb',
  H + 'forest_archer.glb',
  H + 'ice_assassin.glb',
  H + 'merchant.glb',
  H + 'old_master.glb',
  H + 'pink_maiden.glb',
  H + 'purple_fairy.glb',
  H + 'red_armor_warrior.glb',
  H + 'straw_hat_boy.glb',
  H + 'village_girl.glb',
];

/** Toàn bộ hình tượng Meshy: chỉ màn tạo nhân vật cần, nạp khi mở màn đó. */
export const CREATE = MESHY_MODELS.map((m) => H + m.file + '.glb');

/** Tệp model của nhân vật đang dùng (giống cách createHeroCharacter chọn model). */
function heroURL(h) {
  if (!h) return null;
  const id = h.model?.startsWith('mx:') ? h.model : MESHY_DEFAULT[`${h.cls}:${h.gender}`];
  const f = id && meshyFile(id);
  return f ? H + f + '.glb' : null;
}

export function preloadModels(hero, onEach) {
  const own = heroURL(hero);
  const list = own ? [...BOOT, own] : BOOT;
  for (const u of list) loadGLTF(u).then(onEach, () => {});
}

let creationP = null;
/** Nạp trước các hình tượng chỉ dùng ở màn tạo nhân vật; gọi nhiều lần vẫn chỉ một lượt tải. */
export function preloadCreation(onEach) {
  creationP ??= Promise.all(CREATE.map((u) => loadGLTF(u).catch(() => {})));
  if (onEach) creationP.then(() => CREATE.forEach(onEach));
  return creationP;
}
