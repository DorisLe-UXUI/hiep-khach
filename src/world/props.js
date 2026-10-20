import * as THREE from 'three';
import { loadModel } from '../engine/assets.js';
import { PLACES } from './layout.js';

/**
 * Đặt đồ vật Poly Haven. Mỗi mục: [model, x, z, yaw, scale, yOffset, collideRadius]
 * Toạ độ trong khách điếm tính theo tâm khách điếm (cục bộ).
 */
const INN_PROPS = [
  ['chinese_tea_table', -4, -1, 0, 1.4], ['chinese_stool', -5, -1, 0], ['chinese_stool', -3, -1, Math.PI], ['tea_set_01', -4, -1, 0, 1, 0.62],
  ['chinese_tea_table', 1, -1, 0.2, 1.4], ['chinese_stool', 0, -1, 0], ['chinese_stool', 2, -1, Math.PI], ['jug_01', 1, -1, 0, 1, 0.62],
  ['chinese_tea_table', -4, 2.5, 0, 1.4], ['chinese_stool', -5, 2.5, 0], ['chinese_stool', -3, 2.5, Math.PI], ['wooden_bowl_01', -4, 2.5, 0, 1, 0.62],
  ['chinese_tea_table', 1, 2.5, 0, 1.4], ['chinese_armchair', 0, 2.5, Math.PI / 2], ['chinese_armchair', 2, 2.5, -Math.PI / 2],
  ['chinese_console_table', 5.2, -4.2, 0, 1.6], ['chinese_cabinet', -6.6, -4.6, 0, 1.2], ['chinese_cabinet', -4.6, -4.6, 0, 1.2],
  ['chinese_screen_panels', 3.6, -3.4, 0, 1.3], ['antique_ceramic_vase_01', 7.1, -4.7, 0, 1.5], ['ceramic_vase_03', 6.6, -4.6, 0, 1.3],
  ['wine_barrel_01', 7.1, 3.5, 0, 1], ['wine_barrel_01', 7.1, 2.3, 0.4, 1], ['wooden_barrels_01', 6.8, 0.6, 1.2, 0.9],
  ['katana_stand_01', 5.2, -4.4, 0, 1, 0.82],
  ['chinese_chandelier', -2.5, 0.5, 0, 1.2, 3.1], ['chinese_chandelier', 3, 0.5, 0, 1.2, 3.1],
];

const VILLAGE_PROPS = [
  ['wooden_lantern_01', 20, 34, 0, 1.6], ['wooden_lantern_01', 40, 34, 0, 1.6],
  ['wooden_crate_01', 64, 34, 0.3, 1, 0, 0.6], ['wooden_crate_02', 65, 35.5, 1.0, 1, 0, 0.6], ['Barrel_01', 63, 36.6, 0, 1, 0, 0.5],
  ['wicker_basket_01', 12, 50, 0, 1], ['wicker_basket_02', 13, 51.2, 0, 1], ['wooden_bucket_01', 50, 52, 0, 1],
  ['wooden_picnic_table', 42, 52, 0.4, 1, 0, 1.2], ['painted_wooden_bench', 18, 56, 1.4, 1, 0, 0.8],
  ['spinning_wheel_01', -2, 34, 1.2, 1, 0, 0.6], ['folding_wooden_stool', -1, 36, 0.3, 1],
  ['horse_statue_01', 30, 40, 0, 2.2, 0, 1.0], ['wooden_ladder', 63, 26, 0.0, 1, 0, 0],
  ['stone_fire_pit', 46, 74, 0, 1, 0, 0.8], ['wooden_stool_01', 44, 75, 0, 1], ['wooden_stool_02', 48, 73, 0, 1],
  ['wooden_bucket_02', 8, 80, 0, 1], ['wooden_crate_01', 58, 80, 0.5, 1, 0, 0.6],
];

const CAMP_PROPS = [
  ['stone_fire_pit', 0, 2, 0, 1.4, 0, 1.1], ['wooden_crate_01', -8, -12, 0.3, 1, 0, 0.6], ['wooden_crate_02', -9, -10.5, 1.3, 1, 0, 0.6],
  ['wooden_barrels_01', 9, -12, 0.2, 1, 0, 1.2], ['Barrel_01', 12, 6, 0, 1, 0, 0.5], ['Barrel_01', 13, 7, 0, 1, 0, 0.5],
  ['wooden_axe', 4, 4, 0.5, 1, 0.1], ['hatchet', -3, 4, 2, 1, 0.1], ['wooden_bowl_02', 2, 0, 0, 1, 0.05], ['treasure_chest', 0, -21, 0, 1.2, 0, 0.8],
  ['wooden_ladder', -14, 24, 0, 1], ['Lantern_01', -5, -14, 0, 1], ['Lantern_01', 5, -14, 0, 1],
];

async function place(list, toWorld, terrain, colliders, floorY = null) {
  const g = new THREE.Group();
  for (const [name, lx, lz, yaw = 0, scale = 1, yOff = 0, coll = 0] of list) {
    const [x, z, rot] = toWorld(lx, lz);
    const m = (await loadModel(name)).clone(true);
    const y = (floorY ?? terrain.heightAt(x, z)) + yOff;
    m.position.set(x, y, z);
    m.rotation.y = yaw + rot;
    m.scale.setScalar(scale);
    g.add(m);
    if (coll) colliders.circle(x, z, coll * scale, y + 1.2);
  }
  return g;
}

export async function buildProps(terrain, colliders, spots) {
  const root = new THREE.Group();
  root.name = 'props';
  const I = PLACES.inn;
  root.add(await place(INN_PROPS, (x, z) => [I.x + x, I.z + z, 0], terrain, colliders, spots.innFloor));
  // bàn ghế trong khách điếm cũng chắn đường
  for (const [n, x, z] of INN_PROPS) if (n === 'chinese_tea_table') colliders.circle(I.x + x, I.z + z, 0.7, spots.innFloor + 0.8);
  root.add(await place(VILLAGE_PROPS, (x, z) => [x, z, 0], terrain, colliders));
  const Cp = PLACES.camp;
  root.add(await place(CAMP_PROPS, (x, z) => [Cp.x + x, Cp.z + z, 0], terrain, colliders));
  // rương báu trong rừng trúc (dùng cho nhiệm vụ)
  const chest = (await loadModel('treasure_chest')).clone(true);
  chest.position.set(PLACES.chest.x, terrain.heightAt(PLACES.chest.x, PLACES.chest.z), PLACES.chest.z);
  chest.rotation.y = 0.6;
  root.add(chest);
  colliders.circle(PLACES.chest.x, PLACES.chest.z, 0.7, chest.position.y + 1);
  return { group: root, chest };
}
