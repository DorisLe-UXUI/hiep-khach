import * as THREE from 'three';
import { loadGLTF } from '../engine/assets.js';
import { rng, smoothstep } from './noise.js';
import { PLACES, WATER_LEVEL } from './layout.js';

/**
 * Cảnh vật phong cách hoạt hình (Quaternius Stylized Nature MegaKit, CC0):
 * cây, thông, cây cổ thụ, bụi, đá, cỏ, hoa, nấm. Instancing chia theo ô lưới để cắt khung nhìn.
 */
async function nature(name) {
  const g = await loadGLTF(`/assets/nature/${name}.glb`);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.material) { o.material.side = THREE.DoubleSide; if (o.material.map) o.material.alphaTest = Math.max(o.material.alphaTest || 0, 0.4); }
  });
  return g.scene;
}

const CHUNK = 80;

/** Instancing theo ô 80m: mỗi ô một InstancedMesh để three tự cắt ô nằm ngoài khung nhìn. */
function chunkedInstances(scene, items, { shadow = true, radius = 0 } = {}) {
  scene.updateMatrixWorld(true);
  const parts = [];
  scene.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, local: o.matrixWorld.clone() }); });
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const cells = new Map();
  for (const it of items) {
    const key = `${Math.floor(it.x / CHUNK)},${Math.floor(it.z / CHUNK)}`;
    if (!cells.has(key)) cells.set(key, []);
    q.setFromEuler(new THREE.Euler(0, it.yaw, 0));
    cells.get(key).push({ x: it.x, z: it.z, m: new THREE.Matrix4().compose(p.set(it.x, it.y, it.z), q, s.setScalar(it.scale)) });
  }
  for (const list of cells.values()) {
    const cell = new THREE.Group();
    cell.userData.list = list;
    for (const part of parts) {
      const im = new THREE.InstancedMesh(part.geo, part.mat, list.length);
      list.forEach((t, i) => im.setMatrixAt(i, m.multiplyMatrices(t.m, part.local)));
      im.castShadow = shadow;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      cell.add(im);
    }
    group.add(cell);
  }
  if (radius) {
    // vật nhỏ (hoa, cỏ, sỏi): chỉ hiện các ô gần người chơi
    group.userData.update = (x, z) => {
      for (const c of group.children) {
        const t = c.userData.list[0];
        c.visible = Math.hypot(t.x - x, t.z - z) < radius + CHUNK;
      }
    };
  }
  return group;
}

function freeSpot(terrain, x, z, opts) {
  const sp = terrain.splatAt(x, z);
  if (sp.path > (opts.pathClear ?? 0.08) || sp.paved > 0.05) return false;
  const h = terrain.heightAt(x, z);
  if (h < WATER_LEVEL + 0.6) return false;
  if (1 - terrain.normalAt(x, z).y > (opts.maxSlope ?? 0.5)) return false;
  if (opts.avoid && opts.avoid.floorAt(x, z, 1e4) > -1e8) return false;
  if (opts.clearings !== false) {
    if (Math.hypot(x - PLACES.square.x, z - (PLACES.square.z + 15)) < (opts.town ?? 92)) return false;
    if (Math.hypot(x - PLACES.camp.x, z - PLACES.camp.z) < PLACES.camp.r + 6) return false;
    if (Math.hypot(x - PLACES.pavilion.x, z - PLACES.pavilion.z) < 16) return false;
    if (Math.hypot(x - PLACES.bamboo.x, z - PLACES.bamboo.z) < PLACES.bamboo.r + 4) return false;
    if (Math.hypot(x - PLACES.tomb.x, z - PLACES.tomb.z) < 22) return false;
  }
  return true;
}

function scatter(terrain, count, seed, opts = {}, density = () => 1) {
  const r = rng(seed), out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 40) {
    const x = (r() * 2 - 1) * 370, z = (r() * 2 - 1) * 370;
    if (r() > density(x, z)) continue;
    if (!freeSpot(terrain, x, z, opts)) continue;
    out.push({ x, z, y: terrain.heightAt(x, z) - 0.05, yaw: r() * Math.PI * 2, scale: (opts.minS ?? 0.8) + r() * ((opts.maxS ?? 1.2) - (opts.minS ?? 0.8)) });
  }
  return out;
}

