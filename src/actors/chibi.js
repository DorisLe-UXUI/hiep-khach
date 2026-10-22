import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGLTF, loadKitOBJ } from '../engine/assets.js';

/**
 * Nhân vật chibi (KayKit Adventurers / Skeletons, CC0) với cùng giao diện như Character:
 * play(), action(), update(), bones, weaponTip... Tên animation của game được ánh xạ sang KayKit.
 */
const C = '/assets/chibi/';
const HEIGHT = 1.75;

const ANIM_FILES = ['general', 'movementbasic', 'movementadvanced', 'combatmelee', 'combatranged', 'special', 'simulation', 'tools'];

/** Tên animation cũ (UAL) -> KayKit, kèm hệ số tốc độ */
const MAP = {
  Idle_Loop: ['Idle_A'], Sword_Idle: ['Idle_B'], Idle_FoldArms_Loop: ['Idle_B'], Idle_Talking_Loop: ['Idle_B'], Idle_Lantern_Loop: ['Idle_A'],
  Walk_Loop: ['Walking_A'], Jog_Fwd_Loop: ['Running_A'], Sprint_Loop: ['Running_B', 1.15],
  Jump_Loop: ['Jump_Idle'], Jump_Start: ['Jump_Start'], Jump_Land: ['Jump_Land'],
  NinjaJump_Start: ['Jump_Start', 1.2], NinjaJump_Idle_Loop: ['Jump_Idle'], NinjaJump_Land: ['Jump_Land'],
  Roll: ['Dodge_Forward', 0.55],
  Sword_Regular_A: ['Melee_1H_Attack_Slice_Diagonal', 1.35], Sword_Regular_B: ['Melee_1H_Attack_Slice_Horizontal', 1.45],
  Sword_Regular_C: ['Melee_1H_Attack_Jump_Chop', 1.25], Sword_Regular_A_Rec: ['Idle_B', 3], Sword_Regular_B_Rec: ['Idle_B', 3],
  Sword_Dash: ['Melee_1H_Attack_Stab', 1.3], Sword_Block: ['Melee_Blocking'],
  Sword_Regular_Combo: ['Melee_Dualwield_Attack_Slice', 0.75], Sword_Heavy_Combo: ['Melee_2H_Attack_Spin', 0.75],
  Melee_Hook: ['Melee_Unarmed_Attack_Punch_A', 1.2],
  Spell_Simple_Shoot: ['Ranged_Magic_Shoot', 1.1], Spell_Simple_Enter: ['Ranged_Magic_Raise', 1.6],
  Hit_Chest: ['Hit_A', 1.2], Hit_Head: ['Hit_B', 1.2], Hit_Knockback: ['Hit_B', 0.9],
  Death01: ['Death_A'], Consume: ['Use_Item', 1.2], Chest_Open: ['Interact'], PickUp_Table: ['PickUp'], Interact: ['Interact'],
  Sitting_Idle_Loop: ['Sit_Floor_Idle'], Sitting_Talking_Loop: ['Sit_Floor_Idle'], Driving_Loop: ['Sit_Chair_Idle'],
  Swim_Fwd_Loop: ['Running_A', 0.6], Swim_Idle_Loop: ['Idle_A'], Yes: ['Cheering'],
};

/** Ghi đè theo kiểu vũ khí (cung, phép, hai tay) */
const STYLE = {
  bow: { Spell_Simple_Shoot: ['Ranged_Bow_Release', 1.4], Sword_Idle: ['Ranged_Bow_Idle'], Spell_Simple_Enter: ['Ranged_Bow_Draw_Up', 1.4], Jog_Fwd_Loop: ['Running_HoldingBow'], Sprint_Loop: ['Running_HoldingBow', 1.15] },
  staff: { Sword_Idle: ['Idle_B'], Spell_Simple_Shoot: ['Ranged_Magic_Spellcasting', 1.2] },
  spear: { Sword_Regular_A: ['Melee_2H_Attack_Stab', 1.5], Sword_Regular_B: ['Melee_2H_Attack_Slice', 1.3], Sword_Regular_C: ['Melee_2H_Attack_Spin', 1.1], Sword_Idle: ['Melee_2H_Idle'], Sword_Dash: ['Melee_2H_Attack_Stab', 1.4] },
  dual: { Sword_Regular_A: ['Melee_Dualwield_Attack_Chop', 1.4], Sword_Regular_B: ['Melee_Dualwield_Attack_Slice', 1.4], Sword_Regular_C: ['Melee_Dualwield_Attack_Stab', 1.3] },
  skeleton: { Idle_Loop: ['Skeletons_Idle'], Sword_Idle: ['Idle_B'], Walk_Loop: ['Skeletons_Walking'], Death01: ['Skeletons_Death'] },
};

