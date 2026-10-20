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

  playerMelee(p, a) {
    let hits = 0;
    for (const e of this.enemies()) {
      if (!this.inArc(p, e, a.range, a.arc)) continue;
      const crit = Math.random() < 0.12;
      let dmg = Math.round(a.dmg[0] + Math.random() * (a.dmg[1] - a.dmg[0]));
      if (crit) dmg = Math.round(dmg * 1.8);
      e.takeDamage(dmg, p, { knock: a.knock, back: a.back ?? 2.5 });
      this.game.hud.damage(e.pos.clone().setY(e.pos.y + 1.9), dmg, crit ? 'crit' : '');
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
    if (p.dead || !this.inArc(e, p, a.range, a.arc)) return;
    const dmg = Math.round(a.dmg * (0.85 + Math.random() * 0.3));
    const dealt = p.takeDamage(dmg, e, { heavy: a.heavy });
    if (dealt > 0) this.game.hud.damage(p.pos.clone().setY(p.pos.y + 1.9), dealt, 'player');
    p.inCombat = 8;
  }

  fireOrb(owner, from, dir) {
    const mesh = new THREE.Mesh(this.orbGeo, this.orbMat);
    mesh.position.copy(from);
    const light = new THREE.PointLight(0x9fd4ff, 6, 9, 2);
    mesh.add(light);
    this.game.scene.add(mesh);
    this.orbs.push({ mesh, vel: dir.clone().normalize().multiplyScalar(26), life: 1.6, owner });
    this.game.audio.whoosh();
  }

  update(dt) {
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life -= dt;
      o.mesh.position.addScaledVector(o.vel, dt);
      this.game.fx.trail(o.mesh.position, 0xbfe6ff);
      let hit = o.mesh.position.y < this.game.terrain.heightAt(o.mesh.position.x, o.mesh.position.z);
      for (const e of this.enemies()) {
        const c = e.pos.clone().setY(e.pos.y + 1.1);
        if (c.distanceTo(o.mesh.position) < e.radius + 0.6) {
          const dmg = 32 + Math.round(Math.random() * 10);
          e.takeDamage(dmg, o.owner, { knock: true, back: 3 });
          this.game.hud.damage(c.setY(c.y + 0.8), dmg, 'crit');
          hit = true;
          break;
        }
      }
      if (hit || o.life <= 0) {
        this.game.fx.burst(o.mesh.position.clone(), 0xbfe6ff, 30);
        if (hit) this.game.audio.hit();
        this.game.scene.remove(o.mesh);
        o.mesh.children[0].dispose?.();
        this.orbs.splice(i, 1);
      }
    }
  }
}
