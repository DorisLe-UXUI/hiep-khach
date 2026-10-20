import * as THREE from 'three';

/** Hiệu ứng hạt đơn giản dùng chung một Points buffer + vệt kiếm. */
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.max = 2000;
    this.p = [];
    const geo = new THREE.BufferGeometry();
    this.posArr = new Float32Array(this.max * 3);
    this.colArr = new Float32Array(this.max * 3);
    this.sizeArr = new Float32Array(this.max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colArr, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizeArr, 1));
    const mat = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(vC * (1.0 - d * 2.0), 1.0); }`,
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
    if (this.p.length >= this.max) this.p.shift();
    this.p.push({ pos: pos.clone(), vel, color: new THREE.Color(color), size, life, max: life, grav });
  }

  burst(pos, color = 0xffffff, n = 24) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 4);
      this.emit(pos, v, color, 0.12 + Math.random() * 0.1, 0.5 + Math.random() * 0.4, 3);
    }
  }

  sparks(pos) {
    for (let i = 0; i < 18; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5).normalize().multiplyScalar(4 + Math.random() * 5);
      this.emit(pos, v, 0xffc860, 0.06, 0.3 + Math.random() * 0.2, 12);
    }
  }

  blood(pos, dir) {
    for (let i = 0; i < 14; i++) {
      const v = dir.clone().multiplyScalar(2 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2));
      this.emit(pos, v, 0x5a0606, 0.09, 0.4 + Math.random() * 0.3, 14);
    }
  }

  dust(pos) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.emit(pos.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5), 0x3a3428, 0.35, 0.6, -0.5);
    }
  }

  levelUp(pos) {
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 0.6;
      this.emit(pos.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.random() * 0.3, Math.sin(a) * r)), new THREE.Vector3(Math.cos(a) * 0.4, 2 + Math.random() * 3, Math.sin(a) * 0.4), i % 2 ? 0xffd27a : 0xfff3c0, 0.12, 1.2 + Math.random() * 0.6, -0.5);
    }
  }

  ring(pos, radius, color) {
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      this.emit(pos.clone().add(new THREE.Vector3(0, 0.3, 0)), new THREE.Vector3(Math.cos(a) * radius * 2.4, 0.5, Math.sin(a) * radius * 2.4), color, 0.22, 0.45, 0);
    }
  }

  sparkle(pos, color = 0xfff0b0) {
    this.emit(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.5) * 0.5)), new THREE.Vector3(0, 0.6, 0), color, 0.08, 0.8, 0);
  }

  trailPuff(pos, color) {
    this.emit(pos, new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4), color, 0.2, 0.3);
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
      if (q.life <= 0) { this.p.splice(i, 1); continue; }
      q.vel.y -= q.grav * dt;
      q.pos.addScaledVector(q.vel, dt);
    }
    this.p.forEach((q, i) => {
      const k = q.life / q.max;
      this.posArr.set([q.pos.x, q.pos.y, q.pos.z], i * 3);
      this.colArr.set([q.color.r * k, q.color.g * k, q.color.b * k], i * 3);
      this.sizeArr[i] = q.size;
    });
    const g = this.points.geometry;
    g.setDrawRange(0, this.p.length);
    g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = true;

    // vệt kiếm: ghi lại vị trí chuôi/mũi kiếm mỗi frame
    const c = this.trailOwner;
    if (c?.weaponTip) {
      const tip = c.weaponTip.getWorldPosition(new THREE.Vector3());
      const base = c.weaponBase.getWorldPosition(new THREE.Vector3());
      this.trailHist.unshift([base, tip]);
      if (this.trailHist.length > this.trailN) this.trailHist.pop();
    }
    this.trailActive = Math.max(0, this.trailActive - dt);
    for (let i = 0; i < this.trailN; i++) {
      const h = this.trailHist[Math.min(i, this.trailHist.length - 1)];
      if (!h) break;
      this.trailPos.set([h[0].x, h[0].y, h[0].z, h[1].x, h[1].y, h[1].z], i * 6);
      const a = this.trailActive > 0 ? (1 - i / this.trailN) * Math.min(1, this.trailActive * 5) : 0;
      this.trailAlpha[i * 2] = 0;
      this.trailAlpha[i * 2 + 1] = a;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.geometry.attributes.alpha.needsUpdate = true;
  }
}
