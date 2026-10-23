import * as THREE from 'three';

/**
 * Đòn có cảnh báo (boss / tinh anh): vòng đỏ trên mặt đất, phần tô sáng dần đến lúc nổ.
 * Đứng ngoài vùng (hoặc đang lộn né) khi nổ thì không trúng.
 */
const ringGeo = new THREE.RingGeometry(0.94, 1, 64);
const discGeo = new THREE.CircleGeometry(1, 64);
ringGeo.rotateX(-Math.PI / 2);
discGeo.rotateX(-Math.PI / 2);

export class Telegraphs {
  constructor(g) { this.g = g; this.list = []; }

  /** { x, z, r, inner, delay, dmg, owner, color, onBoom } */
  add(o) {
    const g = this.g, color = o.color ?? 0xff3020;
    const grp = new THREE.Group();
    const mk = (geo, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false, depthTest: false, side: THREE.DoubleSide })); m.renderOrder = 5; grp.add(m); return m; };
    const edge = mk(ringGeo, 0.9), base = mk(discGeo, 0.16), fill = mk(discGeo, 0.32);
    edge.scale.setScalar(o.r); base.scale.setScalar(o.r);
    let innerEdge = null;
    if (o.inner) {
      // vùng an toàn ở giữa (đòn hình vành khăn)
      base.geometry = new THREE.RingGeometry(o.inner, o.r, 64).rotateX(-Math.PI / 2); base.scale.setScalar(1);
      innerEdge = mk(ringGeo, 0.9); innerEdge.scale.setScalar(o.inner);
      fill.geometry = base.geometry; fill.scale.setScalar(1);
    }
    grp.position.set(o.x, g.terrain.heightAt(o.x, o.z) + 0.12, o.z);
    g.scene.add(grp);
    this.list.push({ ...o, t: 0, grp, fill, base });
  }

  update(dt) {
    const g = this.g, p = g.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i];
      t.t += dt;
      const k = Math.min(1, t.t / t.delay);
      if (t.inner) t.fill.material.opacity = 0.12 + k * 0.4;
      else t.fill.scale.setScalar(Math.max(0.01, t.r * k));
      t.grp.children[0].material.opacity = 0.6 + Math.sin(t.t * 18) * 0.3;
      if (t.owner?.dead) { g.scene.remove(t.grp); this.list.splice(i, 1); continue; }
      if (k < 1) continue;
      // nổ
      const d = Math.hypot(p.pos.x - t.x, p.pos.z - t.z);
      const inside = d <= t.r + p.radius * 0.5 && d >= (t.inner || 0) - p.radius * 0.5;
      g.vfx.shockwave(new THREE.Vector3(t.x, g.terrain.heightAt(t.x, t.z), t.z), t.color ?? 0xff3020, t.r);
      g.fx.burst(new THREE.Vector3(t.x, g.terrain.heightAt(t.x, t.z) + 0.5, t.z), t.color ?? 0xff5030, 26);
      g.camRig.shake = Math.max(g.camRig.shake, 0.5);
      g.audio.hit(true);
      if (inside && !p.dead) {
        if (p.state === 'roll' || p.iframes > 0) g.hud.damage(p.pos.clone().setY(p.pos.y + 2.2), 'Né!', 'heal');
        else {
          p.takeDamage(t.dmg, t.owner || { pos: new THREE.Vector3(t.x, 0, t.z) }, { heavy: true });
          if (t.owner?.boss && Math.random() < 0.4) g.status.add('stun', 1); // boss đập đất: choáng
        }
      } else if (d < t.r + 4) { g.sys.s.stats.dodges = (g.sys.s.stats.dodges || 0) + 1; }
      t.onBoom?.();
      g.scene.remove(t.grp);
      this.list.splice(i, 1);
    }
  }

  clear() { for (const t of this.list) this.g.scene.remove(t.grp); this.list = []; }
}

/** Chọn và tung một chiêu cảnh báo cho kẻ địch lớn. Trả về thời gian vận chiêu. */
export function castTelegraph(e, g) {
  const p = g.player, boss = e.boss, ph2 = e.phase2;
  const dmg = Math.round(e.dmg * (boss ? 2.2 : 1.8));
  const pick = Math.random();
  const T = g.telegraphs;
  let delay;
  if (pick < 0.4) {
    // đập đất quanh thân
    delay = ph2 ? 1.0 : 1.3;
    T.add({ x: e.pos.x, z: e.pos.z, r: boss ? 5.5 : 4, delay, dmg, owner: e });
    g.toast?.(`<b>${e.name.split('·').pop().trim()}</b> vận lực đập đất — tránh xa!`, 1.2);
  } else if (pick < 0.75 || !boss) {
    // nhắm vào chỗ người chơi đang đứng (phase 2: 3 vòng)
    delay = 1.15;
    const n = ph2 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, off = i ? 3 + Math.random() * 2 : 0;
      T.add({ x: p.pos.x + Math.cos(a) * off, z: p.pos.z + Math.sin(a) * off, r: 2.6, delay: delay + i * 0.25, dmg, owner: e, color: 0xff6a20 });
    }
  } else {
    // vành khăn: an toàn khi áp sát
    delay = 1.6;
    T.add({ x: e.pos.x, z: e.pos.z, r: 11, inner: 3, delay, dmg, owner: e, color: 0xc03aff });
    g.toast?.('Sát khí lan rộng — <b>áp sát</b> kẻ địch để tránh!', 1.4);
  }
  return delay;
}
