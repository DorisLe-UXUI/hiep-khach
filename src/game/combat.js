import * as THREE from 'three';

export class Combat {
  constructor(game) {
    this.game = game;
    this.orbs = [];
    this.orbGeo = new THREE.SphereGeometry(0.22, 16, 12);
    this.orbMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, toneMapped: false });
    this.hitStop = 0;
  }

  enemies() { return this.game.enemies.filter((e) => !e.dead); }

  nearestEnemy(pos, range, fwd, minDot = -1) {
    let best = null, bd = range;
    for (const e of this.enemies()) {
      const v = new THREE.Vector3().subVectors(e.pos, pos).setY(0);
      const d = v.length();
      if (d < bd && (minDot <= -1 || v.normalize().dot(fwd) > minDot)) { bd = d; best = e; }
    }
    return best;
  }

  inArc(attacker, target, range, arc) {
    const v = new THREE.Vector3().subVectors(target.pos, attacker.pos).setY(0);
    const d = v.length() - target.radius;
    if (d > range || Math.abs(target.pos.y - attacker.pos.y) > 2) return false;
    if (d < 0.4) return true;
    const ang = Math.acos(THREE.MathUtils.clamp(v.normalize().dot(attacker.forward()), -1, 1));
    return ang < arc / 2 + 0.2;
  }

  /** Gây sát thương lên kẻ địch (dùng chung cho mọi đòn của người chơi). */
  hurtEnemy(p, e, dmg, opts = {}) {
    this.game.lastTarget = e;
    const crit = Math.random() < this.game.rpg.crit();
    dmg = Math.round(dmg * (crit ? 1.8 : 1));
    e.takeDamage(dmg, p, opts);
    this.game.hud.damage(e.pos.clone().setY(e.pos.y + 1.9), dmg, crit ? 'crit' : '');
    this.game.vfx.flash(e, crit ? 0xffe080 : 0xffffff);
    return dmg;
  }

  playerMelee(p, a) {
    let hits = 0;
    for (const e of this.enemies()) {
      if (!this.inArc(p, e, a.range, a.arc)) continue;
      this.game.lastTarget = e;
      const crit = Math.random() < this.game.rpg.crit();
      let dmg = Math.round(a.dmg);
      if (crit) dmg = Math.round(dmg * 1.8);
      e.takeDamage(dmg, p, { knock: a.knock, back: a.back ?? 2.5 });
      this.game.hud.damage(e.pos.clone().setY(e.pos.y + 1.9), dmg, crit ? 'crit' : '');
      this.game.vfx.flash(e, crit ? 0xffe080 : 0xffffff);
      if (crit) this.game.vfx.shockwave(e.pos.clone(), 0xffd27a, 2);
      this.game.fx.blood(e.pos.clone().setY(e.pos.y + 1.2), p.forward());
      hits++;
    }
    if (hits) {
      this.game.audio.hit();
      this.hitStop = a.knock ? 0.09 : 0.05;
      this.game.camRig.shake = a.knock ? 0.7 : 0.35;
      p.inCombat = 8;
    }
    this.game.fx.slash(p, a.knock ? 0xfff0c0 : 0xffffff);
  }

  enemyMelee(e, a) {
    const p = this.game.player;
    // đồng đội đứng trong tầm cũng dính đòn
    for (const al of this.game.allies || []) {
      if (!al.dead && this.inArc(e, al, a.range, a.arc)) al.takeDamage(Math.round(a.dmg * 0.9));
    }
    if (p.dead || !this.inArc(e, p, a.range, a.arc)) return;
    const dmg = Math.round(a.dmg * (0.85 + Math.random() * 0.3));
    const dealt = p.takeDamage(dmg, e, { heavy: a.heavy });
    if (dealt > 0) this.game.hud.damage(p.pos.clone().setY(p.pos.y + 1.9), dealt, 'player');
    p.inCombat = 8;
  }

  /** Chưởng khí. Của người chơi thì trúng địch, của địch thì trúng người chơi. */
  fireOrb(owner, from, dir, { dmg = 30, size = 1, color = 0xbfe6ff, speed = 26 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const mesh = new THREE.Mesh(this.orbGeo, mat);
    mesh.scale.setScalar(size);
    mesh.position.copy(from);
    mesh.add(new THREE.PointLight(color, 6, 9, 2));
    this.game.scene.add(mesh);
    this.orbs.push({ mesh, vel: dir.clone().normalize().multiplyScalar(speed), life: 1.8, owner, dmg, color, hostile: !!owner.isEnemy, r: 0.5 * size });
    this.game.audio.whoosh();
  }

  /** Bắn n mũi tên toả hình quạt. */
  fireArrows(owner, from, dir, n, dmg) {
    if (!this.arrowGeo) {
      this.arrowGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.9, 5).rotateX(Math.PI / 2);
      this.arrowMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, emissive: 0x3a2a10 });
    }
    const base = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i / (n - 1) - 0.5) * 0.5 : 0);
      const d = new THREE.Vector3(Math.sin(a), dir.y || 0, Math.cos(a)).normalize();
      const mesh = new THREE.Mesh(this.arrowGeo, this.arrowMat);
      mesh.position.copy(from);
      mesh.lookAt(from.clone().add(d));
      this.game.scene.add(mesh);
      this.orbs.push({ mesh, vel: d.multiplyScalar(42), life: 1.1, owner, dmg, color: 0xffe6b0, arrow: true, hostile: false, r: 0.35 });
    }
    this.game.audio.swoosh(0.6);
  }

  /** Sóng chấn quanh người (Phong Lôi Trận, Hoành Tảo). */
  nova(owner, radius, dmg, color) {
    for (const e of this.enemies()) {
      if (e.pos.distanceTo(owner.pos) < radius + e.radius) this.hurtEnemy(owner, e, dmg, { knock: true, back: 5 });
    }
    this.game.fx.ring(owner.pos.clone(), radius, color);
    this.game.camRig.shake = 0.6;
    this.game.audio.hit();
  }

  update(dt) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      o.mesh.position.addScaledVector(o.vel, dt);
      if (!o.arrow) this.game.fx.trailPuff(o.mesh.position, o.color);
      let hit = o.mesh.position.y < this.game.terrain.heightAt(o.mesh.position.x, o.mesh.position.z);
      if (o.hostile) {
        const p = this.game.player;
        if (!p.dead && p.pos.clone().setY(p.pos.y + 1.1).distanceTo(o.mesh.position) < p.radius + o.r) {
          const dealt = p.takeDamage(o.dmg, o.owner, { heavy: true });
          if (dealt) this.game.hud.damage(p.pos.clone().setY(p.pos.y + 1.9), dealt, 'player');
          hit = true;
        }
      } else {
        for (const e of this.enemies()) {
          const c = e.pos.clone().setY(e.pos.y + 1.1);
          if (c.distanceTo(o.mesh.position) < e.radius + o.r + 0.2) {
            this.hurtEnemy(o.owner, e, o.dmg, { knock: !o.arrow, back: 3 });
            hit = true;
            break;
          }
        }
      }
      if (hit || o.life <= 0) {
        if (!o.arrow || hit) this.game.fx.burst(o.mesh.position.clone(), o.color, o.arrow ? 10 : 30);
        if (hit) this.game.audio.hit();
        this.game.scene.remove(o.mesh);
        o.mesh.children[0]?.dispose?.();
        if (!o.arrow) o.mesh.material.dispose();
        this.orbs.splice(i, 1);
      }
    }
  }
}
