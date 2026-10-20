import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

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
