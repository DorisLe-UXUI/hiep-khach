import * as THREE from 'three';
import { Actor } from './actor.js';

/** Sơn tặc / trại chủ. AI: canh gác -> phát hiện -> áp sát -> chém -> trúng đòn -> chết. */
export class Enemy extends Actor {
  constructor(game, character, opts) {
    super(game, character, { radius: opts.boss ? 0.5 : 0.4, hp: opts.hp });
    this.name = opts.name;
    this.boss = !!opts.boss;
    this.dmg = opts.dmg;
    this.speed = opts.speed ?? 4.6;
    this.home = new THREE.Vector3(opts.x, 0, opts.z);
    this.patrol = opts.patrol || null;
    this.patrolIdx = 0;
    this.aggroR = opts.aggro ?? 17;
    this.idleAnim = opts.idleAnim || 'Sword_Idle';
    this.state = 'idle';
    this.stateT = 0;
    this.cool = 1 + Math.random();
    this.hitDone = false;
    this.attackKind = null;
    this.deadT = 0;
    this.tag = opts.tag || 'bandit';
    this.alerted = false;
    this.caster = !!opts.caster;
    this.exp = opts.exp ?? (this.boss ? 300 : 30);
    this.gold = opts.gold ?? (this.boss ? 150 : 8);
    this.group = opts.group || null;
    this.phase2 = false;
  }

  setState(s) { this.state = s; this.stateT = 0; this.hitDone = false; }

  takeDamage(amount, from, { knock = false, back = 2.5 } = {}) {
    if (this.dead) return 0;
    this.hp -= amount;
    this.alerted = true;
    this.game.player.inCombat = 8;
    const away = new THREE.Vector3().subVectors(this.pos, from.pos).setY(0).normalize();
    // trùm không bị khựng bởi đòn thường
    const stagger = !this.boss || knock;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.setState('dead');
      this.vel.addScaledVector(away, 3);
      this.char.play('Death01', { once: true, fade: 0.08 });
      this.game.onEnemyKilled(this);
      return amount;
    }
    if (this.boss && !this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.speed *= 1.25;
      this.game.fx.ring(this.pos.clone(), 6, 0xff3a2a);
      this.game.fx.burst(this.pos.clone().setY(this.pos.y + 1.2), 0xff3a2a, 60);
      this.game.toast(`<b>${this.name.split('·').pop().trim()}</b> nổi giận, vận toàn lực!`, 3);
      this.game.camRig.shake = 1;
    }
    if (stagger) {
      this.setState('hit');
      this.vel.addScaledVector(away, knock ? back * 2 : back);
      this.char.play(knock ? 'Hit_Knockback' : (Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head'), { once: true, fade: 0.04, restart: true, speed: 1.2, onDone: () => this.state === 'hit' && this.setState('chase') });
    }
    return amount;
  }

  update(dt) {
    const p = this.game.player;
    this.stateT += dt;
    this.cool -= dt;
    if (this.dead) {
      this.deadT += dt;
      this.vel.x *= 0.9; this.vel.z *= 0.9;
      this.physics(dt);
      if (this.deadT > 12) this.root.visible = false;
      this.char.update(dt);
      return;
    }
    const toP = new THREE.Vector3().subVectors(p.pos, this.pos).setY(0);
    const dist = toP.length();
    let speed = 0, moveDir = null;

    switch (this.state) {
      case 'idle': {
        if (this.patrol) {
          const wp = this.patrol[this.patrolIdx];
          const to = new THREE.Vector3(wp[0] - this.pos.x, 0, wp[1] - this.pos.z);
          if (to.length() < 1) this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
          else { moveDir = to.normalize(); speed = 1.6; }
        }
        if (!p.dead && (dist < this.aggroR || this.alerted)) {
          this.setState('chase');
          this.alerted = true;
          this.game.alertNearby(this);
        }
        break;
      }
      case 'chase': {
        if (p.dead) { this.setState('return'); break; }
        if (this.pos.distanceTo(this.home) > 70) { this.setState('return'); this.alerted = false; break; }
        const reach = this.boss ? 2.4 : 2.0;
        if (this.caster && dist > reach && dist < 16 && this.cool <= 0 && Math.random() < 0.02) { this.startAttack(); break; }
        if (dist > reach) { moveDir = toP.clone().normalize(); speed = this.speed; }
        else {
          // vòng quanh một chút khi đang hồi chiêu
          moveDir = new THREE.Vector3(-toP.z, 0, toP.x).normalize().multiplyScalar(Math.sin(this.stateT * 0.8 + this.home.x) > 0 ? 1 : -1);
          speed = 1.2;
          if (this.cool <= 0) this.startAttack();
        }
        this.faceTowards(Math.atan2(toP.x, toP.z), dt, 8);
        break;
      }
      case 'attack': {
        const a = this.attackKind;
        const act = this.char.action(a.anim), t = act ? act.time / act.getClip().duration : 1;
        if (t < a.hitAt[0]) this.faceTowards(Math.atan2(toP.x, toP.z), dt, 5);
        if (t > a.hitAt[0] - 0.12 && t < a.hitAt[0] + 0.05) { moveDir = this.forward(); speed = a.lunge; }
        for (let i = 0; i < a.hitAt.length; i++) {
          if (!(this.hitDone & (1 << i)) && t >= a.hitAt[i]) {
            this.hitDone |= 1 << i;
            if (a.orb) {
              const hand = new THREE.Vector3();
              this.char.bones.hand_r.getWorldPosition(hand);
              const target = p.pos.clone().setY(p.pos.y + 1.1);
              const n = this.phase2 ? 3 : 1;
              this.game.vfx.magicCircle(this.pos.clone(), 0xff3a2a, 2.4, 0.9);
              for (let k = 0; k < n; k++) {
                const dir = target.clone().sub(hand).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (k - (n - 1) / 2) * 0.25);
                this.game.combat.fireOrb(this, hand, dir, { dmg: a.dmg, color: 0xff3a2a, speed: 20 });
              }
            } else {
              this.game.vfx.slash(this, this.boss ? 0xff5040 : 0xffb090, { flip: i % 2 === 1, wide: a.heavy ? 1.4 : 1, reach: a.range * 0.7 });
              this.game.combat.enemyMelee(this, a);
            }
          }
        }
        break;
      }
      case 'hit':
        break;
      case 'return': {
        const to = new THREE.Vector3(this.home.x - this.pos.x, 0, this.home.z - this.pos.z);
        if (to.length() < 1.5) { this.setState('idle'); this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5); }
        else { moveDir = to.normalize(); speed = 3; this.faceTowards(Math.atan2(to.x, to.z), dt, 6); }
        if (!p.dead && dist < this.aggroR * 0.6) this.setState('chase');
        break;
      }
    }

