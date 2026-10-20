import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGLTF } from '../engine/assets.js';
import { BEASTS } from './beasts.js';

/** Thú có animation (glb Quaternius): tự chọn clip theo tên. */
export class Animal {
  static async create(file, height) {
    const src = await loadGLTF(file);
    const model = SkeletonUtils.clone(src.scene);
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const ms = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => { const n = m.clone(); n.roughness = 0.8; return n; });
        o.material = ms.length === 1 ? ms[0] : ms;
      }
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    const k = height / (box.max.y - box.min.y);
    model.scale.multiplyScalar(k);
    model.position.y -= box.min.y * k;
    const root = new THREE.Group();
    root.add(model);
    return new Animal(root, model, src.animations);
  }

  constructor(root, model, clips) {
    this.root = root;
    this.mixer = new THREE.AnimationMixer(model);
    const find = (re) => clips.find((c) => re.test(c.name));
    const idle = find(/(^|\|)idle$/i) || find(/flying|idle/i) || clips[0];
    this.anim = {
      idle,
      walk: find(/(^|\|)walk$/i) || find(/walk|fly/i) || idle,
      run: find(/(^|\|)gallop$/i) || find(/run|gallop|fly/i) || idle,
      attack: find(/attack_headbutt|(^|\|)attack$|headbutt|attack/i) || idle,
    };
    this.cur = null;
    this.busy = 0;
    this.play('idle');
  }

  play(kind, speed = 1) {
    if (this.busy > 0 && kind !== 'attack') return;
    const clip = this.anim[kind];
    if (!clip) return;
    const a = this.mixer.clipAction(clip);
    a.timeScale = speed;
    if (kind === 'attack') {
      a.reset(); a.setLoop(THREE.LoopOnce, 1);
      this.busy = clip.duration / speed;
    } else {
      a.setLoop(THREE.LoopRepeat);
      if (this.cur === a) return;
    }
    a.play();
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, 0.15, false);
    this.cur = a;
  }

  update(dt) {
    if (this.busy > 0) this.busy -= dt;
    this.mixer.update(dt);
  }
}

/** Thú cưỡi + linh thú của người chơi. */
export class Companions {
  constructor(g) {
    this.g = g;
    this.horse = null; this.horseId = null;
    this.pet = null; this.petId = null;
    this.riding = false;
    this.petPos = new THREE.Vector3();
    this.petCool = 1; this.skillCool = 6;
    this.rideDist = 0;
  }

  async toggleMount() {
    const g = this.g, p = g.player, bs = g.beasts;
    const id = bs.s.mount;
    if (!this.riding && !id) { g.toast('Chưa có thú cưỡi. Mua hoặc thu phục ở bảng Ngự thú (phím B).', 2.5); return; }
    if (!this.riding && this.horseId !== id) {
      if (this.horse) g.scene.remove(this.horse.root);
      this.horse = await Animal.create(BEASTS[id].file, BEASTS[id].mount.h);
      this.horseId = id;
      g.scene.add(this.horse.root);
    }
    this.riding = !this.riding;
    g.sys.s.mount = this.riding;
    this.horse.root.visible = this.riding;
    p.mounted = this.riding;
    p.char.model.position.y = this.riding ? BEASTS[this.horseId].mount.h * 0.54 : 0;
    if (this.riding) { p.char.play('Driving_Loop', { fade: 0.2 }); g.fx.dust(p.pos.clone()); }
    g.rpg.apply();
    g.toast(this.riding ? `Cưỡi <b>${BEASTS[this.horseId].name}</b> · H để xuống` : 'Xuống thú cưỡi', 1.4);
  }

  dismount() { if (this.riding) this.toggleMount(); }

  async spawnPet() {
    const g = this.g, bs = g.beasts, d = bs.petDef(), id = bs.s.pet;
    if (d && this.petId !== id) {
      if (this.pet) g.scene.remove(this.pet.root);
      this.pet = null;
      const a = await Animal.create(d.file, d.pet.h);
      if (bs.s.pet !== id) return; // đã đổi trong lúc tải
      this.pet = a; this.petId = id;
      this.petPos.copy(g.player.pos).add(new THREE.Vector3(1, 0, 1));
      this.pet.root.position.copy(this.petPos);
      g.scene.add(this.pet.root);
    }
    if (this.pet) this.pet.root.visible = !!d;
    g.rpg.apply();
  }

