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

/** Bảng màu chiêu theo môn phái: nhiều sắc chuyển nhau cho cảm giác "ảo". */
export const PALETTES = {
  kiem: [0x7fe8ff, 0xffffff, 0xa98bff, 0x5ab8ff],
  thuong: [0xffd24a, 0xff7a2a, 0xff3a3a, 0xfff0a0],
  cung: [0xfff08a, 0x8affc0, 0xffffff, 0x6ad8ff],
  phap: [0xc08aff, 0x6a9bff, 0xff7ae0, 0xe8d8ff],
  dao: [0x8affb0, 0x5ae8e0, 0xffe27a, 0xffffff],
};
export const ULT_HAN = { kiem: '天劍陣', thuong: '霸王訣', cung: '萬箭齊發', phap: '天雷陣', dao: '道法自然' };

let starTex = null;
function starTexture() {
  if (starTex) return starTex;
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,255,255,.8)'); gr.addColorStop(0.4, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, S / 2, 0, Math.PI * 2); g.fill();
  // tia sáng
  for (let i = 0; i < 12; i++) {
    const L = i % 2 ? S * 0.32 : S * 0.5, w = i % 2 ? 5 : 9;
    g.save(); g.rotate((i / 12) * Math.PI * 2);
    const lg = g.createLinearGradient(0, 0, 0, -L); lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(-w, 0); g.lineTo(0, -L); g.lineTo(w, 0); g.closePath(); g.fill();
    g.restore();
  }
  starTex = new THREE.CanvasTexture(c);
  return starTex;
}

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const pick = (pal, i) => pal[((i % pal.length) + pal.length) % pal.length];

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    // dùng lại vật liệu + hình khối: không tạo/huỷ mỗi chiêu (huỷ vật liệu cuối cùng => three xoá chương trình shader, lần sau phải dịch lại)
    this.mats = new Map();
    this.geos = new Map();
  }

  /** Vật liệu cộng màu từ kho; trả về kho khi hiệu ứng hết. */
  mat(map, color, opacity = 1, normal = false) {
    const k = (map ? map.uuid : '') + (normal ? 'n' : '');
    if (!this.mats.has(k)) this.mats.set(k, []);
    const pool = this.mats.get(k);
    const m = pool.pop() || new THREE.MeshBasicMaterial({ map, transparent: true, blending: normal ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    m.color.set(color);
    m.opacity = opacity;
    m.userData.pool = pool;
    return m;
  }

  geo(key, make) {
    if (!this.geos.has(key)) this.geos.set(key, make());
    return this.geos.get(key);
  }

  add(obj, life, update) {
    this.scene.add(obj);
    this.items.push({ obj, life, max: life, update });
  }

  /** Vòng phép xoay dưới chân. */
  magicCircle(pos, color = 0x8fd8ff, radius = 2.2, life = 1.1) {
    const mat = this.mat(runeTexture(), color);
    const m = new THREE.Mesh(this.geo('plane' + radius, () => new THREE.PlaneGeometry(radius * 2, radius * 2)), mat);
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
    const beam = new THREE.Mesh(this.geo('beam' + radius, () => new THREE.CylinderGeometry(radius * 0.75, radius * 0.9, 2.5, 32, 1, true)), this.mat(null, color, 0.25));
    beam.position.copy(pos).add(new THREE.Vector3(0, 1.25, 0));
    this.add(beam, life * 0.7, (o, k) => { o.material.opacity = k * 0.22; o.scale.y = 0.4 + (1 - k); });
    return m;
  }

  /** Vệt kiếm lưỡi liềm trước mặt nhân vật. */
  slash(actor, color = 0xffffff, { wide = 1, flip = false, tilt = 0.25, height = 1.15, reach = 1.6 } = {}) {
    const r0 = reach * 0.66, r1 = reach * (0.98 + wide * 0.08);
    const geo = this.geo(`slash${reach},${wide}`, () => {
      const geo = new THREE.RingGeometry(r0, r1, 48, 1, -1.1 * wide, 2.2 * wide);
      // UV theo góc để gradient chạy dọc vệt
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const a = Math.atan2(pos.getY(i), pos.getX(i));
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (a + 1.1 * wide) / (2.2 * wide), (r - r0) / (r1 - r0));
      }
      return geo;
    });
    const mat = this.mat(arcTexture(), color);
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
  shockwave(pos, color = 0xffd27a, radius = 5, normal = false) {
    const mat = this.mat(null, color, 1, normal);
    const m = new THREE.Mesh(this.geo('shock', () => new THREE.RingGeometry(0.8, 1, 48)), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
    this.add(m, 0.5, (o, k) => { o.scale.setScalar(radius * (1 - k) + 0.5); mat.opacity = k; });
  }

  /** Cột sáng (lên cấp, hồi máu). */
  pillar(pos, color = 0xffd27a, h = 6) {
    const mat = this.mat(null, color);
    const m = new THREE.Mesh(this.geo('pillar' + h, () => new THREE.CylinderGeometry(0.9, 1.1, h, 32, 1, true)), mat);
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

  // ───────────────────────── hiệu ứng nâng cấp ─────────────────────────
  get lite() { return this.quality === 'low'; }

  /** Sao nổ nhiều màu tại điểm trúng đòn. */
  impact(pos, pal = PALETTES.kiem, size = 1.6) {
    const tex = starTexture();
    [0, 1].forEach((j) => {
      const mat = new THREE.SpriteMaterial({ map: tex, color: pick(pal, j), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
      const sp = new THREE.Sprite(mat);
      sp.position.copy(pos);
      const s0 = size * (j ? 1.6 : 1), rot = Math.random() * 6;
      this.add(sp, 0.28 + j * 0.08, (o, k) => { o.scale.setScalar(s0 * (0.4 + (1 - k) * 0.9)); mat.opacity = k; mat.rotation = rot + (1 - k) * (j ? -1 : 1); });
      sp.userData.onEnd = () => mat.dispose();
    });
    if (this.fx) for (let i = 0; i < (this.lite ? 8 : 18); i++) {
      _a.set(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 6);
      this.fx.emit(pos, _a, pick(pal, i), 0.09 + Math.random() * 0.08, 0.35 + Math.random() * 0.25, 6);
    }
  }

  /** Nhiều vòng sóng chấn nối nhau, mỗi vòng một màu. */
  rings(pos, pal, radius = 6) {
    pal.slice(0, this.lite ? 2 : 3).forEach((c, i) => setTimeout(() => this.shockwave(pos, c, radius * (1 - i * 0.12), i !== 1), i * 90));
  }

  /** Hạt xoắn ốc bay lên quanh một điểm. */
  spiral(pos, pal, n = 60, h = 4, r = 1.4) {
    if (!this.fx) return;
    n = this.lite ? n >> 1 : n;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 6, rr = r * (0.6 + Math.random() * 0.5);
      _a.copy(pos).add(_b.set(Math.cos(a) * rr, (i / n) * 0.6, Math.sin(a) * rr));
      _b.set(-Math.sin(a) * 2.2, h * (0.6 + Math.random() * 0.6), Math.cos(a) * 2.2);
      this.fx.emit(_a, _b, pick(pal, i), 0.12 + Math.random() * 0.1, 0.8 + Math.random() * 0.6, 1.5);
    }
  }

  /** Tia sét gấp khúc (2 dải chéo nhau để nhìn góc nào cũng thấy). */
  lightning(from, to, color = 0xc8b0ff, life = 0.3, width = 0.28) {
    const seg = 10, pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, j = i && i < seg ? 1 : 0;
      pts.push(new THREE.Vector3().lerpVectors(from, to, t).add(_a.set((Math.random() - 0.5) * 1.4 * j, (Math.random() - 0.5) * 0.4 * j, (Math.random() - 0.5) * 1.4 * j)));
    }
    const g = new THREE.Group();
    for (const [ax, az] of [[1, 0], [0, 1]]) {
      const pos = [];
      pts.forEach((p, i) => { const w = width * (1 - i / seg * 0.6); pos.push(p.x - ax * w, p.y, p.z - az * w, p.x + ax * w, p.y, p.z + az * w); });
      const idx = [];
      for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const core = new THREE.Mesh(geo, this.mat(null, 0xffffff));
      const outer = new THREE.Mesh(geo, this.mat(null, color, 0.7, true));
      outer.scale.set(1, 1, 1);
      g.add(outer, core);
    }
    this.add(g, life, (o, k) => { const f = Math.random() < 0.3 ? 0.3 : 1; o.children.forEach((m, i) => { m.material.opacity = k * f * (i % 2 ? 1 : 0.7); }); });
    g.userData.onEnd = () => g.children.forEach((m, i) => { if (i % 2) m.geometry.dispose(); });
    return g;
  }

  /** Một đòn từ trời: kiếm ánh sáng / sét / thương lửa / tên sáng / bùa. */
  skyStrike(pos, pal, kind = 'blade') {
    const ground = pos.clone();
    if (kind === 'bolt') {
      this.lightning(ground.clone().add(_a.set((Math.random() - 0.5) * 3, 16, (Math.random() - 0.5) * 3)), ground, pick(pal, Math.random() * 4 | 0), 0.32, 0.35);
      this.impact(ground.clone().setY(ground.y + 0.6), pal, 2.4);
      this.shockwave(ground, pick(pal, 1), 3);
      return;
    }
    const len = kind === 'arrow' ? 2.4 : 3.4, w = kind === 'arrow' ? 0.12 : kind === 'talisman' ? 0.5 : 0.28;
    const geo = this.geo('sky' + kind, () => kind === 'talisman' ? new THREE.PlaneGeometry(0.7, 1.2) : new THREE.ConeGeometry(w, len, 4).rotateX(Math.PI));
    const col = pick(pal, Math.random() * 4 | 0);
    const m = new THREE.Mesh(geo, this.mat(null, col, 1, true));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    glow.scale.set(1.4, len * 1.3, 1);
    const g = new THREE.Group(); g.add(m, glow);
    const fall = 0.3, h0 = 15;
    let landed = false;
    this.add(g, fall + 0.35, (o, k, dt) => {
      const t = (1 - k) * (fall + 0.35);
      const f = Math.min(1, t / fall);
      o.position.copy(ground).setY(ground.y + len / 2 + h0 * (1 - f * f));
      if (kind === 'talisman') o.rotation.y += dt * 12;
      if (f < 1 && this.fx && Math.random() < 0.8) this.fx.trailPuff(o.position, col);
      if (f >= 1 && !landed) {
        landed = true;
        this.impact(ground.clone().setY(ground.y + 0.5), pal, kind === 'arrow' ? 1.4 : 2);
        this.shockwave(ground, pick(pal, 2), kind === 'arrow' ? 1.6 : 2.6);
        if (kind === 'fire' && this.fx) for (let i = 0; i < 14; i++) this.fx.emit(ground, _a.set((Math.random() - 0.5) * 3, 3 + Math.random() * 4, (Math.random() - 0.5) * 3), i % 2 ? 0xff5a1a : 0xffd24a, 0.25, 0.7, 2);
      }
      const fade = f >= 1 ? k / (0.35 / (fall + 0.35)) : 1;
      m.material.opacity = Math.min(1, fade); glow.material.opacity = Math.min(1, fade) * 0.8;
    });
    g.userData.onEnd = () => glow.material.dispose();
  }

  /** Mưa đòn từ trời quanh một điểm trong khoảng dur giây. */
  skyRain(center, pal, kind, radius = 7, n = 14, dur = 1.2) {
    n = this.lite ? Math.ceil(n / 2) : n;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radius;
        const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
        const y = this.terrain ? this.terrain.heightAt(x, z) : center.y;
        this.skyStrike(new THREE.Vector3(x, y, z), pal, kind);
        if (this.audio && i % 3 === 0) this.audio.skill(kind === 'bolt' ? 'zap' : kind === 'fire' ? 'fire' : kind === 'arrow' ? 'arrow' : 'slash', 0.5);
      }, (i / n) * dur * 1000 + Math.random() * 80);
    }
  }

  /** Hào quang bám theo nhân vật: vòng phù xoay + hạt nhiều màu bốc lên. */
  aura(actor, pal, life = 1.2, radius = 1.8) {
    const mat = this.mat(runeTexture(), pick(pal, 0), 0);
    const mat2 = this.mat(runeTexture(), pick(pal, 2), 0, true);
    const geo = this.geo('aura' + radius, () => new THREE.PlaneGeometry(radius * 2, radius * 2));
    const a = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat2);
    a.rotation.x = b.rotation.x = -Math.PI / 2;
    b.scale.setScalar(0.7);
    const g = new THREE.Group(); g.add(a, b);
    let t = 0;
    this.add(g, life, (o, k, dt) => {
      t += dt;
      o.position.copy(actor.pos).setY(actor.pos.y + 0.08);
      a.rotation.z += dt * 2.2; b.rotation.z -= dt * 3.4;
      const f = Math.min(1, t * 4) * Math.min(1, k * 4);
      mat.opacity = f * 0.9; mat2.opacity = f * 0.8;
      if (this.fx && Math.random() < (this.lite ? 0.4 : 1)) {
        const ang = Math.random() * Math.PI * 2;
        _a.copy(actor.pos).add(_b.set(Math.cos(ang) * radius * 0.8, 0.1, Math.sin(ang) * radius * 0.8));
        this.fx.emit(_a, _b.set(0, 2.5 + Math.random() * 2, 0), pick(pal, Math.random() * 4 | 0), 0.12, 0.7, 0);
      }
    });
  }

  /** Lưỡi kiếm khí lưỡi liềm bay về phía trước. */
  crescent(actor, dir, pal, { dist = 12, size = 1.8, delay = 0 } = {}) {
    setTimeout(() => {
      const geo = this.geo('cres', () => {
        const r0 = 0.62, r1 = 1, geo = new THREE.RingGeometry(r0, r1, 40, 1, -1.2, 2.4);
        const pos = geo.attributes.position, uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); uv.setXY(i, 1 - Math.abs(a) / 1.2, (Math.hypot(pos.getX(i), pos.getY(i)) - r0) / (r1 - r0)); }
        return geo;
      });
      const g = new THREE.Group();
      pal.slice(0, 3).forEach((c, i) => {
        const m = new THREE.Mesh(geo, this.mat(arcTexture(), c, 0.9, i !== 1));
        m.rotation.x = -Math.PI / 2;
        m.position.y = (i - 1) * 0.12;
        m.scale.setScalar(1 - i * 0.12);
        g.add(m);
      });
      const start = actor.pos.clone().setY(actor.pos.y + 1.1), d = dir.clone().setY(0).normalize();
      g.rotation.y = Math.atan2(d.x, d.z) - Math.PI / 2;
      this.add(g, 0.45, (o, k) => {
        const t = 1 - k;
        o.position.copy(start).addScaledVector(d, dist * t);
        o.scale.setScalar(size * (0.7 + t * 0.8));
        o.children.forEach((m) => (m.material.opacity = Math.min(1, k * 2.5) * 0.9));
        if (this.fx && Math.random() < 0.7) this.fx.trailPuff(o.position, pick(pal, Math.random() * 4 | 0));
      });
    }, delay);
  }

  /** Chớp sáng toàn màn hình + chữ Hán lớn tên tuyệt kỹ. */
  banner(han, name, color = '#9fd8ff') {
    let el = document.getElementById('ult-banner');
    if (!el) {
      el = document.createElement('div'); el.id = 'ult-banner';
      el.innerHTML = '<div class="ub-flash"></div><div class="ub-han"></div><div class="ub-name"></div>';
      document.body.appendChild(el);
    }
    el.style.setProperty('--uc', color);
    el.querySelector('.ub-han').textContent = han;
    el.querySelector('.ub-name').textContent = name;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  flashScreen(color = '#ffffff', a = 0.5) {
    let el = document.getElementById('scr-flash');
    if (!el) { el = document.createElement('div'); el.id = 'scr-flash'; document.body.appendChild(el); }
    el.style.background = `radial-gradient(circle, transparent 20%, ${color})`;
    el.style.setProperty('--fa', a);
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
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
        // hình khối trong kho dùng lại, vật liệu trả về kho (không dispose)
        it.obj.traverse?.((o) => { o.material?.userData.pool?.push(o.material); });
        this.items.splice(i, 1);
      }
    }
  }
}