    if (moveDir && this.state === 'idle') this.faceTowards(Math.atan2(moveDir.x, moveDir.z), dt, 5);
    const tv = moveDir ? moveDir.multiplyScalar(speed) : new THREE.Vector3();
    this.vel.x += (tv.x - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (tv.z - this.vel.z) * Math.min(1, dt * 10);
    this.physics(dt);

    if (this.state === 'idle' || this.state === 'chase' || this.state === 'return') {
      const hs = Math.hypot(this.vel.x, this.vel.z);
      if (hs > 3) this.char.play('Jog_Fwd_Loop', { speed: hs / 5.2 });
      else if (hs > 0.5) this.char.play('Walk_Loop', { speed: Math.max(0.7, hs / 1.6) });
      else this.char.play(this.state === 'chase' ? 'Sword_Idle' : this.idleAnim);
    }
    this.char.update(dt);
  }

  startAttack() {
    const list = this.boss
      ? [
          { anim: 'Sword_Regular_Combo', hitAt: [0.18, 0.42, 0.7], dmg: 16, range: 2.7, arc: 1.4, lunge: 3, speed: 1.0 },
          { anim: 'Sword_Heavy_Combo', hitAt: [0.3, 0.62], dmg: 26, range: 3.1, arc: 1.8, lunge: 4, heavy: true, speed: 1.05 },
          { anim: 'Sword_Dash', hitAt: [0.35], dmg: 22, range: 3.2, arc: 1.4, lunge: 12, heavy: true, speed: 1.1 },
        ]
      : [
          { anim: 'Sword_Regular_A', hitAt: [0.6], dmg: this.dmg, range: 2.2, arc: 1.2, lunge: 2.5, speed: 0.75 },
          { anim: 'Sword_Regular_B', hitAt: [0.6], dmg: this.dmg, range: 2.2, arc: 1.2, lunge: 2.5, speed: 0.75 },
          { anim: 'Melee_Hook', hitAt: [0.55], dmg: this.dmg * 0.8, range: 1.8, arc: 1.0, lunge: 2, speed: 0.8 },
        ];
    if (this.caster) list.push({ anim: 'Spell_Simple_Shoot', hitAt: [0.42], dmg: this.dmg * 1.2, range: 30, arc: 6, lunge: 0, speed: 0.9, orb: true });
    const a = list[Math.floor(Math.random() * list.length)];
    this.attackKind = a;
    this.setState('attack');
    this.hitDone = 0;
    this.cool = (this.boss ? (this.phase2 ? 0.8 : 1.4) : 1.8) + Math.random() * 1.4;
    this.char.play(a.anim, { once: true, fade: 0.1, restart: true, speed: a.speed, onDone: () => this.state === 'attack' && this.setState('chase') });
    this.game.audio.swoosh(0.8);
  }
}
