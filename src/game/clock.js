import * as THREE from 'three';

/**
 * Giờ trong game (1 giây thật = 1 phút game → một ngày 24 phút) và thời tiết.
 * Ban đêm: quái mạnh +25%, kinh nghiệm +30%. Mưa: cá cắn câu nhanh gấp đôi, kim lý ngư dễ gặp hơn.
 */
const SHICHEN = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const SHICHEN_HAN = '子丑寅卯辰巳午未申酉戌亥';
const HOUR_OF = { dawn: 5.5, sunrise: 7, morning: 9, noon: 13, dawn2: 17.5, night: 22 };

export function phaseOf(h) {
  if (h >= 5 && h < 6.5) return 'dawn';
  if (h >= 6.5 && h < 8) return 'sunrise';
  if (h >= 8 && h < 11) return 'morning';
  if (h >= 11 && h < 16) return 'noon';
  if (h >= 16 && h < 19) return 'dawn2';
  return 'night';
}

export class Clock {
  constructor(g) {
    this.g = g;
    this.phase = null;
    this.rainK = 0;
    this.lastHour = -1;
    this.buildRain();
  }
  get s() { return (this.g.sys.s.clock ??= { min: 9 * 60, rain: 0 }); }
  get hour() { return this.s.min / 60; }
  get night() { const h = this.hour; return h >= 19 || h < 5; }
  get raining() { return this.s.rain > 0; }
  shichen() { const i = Math.floor(((this.hour + 1) % 24) / 2); return { name: 'Giờ ' + SHICHEN[i], han: SHICHEN_HAN[i] + '時' }; }
  label() { const h = Math.floor(this.hour), m = Math.floor(this.s.min % 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }

  /** Chương truyện đặt thời điểm cố định */
  setTo(timeName) { this.s.min = (HOUR_OF[timeName] ?? 9) * 60; this.phase = timeName; }

  buildRain() {
    const N = 1400, pos = new Float32Array(N * 6);
    this.rainV = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 50, y = Math.random() * 28, z = (Math.random() - 0.5) * 50;
      pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6);
      this.rainV[i] = 22 + Math.random() * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.g.scene.add(this.rain);
  }

  update(dt) {
    const g = this.g, s = this.s;
    s.min = (s.min + dt) % 1440;
    // đổi cảnh trời theo khung giờ
    const ph = phaseOf(this.hour);
    if (ph !== this.phase && !g.dialogOpen) {
      const wasNight = this.phase === 'night';
      this.phase = ph;
      g.sky.set(ph);
      if (ph === 'night') { g.toast('<span class="han">夜</span> Màn đêm buông xuống — yêu quái mạnh hơn, kinh nghiệm <b>+30%</b>', 3.5); g.mhud?.log('system', 'Trời đã tối. Yêu quái hoạt động mạnh hơn.'); }
      else if (wasNight) g.toast('<span class="han">晨</span> Trời đã sáng', 2);
    }
    // thời tiết: mỗi giờ game tung xúc xắc
    const hr = Math.floor(this.hour);
    if (hr !== this.lastHour) {
      this.lastHour = hr;
      if (s.rain > 0) s.rain--;
      else if (Math.random() < 0.1) { s.rain = 1 + Math.floor(Math.random() * 3); g.toast('<span class="han">雨</span> Trời đổ mưa — cá cắn câu nhanh hơn', 2.5); }
    }
    const want = s.rain > 0 ? 1 : 0;
    this.rainK += (want - this.rainK) * Math.min(1, dt * 0.4);
    const r = this.rain;
    r.visible = this.rainK > 0.02;
    if (r.visible) {
      r.material.opacity = 0.45 * this.rainK;
      r.position.set(g.camera.position.x, g.camera.position.y - 10, g.camera.position.z);
      const a = r.geometry.attributes.position.array;
      for (let i = 0; i < this.rainV.length; i++) {
        const o = i * 6, d = this.rainV[i] * dt;
        a[o + 1] -= d; a[o + 4] -= d;
        if (a[o + 4] < 0) { const x = (Math.random() - 0.5) * 50, z = (Math.random() - 0.5) * 50; a[o] = x; a[o + 2] = z; a[o + 3] = x + 0.05; a[o + 5] = z; a[o + 1] = 28; a[o + 4] = 27.3; }
      }
      r.geometry.attributes.position.needsUpdate = true;
    }
    g.audio.rain?.(this.rainK);
  }
}