/** Vũ khí KayKit (glb) hoặc vũ khí OBJ cũ; hand: r | l */
const WEAPONS = {
  sword: [{ file: 'w_sword_1handed', hand: 'r' }],
  golden: [{ file: 'w_sword_2handed_color', hand: 'r' }],
  saber: [{ file: 'w_sword_1handed', hand: 'r' }, { file: 'w_shield_round', hand: 'l' }],
  axe: [{ file: 'w_axe_1handed', hand: 'r' }],
  machete: [{ file: 'w_skeleton_blade', hand: 'r' }],
  dagger: [{ file: 'w_dagger', hand: 'r' }, { file: 'w_dagger', hand: 'l' }],
  bow: [{ file: 'w_bow_withstring', hand: 'l' }],
  staff: [{ file: 'w_staff', hand: 'r' }],
  spear: [{ obj: 'Spear', hand: 'r', len: 1.9, grip: 0.4 }],
  skelaxe: [{ file: 'w_skeleton_axe', hand: 'r' }],
  skelstaff: [{ file: 'w_skeleton_staff', hand: 'r' }],
};
const STYLE_OF = { bow: 'bow', staff: 'staff', spear: 'spear', dagger: 'dual', golden: 'spear' };

let clipsP = null;
function loadClips() {
  clipsP ??= Promise.all(ANIM_FILES.map((f) => loadGLTF(`${C}anim_${f}.glb`))).then((gs) => {
    const map = {};
    for (const g of gs) for (const c of g.animations) map[c.name] = c;
    return map;
  });
  return clipsP;
}

export class ChibiCharacter {
  /**
   * look: { model: 'knight', hide: ['Knight_Helmet'], tint: '#hex', scale }
   */
  static async create(look, weapon) {
    const [g, clips] = await Promise.all([loadGLTF(`${C}${look.model}.glb`), loadClips()]);
    const model = SkeletonUtils.clone(g.scene);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      if (look.hide?.some((h) => o.name.includes(h))) o.visible = false;
      o.material = o.material.clone();
      // ám màu nhẹ (texture atlas dùng chung cho cả da nên không nhuộm mạnh)
      if (look.tint) o.material.color.set('#ffffff').lerp(new THREE.Color(look.tint), look.tintK ?? 0.38);
      if (o.material.map) o.material.map.anisotropy = 8;
    });
    const box = new THREE.Box3().setFromObject(model);
    const s = (HEIGHT * (look.scale || 1)) / (box.max.y - box.min.y);
    model.scale.multiplyScalar(s);
    model.position.y -= box.min.y * s;
    const c = new ChibiCharacter(model, clips, look);
    if (weapon) await c.equip(weapon);
    return c;
  }

  constructor(model, clips, look) {
    this.root = new THREE.Group();
    this.model = model;
    this.root.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = clips;
    this.actions = {};
    this.current = null;
    this.currentName = null;
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });
    // tên xương kiểu cũ để code dùng chung (tay phải, đầu)
    // GLTFLoader bỏ dấu chấm trong tên node: handslot.r -> handslotr
    this.bones.hand_r = this.bones.handslotr || this.bones['handslot.r'] || this.bones.handr;
    this.bones.hand_l = this.bones.handslotl || this.bones['handslot.l'] || this.bones.handl;
    this.bones.Head = this.bones.head;
    this.style = look.skeleton ? { ...STYLE.skeleton } : {};
    this.onDone = new Map();
    this.mixer.addEventListener('finished', (e) => {
      const cb = this.onDone.get(e.action);
      this.onDone.delete(e.action);
      cb?.();
    });
  }

  resolve(name) {
    const m = this.style[name] || MAP[name] || [name];
    return { clip: this.clips[m[0]] ? m[0] : 'Idle_A', speed: m[1] || 1 };
  }

  async equip(kind) {
    const defs = WEAPONS[kind];
    if (!defs) return;
    this.weaponKind = kind;
    if (STYLE_OF[kind]) Object.assign(this.style, STYLE[STYLE_OF[kind]]);
    this.weaponMounts = [];
    for (const d of defs) {
      let w;
      if (d.obj) {
        w = await loadKitOBJ(d.obj);
        const holder = new THREE.Group();
        const box = new THREE.Box3().setFromObject(w), size = box.getSize(new THREE.Vector3());
        const axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';
        const k = d.len / size[axis];
        w.scale.setScalar(k);
        w.position.set(-(box.min.x + box.max.x) / 2 * k, -(box.min.y + box.max.y) / 2 * k, -(box.min.z + box.max.z) / 2 * k);
        w.position[axis] = -box.min[axis] * k - d.len * d.grip;
        if (axis === 'x') w.rotation.z = Math.PI / 2;
        if (axis === 'z') w.rotation.x = -Math.PI / 2;
        holder.add(w);
        w = holder;
      } else {
        w = (await loadGLTF(`${C}${d.file}.glb`)).scene.clone(true);
      }
      w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      // bù tỉ lệ của bộ xương để vũ khí giữ đúng kích thước gốc của pack
      const bone = d.hand === 'l' ? this.bones.hand_l : this.bones.hand_r;
      bone.add(w);
      this.weaponMounts.push(w);
    }
    // điểm mũi/chuôi cho vệt kiếm
    const main = this.weaponMounts[0];
    const box = new THREE.Box3().setFromObject(main);
    const len = Math.max(0.4, box.getSize(new THREE.Vector3()).length() / this.root.scale.x);
    this.weaponTip = new THREE.Object3D();
    this.weaponBase = new THREE.Object3D();
    main.add(this.weaponTip, this.weaponBase);
    this.weaponTip.position.y = len * 0.8 / (main.parent ? main.parent.getWorldScale(new THREE.Vector3()).x : 1);
  }

  async swapWeapon(kind) {
    for (const m of this.weaponMounts || []) m.removeFromParent();
    this.weaponMounts = [];
    this.weaponTip = null;
    if (kind) await this.equip(kind);
  }

  setWeaponPose() {}

  action(name) {
    const { clip } = this.resolve(name);
    if (!this.actions[clip]) this.actions[clip] = this.mixer.clipAction(this.clips[clip]);
    return this.actions[clip];
  }

  play(name, { fade = 0.15, once = false, speed = 1, onDone = null, restart = false } = {}) {
    const { speed: k } = this.resolve(name);
    const a = this.action(name);
    if (!a) return null;
    if (this.current === a && !restart) { a.timeScale = speed * k; this.currentName = name; return a; }
    a.reset();
    a.enabled = true;
    a.timeScale = speed * k;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    if (onDone) this.onDone.set(a, onDone); else this.onDone.delete(a);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
    this.currentName = name;
    return a;
  }

  duration(name) { return this.clips[this.resolve(name).clip]?.duration ?? 1; }

  update(dt) { this.mixer.update(dt); }
}

