import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const cache = new Map();
function loadAnimal(name) {
  if (!cache.has(name)) cache.set(name, new FBXLoader().loadAsync(`/assets/kit/animals/${name}.fbx`));
  return cache.get(name);
}

/** Thú có animation (ngựa, chó): tự chọn clip đi/chạy/đứng theo tên. */
export class Animal {
  static async create(name, height) {
    const src = await loadAnimal(name);
    const model = SkeletonUtils.clone(src);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        o.material = ms.map((m) => new THREE.MeshStandardMaterial({ color: m.color, map: m.map || null, roughness: 0.8 }));
        if (o.material.length === 1) o.material = o.material[0];
      }
    });
    const box = new THREE.Box3().setFromObject(model);
    model.scale.multiplyScalar(height / (box.max.y - box.min.y));
    const root = new THREE.Group();
    root.add(model);
    return new Animal(root, model, src.animations);
  }

  constructor(root, model, clips) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(model);
    this.clips = clips;
    const find = (re) => clips.find((c) => re.test(c.name));
    this.anim = {
      idle: find(/idle/i) || clips[0],
      walk: find(/walk/i) || find(/run|gallop/i) || clips[0],
      run: find(/gallop|run/i) || find(/walk/i) || clips[0],
    };
    this.cur = null;
    this.play('idle');
  }

  play(kind, speed = 1) {
    const clip = this.anim[kind];
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.timeScale = speed;
    if (this.cur === a) return;
    a.reset().play();
    if (this.cur) a.crossFadeFrom(this.cur, 0.2, false);
    this.cur = a;
  }

  update(dt) { this.mixer.update(dt); }
}

/** Thú cưỡi + pet của người chơi. */
export class Companions {
  constructor(g) {
    this.g = g;
    this.horse = null;
    this.pet = null;
    this.riding = false;
    this.petPos = new THREE.Vector3();
  }

  async toggleMount() {
    const g = this.g, p = g.player;
    if (!g.sys.s.mountOwned) { g.toast('Chưa có thú cưỡi. Mua ở bảng Thú cưỡi (phím B).', 2.5); return; }
    if (!this.horse) {
      this.horse = await Animal.create('Horse', 1.75);
      g.scene.add(this.horse.root);
    }
    this.riding = !this.riding;
    g.sys.s.mount = this.riding;
    this.horse.root.visible = this.riding;
    p.mounted = this.riding;
    p.char.model.position.y = this.riding ? 0.95 : 0;
    if (this.riding) { p.char.play('Driving_Loop', { fade: 0.2 }); g.fx.dust(p.pos.clone()); }
    g.toast(this.riding ? 'Lên ngựa · H để xuống' : 'Xuống ngựa', 1.4);
  }

  dismount() { if (this.riding) this.toggleMount(); }

  async spawnPet() {
    const g = this.g, out = g.sys.s.pet && g.sys.s.petOut !== false;
    if (out && !this.pet) {
      this.pet = await Animal.create('Pug', 0.45);
      this.petPos.copy(g.player.pos).add(new THREE.Vector3(1, 0, 1));
      this.pet.root.position.copy(this.petPos);
      g.scene.add(this.pet.root);
    }
    if (this.pet) this.pet.root.visible = !!out;
  }

  update(dt) {
    const g = this.g, p = g.player;
    if (this.horse && this.riding) {
      const h = this.horse;
      h.root.position.copy(p.pos);
      h.root.rotation.y = p.yaw;
      const sp = Math.hypot(p.vel.x, p.vel.z);
      h.play(sp > 6 ? 'run' : sp > 0.5 ? 'walk' : 'idle', sp > 6 ? sp / 10 : Math.max(0.6, sp / 3));
      h.update(dt);
    }
    if (this.pet && this.pet.root.visible) {
      // đi theo sau lưng chủ nhân
      const target = p.pos.clone().addScaledVector(p.forward(), -1.4).add(new THREE.Vector3(Math.cos(p.yaw) * 0.8, 0, -Math.sin(p.yaw) * 0.8));
      const to = target.sub(this.petPos).setY(0);
      const d = to.length();
      const speed = d > 6 ? 9 : d > 1.2 ? 4 : 0;
      if (speed) this.petPos.addScaledVector(to.normalize(), Math.min(d, speed * dt));
      if (d > 30) this.petPos.copy(p.pos);
      this.petPos.y = g.terrain.heightAt(this.petPos.x, this.petPos.z);
      const r = this.pet.root;
      r.position.copy(this.petPos);
      if (speed) r.rotation.y = Math.atan2(to.x, to.z);
      this.pet.play(speed > 5 ? 'run' : speed ? 'walk' : 'idle');
      this.pet.update(dt);
    }
  }
}
