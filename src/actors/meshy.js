import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGLTF } from '../engine/assets.js';
import { ChibiCharacter } from './chibi.js';

/**
 * Nhân vật tạo bằng Meshy/Tripo (khung xương kiểu Mixamo, không có ngón tay).
 * Một khung chibi KayKit vô hình ("người điều khiển") chạy toàn bộ animation của game;
 * mỗi khung hình, tư thế từng khớp được chép sang khung xương Meshy theo độ lệch so với tư thế gốc.
 * Giao diện giống ChibiCharacter: play(), action(), update(), bones, weaponTip, swapWeapon()...
 */
const H = '/assets/heroes/';
const HEIGHT = 1.75;

/** xương KayKit (GLTFLoader bỏ dấu chấm) → xương Meshy */
const BONE_MAP = [
  ['hips', 'Hips'], ['spine', 'Spine02'], ['chest', 'Spine'], ['head', 'Head'],
  ['upperarml', 'LeftArm'], ['lowerarml', 'LeftForeArm'], ['wristl', 'LeftHand'],
  ['upperarmr', 'RightArm'], ['lowerarmr', 'RightForeArm'], ['wristr', 'RightHand'],
  ['upperlegl', 'LeftUpLeg'], ['lowerlegl', 'LeftLeg'], ['footl', 'LeftFoot'], ['toesl', 'LeftToeBase'],
  ['upperlegr', 'RightUpLeg'], ['lowerlegr', 'RightLeg'], ['footr', 'RightFoot'], ['toesr', 'RightToeBase'],
];

/** Các nhân vật Meshy hiện có */
export const MESHY_MODELS = [
  { id: 'mx:swordsman_blue', file: 'swordsman_blue', name: 'Lam y kiếm khách', han: '藍衣劍客', gender: 'male' },
  { id: 'mx:red_fighter', file: 'red_fighter', name: 'Hồng y thương khách', han: '紅衣槍客', gender: 'female' },
  { id: 'mx:ice_assassin', file: 'ice_assassin', name: 'Băng y thích khách', han: '冰衣刺客', gender: 'female' },
  { id: 'mx:dark_lord', file: 'dark_lord', name: 'Huyết y ma quân', han: '血衣魔君', gender: 'male' },
  { id: 'mx:barbarian_warrior', file: 'barbarian_warrior', name: 'Sơn trại hảo hán', han: '山寨好漢', gender: 'male' },
  { id: 'mx:merchant', file: 'merchant', name: 'Phú thương', han: '富商', gender: 'male' },
  { id: 'mx:black_robes', file: 'black_robes', name: 'Hắc y đạo cô', han: '黑衣道姑', gender: 'female' },
  { id: 'mx:green_warrior', file: 'green_warrior', name: 'Lục y cung thủ', han: '綠衣弓手', gender: 'female' },
  { id: 'mx:pink_maiden', file: 'pink_maiden', name: 'Phấn y thiếu nữ', han: '粉衣少女', gender: 'female' },
  { id: 'mx:taoist_scholar', file: 'taoist_scholar', name: 'Tử y pháp sư', han: '紫衣法師', gender: 'male' },
];

/** Ngoại hình mặc định theo môn phái + giới tính (khi người chơi chưa chọn hình tượng riêng) */
export const MESHY_DEFAULT = { 'kiem:male': 'mx:swordsman_blue', 'thuong:female': 'mx:red_fighter', 'cung:female': 'mx:green_warrior', 'dao:female': 'mx:black_robes', 'phap:male': 'mx:taoist_scholar' };
export const meshyFile = (id) => MESHY_MODELS.find((m) => m.id === id)?.file;

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();

export class MeshyCharacter {
  /** file: tên trong /assets/heroes ; weapon: như ChibiCharacter */
  static async create(file, weapon, opts = {}) {
    const [g, driver] = await Promise.all([loadGLTF(`${H}${file}.glb`), ChibiCharacter.create({ model: 'knight' }, null)]);
    const model = SkeletonUtils.clone(g.scene);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      o.material.roughness = 0.75;
      o.material.metalness = 0;
      if (opts.tint) o.material.color.lerp(new THREE.Color(opts.tint), 0.35);
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const s = (HEIGHT * (opts.scale || 1)) / (box.max.y - box.min.y);
    model.scale.multiplyScalar(s);
    model.position.y -= box.min.y * s;
    const c = new MeshyCharacter(model, driver);
    if (weapon) await c.equip(weapon);
    return c;
  }

