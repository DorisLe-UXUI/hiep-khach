import * as THREE from 'three';
import { Actor } from './actor.js';

const COMBO = {
  A: { anim: 'Sword_Regular_A', rec: 'Sword_Regular_A_Rec', hitAt: 0.6, mul: 1, arc: 1.25, lunge: 3.5, next: 'B' },
  B: { anim: 'Sword_Regular_B', rec: 'Sword_Regular_B_Rec', hitAt: 0.6, mul: 1.12, arc: 1.25, lunge: 3.5, next: 'C' },
  C: { anim: 'Sword_Regular_C', rec: null, hitAt: 0.3, mul: 1.9, arc: 1.7, lunge: 5, next: null, knock: true, speed: 1.25 },
};

export class Player extends Actor {
  constructor(game, character, cls) {
    super(game, character, { radius: 0.38, hp: 220 });
    this.cls = cls;
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
    this.cooldowns = { dash: 0, cast: 0, potion: 0, atk: 0, u1: 0, u2: 0 };
    this.attackBonus = 0;
    this.storyHp = 0;
    this.storyMp = 0;
    this.inCombat = 0;
    this.hurtFlash = 0;
    this.pendingSkill = null;
  }

  get rpg() { return this.game.rpg; }
  get canWaterRun() { return !!this.game.unlocks.waterRun; }

  setState(s) { this.state = s; this.stateT = 0; this.hitDone = false; }

  /** Sát thương cơ bản theo cấp, trang bị, độ khó, võ học. */
  damage(mul, skill = 'sword') {
    const r = this.rpg;
    const lv = r.skills[skill] || 0;
    const per = { sword: 0.1, dash: 0.15, palm: 0.18 }[skill] || 0.1;
    const base = r.atk() * this.cls.dmgMul * mul * (1 + lv * per) * this.game.diff.playerDmg * (this.game.fury?.mult() || 1);
    return base * (0.9 + Math.random() * 0.2);
  }

  heal(n) {
    const v = Math.min(this.maxHp - this.hp, n);
    this.hp += v;
    this.game.hud.damage(this.pos.clone().setY(this.pos.y + 2), Math.round(v), 'heal');
    this.game.fx.burst(this.pos.clone().setY(this.pos.y + 1), 0x8fe0a8, 26);
    this.game.audio.chime();
  }

