import * as THREE from 'three';
import { loadModel } from '../engine/assets.js';
import { loadImpostor, impostorForest } from './impostor.js';
import { rng, smoothstep } from './noise.js';
import { PLACES, WATER_LEVEL } from './layout.js';

/**
 * Chép một scene glTF thành các InstancedMesh (mỗi mesh con một cái).
 * radius: chỉ vẽ những bản sao trong bán kính quanh người chơi (cho cây bụi nhiều polygon);
 * khi đó group.userData.update(x, z) cần được gọi mỗi frame.
 */
export function instanceModel(scene, transforms, { shadow = true, radius = 0 } = {}) {
  scene.updateMatrixWorld(true);
  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const placed = transforms.map((t) => {
    q.setFromEuler(new THREE.Euler(t.rx || 0, t.yaw || 0, t.rz || 0));
    return { x: t.x, z: t.z, m: new THREE.Matrix4().compose(p.set(t.x, t.y, t.z), q, s.setScalar(t.scale || 1)) };
  });
  const parts = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, transforms.length);
    im.castShadow = shadow;
    im.receiveShadow = true;
    parts.push({ im, local: o.matrixWorld.clone() });
    group.add(im);
  });
  const fill = (list) => {
    for (const { im, local } of parts) {
      list.forEach((t, i) => im.setMatrixAt(i, m.multiplyMatrices(t.m, local)));
      im.count = list.length;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
  };
  if (!radius) fill(placed);
  else {
    let lx = 1e9, lz = 1e9;
    group.userData.update = (x, z) => {
      if (Math.hypot(x - lx, z - lz) < radius * 0.15) return;
      lx = x; lz = z;
      const r2 = radius * radius;
      fill(placed.filter((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < r2));
    };
    for (const { im } of parts) im.frustumCulled = false;
    group.userData.update(0, 0);
  }
  return group;
}

/** Điểm có thể rải cây/đá không? */
function freeSpot(terrain, x, z, { pathClear = 0.08, maxSlope = 0.5, minH = WATER_LEVEL + 0.8, clearings = true } = {}) {
  const sp = terrain.splatAt(x, z);
  if (sp.path > pathClear || sp.paved > 0.05) return false;
  const h = terrain.heightAt(x, z);
  if (h < minH) return false;
  if (1 - terrain.normalAt(x, z).y > maxSlope) return false;
  if (clearings) {
    if (Math.hypot(x - PLACES.square.x, z - (PLACES.square.z + 15)) < 92) return false;
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
    out.push({ x, y: terrain.heightAt(x, z), z, yaw: r() * Math.PI * 2, scale: (opts.minS ?? 0.8) + r() * ((opts.maxS ?? 1.2) - (opts.minS ?? 0.8)), r: r() });
  }
  return out;
}

/** Mật độ rừng: dày ở các sườn núi, thưa ở thung lũng. */
function forestDensity(x, z) {
  const d = Math.hypot(x, z);
  const n = Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2) * 0.5 + 0.5;
  return Math.min(1, smoothstep(110, 250, d) * 0.9 + n * 0.35);
}

