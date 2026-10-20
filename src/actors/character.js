import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGLTF, loadModel, loadKitOBJ } from '../engine/assets.js';

const C = '/assets/characters/';
const HEAD_BONES = new Set(['Head', 'neck_01']);
const TARGET_HEIGHT = 1.78;

let clipsPromise = null;
/** Tất cả animation của Universal Animation Library 1 + 2, theo tên. */
export function loadClips() {
  clipsPromise ??= Promise.all([loadGLTF(C + 'anim_ual1.glb'), loadGLTF(C + 'anim_ual2.glb')]).then((gs) => {
    const map = {};
    for (const g of gs) for (const clip of g.animations) {
      // bỏ track scale và vị trí của mọi xương trừ pelvis (giữ tỉ lệ cơ thể của bộ quần áo)
      clip.tracks = clip.tracks.filter((t) => t.name.endsWith('.quaternion') || t.name === 'pelvis.position');
      map[clip.name] = clip;
    }
    return map;
  });
  return clipsPromise;
}

/** Giữ lại tam giác thuộc vùng đầu/cổ của thân gốc (bỏ phần thân sẽ bị quần áo che). */
function keepHeadOnly(mesh) {
  const geo = mesh.geometry.clone();
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  const isHead = new Uint8Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } }
    isHead[v] = HEAD_BONES.has(bones[best]?.name) ? 1 : 0;
  }
  const idx = geo.index.array, keep = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (isHead[idx[i]] && isHead[idx[i + 1]] && isHead[idx[i + 2]]) keep.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  geo.setIndex(keep);
  mesh.geometry = geo;
}

/** Gắn các SkinnedMesh của file khác (đầu, tóc) vào bộ xương của bộ quần áo, khớp theo tên xương. */
function graft(targetRoot, sourceScene, filter = () => true, edit = () => {}) {
  const boneByName = {};
  targetRoot.traverse((o) => { if (o.isBone) boneByName[o.name] = o; });
  const anchor = [];
  targetRoot.traverse((o) => { if (o.isSkinnedMesh) anchor.push(o); });
  const parent = anchor[0].parent;
  const meshes = [];
  sourceScene.traverse((o) => { if (o.isSkinnedMesh && filter(o)) meshes.push(o); });
  for (const m of meshes) {
    edit(m);
    const bones = m.skeleton.bones.map((b) => boneByName[b.name]);
    if (bones.some((b) => !b)) { console.warn('thiếu xương khi ghép', m.name); continue; }
    const skel = new THREE.Skeleton(bones, m.skeleton.boneInverses.map((b) => b.clone()));
    const bindMatrix = m.bindMatrix.clone();
    m.removeFromParent();
    parent.add(m);
    m.bind(skel, bindMatrix);
  }
}

const templates = new Map();

/**
 * look: { outfit: 'male_ranger', base: 'male', hair: ['hair_buns'], brows: 'eyebrows_regular',
 *         outfitColor?: hex, hairColor?: hex }
 */
async function buildTemplate(look) {
  const key = JSON.stringify(look);
  if (templates.has(key)) return templates.get(key);
  const p = (async () => {
    const outfit = await loadGLTF(`${C}outfit_${look.outfit}.glb`);
    const root = SkeletonUtils.clone(outfit.scene);
    const base = await loadGLTF(`${C}base_${look.base}.glb`);
    const baseClone = SkeletonUtils.clone(base.scene);
    graft(root, baseClone, (m) => true, (m) => {
      const name = (m.material?.name || '').toLowerCase();
      if (name.includes('superhero')) keepHeadOnly(m);
      if (name.includes('hair') && look.brows) m.visible = false; // lông mày gốc thay bằng bộ riêng
    });
    for (const h of [...(look.hair || []), look.brows].filter(Boolean)) {
      const hg = await loadGLTF(`${C}${h}.glb`);
      graft(root, SkeletonUtils.clone(hg.scene), () => true, (m) => {
        if (look.hairColor) { m.material = m.material.clone(); m.material.color.set(look.hairColor); }
      });
    }
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const mn = (o.material?.name || '').toLowerCase();
      if (look.outfitColor && (mn.includes('ranger') || mn.includes('peasant'))) {
        o.material = o.material.clone();
        // texture gốc khá tối: nhân màu lên để màu thời trang rõ hơn
        o.material.color.set(look.outfitColor).multiplyScalar(2.1);
      }
      if (o.material?.map) o.material.map.anisotropy = 8;
    });
    // chuẩn hoá chiều cao
    const box = new THREE.Box3().setFromObject(root);
    const s = TARGET_HEIGHT / (box.max.y - box.min.y);
    root.scale.multiplyScalar(s);
    root.position.y -= box.min.y * s;
    return root;
  })();
  templates.set(key, p);
  return p;
}