  constructor(model, driver) {
    this.root = new THREE.Group();
    this.model = model;
    this.driver = driver;
    this.root.add(model);
    // người điều khiển: cùng gốc, ẩn hết lưới
    driver.model.traverse((o) => { if (o.isMesh) o.visible = false; });
    this.root.add(driver.root);
    this.mixer = driver.mixer;
    this.clips = driver.clips;
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    this.bones.hand_r = this.bones.RightHand;
    this.bones.hand_l = this.bones.LeftHand;
    this.bones.head = this.bones.Head;
    // ghi lại tư thế gốc (thế giới, trong hệ toạ độ root) của cả hai khung xương
    this.root.updateMatrixWorld(true);
    this.pairs = [];
    for (const [s, t] of BONE_MAP) {
      const sb = driver.bones[s], tb = this.bones[t];
      if (!sb || !tb) continue;
      this.pairs.push({ name: s, s: sb, t: tb, sBind: sb.getWorldQuaternion(new THREE.Quaternion()).invert(), tBind: tb.getWorldQuaternion(new THREE.Quaternion()) });
    }
    // Tư thế gốc khác nhau (KayKit dang tay chữ T, Meshy tay chếch chữ A): xoay hướng xương Meshy
    // trùng hướng xương KayKit trước, nếu không tay sẽ bị hạ hai lần và quặt ra sau lưng.
    const byName = Object.fromEntries(this.pairs.map((p) => [p.name, p]));
    const CHILD = { hips: 'spine', spine: 'chest', chest: 'head', upperarml: 'lowerarml', lowerarml: 'wristl', upperarmr: 'lowerarmr', lowerarmr: 'wristr', upperlegl: 'lowerlegl', lowerlegl: 'footl', upperlegr: 'lowerlegr', lowerlegr: 'footr', footl: 'toesl', footr: 'toesr' };
    const PARENT = { head: 'chest', wristl: 'lowerarml', wristr: 'lowerarmr', toesl: 'footl', toesr: 'footr' };
    const pos = (b) => b.getWorldPosition(new THREE.Vector3());
    for (const p of this.pairs) {
      const c = byName[CHILD[p.name]];
      if (!c) continue;
      const sDir = pos(c.s).sub(pos(p.s)).normalize(), tDir = pos(c.t).sub(pos(p.t)).normalize();
      p.align = new THREE.Quaternion().setFromUnitVectors(tDir, sDir);
    }
    for (const p of this.pairs) {
      p.align ??= byName[PARENT[p.name]]?.align || new THREE.Quaternion();
      p.tBind.premultiply(p.align);
    }
    const sh = driver.bones.hips, th = this.bones.Hips;
    // vị trí hông gốc tính trong hệ của từng model (để game nâng model lên khi cưỡi ngựa vẫn đúng)
    this.hips = { s: sh, t: th, sBindPos: driver.model.worldToLocal(sh.getWorldPosition(new THREE.Vector3())), tBindPos: model.worldToLocal(th.getWorldPosition(new THREE.Vector3())) };
  }

  // ─── giao diện giống ChibiCharacter (giao cho người điều khiển) ───
  get current() { return this.driver.current; }
  get currentName() { return this.driver.currentName; }
  get weaponTip() { return this.driver.weaponTip; }
  get weaponMounts() { return this.driver.weaponMounts; }
  get weaponKind() { return this.driver.weaponKind; }
  resolve(n) { return this.driver.resolve(n); }
  action(n) { return this.driver.action(n); }
  play(n, o) { return this.driver.play(n, o); }
  duration(n) { return this.driver.duration(n); }
  setWeaponPose() {}

  async equip(kind) { await this.driver.equip(kind); this.mountWeapons(); }
  async swapWeapon(kind) { await this.driver.swapWeapon(kind); this.mountWeapons(); }

  /**
   * Vũ khí giữ nguyên hướng của khung KayKit (khớp với động tác chém/bắn), chỉ dời vị trí sang
   * lòng bàn tay nhân vật Meshy mỗi khung hình (xem update()).
   */
  mountWeapons() {
    const d = this.driver;
    this.mounts = [];
    for (const w of d.weaponMounts || []) {
      const slot = w.parent;
      if (!slot || slot.userData.isHolder) continue;
      const left = slot === d.bones.hand_l;
      const holder = new THREE.Group();
      holder.userData.isHolder = true;
      slot.add(holder);
      holder.add(w);
      this.mounts.push({ holder, slot, wrist: d.bones[left ? 'wristl' : 'wristr'], tHand: left ? this.bones.hand_l : this.bones.hand_r });
    }
  }

  update(dt) {
    this.driver.update(dt);
    this.root.updateMatrixWorld(true);
    // hông: dịch theo độ lệch của hông người điều khiển (ngồi, nhảy, ngã)
    const h = this.hips;
    _v.copy(h.s.getWorldPosition(new THREE.Vector3())).sub(this.driver.model.localToWorld(h.sBindPos.clone()));
    const target = this.model.localToWorld(h.tBindPos.clone()).add(_v);
    h.t.parent.updateMatrixWorld(true);
    h.t.position.copy(h.t.parent.worldToLocal(target));
    // xoay từng khớp: q_t = q_s · inv(q_s_bind) · q_t_bind (tính trong hệ root), rồi đổi về hệ cha
    const rootQ = this.root.getWorldQuaternion(new THREE.Quaternion());
    const rootInv = rootQ.clone().invert();
    for (const p of this.pairs) {
      p.s.getWorldQuaternion(_q).premultiply(rootInv).multiply(p.sBind).multiply(p.tBind).premultiply(rootQ);
      p.t.parent.getWorldQuaternion(_q2);
      p.t.quaternion.copy(_q2.invert().multiply(_q));
      p.t.updateMatrixWorld(true);
    }
    // vũ khí: lòng bàn tay Meshy = cổ tay Meshy + (khe cầm − cổ tay) của khung KayKit
    for (const m of this.mounts || []) {
      const slotW = m.slot.getWorldPosition(new THREE.Vector3());
      const target = m.tHand.getWorldPosition(new THREE.Vector3()).add(slotW.clone().sub(m.wrist.getWorldPosition(_v)));
      m.holder.position.copy(m.slot.worldToLocal(target));
    }
  }
}