// ---------- Rừng trúc thủ tục ----------
function leafTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const r = rng(77);
  for (let i = 0; i < 46; i++) {
    const x = 20 + r() * 216, y = 20 + r() * 216, a = r() * Math.PI * 2, L = 34 + r() * 30;
    g.save(); g.translate(x, y); g.rotate(a);
    const hue = 85 + r() * 25, light = 24 + r() * 16;
    g.fillStyle = `hsl(${hue}, 45%, ${light}%)`;
    g.beginPath(); g.ellipse(0, 0, L, L * 0.13, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `hsla(${hue}, 40%, ${light + 12}%, .6)`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bambooGrove(terrain, colliders) {
  const B = PLACES.bamboo;
  const r = rng(9);
  const stalks = [];
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (B.r + 22);
    const x = B.x + Math.cos(a) * d, z = B.z + Math.sin(a) * d;
    if (terrain.splatAt(x, z).path > 0.1) continue;
    if (Math.hypot(x - PLACES.chest.x, z - PLACES.chest.z) < 7) continue;
    const edge = smoothstep(B.r - 5, B.r + 22, d);
    if (r() < edge) continue;
    stalks.push({ x, z, y: terrain.heightAt(x, z), h: 9 + r() * 8, rad: 0.05 + r() * 0.05, lean: (r() - 0.5) * 0.12, yaw: r() * 6.28 });
  }
  const g = new THREE.Group();
  const stalkGeo = new THREE.CylinderGeometry(1, 1, 1, 7, 12);
  stalkGeo.translate(0, 0.5, 0);
  // vẽ đốt trúc bằng vertex color
  const pos = stalkGeo.attributes.position, col = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), node = Math.abs((y * 12) % 1 - 0.5) > 0.46;
    const c = node ? [0.55, 0.6, 0.35] : [0.38, 0.52, 0.24];
    col.push(...c.map((v) => v * (0.8 + y * 0.35)));
  }
  stalkGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const stalkMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
  const sm = new THREE.InstancedMesh(stalkGeo, stalkMat, stalks.length);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  const leafGeo = new THREE.PlaneGeometry(2.6, 2.6);
  const leavesPer = 7;
  const lm = new THREE.InstancedMesh(leafGeo, leafMat, stalks.length * leavesPer);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  stalks.forEach((st, i) => {
    q.setFromEuler(new THREE.Euler(st.lean, st.yaw, st.lean * 0.7));
    sm.setMatrixAt(i, m.compose(p.set(st.x, st.y - 0.2, st.z), q, s.set(st.rad, st.h, st.rad)));
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    for (let k = 0; k < leavesPer; k++) {
      const t = 0.45 + (k / leavesPer) * 0.55;
      const lp = new THREE.Vector3(st.x, st.y, st.z).addScaledVector(up, st.h * t);
      const lq = new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 1.2 - 0.6, r() * 6.28, r() * 1.2 - 0.6));
      lm.setMatrixAt(i * leavesPer + k, m.compose(lp, lq, s.setScalar(0.8 + r() * 0.7)));
    }
    colliders.circle(st.x, st.z, st.rad + 0.08);
  });
  sm.castShadow = lm.castShadow = true;
  sm.receiveShadow = lm.receiveShadow = true;
  g.add(sm, lm);
  g.userData.leaves = lm;
  return g;
}