const WEAPONS = {
  sword: { model: 'antique_katana_01', pos: [0.0, 0.03, 0.0], len: 1.0 },
  saber: { model: 'wooden_handle_saber', pos: [0.0, 0.03, 0.0], len: 0.9 },
  axe: { model: 'hatchet', pos: [0.0, 0.03, 0.0], len: 0.5 },
  machete: { model: 'machete', pos: [0.0, 0.03, 0.0], len: 0.6 },
  dagger: { model: 'ornate_medieval_dagger', pos: [0.0, 0.03, 0.0], len: 0.45 },
  spear: { kit: 'Spear', pos: [0.0, 0.03, 0.0], len: 2.1, grip: 0.42 },
  bow: { kit: 'Bow_Wooden', pos: [0.0, 0.03, 0.0], len: 1.3, grip: 0.5, bow: true },
  golden: { kit: 'Sword_Golden', pos: [0.0, 0.03, 0.0], len: 1.05 },
  claymore: { kit: 'Claymore', pos: [0.0, 0.03, 0.0], len: 1.3 },
};

export class Character {
  static async create(look, weapon = null) {
    const [tpl, clips] = await Promise.all([buildTemplate(look), loadClips()]);
    const c = new Character(SkeletonUtils.clone(tpl), clips);
    if (weapon) await c.equip(weapon);
    return c;
  }

  constructor(model, clips) {
    this.root = new THREE.Group();
    this.model = model;
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = clips;
    this.actions = {};
    this.current = null;
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    // phong cách chibi: đầu to, người thấp lại một chút
    if (Character.chibi && this.bones.Head) {
      this.bones.Head.scale.setScalar(1.42);
      this.bones.neck_01?.scale.setScalar(0.92);
      model.scale.multiplyScalar(0.9);
    }
    this.onDone = new Map();
    this.mixer.addEventListener('finished', (e) => {
      const cb = this.onDone.get(e.action);
      this.onDone.delete(e.action);
      cb?.();
    });
  }

  /** Đổi vũ khí đang cầm (thay trang bị). */
  async swapWeapon(kind, tint) {
    if (this.weaponMount) { this.weaponMount.removeFromParent(); this.weaponMount = null; this.weaponTip = null; }
    if (kind) await this.equip(kind, tint);
  }

  async equip(kind, tint) {
    const def = WEAPONS[kind];
    if (!def) return;
    const src = def.kit ? await loadKitOBJ(def.kit) : await loadModel(def.model);
    const w = src.clone(true);
    // đặt chuôi kiếm ở gốc, lưỡi hướng theo trục dài nhất
    const box = new THREE.Box3().setFromObject(w), size = box.getSize(new THREE.Vector3());
    const axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
    const holder = new THREE.Group();
    holder.add(w);
    const len = size[axis];
    const k = def.len / len;
    w.scale.setScalar(k);
    // chuôi = đầu nhỏ hơn của trục dài: thử cả hai đầu, chọn đầu có tiết diện hẹp
    w.position.set(-(box.min.x + box.max.x) / 2 * k, -(box.min.y + box.max.y) / 2 * k, -(box.min.z + box.max.z) / 2 * k);
    w.position[axis] = -box.min[axis] * k - def.len * (def.grip ?? 0.12);
    if (tint) w.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(tint); o.material.emissiveIntensity = 0.35; } });
    // quay để trục dài trùng trục Y cục bộ của holder
    const inner = new THREE.Group();
    inner.add(holder);
    if (axis === 'x') holder.rotation.z = Math.PI / 2;
    if (axis === 'z') holder.rotation.x = -Math.PI / 2;
    // bù tỉ lệ của bộ xương (model đã bị scale)
    const ws = new THREE.Vector3();
    this.bones.hand_r.getWorldScale(ws);
    inner.scale.setScalar(1 / ws.x * this.root.scale.x);
    inner.position.fromArray(def.pos).multiplyScalar(1 / ws.x);
    this.weaponMount = inner;
    this.weaponLen = def.len;
    this.weapon = w;
    // hướng lưỡi: dọc theo ngón tay rồi hiệu chỉnh trong setWeaponPose
    this.setWeaponPose(WEAPON_POSE);
    this.bones.hand_r.add(inner);
    w.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    this.weaponTip = new THREE.Object3D();
    this.weaponTip.position.y = def.len * 0.88;
    holder.parent.add(this.weaponTip);
    this.weaponBase = new THREE.Object3D();
    this.weaponBase.position.y = def.len * 0.1;
    holder.parent.add(this.weaponBase);
  }

  setWeaponPose(p) {
    if (!this.weaponMount) return;
    this.weaponMount.rotation.set(p[0], p[1], p[2]);
  }

  action(name) {
    if (!this.actions[name]) {
      const clip = this.clips[name];
      if (!clip) { console.warn('không có animation', name); return null; }
      this.actions[name] = this.mixer.clipAction(clip);
    }
    return this.actions[name];
  }

  /** Phát animation; once = chạy một lần rồi giữ khung cuối. */
  play(name, { fade = 0.18, once = false, speed = 1, onDone = null, restart = false } = {}) {
    const a = this.action(name);
    if (!a) return null;
    if (this.current === a && !restart) { a.timeScale = speed; return a; }
    a.reset();
    a.enabled = true;
    a.timeScale = speed;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    if (onDone) this.onDone.set(a, onDone); else this.onDone.delete(a);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
    this.currentName = name;
    return a;
  }

  duration(name) { return this.clips[name]?.duration ?? 1; }

  update(dt) { this.mixer.update(dt); }
}

// Hướng kiếm so với xương bàn tay phải (rad: x, y, z); chỉnh bằng mắt
export const WEAPON_POSE = [0, 0, 0];
