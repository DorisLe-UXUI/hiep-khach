import * as THREE from 'three';
import { Actor } from './actor.js';

/**
 * Đồng đội do máy điều khiển (tổ đội, chiến trường, con cái).
 * Theo sau người chơi; thấy địch gần thì xông vào đánh (cận chiến hoặc chưởng khí).
 */
export class Ally extends Actor {
  constructor(game, character, opts) {
    super(game, character, { radius: 0.38, hp: opts.hp || 300 });
    this.name = opts.name;
    this.atk = opts.atk || 20;
    this.ranged = !!opts.ranged;
    this.color = opts.color || 0xbfe6ff;
    this.slot = opts.slot ?? 0;
    this.speed = opts.speed || 5.6;
    this.cool = Math.random();
    this.target = null;
    this.state = 'follow';
    this.hitDone = false;
    this.anchor = opts.anchor || null; // chiến trường: điểm tập kết
    this.faction = opts.faction || 'player';
  }

  takeDamage(n) {
    if (this.dead) return 0;
    this.hp -= n;
    this.game.vfx.flash(this, 0xff4030);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.char.play('Death01', { once: true });
      this.game.mhud?.log('team', `<b class="cy">${this.name}</b> đã trọng thương!`);
    } else this.char.play('Hit_Chest', { once: true, restart: true });
    return n;
  }

  update(dt) {
    const g = this.game, p = g.player;
    if (this.dead) { this.char.update(dt); return; }
    this.cool -= dt;
    this.hp = Math.min(this.maxHp, this.hp + dt * 3);
    // tìm địch gần người chơi (hoặc gần điểm tập kết)
    const center = this.anchor || p.pos;
    if (!this.target || this.target.dead || this.target.pos.distanceTo(center) > 22) {
      this.target = null;
      let bd = 18;
      for (const e of g.enemies) {
        if (e.dead || !e.root.visible) continue;
        const d = e.pos.distanceTo(this.pos);
        if (d < bd && e.pos.distanceTo(center) < 22) { bd = d; this.target = e; }
      }
    }
    let move = null, speed = 0;
    const e = this.target;
    if (e && this.state !== 'attack') {
      const to = new THREE.Vector3().subVectors(e.pos, this.pos).setY(0);
      const d = to.length(), reach = this.ranged ? 12 : 1.9 + e.radius;
      this.faceTowards(Math.atan2(to.x, to.z), dt, 10);
      if (d > reach) { move = to.normalize(); speed = this.speed; }
      else if (this.cool <= 0) {
        this.state = 'attack';
        this.hitDone = false;
        this.cool = 1.1 + Math.random() * 0.6;
        const anim = this.ranged ? 'Spell_Simple_Shoot' : ['Sword_Regular_A', 'Sword_Regular_B'][Math.floor(Math.random() * 2)];
        this.atkAnim = anim;
        this.char.play(anim, { once: true, restart: true, speed: 1.2, onDone: () => { this.state = 'follow'; } });
      }
    } else if (!e && this.state !== 'attack') {
      // xếp hàng sau lưng người chơi
      const side = this.slot % 2 ? 1 : -1, row = 1.6 + Math.floor(this.slot / 2) * 1.4;
      const spot = (this.anchor || p.pos).clone().addScaledVector(p.forward(), this.anchor ? 0 : -row).add(new THREE.Vector3(Math.cos(p.yaw) * side * 1.3, 0, -Math.sin(p.yaw) * side * 1.3));
      const to = spot.sub(this.pos).setY(0);
      const d = to.length();
      if (d > 1) { move = to.normalize(); speed = d > 8 ? 9 : 4.5; this.faceTowards(Math.atan2(move.x, move.z), dt, 8); }
      if (d > 40) this.placeAt(p.pos.x + side, p.pos.z - 2, p.yaw);
    }
    if (this.state === 'attack' && e && !this.hitDone) {
      const a = this.char.action(this.atkAnim);
      const t = a ? a.time / a.getClip().duration : 1;
      if (t > 0.45) {
        this.hitDone = true;
        if (this.ranged) {
          const from = this.pos.clone().setY(this.pos.y + 1.2);
          const dir = e.pos.clone().setY(e.pos.y + 1).sub(from).normalize();
          g.combat.fireOrb(this, from, dir, { dmg: this.atk, color: this.color, size: 0.7 });
        } else if (e.pos.distanceTo(this.pos) < 2.6 + e.radius) {
          g.combat.hurtEnemy(this, e, this.atk * (0.85 + Math.random() * 0.3), { knock: false });
          g.vfx.slash(this, this.color, { reach: 1.4 });
          g.audio.hit();
        }
      }
    }
    const tv = move ? move.multiplyScalar(speed) : new THREE.Vector3();
    this.vel.x += (tv.x - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (tv.z - this.vel.z) * Math.min(1, dt * 10);
    this.physics(dt);
    if (this.state !== 'attack') {
      const hs = Math.hypot(this.vel.x, this.vel.z);
      this.char.play(hs > 5 ? 'Jog_Fwd_Loop' : hs > 0.6 ? 'Walk_Loop' : 'Idle_Loop', { fade: 0.2 });
    }
    this.char.update(dt);
  }
}