  petAtk() {
    const d = BEASTS[this.petId];
    return Math.round((6 + this.g.rpg.level * 2 + this.g.beasts.lv(this.petId) * 2.5) * (d?.pet.atk || 1));
  }

  update(dt) {
    const g = this.g, p = g.player;
    if (this.horse && this.riding) {
      const h = this.horse;
      h.root.position.copy(p.pos);
      h.root.rotation.y = p.yaw;
      const sp = Math.hypot(p.vel.x, p.vel.z);
      h.play(sp > 6 ? 'run' : sp > 0.5 ? 'walk' : 'idle', sp > 6 ? sp / 12 : Math.max(0.6, sp / 3));
      h.update(dt);
      // thú cưỡi lên cấp theo quãng đường
      this.rideDist += sp * dt;
      if (this.rideDist > 25) { g.beasts.gainExp(this.horseId, 3); this.rideDist = 0; }
    }
    if (!this.pet || !this.pet.root.visible) return;
    const d = BEASTS[this.petId], sk = d.pet.skill;
    this.petCool -= dt; this.skillCool -= dt;
    // mục tiêu: kẻ địch chủ đang đánh, hoặc kẻ đang đánh chủ
    let foe = g.lastTarget && !g.lastTarget.dead && g.lastTarget.pos.distanceTo(p.pos) < 14 ? g.lastTarget : null;
    if (!foe) for (const e of g.enemies) if (!e.dead && e.alerted && !e.beast && e.pos.distanceTo(p.pos) < 9) { foe = e; break; }
    let target, close = 1.2;
    if (foe && !p.dead) { target = foe.pos.clone(); close = foe.radius + 0.9; }
    else target = p.pos.clone().addScaledVector(p.forward(), -1.4).add(new THREE.Vector3(Math.cos(p.yaw) * 0.8, 0, -Math.sin(p.yaw) * 0.8));
    const to = target.sub(this.petPos).setY(0);
    const dist = to.length();
    const speed = dist > 6 ? (p.mounted ? 16 : 9.5) : dist > close ? 4.5 : 0;
    if (speed) this.petPos.addScaledVector(to.clone().normalize(), Math.min(dist, speed * dt));
    if (this.petPos.distanceTo(p.pos) > 30) this.petPos.copy(p.pos);
    const fly = d.pet.fly || 0;
    this.petPos.y = g.terrain.heightAt(this.petPos.x, this.petPos.z) + fly + (fly ? Math.sin(performance.now() / 300) * 0.15 : 0);
    const r = this.pet.root;
    r.position.copy(this.petPos);
    if (dist > 0.05) r.rotation.y = Math.atan2(to.x, to.z);
    // tấn công
    if (foe && dist <= close + 0.3 && this.petCool <= 0) {
      this.petCool = 1.4;
      this.pet.play('attack', 1.3);
      setTimeout(() => { if (!foe.dead) { g.combat.hurtEnemy(this, foe, this.petAtk() * (0.85 + Math.random() * 0.3), { knock: false }); g.audio.hit(); } }, 280);
    } else this.pet.play(speed > 5 ? 'run' : speed ? 'walk' : 'idle');
    // kỹ năng linh thú
    if (this.skillCool <= 0) {
      if (sk === 'heal' && p.hp < p.maxHp * 0.95) { this.skillCool = 12; p.heal(p.maxHp * 0.08); g.fx.burst(p.pos.clone().setY(p.pos.y + 1), 0x9affb0, 24); }
      else if (sk === 'bite' && foe && dist < close + 1) { this.skillCool = 8; g.combat.hurtEnemy(this, foe, this.petAtk() * 2.5, { knock: true, back: 3 }); g.fx.burst(foe.pos.clone().setY(foe.pos.y + 1), 0xff4a3a, 20); }
      else if (sk === 'breath' && foe) {
        this.skillCool = 10;
        g.vfx.shockwave(p.pos.clone(), 0xff8a2a, 6);
        g.fx.burst(this.petPos.clone(), 0xff7a2a, 50);
        for (const e of g.enemies) if (!e.dead && !e.beast && e.pos.distanceTo(p.pos) < 6) g.combat.hurtEnemy(this, e, this.petAtk() * 1.6, { knock: true, back: 4 });
        g.audio.whoosh();
      }
    }
    this.pet.update(dt);
  }

  get pos() { return this.petPos; }
}