/** Ngoại hình chibi theo vai trò (cho NPC, địch). */
export const CHIBI_LOOKS = {
  guard: { model: 'barbarian', tint: '#b8a890' },
  innkeeper: { model: 'mage', hide: ['Mage_Hat'], tint: '#c8a070' },
  maiden: { model: 'rogue', tint: '#a8d0e8', meshy: 'pink_maiden' },
  villagerM: { model: 'knight', hide: ['Helmet', 'Cape'], tint: '#c8b8a0' },
  villagerF: { model: 'ranger', hide: ['Quiver'], tint: '#e0c0a0' },
  bandit: { model: 'barbarian', tint: '#8a6a50' },
  bandit2: { model: 'rogue_hooded', tint: '#7a5a3a', tintK: 0.6 },
  boss: { model: 'barbarian', tint: '#a03028', scale: 1.15 },
  assassin: { model: 'rogue_hooded', tint: '#2a2030', tintK: 0.8 },
  hanbang: { model: 'rogue', tint: '#3a5a98', tintK: 0.65 },
  villain: { model: 'mage', tint: '#a01020', tintK: 0.7, scale: 1.1 },
  skeleton: { model: 'skeleton_warrior', skeleton: true },
  skeletonMinion: { model: 'skeleton_minion', skeleton: true },
  skeletonRogue: { model: 'skeleton_rogue', skeleton: true },
  skeletonMage: { model: 'skeleton_mage', skeleton: true },
  skeletonKing: { model: 'skeleton_warrior', skeleton: true, scale: 2.1, tint: '#ff8060' },
};

/** Nhân vật chính theo phái + giới tính. */
export function chibiHero(h) {
  const male = { kiem: 'knight', thuong: 'barbarian', cung: 'ranger', phap: 'mage', dao: 'rogue_hooded' };
  const female = { kiem: 'rogue', thuong: 'barbarian', cung: 'ranger', phap: 'mage', dao: 'rogue_hooded' };
  const model = h.model || (h.gender === 'female' ? female : male)[h.cls] || 'knight';
  const hide = [];
  if (!h.hood) hide.push('Helmet', 'BearHat', 'Mage_Hat', 'Mask');
  return { model, hide, tint: h.fashionColor || null, tintK: 0.5 };
}

export const FOLK = [
  ...['a', 'b', 'c', 'd', 'e', 'f'].flatMap((l, i) => [
    { id: `folk:mini-male-${l}`, name: `Thiếu hiệp ${i + 1}`, han: '少俠', gender: 'male' },
    { id: `folk:mini-female-${l}`, name: `Thiếu nữ ${i + 1}`, han: '少女', gender: 'female' },
  ]),
  ...'abcdefghijklmnopqr'.split('').map((l, i) => ({ id: `folk:blocky-${l}`, name: `Mộc nhân ${i + 1}`, han: '木人', gender: 'any' })),
];

export const CHIBI_MODELS = [
  { id: 'knight', name: 'Hiệp sĩ', han: '俠士' }, { id: 'rogue', name: 'Nữ hiệp', han: '女俠' },
  { id: 'barbarian', name: 'Mãnh tướng', han: '猛將' }, { id: 'ranger', name: 'Xạ thủ', han: '射手' },
  { id: 'mage', name: 'Đạo trưởng', han: '道長' }, { id: 'rogue_hooded', name: 'Thích khách', han: '刺客' },
];