  startAttack(key) {
    const a = COMBO[key];
    this.combo = key;
    this.buffered = false;
    this.setState('attack');
    this.char.play(a.anim, { once: true, fade: 0.08, speed: (a.speed ?? 1.2) * (this.cls.speed ?? 1), restart: true, onDone: () => this.endAttack() });
    this.game.audio.swoosh(key === 'C' ? 1.3 : 1);
    this.st = Math.max(0, this.st - 6);
    const col = { kiem: 0xcfe8ff, thuong: 0xffd27a, dao: 0x9fe8c8 }[this.clsId] || 0xffffff;
    setTimeout(() => this.game.vfx.slash(this, col, { flip: key === 'B', wide: key === 'C' ? 1.45 : 1, reach: this.cls.range * 0.75, tilt: key === 'C' ? 0.6 : 0.25 }), key === 'C' ? 220 : 120);
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

  /** Bắn tên / phóng chưởng (đòn thường của Cung Thủ, Pháp Sư). */
  startShot() {
    if (this.cooldowns.atk > 0) return;
    this.cooldowns.atk = this.cls.attack === 'arrow' ? 0.45 : 0.55;
    this.setState('shoot');
    this.aimNow();
    this.char.play('Spell_Simple_Shoot', { once: true, fade: 0.05, speed: 1.6, restart: true, onDone: () => this.state === 'shoot' && this.setState('free') });
  }

  aimNow() {
    const cam = this.game.camRig;
    if (cam.mode === 'third') { const f = cam.forward(); this.yaw = Math.atan2(f.x, f.z); }
    const e = this.game.combat.nearestEnemy(this.pos, 26, this.forward(), 0.6);
    if (e) this.yaw = Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
    this.root.rotation.y = this.yaw;
  }

  aimDir() {
    const e = this.game.combat.nearestEnemy(this.pos, 30, this.forward(), 0.5);
    if (e) return new THREE.Vector3().subVectors(e.pos, this.pos).setY(0).normalize().setY(0.02);
    const cam = this.game.camRig;
    return cam.mode === 'third' ? this.game.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize() : this.forward();
  }

  handPos() {
    const h = new THREE.Vector3();
    (this.char.bones.hand_r || this.char.bones.Head).getWorldPosition(h);
    return h.addScaledVector(this.forward(), 0.35);
  }

  /** Tuyệt kỹ Q / F theo phái. */
  useSkill(slot) {
    const sk = this.cls[slot];
    const r = this.rpg;
    const cdKey = { q: 'dash', f: 'cast', u1: 'u1', u2: 'u2' }[slot];
    if (sk.lv && r.level < sk.lv) { this.game.toast(`<b>${sk.name}</b> mở khoá ở cấp ${sk.lv}`, 1.6); return; }
    let cost = sk.mp;
    if (sk.kind === 'orb' || sk.kind === 'bigorb') cost = Math.max(5, cost - (r.skills.palm || 0) * 2);
    if (this.cooldowns[cdKey] > 0 || this.mp < cost) { this.game.hud.flashSlot(slot === 'q' ? 'dash' : 'cast'); return; }
    if (slot === 'u1' || slot === 'u2') {
      this.mp -= cost;
      this.cooldowns[cdKey] = sk.cd;
      this.pendingSkill = sk;
      this.aimNow();
      this.setState('cast');
      const ult = sk.kind === 'ult';
      this.game.vfx.magicCircle(this.pos.clone(), sk.color, ult ? 4.5 : 2.4, ult ? 1.6 : 1);
      this.char.play(ult ? 'Spell_Simple_Enter' : (this.cls.attack === 'melee' ? 'Sword_Regular_C' : 'Spell_Simple_Shoot'), { once: true, fade: 0.06, speed: ult ? 1 : 1.3, restart: true, onDone: () => this.state === 'cast' && this.setState('free') });
      this.game.audio.whoosh();
      if (ult) { this.game.camRig.shake = 0.6; this.iframes = 0.8; }
      return;
    }
    this.mp -= cost;
    this.cooldowns[cdKey] = sk.cd - (sk.kind === 'dash' ? (r.skills.dash || 0) * 0.3 : 0);
    this.pendingSkill = sk;
    const k = sk.kind;
    const circleCol = { orb: 0x8fd8ff, bigorb: 0x9fe8ff, nova: this.cls.weapon === 'spear' ? 0xffc860 : 0xb7a8ff, heal: 0x8fe0a8, volley: 0xffe6a0, dash: 0xcfe8ff }[k];
    if (circleCol) this.game.vfx.magicCircle(this.pos.clone(), circleCol, k === 'nova' ? 3.2 : 2.2, 1.0);
    if (k === 'dash') {
      this.setState('dash');
      this.char.play('Sword_Dash', { once: true, fade: 0.06, speed: 1.3, restart: true, onDone: () => this.state === 'dash' && this.setState('free') });
      this.game.audio.swoosh(1.5);
    } else if (k === 'orb' || k === 'bigorb' || k === 'volley') {
      this.aimNow();
      this.setState('cast');
      this.char.play('Spell_Simple_Shoot', { once: true, fade: 0.06, speed: 1.1, restart: true, onDone: () => this.state === 'cast' && this.setState('free') });
    } else if (k === 'nova') {
      this.setState('cast');
      this.char.play(this.cls.weapon === 'spear' ? 'Sword_Regular_C' : 'Spell_Simple_Enter', { once: true, fade: 0.06, speed: 1.3, restart: true, onDone: () => this.state === 'cast' && this.setState('free') });
    } else if (k === 'heal') {
      this.setState('cast');
      this.char.play('Spell_Simple_Enter', { once: true, fade: 0.06, speed: 1, restart: true, onDone: () => this.state === 'cast' && this.setState('free') });
    } else if (k === 'backflip') {
      this.setState('roll');
      this.iframes = 0.5;
      this.yaw += Math.PI; // lộn ngược ra sau
      this.char.play('Roll', { once: true, fade: 0.05, speed: 1.6, restart: true, onDone: () => { this.yaw -= Math.PI; this.root.rotation.y = this.yaw; if (this.state === 'roll') { this.setState('free'); this.game.combat.fireArrows(this, this.handPos(), this.aimDir(), 3, this.damage(0.9)); } } });
    }
  }

  /** Thực thi hiệu ứng tuyệt kỹ ở khung hình ra đòn. */
  releaseSkill() {
    const sk = this.pendingSkill;
    if (!sk) return;
    const c = this.game.combat;
    if (sk.kind === 'orb') c.fireOrb(this, this.handPos(), this.aimDir(), { dmg: this.damage(1.8, 'palm') });
    if (sk.kind === 'bigorb') c.fireOrb(this, this.handPos(), this.aimDir(), { dmg: this.damage(3, 'palm'), size: 2, color: 0x9fe8ff });
    if (sk.kind === 'volley') c.fireArrows(this, this.handPos(), this.aimDir(), 5, this.damage(1.1));
    if (sk.kind === 'nova') { c.nova(this, 5, this.damage(2.2, 'palm'), this.cls.weapon === 'spear' ? 0xffd27a : 0xb7a8ff); this.game.vfx.shockwave(this.pos.clone(), this.cls.weapon === 'spear' ? 0xffd27a : 0xb7a8ff, 6); }
    if (sk.kind === 'heal') this.game.vfx.pillar(this.pos.clone(), 0x8fe0a8, 4);
    if (sk.kind === 'heal') this.heal(this.maxHp * 0.3);
    if (sk.kind === 'wave') {
      const dir = this.aimDir();
      for (let k = -1; k <= 1; k++) c.fireOrb(this, this.handPos(), dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.22), { dmg: this.damage(1.6, 'palm'), size: 0.9, color: sk.color, speed: 30 });
    }
    if (sk.kind === 'volley7') c.fireArrows(this, this.handPos(), this.aimDir(), 7, this.damage(1.2));
    if (sk.kind === 'ult') {
      c.nova(this, 7.5, this.damage(4.2, 'palm'), sk.color);
      this.game.vfx.shockwave(this.pos.clone(), sk.color, 9);
      this.game.vfx.pillar(this.pos.clone(), sk.color, 8);
      this.game.mhud?.announce(`${this.game.profile.name} thi triển tuyệt kỹ <b>${sk.name}</b>!`);
      if (sk.heal) this.heal(this.maxHp * 0.35);
    }
  }

