import * as THREE from 'three';
import { Actor } from './actor.js';

const COMBO = {
  A: { anim: 'Sword_Regular_A', rec: 'Sword_Regular_A_Rec', hitAt: 0.6, dmg: [14, 19], range: 2.5, arc: 1.25, lunge: 3.5, next: 'B' },
  B: { anim: 'Sword_Regular_B', rec: 'Sword_Regular_B_Rec', hitAt: 0.6, dmg: [16, 21], range: 2.5, arc: 1.25, lunge: 3.5, next: 'C' },
  C: { anim: 'Sword_Regular_C', rec: null, hitAt: 0.3, dmg: [28, 36], range: 2.9, arc: 1.7, lunge: 5, next: null, knock: true, speed: 1.25 },
};

export class Player extends Actor {
  constructor(game, character) {
    super(game, character, { radius: 0.38, hp: 220 });
    this.mp = this.maxMp = 100;
    this.st = this.maxSt = 100;
    this.state = 'free';
    this.stateT = 0;
    this.combo = null;
    this.buffered = false;
    this.hitDone = false;
    this.iframes = 0;
    this.airJumps = 0;
    this.gliding = false;
    this.cooldowns = { dash: 0, cast: 0 };
    this.canWaterRun = false;
    this.attackBonus = 0;
    this.inCombat = 0;
  }

  setState(s) { this.state = s; this.stateT = 0; this.hitDone = false; }

  startAttack(key) {
    const a = COMBO[key];
    this.combo = key;
    this.buffered = false;
    this.setState('attack');
    this.char.play(a.anim, { once: true, fade: 0.08, speed: a.speed ?? 1.2, restart: true, onDone: () => this.endAttack() });
    this.game.audio.swoosh(key === 'C' ? 1.3 : 1);
    this.st = Math.max(0, this.st - 6);
  }

  endAttack() {
    if (this.state !== 'attack') return;
    const a = COMBO[this.combo];
    if (this.buffered && a.next) return this.startAttack(a.next);
    if (a.rec) {
      this.setState('recover');
      this.char.play(a.rec, { once: true, fade: 0.08, speed: 1.4, onDone: () => this.state === 'recover' && this.setState('free') });
    } else this.setState('free');
  }

