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
  if (file.endsWith('.fbx')) {
    if (!fbxCache.has(file)) fbxCache.set(file, new FBXLoader().loadAsync(`/assets/monsters/${file}`));
    const o = await fbxCache.get(file);
    return { scene: o, animations: o.animations };
  }
  return loadGLTF(`/assets/monsters/${file}`);
}

const KIND_RE = {
  idle: /(^|\|)(idle|flying_idle|fly)$/i,
  walk: /(^|\|)(walk|flying_idle|fly|crawl)$/i,
  run: /(^|\|)(run|fast_flying|gallop|walk)$/i,
  attack: /(attack|punch|bite|headbutt|weapon|sting|claw|slash|smash|kick)/i,
  hit: /(hit|hurt|damage)/i,
  death: /(death|die|dead)/i,
};

/** Tên animation của game -> loại động tác */
function kindOf(name) {
  if (/Death/.test(name)) return 'death';
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
    const box = new THREE.Box3().setFromObject(model);
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
    this.actions = {};
    this.current = null;
    this.currentName = null;
    this.bones = { hand_r: model, Head: model };
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
    const one = once || kind === 'attack' || kind === 'hit' || kind === 'death';
    if (this.current === a && !restart) { a.timeScale = speed; this.currentName = name; return a; }
    a.reset();
    a.enabled = true;
    a.timeScale = speed * (kind === 'attack' ? 1.1 : 1);
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
  async equip() {}
  async swapWeapon() {}
  setWeaponPose() {}
  update(dt) { this.mixer.update(dt); }
}