  takeDamage(amount, from, { heavy = false } = {}) {
    if (this.dead || this.iframes > 0) return 0;
    if (this.mounted && heavy) this.game.companions.dismount();
    amount *= this.game.diff.enemyDmg * (1 - this.rpg.def());
    const toAttacker = new THREE.Vector3().subVectors(from.pos, this.pos).setY(0).normalize();
    if (this.state === 'block' && this.forward().dot(toAttacker) > 0.25 && this.st > 0) {
      this.st = Math.max(0, this.st - (heavy ? 30 : 15));
      this.game.audio.clang();
      this.game.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(toAttacker, 0.6));
      const dmg = Math.round(amount * 0.12);
      this.hp -= dmg;
      return dmg;
    }
    amount = Math.round(amount);
    this.hp -= amount;
    this.hurtFlash = 0.5;
    this.game.vfx.flash(this, 0xff3020);
    this.game.camRig.shake = heavy ? 1 : 0.6;
    this.game.audio.hit();
    this.game.fury?.hurt();
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

  revive(x, z, yaw = Math.PI) {
    this.dead = false;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.st = this.maxSt;
    this.placeAt(x, z, yaw);
    this.setState('free');
    this.char.play('Idle_Loop', { fade: 0.01, restart: true });
  }

  update(dt, input, cam) {
    const s = this;
    s.stateT += dt;
    s.iframes = Math.max(0, s.iframes - dt);
    for (const k in s.cooldowns) s.cooldowns[k] = Math.max(0, s.cooldowns[k] - dt);
    s.inCombat = Math.max(0, s.inCombat - dt);
    if (s.dead) { s.vel.x = s.vel.z = 0; s.physics(dt); s.char.update(dt); return; }

    const f = cam.forward(), r = cam.right();
    const move = new THREE.Vector3();
    if (input.held('KeyW')) move.add(f);
    if (input.held('KeyS')) move.sub(f);
    if (input.held('KeyD')) move.add(r);
    if (input.held('KeyA')) move.sub(r);
    const vm = input.virtualMove;
    if (vm) move.addScaledVector(f, vm.y).addScaledVector(r, vm.x);
    if (input.autoMove && move.lengthSq() === 0) move.copy(input.autoMove);
    const hasMove = move.lengthSq() > 0.02;
    if (hasMove) move.normalize();
    const sprint = input.held('ShiftLeft') || input.held('ShiftRight') || !!vm?.sprint || !!input.autoSprint;
    const talking = s.state === 'talk';
    const melee = s.cls.attack === 'melee';

    const grounded = s.onGround && !s.inWater;
    const busy = ['attack', 'dash', 'roll', 'hit', 'cast', 'shoot', 'drink'].includes(s.state);
    if (s.mounted && !talking && ['Mouse0', 'KeyQ', 'KeyF', 'ControlLeft', 'KeyC', 'Space'].some((k) => input.pressed(k))) s.game.companions.dismount();
    if (!talking) {
      if (input.pressed('Mouse0') || (!melee && input.held('Mouse0') && s.state === 'free')) {
        if (melee) {
          if (s.state === 'attack' && s.stateT > 0.12) s.buffered = true;
          else if (s.state === 'recover') s.startAttack(COMBO[s.combo].next || 'A');
          else if ((s.state === 'free' || s.state === 'block') && grounded) s.startAttack('A');
        } else if (s.state === 'free' || s.state === 'recover') s.startShot();
      }
      if (input.pressed('KeyQ') && !busy && grounded) s.useSkill('q');
      if (input.pressed('KeyF') && !busy) s.useSkill('f');
      if (input.pressed('Digit1') && !busy) s.useSkill('u1');
      if (input.pressed('Digit2') && !busy) s.useSkill('u2');
      if (input.pressed('KeyR') && !busy && s.cooldowns.potion <= 0) {
        if (s.rpg.use('potion')) { s.cooldowns.potion = 6; s.setState('drink'); s.char.play('Consume', { once: true, fade: 0.08, speed: 1.8, restart: true, onDone: () => s.state === 'drink' && s.setState('free') }); }
        else s.game.hud.flashSlot('potion');
      }
      if ((input.pressed('ControlLeft') || input.pressed('KeyC')) && !busy && grounded && s.st >= 20) {
        s.st -= 20;
        if (hasMove) s.yaw = Math.atan2(move.x, move.z);
        s.setState('roll');
        s.iframes = 0.5;
        s.char.play('Roll', { once: true, fade: 0.05, speed: 1.5, restart: true, onDone: () => s.state === 'roll' && s.setState('free') });
      }
      const blockHeld = (input.held('Mouse2') && !input.noLock) || input.held('Block');
      if (blockHeld && (s.state === 'free' || s.state === 'recover') && grounded && melee) {
        s.setState('block');
        s.char.play('Sword_Block', { once: true, fade: 0.08, speed: 1.6, restart: true });
      }
      if (s.state === 'block' && !blockHeld) s.setState('free');
      if (input.pressed('Space') && !busy) {
        const qg = 1 + (s.rpg.skills.qinggong || 0) * 0.1;
        if (grounded || s.inWater) {
          s.vel.y = 9 * qg; s.onGround = false; s.airJumps = 0;
          s.char.play('Jump_Loop', { fade: 0.1 });
          if (s.state !== 'free') s.setState('free');
        } else if (s.airJumps < 1 && s.mp >= 8) {
          s.mp -= 8; s.airJumps++;
          s.vel.y = 12 * qg;
          s.gliding = true;
          s.char.play('NinjaJump_Start', { once: true, fade: 0.06, speed: 1.6, restart: true, onDone: () => !s.onGround && s.char.play('NinjaJump_Idle_Loop', { fade: 0.1 }) });
          s.game.fx.burst(s.pos.clone(), 0xe8f0ff);
          s.game.audio.swoosh(0.7);
        }
      }
    }

    let speed = 0;
    const wantYaw = hasMove ? Math.atan2(move.x, move.z) : s.yaw;
    const frac = (name) => { const a = s.char.action(name); return a ? a.time / a.getClip().duration : 1; };
    if (s.state === 'free' && !talking) {
      if (hasMove) {
        speed = (sprint && s.st > 1 ? 9 : 5.2) * (1 + s.rpg.stat('spd'));
        if (s.mounted) speed = (sprint ? 17 : 11) * (s.game.beasts?.mountSpeed() || 1);
        if (s.inWater) speed = sprint ? 4 : 2.6;
        if (sprint && !s.mounted) s.st = Math.max(0, s.st - dt * 14);
        s.faceTowards(wantYaw, dt, 12);
      }
    } else if (s.state === 'attack') {
      const a = COMBO[s.combo];
      const t = frac(a.anim);
      if (s.stateT < 0.12 && hasMove) s.faceTowards(wantYaw, dt, 25);
      else if (s.stateT < 0.12) s.autoAim(dt);
      if (t > 0.25 && t < 0.55) speed = a.lunge;
      if (!s.hitDone && t >= a.hitAt) {
        s.hitDone = true;
        s.game.combat.playerMelee(s, { range: s.cls.range * (a.knock ? 1.15 : 1), arc: a.arc, dmg: s.damage(a.mul), knock: a.knock });
      }
    } else if (s.state === 'shoot') {
      if (!s.hitDone && frac('Spell_Simple_Shoot') > 0.35) {
        s.hitDone = true;
        if (s.cls.attack === 'arrow') s.game.combat.fireArrows(s, s.handPos(), s.aimDir(), 1, s.damage(1.2));
        else s.game.combat.fireOrb(s, s.handPos(), s.aimDir(), { dmg: s.damage(1.1, 'palm'), size: 0.7 });
      }
    } else if (s.state === 'dash') {
      const t = frac('Sword_Dash');
      if (t > 0.08 && t < 0.42) speed = 17;
      if (t < 0.42) s.iframes = Math.max(s.iframes, 0.05);
      if (!s.hitDone && t > 0.32) { s.hitDone = true; s.game.combat.playerMelee(s, { range: 3.4, arc: 2.2, dmg: s.damage(2.2, 'dash'), knock: true, back: 4.5 }); s.game.vfx.slash(s, 0xcfe8ff, { wide: 1.6, reach: 2.6, tilt: 0.1 }); }
    } else if (s.state === 'roll') {
      speed = frac('Roll') < 0.65 ? 8.5 : 2;
    } else if (s.state === 'cast') {
      const name = s.char.currentName;
      if (!s.hitDone && frac(name) > 0.42) { s.hitDone = true; s.releaseSkill(); }
    } else if (s.state === 'recover') {
      if (hasMove && s.stateT > 0.12) s.setState('free');
    } else if (s.state === 'block') {
      const act = s.char.action('Sword_Block');
      if (act && act.time > act.getClip().duration * 0.32) act.paused = true;
      s.autoAim(dt);
    }

    const dir = s.state === 'free' ? move : s.forward();
    const accel = s.onGround || s.inWater ? 14 : 3;
    s.vel.x += (dir.x * speed - s.vel.x) * Math.min(1, dt * accel);
    s.vel.z += (dir.z * speed - s.vel.z) * Math.min(1, dt * accel);

    const glideCost = 6 - (s.rpg.skills.qinggong || 0) * 1.5;
    s.gravityScale = s.gliding && input.held('Space') && s.vel.y < 0 && s.mp > 0 ? 0.18 : 1;
    if (s.gravityScale < 1) s.mp = Math.max(0, s.mp - dt * glideCost);
    s.walkOnWater = s.canWaterRun && sprint && s.mp > 0;
    const wasAir = !s.onGround;
    s.physics(dt);
    if (s.walkOnWater && s.onGround && s.pos.y <= -0.55 && hasMove) s.mp = Math.max(0, s.mp - dt * 5);

    if (s.onGround && wasAir) {
      s.gliding = false;
      s.airJumps = 0;
      if (s.state === 'free') s.char.play(Math.hypot(s.vel.x, s.vel.z) > 2 ? 'Jog_Fwd_Loop' : 'Jump_Land', { fade: 0.1, speed: 1.6 });
      s.game.fx.dust(s.pos.clone());
    }

    if (!sprint || !hasMove) s.st = Math.min(s.maxSt, s.st + dt * 22);
    s.mp = Math.min(s.maxMp, s.mp + dt * 3.5);
    if (s.inCombat <= 0) s.hp = Math.min(s.maxHp, s.hp + dt * 4);

    if (s.state === 'free' || s.state === 'talk') {
      const hs = Math.hypot(s.vel.x, s.vel.z);
      if (s.mounted) s.char.play('Driving_Loop', { fade: 0.2 });
      else if (s.inWater) s.char.play(hs > 0.5 ? 'Swim_Fwd_Loop' : 'Swim_Idle_Loop', { fade: 0.25 });
      else if (!s.onGround) { if (!s.gliding && s.char.currentName !== 'Jump_Loop') s.char.play('Jump_Loop', { fade: 0.15 }); }
      else if (hs > 7) s.char.play('Sprint_Loop', { fade: 0.2, speed: hs / 8.5 });
      else if (hs > 3) s.char.play('Jog_Fwd_Loop', { fade: 0.2, speed: hs / 5.2 });
      else if (hs > 0.6) s.char.play('Walk_Loop', { fade: 0.25, speed: Math.max(0.6, hs / 1.8) });
      else if (s.char.currentName !== 'Jump_Land' || !s.char.current.isRunning()) s.char.play(s.inCombat > 0 && melee ? 'Sword_Idle' : 'Idle_Loop', { fade: 0.3 });
    }
    s.char.update(dt);
  }

  autoAim(dt) {
    const e = this.game.combat.nearestEnemy(this.pos, 4.5, this.forward(), 0.2);
    if (e) this.faceTowards(Math.atan2(e.pos.x - this.pos.x, e.pos.z - this.pos.z), dt, 20);
  }
}