// ---------- Cỏ lá mọc quanh người chơi ----------
export class GrassField {
  constructor(terrain) {
    this.terrain = terrain;
    this.tile = 10;
    this.radius = 4; // ô quanh người chơi (9x9)
    this.perTile = 1400;
    const blade = new THREE.BufferGeometry();
    // lá cỏ 5 đỉnh, nhọn ở ngọn
    const w = 0.06, h = 1;
    blade.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.7, h * 0.5, 0, w * 0.7, h * 0.5, 0, 0, h, 0], 3));
    blade.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    blade.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 0.5, 1, 0.5, 0.5, 1], 2));
    blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
    this.uniforms = { uTime: { value: 0 } };
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.uniforms.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute vec4 aBlade;\nvarying float vH;\nvarying float vTint;')
        .replace('#include <begin_vertex>', `
  vec3 transformed = position;
  float bh = aBlade.w;
  transformed.y *= bh;
  float c = cos(aBlade.z), s = sin(aBlade.z);
  transformed.xz = mat2(c, -s, s, c) * transformed.xz;
  vec3 wp = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
  float wind = sin(uTime * 1.7 + wp.x * 0.35 + wp.z * 0.21) * 0.5 + sin(uTime * 3.1 + wp.x * 1.3) * 0.18;
  float k = uv.y * uv.y;
  transformed.x += wind * 0.28 * k * bh;
  transformed.z += (aBlade.x - 0.5) * 0.3 * k * bh + wind * 0.12 * k * bh;
  vH = uv.y; vTint = aBlade.y;
`)
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vH;\nvarying float vTint;')
        .replace('#include <map_fragment>', `
#ifdef STYLIZED
  vec3 base = mix(vec3(0.20, 0.45, 0.10), vec3(0.30, 0.55, 0.12), vTint);
  vec3 tip = mix(vec3(0.42, 0.74, 0.20), vec3(0.52, 0.80, 0.24), vTint);
  diffuseColor.rgb = mix(base, tip, vH);
#else
  vec3 base = mix(vec3(0.06, 0.12, 0.03), vec3(0.18, 0.27, 0.07), vTint);
  vec3 tip = mix(vec3(0.30, 0.44, 0.12), vec3(0.45, 0.50, 0.20), vTint);
  diffuseColor.rgb = mix(base, tip, vH) * mix(0.55, 1.0, vH);
#endif
`);
    };
    if (GrassField.stylized) { mat.defines = { STYLIZED: '' }; this.heightK = 0.55; } else this.heightK = 1;
    this.tiles = new Map();
    this.excl = [];
    this.pool = [];
    this.group = new THREE.Group();
    this.blade = blade;
    this.mat = mat;
  }

  makeTile(tx, tz) {
    let im = this.pool.pop();
    if (!im) {
      const g = this.blade.clone();
      g.setAttribute('aBlade', new THREE.InstancedBufferAttribute(new Float32Array(this.perTile * 4), 4));
      im = new THREE.InstancedMesh(g, this.mat, this.perTile);
      im.receiveShadow = true;
      im.frustumCulled = false;
    }
    const r = rng(((tx * 73856093) ^ (tz * 19349663)) >>> 0);
    const m = new THREE.Matrix4(), attr = im.geometry.attributes.aBlade;
    let n = 0;
    for (let i = 0; i < this.perTile; i++) {
      const x = (tx + r()) * this.tile, z = (tz + r()) * this.tile;
      const sp = this.terrain.splatAt(x, z);
      const h = this.terrain.heightAt(x, z);
      const keep = (1 - sp.path * 1.6) * (1 - sp.paved * 2) * (1 - sp.forest * 0.7) * (h > WATER_LEVEL + 0.5 ? 1 : 0) * (h < 40 ? 1 : 0);
      const rr = r(), a = r(), b = r(), c = r();
      if (rr > keep) continue;
      if (this.excl.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r)) continue;
      m.makeTranslation(x, h - 0.03, z);
      im.setMatrixAt(n, m);
      attr.setXYZW(n, a, b, c * 6.28, (0.35 + b * 0.45 + a * 0.25) * this.heightK);
      n++;
    }
    im.count = n;
    im.instanceMatrix.needsUpdate = true;
    attr.needsUpdate = true;
    this.group.add(im);
    return im;
  }

  update(px, pz, time) {
    this.uniforms.uTime.value = time;
    const cx = Math.floor(px / this.tile), cz = Math.floor(pz / this.tile);
    const want = new Set();
    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) want.add(`${cx + dx},${cz + dz}`);
    }
    for (const [k, im] of this.tiles) {
      if (!want.has(k)) { this.group.remove(im); this.pool.push(im); this.tiles.delete(k); }
    }
    let built = 0;
    for (const k of want) {
      if (this.tiles.has(k) || built > 3) continue;
      const [tx, tz] = k.split(',').map(Number);
      this.tiles.set(k, this.makeTile(tx, tz));
      built++;
    }
  }
}

