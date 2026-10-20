import * as THREE from 'three';
import { loadHDR } from '../engine/assets.js';

/** Bối cảnh thời gian cho từng chương. */
export const TIMES = {
  dawn: { hdr: 'kloofendal_misty_morning_puresky', sun: [-0.7, 0.22, 0.4], color: 0xffcf9e, int: 1.9, env: 0.6, bg: 0.8, fog: 0xc0c3c2, density: 0.0045, exposure: 0.85, hemi: 0.3 },
  morning: { hdr: 'kloofendal_misty_morning_puresky', sun: [-0.55, 0.42, 0.35], color: 0xffe2bd, int: 2.6, env: 0.75, bg: 0.9, fog: 0xb7c0c2, density: 0.003, exposure: 0.85, hemi: 0.35 },
  noon: { hdr: 'table_mountain_1_puresky', sun: [0.35, 0.85, 0.25], color: 0xfff3dc, int: 3.0, env: 0.7, bg: 0.85, fog: 0xc6d0d8, density: 0.0022, exposure: 0.75, hemi: 0.35 },
  night: { hdr: 'lakeside_night', sun: [0.45, 0.6, -0.35], color: 0x9fb4ff, int: 0.55, env: 0.45, bg: 0.7, fog: 0x101722, density: 0.0055, exposure: 1.15, hemi: 0.12, lanterns: true },
  dawn2: { hdr: 'kloofendal_28d_misty_puresky', sun: [0.6, 0.18, -0.5], color: 0xffc4a0, int: 1.7, env: 0.65, bg: 0.8, fog: 0xc3c2c0, density: 0.0075, exposure: 0.9, hemi: 0.3, lanterns: true },
  sunrise: { hdr: 'lakeside_dawn', sun: [-0.75, 0.2, 0.2], color: 0xffc58a, int: 2.4, env: 0.7, bg: 0.9, fog: 0xd2bfa8, density: 0.0028, exposure: 0.85, hemi: 0.3 },
};

export class Sky {
  constructor({ renderer, scene, sun, sunDir, hemi, water, lights }) {
    Object.assign(this, { renderer, scene, sun, sunDir, hemi, water });
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.cache = new Map();
    this.lanternSpots = lights || [];
    // đèn lồng: 8 đèn điểm luân chuyển tới các vị trí gần người chơi nhất
    this.pool = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xff9a48, 0, 16, 1.6);
      scene.add(l);
      this.pool.push(l);
    }
    // quầng sáng giả cho đèn ở xa
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(0.25, 'rgba(255,140,60,.55)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    this.glows = this.lanternSpots.map((p) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.position.copy(p);
      s.scale.setScalar(2.2);
      s.visible = false;
      scene.add(s);
      return s;
    });
    this.lanterns = false;
    this.current = null;
  }

  async env(name) {
    if (!this.cache.has(name)) {
      this.cache.set(name, loadHDR(name).then((hdr) => {
        hdr.mapping = THREE.EquirectangularReflectionMapping;
        return { bg: hdr, env: this.pmrem.fromEquirectangular(hdr).texture };
      }));
    }
    return this.cache.get(name);
  }

  async set(timeName) {
    const t = TIMES[timeName] || TIMES.morning;
    this.current = timeName;
    const e = await this.env(t.hdr);
    const s = this.scene;
    s.background = e.bg;
    s.environment = e.env;
    s.backgroundIntensity = t.bg;
    s.environmentIntensity = t.env;
    const bright = document.body.classList.contains('style-bright');
    s.fog.color.set(t.fog);
    s.fog.density = t.density * (bright ? 0.55 : 1);
    this.renderer.toneMappingExposure = t.exposure * (bright ? 1.18 : 1);
    this.sunDir.set(...t.sun).normalize();
    this.sun.color.set(t.color);
    this.sun.intensity = t.int * (bright ? 1.15 : 1);
    this.hemi.intensity = t.hemi;
    if (this.water) {
      const u = this.water.material.uniforms;
      u.sunDirection.value.copy(this.sunDir);
      u.sunColor.value.set(t.color);
      u.waterColor.value.set(timeName === 'night' ? 0x07121a : 0x1d3b3a);
    }
    this.lanterns = !!t.lanterns;
    this.glows.forEach((g) => (g.visible = this.lanterns));
    if (!this.lanterns) this.pool.forEach((l) => (l.intensity = 0));
  }

  /** Gọi mỗi frame: chuyển đèn điểm tới các đèn lồng gần người chơi. */
  update(pos, time) {
    if (!this.lanterns) return;
    const near = this.lanternSpots.map((p, i) => [p.distanceToSquared(pos), i]).sort((a, b) => a[0] - b[0]);
    this.pool.forEach((l, k) => {
      const n = near[k];
      if (!n) { l.intensity = 0; return; }
      l.position.copy(this.lanternSpots[n[1]]);
      l.intensity = 14 * (0.9 + Math.sin(time * 9 + k * 1.7) * 0.06 + Math.sin(time * 23 + k) * 0.04);
    });
  }
}
