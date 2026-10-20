import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export const manager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader(manager);
const hdrLoader = new HDRLoader(manager);

const gltfCache = new Map();
const texCache = new Map();
let maxAniso = 8;

export function setMaxAnisotropy(n) { maxAniso = n; }

export function loadGLTF(url) {
  if (!gltfCache.has(url)) gltfCache.set(url, gltfLoader.loadAsync(url));
  return gltfCache.get(url);
}

/** Model tĩnh Poly Haven (đã tối ưu thành .glb). Bật bóng đổ cho mọi mesh. */
export async function loadModel(name) {
  const gltf = await loadGLTF(`/assets/models/${name}.glb`);
  gltf.scene.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  return gltf.scene;
}

function tex(url, srgb) {
  const key = url + srgb;
  if (!texCache.has(key)) {
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return texCache.get(key);
}

/** Bộ texture PBR Poly Haven: diff / nor / rough / ao. repeat = số lần lặp trên UV. */
export function pbr(name, repeat = 1, extra = {}) {
  const base = `/assets/textures/${name}/`;
  const maps = {
    map: tex(base + 'diff.jpg', true),
    normalMap: tex(base + 'nor.jpg', false),
    roughnessMap: tex(base + 'rough.jpg', false),
  };
  const r = Array.isArray(repeat) ? repeat : [repeat, repeat];
  // Mỗi vật liệu cần bản sao texture riêng để có repeat riêng
  for (const k in maps) {
    const t = maps[k].clone();
    t.repeat.set(r[0], r[1]);
    t.needsUpdate = true;
    maps[k] = t;
  }
  return new THREE.MeshStandardMaterial({ ...maps, roughness: 1, metalness: 0, ...extra });
}

/** Chỉ lấy texture thô (để tự viết shader). */
export function rawTex(name, map = 'diff') {
  return tex(`/assets/textures/${name}/${map}.jpg`, map === 'diff');
}

export function loadHDR(name) {
  return hdrLoader.loadAsync(`/assets/hdri/${name}.hdr`);
}

const objCache = new Map();
/** Vũ khí low-poly Quaternius (OBJ + MTL) trong /assets/kit/weapons. */
export function loadKitOBJ(name) {
  if (!objCache.has(name)) {
    objCache.set(name, (async () => {
      const base = '/assets/kit/weapons/';
      const mtl = await new MTLLoader(manager).setPath(base).loadAsync(name + '.mtl');
      mtl.preload();
      const obj = await new OBJLoader(manager).setMaterials(mtl).setPath(base).loadAsync(name + '.obj');
      obj.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        o.material = ms.map((m) => new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.55, metalness: /metal|steel|iron|blade|silver|gold/i.test(m.name) ? 0.8 : 0.1 }));
        if (o.material.length === 1) o.material = o.material[0];
      });
      return obj;
    })());
  }
  return objCache.get(name).then((o) => o.clone(true));
}

/** Đạo cụ Quaternius đã đóng gói trong /assets/kit/<tên>.glb */
export async function loadKit(name) {
  const g = await loadGLTF(`/assets/kit/${name}.glb`);
  g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g.scene;
}
