import * as THREE from 'three';

const _col = new THREE.Color();
const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

/** Hiệu ứng hạt đơn giản dùng chung một Points buffer + vệt kiếm. */
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.max = 2000;
    this.p = [];
    this.pool = [];
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(this.max * 3);
    this.colArr = new Float32Array(this.max * 3);
    this.sizeArr = new Float32Array(this.max);
    this.alphaArr = new Float32Array(this.max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizeArr, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphaArr, 1));
    const mat = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; float f = 1.0 - d * 2.0; gl_FragColor = vec4(vC * f * 1.2, vA * f * 0.55); }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    // vệt kiếm: dải tam giác nối các vị trí mũi/chuôi kiếm gần đây
    this.trailN = 24;
    const tg = new THREE.BufferGeometry();
    this.trailPos = new Float32Array(this.trailN * 2 * 3);
    this.trailAlpha = new Float32Array(this.trailN * 2);
    tg.setAttribute('position', new THREE.BufferAttribute(this.trailPos, 3));
    tg.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlpha, 1));
    const idx = [];
    for (let i = 0; i < this.trailN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    tg.setIndex(idx);
    this.trailMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ gl_FragColor = vec4(uColor * vA * 0.9, 1.0); }`,
    });
    this.trail = new THREE.Mesh(tg, this.trailMat);
    this.trail.frustumCulled = false;
    scene.add(this.trail);
    this.trailHist = [];
    this.trailActive = 0;
    this.trailOwner = null;
  }

  emit(pos, vel, color, size, life, grav = 0) {
    let q;
    if (this.p.length >= this.max) {
      // thu hồi hạt cũ nhất (O(1), không shift mảng)
      q = this.p[0];
      this.p[0] = this.p.pop();
    } else q = this.pool.pop() || {};
    q.x = pos.x; q.y = pos.y; q.z = pos.z;
    q.vx = vel.x; q.vy = vel.y; q.vz = vel.z;
    _col.set(color);
    q.r = _col.r; q.g = _col.g; q.b = _col.b;
    q.size = size; q.life = life; q.max = life; q.grav = grav;
    this.p.push(q);
  }

  burst(pos, color = 0xffffff, n = 24) {
    for (let i = 0; i < n; i++) {
      const v = _v.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 4);
      this.emit(pos, v, color, 0.12 + Math.random() * 0.1, 0.5 + Math.random() * 0.4, 3);
    }
  }

  sparks(pos) {
    for (let i = 0; i < 18; i++) {
      const v = _v.set(Math.random() - 0.5, Math.random(), Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 5);
      this.emit(pos, v, 0xffc860, 0.06, 0.3 + Math.random() * 0.2, 12);
    }
  }

  blood(pos, dir) {
    for (let i = 0; i < 14; i++) {
      const v = _v.copy(dir).multiplyScalar(2 + Math.random() * 3).add(_v2.set((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2));
      this.emit(pos, v, 0x5a0606, 0.09, 0.4 + Math.random() * 0.3, 14);
    }
  }

  dust(pos) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(_p.copy(pos).setY(pos.y + 0.1), _v.set(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5), 0x3a3428, 0.35, 0.6, -0.5);
    }
  }

  levelUp(pos) {
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.6;
      this.emit(_p.copy(pos).add(_v2.set(Math.cos(a) * r, Math.random() * 0.3, Math.sin(a) * r)), _v.set(Math.cos(a) * 0.4, 2 + Math.random() * 3, Math.sin(a) * 0.4), i % 2 ? 0xffd27a : 0xfff3c0, 0.12, 1.2 + Math.random() * 0.6, -0.5);
    }
  }

  ring(pos, radius, color) {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      this.emit(_p.copy(pos).setY(pos.y + 0.3), _v.set(Math.cos(a) * radius * 2.4, 0.5, Math.sin(a) * radius * 2.4), color, 0.22, 0.45, 0);
    }
  }

  sparkle(pos, color = 0xfff0b0) {
    this.emit(_p.copy(pos).add(_v2.set((Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.5) * 0.5)), _v.set(0, 0.6, 0), color, 0.08, 0.8, 0);
  }

  trailPuff(pos, color) {
    this.emit(pos, _v.set((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4), color, 0.2, 0.3);
  }

  /** Bật vệt kiếm của nhân vật trong ~0.3s. */
  slash(actor, color) {
    this.trailOwner = actor.char;
    this.trailActive = 0.32;
    this.trailMat.uniforms.uColor.value.set(color);
  }

  update(dt) {
    const n = this.p.length;
    for (let i = n - 1; i >= 0; i--) {
      const q = this.p[i];
      q.life -= dt;
      if (q.life <= 0) {
        // swap-remove + tái dùng object, tránh splice/shift mỗi frame
        this.p[i] = this.p[this.p.length - 1];
        this.p.pop();
        this.pool.push(q);
        continue;
      }
      q.vy -= q.grav * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    }
    const len = this.p.length;
    for (let i = 0; i < len; i++) {
      const q = this.p[i], k = q.life / q.max, i3 = i * 3;
      this.posArr[i3] = q.x; this.posArr[i3 + 1] = q.y; this.posArr[i3 + 2] = q.z;
      this.colArr[i3] = q.r * k; this.colArr[i3 + 1] = q.g * k; this.colArr[i3 + 2] = q.b * k;
      this.sizeArr[i] = q.size;
      this.alphaArr[i] = k;
    }
    const g = this.points.geometry;
    g.setDrawRange(0, len);
    // chỉ đẩy lên GPU phần đang dùng (trước đây cả 2000 hạt mỗi khung hình, kể cả khi không có hạt nào)
    if (len) {
      const at = g.attributes;
      for (const [a, w] of [[at.position, 3], [at.color, 3], [at.size, 1], [at.alpha, 1]]) { a.clearUpdateRanges(); a.addUpdateRange(0, len * w); a.needsUpdate = true; }
    }

    // vệt kiếm: ghi lại vị trí chuôi/mũi kiếm mỗi frame
    // vệt kiếm: luôn ghi vị trí (đòn chém bật vệt ở khung trúng, cần cả quãng vung trước đó) nhưng không cấp phát;
    // chỉ đẩy lên GPU khi đang hiện hoặc vừa tắt
    const was = this.trailActive > 0;
    this.trailActive = Math.max(0, this.trailActive - dt);
    const c = this.trailOwner;
    if (c?.weaponTip) {
      // dùng lại cặp vector cũ nhất thay vì cấp phát
      const h = this.trailHist.length >= this.trailN ? this.trailHist.pop() : [new THREE.Vector3(), new THREE.Vector3()];
      c.weaponTip.getWorldPosition(h[1]);
      // nhân vật Meshy chỉ có mũi kiếm: lấy chuôi = bàn tay (hoặc lùi từ mũi về phía thân)
      (c.weaponBase || c.handBone || c.root).getWorldPosition(h[0]);
      this.trailHist.unshift(h);
    }
    if (!was && !this.trailActive) return;
    const tp = this.trailPos;
    for (let i = 0; i < this.trailN; i++) {
      const h = this.trailHist[Math.min(i, this.trailHist.length - 1)];
      const a = h && this.trailActive > 0 ? (1 - i / this.trailN) * Math.min(1, this.trailActive * 5) : 0;
      if (h) { const o = i * 6; tp[o] = h[0].x; tp[o + 1] = h[0].y; tp[o + 2] = h[0].z; tp[o + 3] = h[1].x; tp[o + 4] = h[1].y; tp[o + 5] = h[1].z; }
      this.trailAlpha[i * 2] = 0;
      this.trailAlpha[i * 2 + 1] = a;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.alpha.needsUpdate = true;
  }
}