const forest = (x, z) => {
  const d = Math.hypot(x, z);
  const n = Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2) * 0.5 + 0.5;
  return Math.min(1, smoothstep(110, 250, d) * 0.9 + n * 0.35);
};
const open = (x, z) => 1 - forest(x, z) * 0.6;

export async function buildStylizedVegetation(terrain, colliders, onProgress = () => {}) {
  const root = new THREE.Group();
  root.name = 'stylized-vegetation';
  const near = [];
  const add = async (names, count, seed, opts, density, solid = 0) => {
    opts = { ...opts, avoid: colliders };
    const per = Math.ceil(count / names.length);
    for (let i = 0; i < names.length; i++) {
      const items = scatter(terrain, per, seed + i * 17, opts, density);
      const inst = chunkedInstances(await nature(names[i]), items, opts);
      if (opts.radius) near.push(inst);
      root.add(inst);
      if (solid) for (const it of items) colliders.circle(it.x, it.z, solid * it.scale);
    }
    onProgress(`Trồng ${names[0]}...`);
  };
  // rừng
  await add(['pine_1', 'pine_2', 'pine_3', 'pine_4', 'pine_5'], 1300, 101, { minS: 1.4, maxS: 2.3, maxSlope: 0.6 }, forest, 0.45);
  await add(['commontree_1', 'commontree_2', 'commontree_3', 'commontree_4', 'commontree_5'], 900, 202, { minS: 1.3, maxS: 2.0 }, forest, 0.45);
  await add(['twistedtree_1', 'twistedtree_3', 'twistedtree_5'], 90, 303, { minS: 1.4, maxS: 2.0 }, open, 0.6);
  await add(['deadtree_1', 'deadtree_3'], 60, 404, { minS: 1.2, maxS: 1.8, maxSlope: 0.7 }, forest, 0.35);
  // bụi, đá
  await add(['bush_common', 'bush_common_flowers'], 900, 505, { minS: 1.2, maxS: 2.0, shadow: true }, open);
  await add(['rock_medium_1', 'rock_medium_2', 'rock_medium_3'], 500, 606, { minS: 1.2, maxS: 3.0, maxSlope: 0.9 }, forest, 0.5);
  // vật nhỏ quanh người chơi
  const small = { radius: 70, shadow: false, clearings: true, town: 60 };
  await add(['grass_common_short', 'grass_common_tall', 'grass_wispy_short', 'grass_wispy_tall'], 9000, 707, { ...small, minS: 1.2, maxS: 2.2 }, open);
  await add(['flower_3_group', 'flower_4_group', 'flower_3_single', 'flower_4_single'], 2600, 808, { ...small, minS: 0.7, maxS: 1.2 }, open);
  await add(['mushroom_common', 'mushroom_laetiporus', 'fern_1', 'plant_1_big', 'plant_7_big', 'clover_1', 'clover_2'], 2400, 909, { ...small, minS: 1.0, maxS: 1.8 }, forest);
  await add(['pebble_round_1', 'pebble_round_3', 'pebble_square_2', 'pebble_square_5'], 1600, 1001, { ...small, minS: 1.0, maxS: 2.5, pathClear: 0.9 }, () => 1);
  // hoa cỏ trang trí trong trấn (tránh đường lát)
  await add(['flower_3_group', 'flower_4_group', 'bush_common_flowers', 'grass_common_short'], 500, 1101, { radius: 70, shadow: false, clearings: false, minS: 0.7, maxS: 1.2, pathClear: 0.02 },
    (x, z) => (Math.hypot(x - PLACES.square.x, z - (PLACES.square.z + 15)) < 90 ? 1 : 0));
  return {
    group: root,
    update(x, z) { for (const n of near) n.userData.update(x, z); },
  };
}