export async function buildVegetation(terrain, colliders, renderer, onProgress = () => {}) {
  if (GrassField.stylized) {
    const { buildStylizedVegetation } = await import('./stylized.js');
    const st = await buildStylizedVegetation(terrain, colliders, onProgress);
    st.group.add(bambooGrove(terrain, colliders));
    const grass = new GrassField(terrain);
    grass.perTile = 450;
    st.group.add(grass.group);
    return { group: st.group, grass: {
      setRadius(r) { grass.radius = Math.min(r, 3); },
      exclude(x, z, r) { grass.excl.push({ x, z, r }); for (const [k, im] of grass.tiles) { grass.group.remove(im); grass.pool.push(im); grass.tiles.delete(k); } },
      update(x, z, t) { grass.update(x, z, t); st.update(x, z); },
    } };
  }
  const root = new THREE.Group();
  root.name = 'vegetation';

  // Rừng impostor từ cây quét 3D thật
  const kinds = [
    { name: 'fir_tree_01', count: 1400, seed: 1, minS: 0.8, maxS: 1.35, tint: 0xf2f6ee },
    { name: 'jacaranda_tree', count: 90, seed: 5, minS: 0.7, maxS: 1.0, tint: 0xffffff },
    { name: 'island_tree_02', count: 500, seed: 2, minS: 0.8, maxS: 1.2, tint: 0xffffff },
    { name: 'tree_small_02', count: 700, seed: 3, minS: 0.8, maxS: 1.3, tint: 0xffffff },
    { name: 'fir_sapling', count: 600, seed: 4, minS: 0.7, maxS: 1.3, tint: 0xffffff },
  ];
  for (const k of kinds) {
    const baked = await loadImpostor(k.name);
    const items = scatter(terrain, k.count, k.seed, { minS: k.minS, maxS: k.maxS, maxSlope: 0.55 }, forestDensity);
    root.add(impostorForest(baked, items, k.tint));
    for (const it of items) colliders.circle(it.x, it.z, 0.35 * it.scale);
    onProgress(`Trồng ${k.name}`);
  }

  // Vài cây jacaranda hoa tím trong trấn và bên hồ
  const jac = await loadImpostor('jacaranda_tree');
  const heroSpots = [[PLACES.square.x - 14, PLACES.square.z + 10, 1.0], [-38, 68, 0.9], [PLACES.square.x + 16, PLACES.square.z + 22, 0.8], [-62, 36, 0.85]];
  root.add(impostorForest(jac, heroSpots.map(([x, z, s]) => ({ x, z, y: terrain.heightAt(x, z) - 0.1, scale: s, yaw: x }))));
  heroSpots.forEach(([x, z]) => colliders.circle(x, z, 0.6));

  // Đá, gốc cây, bụi
  const props = [
    ['rock_moss_set_01', 160, 11, 0.8, 1.6, true],
    ['rock_moss_set_02', 160, 12, 0.8, 1.6, true],
    ['namaqualand_boulder_02', 60, 13, 0.7, 1.4, true],
    ['namaqualand_boulder_04', 60, 14, 0.6, 1.2, true],
    ['rock_face_01', 50, 15, 1.5, 3.0, true],
    ['rock_face_02', 50, 16, 1.5, 3.0, true],
    ['mountainside', 30, 17, 1.0, 2.0, true],
    ['tree_stump_01', 80, 18, 0.8, 1.2, true],
    ['tree_stump_02', 80, 19, 0.8, 1.2, true],
    ['dead_tree_trunk', 50, 20, 0.8, 1.2, false],
    ['dead_tree_trunk_02', 50, 21, 0.8, 1.2, false],
    ['shrub_04', 700, 22, 0.7, 1.3, false, 55],
    ['shrub_03', 1400, 23, 0.7, 1.3, false, 60],
    ['fern_02', 2600, 24, 0.7, 1.4, false, 45],
    ['rock_07', 300, 27, 0.6, 1.5, false],
    ['rock_09', 300, 28, 0.6, 1.5, false],
  ];
  const near = [];
  for (const [name, count, seed, minS, maxS, solid, radius = 0] of props) {
    const model = await loadModel(name);
    const items = scatter(terrain, count, seed, { minS, maxS, maxSlope: name.startsWith('rock_face') || name === 'mountainside' ? 0.9 : 0.5, clearings: true }, forestDensity);
    items.forEach((it) => { it.y -= 0.15 * it.scale; });
    const inst = instanceModel(model, items, { shadow: solid || radius > 0, radius });
    if (radius) near.push(inst);
    root.add(inst);
    if (solid) {
      const b = new THREE.Box3().setFromObject(model), sz = b.getSize(new THREE.Vector3());
      for (const it of items) colliders.circle(it.x, it.z, Math.max(sz.x, sz.z) * 0.35 * it.scale, it.y + sz.y * it.scale * 0.8);
    }
    onProgress(`Rải ${name}`);
  }

  // Cỏ quanh chân bụi rậm trong trấn, ven hồ
  const grassModel = await loadModel('grass_medium_02');
  const tufts = scatter(terrain, 5000, 31, { minS: 0.8, maxS: 1.5, clearings: false, pathClear: 0.05 }, (x, z) => 1 - forestDensity(x, z) * 0.5);
  const tuftInst = instanceModel(grassModel, tufts, { shadow: false, radius: 35 });
  near.push(tuftInst);
  root.add(tuftInst);

  root.add(bambooGrove(terrain, colliders));

  const grass = new GrassField(terrain);
  root.add(grass.group);
  // cập nhật chung: cỏ lá + bụi cây quanh người chơi
  const field = {
    setRadius(r) { grass.radius = r; },
    /** vùng không mọc cỏ (sân khấu tạo nhân vật) */
    exclude(x, z, r) {
      grass.excl.push({ x, z, r });
      for (const [k, im] of grass.tiles) { grass.group.remove(im); grass.pool.push(im); grass.tiles.delete(k); }
    },
    update(x, z, t) {
      grass.update(x, z, t);
      for (const n of near) n.userData.update(x, z);
    },
  };
  return { group: root, grass: field };
}

