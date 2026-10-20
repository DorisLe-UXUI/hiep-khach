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

/** Bảng màu trời hoạt hình theo thời điểm: [đỉnh, chân trời, mặt đất, mặt trời] */
const TOON = {
  dawn: ['#6aa8e8', '#ffd8b0', '#c8a080', '#ffd0a0'],
  morning: ['#3f8ee8', '#bfe4ff', '#9ac080', '#fff4d8'],
  noon: ['#2a7ae8', '#a8d8ff', '#90c070', '#ffffff'],
  night: ['#0a1430', '#2a3a6a', '#101820', '#c8d8ff'],
  dawn2: ['#7a9ad8', '#ffc8b0', '#b09080', '#ffc0a0'],
  sunrise: ['#4a8ae0', '#ffcc90', '#c0a070', '#ffd890'],
};

function cloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 40 + Math.random() * 176, y = 60 + Math.random() * 30, r = 26 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.7, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

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

  buildToonSky() {
    if (this.dome) return;
    const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() } };
    this.domeU = uniforms;
    const mat = new THREE.ShaderMaterial({
      uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 top, horizon, ground, sunDir, sunCol; varying vec3 vDir;
        void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, ground, pow(-h, 0.4));
          float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          c += sunCol * (pow(sd, 900.0) * 3.0 + pow(sd, 18.0) * 0.35);
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
    this.dome.scale.setScalar(1400);
    this.dome.renderOrder = -1;
    this.dome.frustumCulled = false;
    this.scene.add(this.dome);
    // mây bông
    const tex = cloudTexture();
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
      const a = Math.random() * Math.PI * 2, d = 500 + Math.random() * 500;
      sp.position.set(Math.cos(a) * d, 140 + Math.random() * 160, Math.sin(a) * d);
      sp.scale.set(220 + Math.random() * 200, 110 + Math.random() * 80, 1);
      sp.userData.speed = 2 + Math.random() * 3;
      this.scene.add(sp);
      this.clouds.push(sp);
    }
    // cảnh nhỏ để sinh ánh sáng môi trường từ vòm trời
    this.envScene = new THREE.Scene();
    this.envDome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat);
    this.envScene.add(this.envDome);
  }

  async set(timeName) {
    const t = TIMES[timeName] || TIMES.morning;
    this.current = timeName;
    if (Sky.stylized) return this.setToon(timeName, t);
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

  setToon(timeName, t) {
    this.buildToonSky();
    const [top, hor, gnd, sun] = TOON[timeName] || TOON.morning;
    const u = this.domeU;
    u.top.value.set(top); u.horizon.value.set(hor); u.ground.value.set(gnd); u.sunCol.value.set(sun);
    this.sunDir.set(...t.sun).normalize();
    u.sunDir.value.copy(this.sunDir);
    const s = this.scene;
    s.background = null;
    this.envRT?.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02);
    s.environment = this.envRT.texture;
    s.environmentIntensity = timeName === 'night' ? 0.45 : 0.7;
    s.fog.color.set(hor);
    s.fog.density = t.density * 0.45;
    this.renderer.toneMappingExposure = timeName === 'night' ? 1.2 : 1.0;
    this.sun.color.set(sun);
    this.sun.intensity = timeName === 'night' ? 0.7 : 2.8;
    this.hemi.color.set(hor);
    this.hemi.groundColor.set(gnd);
    this.hemi.intensity = timeName === 'night' ? 0.35 : 0.8;
    for (const c of this.clouds) c.material.color.set(timeName === 'night' ? '#4a5a8a' : timeName.startsWith('dawn') || timeName === 'sunrise' ? '#ffe0d0' : '#ffffff');
    if (this.water) {
      const w = this.water.material.uniforms;
      w.sunDirection.value.copy(this.sunDir);
      w.sunColor.value.set(sun);
      w.waterColor.value.set(timeName === 'night' ? 0x0a2a4a : 0x1a8ab0);
      w.distortionScale.value = 1.2;
    }
    this.lanterns = !!t.lanterns;
    this.glows.forEach((g) => (g.visible = this.lanterns));
    if (!this.lanterns) this.pool.forEach((l) => (l.intensity = 0));
  }

  /** Gọi mỗi frame: chuyển đèn điểm tới các đèn lồng gần người chơi. */
  update(pos, time) {
    if (this.dome) {
      this.dome.position.copy(pos);
      for (const c of this.clouds) {
        c.position.x += c.userData.speed * 0.016;
        if (c.position.x > 1000) c.position.x = -1000;
      }
    }
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
