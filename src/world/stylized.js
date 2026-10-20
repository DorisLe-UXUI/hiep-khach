import * as THREE from 'three';
import { loadGLTF } from '../engine/assets.js';
import { rng, smoothstep } from './noise.js';
import { PLACES, WATER_LEVEL } from './layout.js';

/**
 * Cảnh vật phong cách hoạt hình (Quaternius Stylized Nature MegaKit, CC0):
 * cây, thông, cây cổ thụ, bụi, đá, cỏ, hoa, nấm. Instancing chia theo ô lưới để cắt khung nhìn.
 */
/** Vị trí nhân vật để làm trong suốt cây che giữa camera và nhân vật (dùng chung mọi vật liệu cây). */
export const REVEAL = { uReveal: { value: new THREE.Vector3(1e6, 0, 0) } };

function addReveal(mat) {
  if (mat.userData.reveal) return;
  mat.userData.reveal = true;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = REVEAL.uReveal;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRevealW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
  {
    vec4 rw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      rw = instanceMatrix * rw;
    #endif
    vRevealW = (modelMatrix * rw).xyz;
  }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRevealW;\nuniform vec3 uReveal;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  {
    // phần cây nằm giữa camera và nhân vật: đục lỗ kiểu dither để thấy nhân vật
    vec3 a = cameraPosition, b = uReveal + vec3(0.0, 1.0, 0.0);
    vec3 ab = b - a;
    float t = clamp(dot(vRevealW - a, ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(vRevealW - (a + ab * t));
    if (t < 0.97 && d < 3.2) {
      float k = smoothstep(3.2, 1.2, d);
      float dither = fract(dot(floor(gl_FragCoord.xy), vec2(0.5, 0.25)) * 2.0);
      if (dither < k * 0.85) discard;
    }
  }`);
  };
}

async function nature(name) {
  const g = await loadGLTF(`/assets/nature/${name}.glb`);
  const tree = /tree|pine/.test(name);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (o.material) {
      o.material.side = THREE.DoubleSide;
      if (o.material.map) o.material.alphaTest = Math.max(o.material.alphaTest || 0, 0.4);
      if (tree) addReveal(o.material);
    }
  });
  return g.scene;
}

/**
 * Instancing theo bán kính quanh người chơi: mỗi phần mesh chỉ MỘT lệnh vẽ,
 * danh sách bản sao được lọc lại khi người chơi đi xa hơn 12% bán kính.
 */
function chunkedInstances(scene, items, { shadow = true, radius = 160 } = {}) {
  scene.updateMatrixWorld(true);
  const parts = [];
  scene.traverse((o) => { if (o.isMesh) parts.push({ geo: o.geometry, mat: o.material, local: o.matrixWorld.clone() }); });
  const group = new THREE.Group();
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), m = new THREE.Matrix4();
  const placed = items.map((it) => {
    q.setFromEuler(new THREE.Euler(0, it.yaw, 0));
    return { x: it.x, z: it.z, m: new THREE.Matrix4().compose(p.set(it.x, it.y, it.z), q, s.setScalar(it.scale)) };
  });
  const ims = parts.map((part) => {
    const im = new THREE.InstancedMesh(part.geo, part.mat, Math.max(1, placed.length));
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.frustumCulled = false;
    im.count = 0;
    group.add(im);
    return { im, local: part.local };
  });
  let lx = 1e9, lz = 1e9;
  group.userData.update = (x, z) => {
    if (Math.hypot(x - lx, z - lz) < radius * 0.12) return;
    lx = x; lz = z;
    const r2 = radius * radius;
    const list = placed.filter((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < r2);
    for (const { im, local } of ims) {
      list.forEach((t, i) => im.setMatrixAt(i, m.multiplyMatrices(t.m, local)));
      im.count = list.length;
      im.instanceMatrix.needsUpdate = true;
    }
  };
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
      near.push(inst);
      root.add(inst);
      if (solid) for (const it of items) colliders.circle(it.x, it.z, solid * it.scale);
    }
    onProgress(`Trồng ${names[0]}...`);
  };
  // rừng
  await add(['pine_1', 'pine_2', 'pine_3', 'pine_4', 'pine_5'], 1100, 101, { minS: 1.4, maxS: 2.3, maxSlope: 0.6, radius: 150 }, forest, 0.45);
  await add(['commontree_1', 'commontree_2', 'commontree_3', 'commontree_4', 'commontree_5'], 700, 202, { minS: 1.3, maxS: 2.0, radius: 150 }, forest, 0.45);
  await add(['twistedtree_1', 'twistedtree_3', 'twistedtree_5'], 90, 303, { minS: 1.4, maxS: 2.0, radius: 170 }, open, 0.6);
  await add(['deadtree_1', 'deadtree_3'], 60, 404, { minS: 1.2, maxS: 1.8, maxSlope: 0.7, radius: 130 }, forest, 0.35);
  // bụi, đá
  await add(['bush_common', 'bush_common_flowers'], 700, 505, { minS: 1.2, maxS: 2.0, shadow: false, radius: 90 }, open);
  await add(['rock_medium_1', 'rock_medium_2', 'rock_medium_3'], 400, 606, { minS: 1.2, maxS: 3.0, maxSlope: 0.9, shadow: false, radius: 120 }, forest, 0.5);
  // vật nhỏ quanh người chơi
  const small = { radius: 45, shadow: false, clearings: true, town: 60 };
  await add(['grass_common_short', 'grass_common_tall', 'grass_wispy_short', 'grass_wispy_tall'], 5000, 707, { ...small, minS: 1.2, maxS: 2.2 }, open);
  await add(['flower_3_group', 'flower_4_group', 'flower_3_single', 'flower_4_single'], 1600, 808, { ...small, minS: 0.7, maxS: 1.2 }, open);
  await add(['mushroom_common', 'mushroom_laetiporus', 'fern_1', 'plant_1_big', 'plant_7_big', 'clover_1', 'clover_2'], 1400, 909, { ...small, minS: 1.0, maxS: 1.8 }, forest);
  await add(['pebble_round_1', 'pebble_round_3', 'pebble_square_2', 'pebble_square_5'], 800, 1001, { ...small, minS: 1.0, maxS: 2.5, pathClear: 0.9 }, () => 1);
  // hoa cỏ trang trí trong trấn (tránh đường lát)
  await add(['flower_3_group', 'flower_4_group', 'bush_common_flowers', 'grass_common_short'], 500, 1101, { radius: 60, shadow: false, clearings: false, minS: 0.7, maxS: 1.2, pathClear: 0.02 },
    (x, z) => (Math.hypot(x - PLACES.square.x, z - (PLACES.square.z + 15)) < 90 ? 1 : 0));
  return {
    group: root,
    update(x, z) { for (const n of near) n.userData.update(x, z); },
  };
}
