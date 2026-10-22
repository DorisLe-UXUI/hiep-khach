import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { loadGLTF } from '../engine/assets.js';

/**
 * Quái vật (Quaternius Ultimate Monsters / Monster Pack / Easy Enemies / Bestiary, CC0)
 * với cùng giao diện như Character để dùng chung lớp Enemy.
 */
const fbxCache = new Map();
async function loadSource(file) {
  if (/^\.?\//.test(file)) return loadGLTF(file);
  if (file.endsWith('.fbx')) {
    if (!fbxCache.has(file)) fbxCache.set(file, new FBXLoader().loadAsync(`/assets/monsters/${file}`));
    const o = await fbxCache.get(file);
    return { scene: o, animations: o.animations };
  }
  return loadGLTF(`/assets/monsters/${file}`);
}

const KIND_RE = {
  idle: /(^|\||_)(idle|flying_idle|fly|flying)$/i,
  walk: /(^|\||_)(walk|flying_idle|fly|flying|crawl)$/i,
  run: /(^|\||_)(run|sprint|fast_flying|gallop|walk|flying)$/i,
  attack: /(attack-melee-right|attack|punch|bite|headbutt|weapon|sting|claw|slash|smash|kick)/i,
  attack2: /(attack-melee-left|attack-kick)/i,
  kick: /(attack-kick-right|kick)/i,
  cast: /(holding-right-shoot|holding-both-shoot|cast|spell)/i,
  sit: /(^|\|)sit$/i,
  pick: /(pick-up|interact)/i,
  yes: /(emote-yes|yes|cheer|wave)/i,
  hit: /(hit|hurt|damage)/i,
  death: /(death|die|dead)/i,
};

/** Tên animation của game -> loại động tác */
function kindOf(name) {
  if (/Death/.test(name)) return 'death';
  if (/Sword_Regular_B|Melee_Hook/.test(name)) return 'attack2';
  if (/Sword_Regular_C|Sword_Heavy/.test(name)) return 'kick';
  if (/Spell_/.test(name)) return 'cast';
  if (/Sitting|Driving/.test(name)) return 'sit';
  if (/PickUp|Chest_Open|Interact|Consume/.test(name)) return 'pick';
  if (/Yes|Cheer/.test(name)) return 'yes';
  if (/Hit_/.test(name)) return 'hit';
  if (/Sword_|Melee_|Spell_|Attack/.test(name)) return 'attack';
  if (/Sprint|Jog|Run/.test(name)) return 'run';
  if (/Walk/.test(name)) return 'walk';
  return 'idle';
}

export class MonsterCharacter {
  /** def: { file, height, tint } */
  static async create(def) {
    const src = await loadSource(def.file);
    const model = SkeletonUtils.clone(src.scene);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const ms = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
        const n = m.isMeshStandardMaterial ? m.clone() : new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, vertexColors: !!m.vertexColors });
        n.roughness = 0.75;
        if (def.tint) n.color.lerp(new THREE.Color(def.tint), 0.5);
        return n;
      });
      o.material = ms.length === 1 ? ms[0] : ms;
    });
    // model thú (poly.pizza) có khung xương ×100: đo theo hình đã gắn xương
    const precise = /\/beasts\/|pp_/.test(def.file);
    if (precise) model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, precise);
    const s = def.height / Math.max(0.01, box.max.y - box.min.y);
    model.scale.multiplyScalar(s);
    model.position.y -= box.min.y * s + (def.lift || 0);
    if (def.yaw) model.rotation.y = def.yaw;
    return new MonsterCharacter(model, src.animations, def);
  }

  constructor(model, clips, def) {
    this.root = new THREE.Group();
    this.model = model;
    this.root.add(model);
    this.def = def;
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = {};
    for (const kind of Object.keys(KIND_RE)) {
      this.clips[kind] = (def.clips?.[kind] && clips.find((c) => c.name.endsWith(def.clips[kind]))) || clips.find((c) => KIND_RE[kind].test(c.name)) || null;
    }
    this.clips.idle ??= clips[0];
    this.clips.walk ??= this.clips.idle;
    this.clips.run ??= this.clips.walk;
    this.clips.attack ??= this.clips.idle;
    for (const k of ['attack2', 'kick', 'cast']) this.clips[k] ??= this.clips.attack;
    for (const k of ['sit', 'pick', 'yes']) this.clips[k] ??= this.clips.idle;
    this.actions = {};
    this.current = null;
    this.currentName = null;
    this.bones = { hand_r: model, Head: model };
    model.traverse((o) => {
      if (/arm-right|armright/i.test(o.name)) this.bones.hand_r = o;
      if (/^head$/i.test(o.name)) this.bones.Head = o;
    });
    this.onDone = new Map();
    this.mixer.addEventListener('finished', (e) => {
      const cb = this.onDone.get(e.action);
      this.onDone.delete(e.action);
      cb?.();
    });
  }

  action(name) {
    const clip = this.clips[kindOf(name)];
    if (!clip) return null;
    this.actions[clip.uuid] ??= this.mixer.clipAction(clip);
    return this.actions[clip.uuid];
  }

  play(name, { fade = 0.15, once = false, speed = 1, onDone = null, restart = false } = {}) {
    const kind = kindOf(name);
    const a = this.action(name);
    if (!a) { onDone?.(); return null; }
    // đòn đánh, trúng đòn, chết: chạy một lần
    const one = once || ['attack', 'attack2', 'kick', 'cast', 'hit', 'death', 'pick', 'yes'].includes(kind);
    if (this.current === a && !restart) { a.timeScale = speed; this.currentName = name; return a; }
    a.reset();
    a.enabled = true;
    // động tác của bộ Kenney rất ngắn: chậm lại cho khớp nhịp đòn của game
    const shortK = this.def.folk && one && kind !== 'death' ? 0.45 : 1;
    a.timeScale = speed * (kind === 'attack' ? 1.1 : 1) * shortK;
    a.setLoop(one ? THREE.LoopOnce : THREE.LoopRepeat, one ? 1 : Infinity);
    a.clampWhenFinished = one;
    if (onDone) this.onDone.set(a, onDone); else this.onDone.delete(a);
    if (this.current && this.current !== a) a.crossFadeFrom(this.current, fade, false);
    a.play();
    this.current = a;
    this.currentName = name;
    return a;
  }

  duration(name) { return this.clips[kindOf(name)]?.duration ?? 1; }
  /** Vũ khí KayKit gắn vào cuối cánh tay phải (nhân vật Kenney). */
  async equip(kind) {
    const file = { sword: 'w_sword_1handed', golden: 'w_sword_2handed_color', saber: 'w_sword_1handed', axe: 'w_axe_1handed', dagger: 'w_dagger', bow: 'w_bow_withstring', staff: 'w_staff', spear: 'w_staff', machete: 'w_skeleton_blade' }[kind];
    if (!file || !this.def.folk) return;
    const w = (await loadGLTF(`/assets/chibi/${file}.glb`)).scene.clone(true);
    const arm = this.bones.hand_r;
    const ws = arm.getWorldScale(new THREE.Vector3()).x || 1;
    w.scale.setScalar(0.55 / ws);
    w.position.set(0, -0.26 / ws, 0.05 / ws);
    w.rotation.set(Math.PI / 2, 0, 0);
    w.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    arm.add(w);
    this.weaponMounts = [w];
  }
  async swapWeapon(kind) { for (const m of this.weaponMounts || []) m.removeFromParent(); if (kind) await this.equip(kind); }
  setWeaponPose() {}
  update(dt) { this.mixer.update(dt); }
}
