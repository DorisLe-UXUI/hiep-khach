import * as THREE from 'three';

/** Hiệu ứng chiêu thức kiểu MMO: vòng phép dưới chân, vệt chém, chớp sáng khi trúng, cột sáng lên cấp. */

let runeTex = null;
function runeTexture() {
  if (runeTex) return runeTex;
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(246, 6); ring(226, 2); ring(160, 4); ring(80, 3);
  // bát quái
  g.font = '44px "Ma Shan Zheng", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const tri = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * Math.PI * 2); g.fillText(tri[i], 0, -193); g.restore();
  }
  // chữ phù quanh vòng trong
  const han = '天地玄黃宇宙洪荒日月盈昃辰宿列張';
  g.font = '26px "Ma Shan Zheng", serif';
  for (let i = 0; i < han.length; i++) {
    g.save(); g.rotate((i / han.length) * Math.PI * 2); g.fillText(han[i], 0, -120); g.restore();
  }
  // ngôi sao lục giác
  g.lineWidth = 3;
  for (const off of [0, Math.PI / 3]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) { const a = off + (i / 3) * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 160, Math.sin(a) * 160); }
    g.stroke();
  }
  runeTex = new THREE.CanvasTexture(c);
  return runeTex;
}

let arcTex = null;
function arcTexture() {
  if (arcTex) return arcTex;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 32);
  const v = g.createLinearGradient(0, 0, 0, 32);
  v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.5, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 256, 32);
  arcTex = new THREE.CanvasTexture(c);
  return arcTex;
}

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }

  add(obj, life, update) {
    this.scene.add(obj);
    this.items.push({ obj, life, max: life, update });
  }

  /** Vòng phép xoay dưới chân. */
  magicCircle(pos, color = 0x8fd8ff, radius = 2.2, life = 1.1) {
    const mat = new THREE.MeshBasicMaterial({ map: runeTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).add(new THREE.Vector3(0, 0.06, 0));
    m.renderOrder = 5;
    this.add(m, life, (o, k, dt) => {
      o.rotation.z += dt * 1.6;
      const s = k > 0.85 ? (1 - k) / 0.15 : 1;
      o.scale.setScalar(0.6 + Math.min(1, (1 - k) * 4) * 0.4);
      mat.opacity = Math.min(1, k * 3) * 0.95 * Math.max(0.2, s);
    });
    // cột sáng mảnh
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.75, radius * 0.9, 2.5, 32, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.copy(pos).add(new THREE.Vector3(0, 1.25, 0));
    this.add(beam, life * 0.7, (o, k) => { o.material.opacity = k * 0.22; o.scale.y = 0.4 + (1 - k); });
    return m;
  }

  /** Vệt kiếm lưỡi liềm trước mặt nhân vật. */
  slash(actor, color = 0xffffff, { wide = 1, flip = false, tilt = 0.25, height = 1.15, reach = 1.6 } = {}) {
    const r0 = reach * 0.66, r1 = reach * (0.98 + wide * 0.08);
    const geo = new THREE.RingGeometry(r0, r1, 48, 1, -1.1 * wide, 2.2 * wide);
    // UV theo góc để gradient chạy dọc vệt
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const a = Math.atan2(pos.getY(i), pos.getX(i));
      const r = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (a + 1.1 * wide) / (2.2 * wide), (r - r0) / (r1 - r0));
    }
    const mat = new THREE.MeshBasicMaterial({ map: arcTexture(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(geo, mat);
    const g = new THREE.Group();
    g.add(m);
    m.rotation.x = -Math.PI / 2;
    m.rotation.y = flip ? Math.PI : 0;
    g.position.copy(actor.pos).add(new THREE.Vector3(0, height, 0));
    g.rotation.order = 'YXZ';
    g.rotation.y = actor.yaw - Math.PI / 2;
    g.rotation.z = flip ? -tilt : tilt;
    this.add(g, 0.28, (o, k) => {
      mat.opacity = Math.min(1, k * 1.6) * 0.8;
      o.scale.setScalar(0.9 + (1 - k) * 0.3);
      m.rotation.z = (1 - k) * (flip ? -0.9 : 0.9);
    });
  }

  /** Sóng chấn tròn trên mặt đất. */
  shockwave(pos, color = 0xffd27a, radius = 5) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
    this.add(m, 0.5, (o, k) => { o.scale.setScalar(radius * (1 - k) + 0.5); mat.opacity = k; });
  }

  /** Cột sáng (lên cấp, hồi máu). */
  pillar(pos, color = 0xffd27a, h = 6) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, h, 32, 1, true), mat);
    m.position.copy(pos).add(new THREE.Vector3(0, h / 2, 0));
    this.add(m, 1.4, (o, k, dt) => { mat.opacity = Math.min(1, k * 2) * 0.5; o.scale.x = o.scale.z = 1 + (1 - k) * 0.6; o.rotation.y += dt * 2; });
    this.magicCircle(pos, color, 2.6, 1.4);
  }

  /** Chớp sáng thân người khi trúng đòn (vật liệu phải là bản riêng). */
  flash(actor, color = 0xffffff) {
    const mats = [];
    actor.char.model.traverse((o) => { if (o.isMesh && o.material?.emissive) mats.push(o.material); });
    for (const m of mats) { m.emissive.set(color); m.emissiveIntensity = 0.9; }
    const obj = new THREE.Object3D();
    this.add(obj, 0.14, (o, k) => { for (const m of mats) m.emissiveIntensity = k / 0.14 * 0.9 * 0.14 * 7; });
    obj.userData.onEnd = () => { for (const m of mats) m.emissiveIntensity = 0; };
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const k = Math.max(0, it.life / it.max);
      it.update?.(it.obj, k, dt);
      if (it.life <= 0) {
        it.obj.userData.onEnd?.();
        this.scene.remove(it.obj);
        it.obj.traverse?.((o) => { o.geometry?.dispose(); if (o.material && o.material.map !== runeTex && o.material.map !== arcTex) o.material.dispose?.(); });
        this.items.splice(i, 1);
      }
    }
  }
}