  takeDamage(amount, from, { heavy = false } = {}) {
    if (this.dead || this.iframes > 0) return 0;
    const toAttacker = new THREE.Vector3().subVectors(from.pos, this.pos).setY(0).normalize();
    if (this.state === 'block' && this.forward().dot(toAttacker) > 0.25 && this.st > 0) {
      this.st = Math.max(0, this.st - (heavy ? 30 : 15));
      this.game.audio.clang();
      this.game.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(toAttacker, 0.6));
      const dmg = Math.round(amount * 0.12);
      this.hp -= dmg;
      return dmg;
    }
    this.hp -= amount;
    this.game.camRig.shake = heavy ? 1 : 0.6;
    this.game.audio.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      this.setState('dead');
      this.char.play('Death01', { once: true, fade: 0.1 });
      this.game.onPlayerDeath();
      return amount;
    }
    this.setState('hit');
    this.vel.addScaledVector(toAttacker, heavy ? -6 : -2.5);
    this.char.play(heavy ? 'Hit_Knockback' : 'Hit_Chest', { once: true, fade: 0.05, restart: true, onDone: () => this.state === 'hit' && this.setState('free') });
    return amount;
  }

  revive(x, z) {
    this.dead = false;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.st = this.maxSt;
    this.placeAt(x, z, Math.PI);
    this.setState('free');
    this.char.play('Idle_Loop', { fade: 0.01, restart: true });
  }

  update(dt, input, cam) {
    const s = this;
    s.stateT += dt;
    s.iframes = Math.max(0, s.iframes - dt);
    s.cooldowns.dash = Math.max(0, s.cooldowns.dash - dt);
    s.cooldowns.cast = Math.max(0, s.cooldowns.cast - dt);
    s.inCombat = Math.max(0, s.inCombat - dt);
    if (s.dead) { s.vel.x = s.vel.z = 0; s.physics(dt); return; }

    // hướng nhập theo camera
    const f = cam.forward(), r = cam.right();
    const move = new THREE.Vector3();
    if (input.held('KeyW')) move.add(f);
    if (input.held('KeyS')) move.sub(f);
    if (input.held('KeyD')) move.add(r);
    if (input.held('KeyA')) move.sub(r);
    const hasMove = move.lengthSq() > 0;
    if (hasMove) move.normalize();
    const sprint = input.held('ShiftLeft') || input.held('ShiftRight');
    const talking = s.state === 'talk';

    // ----- hành động -----
    const grounded = s.onGround && !s.inWater;
    const busy = ['attack', 'dash', 'roll', 'hit', 'cast'].includes(s.state);
    if (!talking) {
      if (input.pressed('Mouse0')) {
        if (s.state === 'attack' && s.stateT > 0.12) s.buffered = true;
        else if (s.state === 'recover') s.startAttack(COMBO[s.combo].next || 'A');
        else if ((s.state === 'free' || s.state === 'block') && grounded) s.startAttack('A');
      }
      if (input.pressed('KeyQ') && !busy && grounded && s.mp >= 15 && s.cooldowns.dash <= 0) {
        s.mp -= 15; s.cooldowns.dash = 2.5;
        if (hasMove) s.yaw = Math.atan2(move.x, move.z);
        s.setState('dash');
        s.char.play('Sword_Dash', { once: true, fade: 0.06, speed: 1.3, restart: true, onDone: () => s.state === 'dash' && s.setState('free') });
        s.game.audio.swoosh(1.5);
      }
      if (input.pressed('KeyF') && !busy && s.mp >= 20 && s.cooldowns.cast <= 0) {
        s.mp -= 20; s.cooldowns.cast = 0.8;
        if (cam.mode === 'third') s.yaw = Math.atan2(f.x, f.z);
        s.root.rotation.y = s.yaw;
        s.setState('cast');
        s.char.play('Spell_Simple_Shoot', { once: true, fade: 0.06, speed: 1.1, restart: true, onDone: () => s.state === 'cast' && s.setState('free') });
      }
      if ((input.pressed('ControlLeft') || input.pressed('KeyC')) && !busy && grounded && s.st >= 20) {
        s.st -= 20;
        if (hasMove) s.yaw = Math.atan2(move.x, move.z);
        s.setState('roll');
        s.iframes = 0.5;
        s.char.play('Roll', { once: true, fade: 0.05, speed: 1.5, restart: true, onDone: () => s.state === 'roll' && s.setState('free') });
      }
      if (input.held('Mouse2') && (s.state === 'free' || s.state === 'recover') && grounded) {
        s.setState('block');
        s.char.play('Sword_Block', { once: true, fade: 0.08, speed: 1.6, restart: true });
      }
      if (s.state === 'block' && !input.held('Mouse2')) s.setState('free');
      if (input.pressed('Space') && !busy) {
        if (grounded || (s.inWater)) {
          s.vel.y = 9; s.onGround = false; s.airJumps = 0;
          s.char.play('Jump_Loop', { fade: 0.1 });
          if (s.state !== 'free') s.setState('free');
        } else if (s.airJumps < 1 && s.mp >= 8) {
          // Khinh công: nhảy lần hai trên không và lướt
          s.mp -= 8; s.airJumps++;
          s.vel.y = 12;
          s.gliding = true;
          s.char.play('NinjaJump_Start', { once: true, fade: 0.06, speed: 1.6, restart: true, onDone: () => !s.onGround && s.char.play('NinjaJump_Idle_Loop', { fade: 0.1 }) });
          s.game.fx.burst(s.pos.clone(), 0xe8f0ff);
          s.game.audio.swoosh(0.7);
        }
      }
    }

    // ----- chuyển động theo trạng thái -----
    let speed = 0;
    const wantYaw = hasMove ? Math.atan2(move.x, move.z) : s.yaw;
    if (s.state === 'free' && !talking) {
      if (hasMove) {
        speed = sprint && s.st > 1 ? 9 : 5.2;
        if (s.inWater) speed = sprint ? 4 : 2.6;
        if (sprint && hasMove) s.st = Math.max(0, s.st - dt * 14);
        s.faceTowards(wantYaw, dt, 12);
      }
    } else if (s.state === 'attack') {
      const a = COMBO[s.combo];
      const act = s.char.action(a.anim), t = act ? act.time / act.getClip().duration : 1;
      // xoay nhẹ theo hướng bấm đầu đòn, lướt tới trước
      if (s.stateT < 0.12 && hasMove) s.faceTowards(wantYaw, dt, 25);
      else if (s.stateT < 0.12) s.autoAim(dt);
      if (t > 0.25 && t < 0.55) speed = a.lunge;
      if (!s.hitDone && t >= a.hitAt) {
        s.hitDone = true;
        s.game.combat.playerMelee(s, { ...a, dmg: a.dmg.map((d) => d + s.attackBonus) });
      }
      s.moveDir = s.forward();
    } else if (s.state === 'dash') {
      const act = s.char.action('Sword_Dash'), t = act ? act.time / act.getClip().duration : 1;
      if (t > 0.08 && t < 0.42) speed = 17;
      s.iframes = Math.max(s.iframes, t < 0.42 ? 0.05 : 0);
      if (!s.hitDone && t > 0.32) { s.hitDone = true; s.game.combat.playerMelee(s, { range: 3.2, arc: 2.2, dmg: [30 + s.attackBonus, 40 + s.attackBonus], knock: true, back: 4.5 }); }
    } else if (s.state === 'roll') {
      const act = s.char.action('Roll'), t = act ? act.time / act.getClip().duration : 1;
      speed = t < 0.65 ? 8.5 : 2;
    } else if (s.state === 'cast') {
      const act = s.char.action('Spell_Simple_Shoot'), t = act ? act.time / act.getClip().duration : 1;
      if (!s.hitDone && t > 0.42) {
        s.hitDone = true;
        const hand = new THREE.Vector3();
        s.char.bones.hand_r.getWorldPosition(hand);
        const dir = cam.mode === 'third' ? s.game.camera.getWorldDirection(new THREE.Vector3()) : s.forward();
        if (cam.mode !== 'third') s.autoAimDir(dir);
        s.game.combat.fireOrb(s, hand.addScaledVector(s.forward(), 0.3), dir);
      }
    } else if (s.state === 'recover') {
      if (hasMove && s.stateT > 0.12) s.setState('free');
    } else if (s.state === 'block') {
      const act = s.char.action('Sword_Block');
      if (act && act.time > act.getClip().duration * 0.32) act.paused = true;
      s.autoAim(dt);
    }

    const dir = s.state === 'free' ? move : s.forward();
    const accel = s.onGround || s.inWater ? 14 : 3;
    const tvx = dir.x * speed, tvz = dir.z * speed;
    s.vel.x += (tvx - s.vel.x) * Math.min(1, dt * accel);
    s.vel.z += (tvz - s.vel.z) * Math.min(1, dt * accel);

    // khinh công: giữ Space để lượn chậm rơi
    s.gravityScale = s.gliding && input.held('Space') && s.vel.y < 0 && s.mp > 0 ? 0.18 : 1;
    if (s.gravityScale < 1) s.mp = Math.max(0, s.mp - dt * 6);
    // Lăng Ba Vi Bộ: chạy nhanh trên mặt nước
    s.walkOnWater = s.canWaterRun && sprint && s.mp > 0;
    const wasAir = !s.onGround;
    s.physics(dt);
    if (s.walkOnWater && s.onGround && s.pos.y <= -0.55 && hasMove) s.mp = Math.max(0, s.mp - dt * 5);

    if (s.onGround && wasAir) {
      s.gliding = false;
      s.airJumps = 0;
      if (s.state === 'free') s.char.play(s.vel.lengthSq() > 4 ? 'Jog_Fwd_Loop' : 'Jump_Land', { once: false, fade: 0.1, speed: 1.6 });
      s.game.fx.dust(s.pos.clone());
    }

    // regen
    if (!sprint || !hasMove) s.st = Math.min(s.maxSt, s.st + dt * 22);
    s.mp = Math.min(s.maxMp, s.mp + dt * 3.5);
    if (s.inCombat <= 0) s.hp = Math.min(s.maxHp, s.hp + dt * 4);

    // ----- animation di chuyển -----
    if (s.state === 'free' || s.state === 'talk') {
      const hs = Math.hypot(s.vel.x, s.vel.z);
      if (s.inWater) s.char.play(hs > 0.5 ? 'Swim_Fwd_Loop' : 'Swim_Idle_Loop', { fade: 0.25 });
      else if (!s.onGround) { if (!s.gliding && s.char.currentName !== 'Jump_Loop') s.char.play('Jump_Loop', { fade: 0.15 }); }
      else if (hs > 7) s.char.play('Sprint_Loop', { fade: 0.2, speed: hs / 8.5 });
      else if (hs > 3) s.char.play('Jog_Fwd_Loop', { fade: 0.2, speed: hs / 5.2 });
      else if (hs > 0.6) s.char.play('Walk_Loop', { fade: 0.25, speed: Math.max(0.6, hs / 1.8) });
      else if (s.char.currentName !== 'Jump_Land' || !s.char.current.isRunning()) s.char.play(s.inCombat > 0 ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.3 });
    }
    s.char.update(dt);
  }

  /** Tự xoay về phía kẻ địch gần nhất trước mặt (đỡ phải ngắm chính xác). */
  autoAim(dt) {
    const e = this.game.combat.nearestEnemy(this.pos, 4.5, this.forward(), 0.2);
    if (e) this.faceTowards(Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z), dt, 20);
  }

  autoAimDir(dir) {
    const e = this.game.combat.nearestEnemy(this.pos, 25, this.forward(), 0.5);
    if (e) dir.copy(new THREE.Vector3().subVectors(e.pos, this.pos).setY(0).normalize());
  }
}
