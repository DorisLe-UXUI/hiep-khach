import * as THREE from 'three';

/**
 * Sân khấu tạo nhân vật: cảnh riêng, tách khỏi thế giới game (không bị cỏ cây, NPC che).
 * Bệ ngọc viền vàng, pháp trận chữ Hán xoay dưới chân, cột sáng, cánh hoa rơi, đèn màu theo môn phái.
 */
function circleTexture() {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  ring(250, 6); ring(232, 2); ring(170, 4); ring(110, 2);
  // bát quái
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i * Math.PI) / 4);
    for (let k = 0; k < 3; k++) {
      const broken = (i >> k) & 1;
      const y = -200 + k * 14;
      if (broken) { g.fillRect(-34, y, 28, 7); g.fillRect(6, y, 28, 7); } else g.fillRect(-34, y, 68, 7);
    }
    g.restore();
  }
  // chữ Hán quanh vòng
  g.font = 'bold 34px "Ma Shan Zheng", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = '天劍江湖俠義乾坤清風明月';
  for (let i = 0; i < words.length; i++) {
    g.save(); g.rotate((i / words.length) * Math.PI * 2); g.fillText(words[i], 0, -140); g.restore();
  }
  // sao sáu cánh ở giữa
  g.lineWidth = 3;
  for (let t = 0; t < 2; t++) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) { const a = (i * Math.PI * 2) / 3 + t * Math.PI; i ? g.lineTo(Math.sin(a) * 100, -Math.cos(a) * 100) : g.moveTo(Math.sin(a) * 100, -Math.cos(a) * 100); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function petalTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(32, 32, 30, 16, 0.6, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}

export class HeroStage {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    this.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);
    this.color = new THREE.Color('#d6b062');

    // nền: bầu trời chuyển màu tím đêm → hồng → vàng chân trời
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#1a1238') }, mid: { value: new THREE.Color('#7a2a5a') }, bottom: { value: new THREE.Color('#f0a050') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, mid, bottom; varying vec3 vP;
        void main(){ float h = normalize(vP).y; vec3 c = h > 0.05 ? mix(mid, top, smoothstep(0.05, 0.6, h)) : mix(bottom, mid, smoothstep(-0.15, 0.05, h));
        gl_FragColor = vec4(c, 1.0); }`,
    });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat));
    // núi xa: các lớp bóng núi
    const ridge = (z, color, h, seed) => {
      const pts = [new THREE.Vector2(-120, -5)];
      for (let x = -120; x <= 120; x += 6) pts.push(new THREE.Vector2(x, h * (0.55 + 0.45 * Math.sin(x * 0.05 + seed) * Math.sin(x * 0.11 + seed * 2))));
      pts.push(new THREE.Vector2(120, -5));
      const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), new THREE.MeshBasicMaterial({ color, fog: false }));
      m.position.set(0, -2, z);
      s.add(m);
    };
    ridge(-70, '#3a1e4a', 22, 1); ridge(-55, '#2a1438', 15, 4); ridge(-40, '#1c0e28', 9, 7);
    // trăng
    const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 48), new THREE.MeshBasicMaterial({ color: '#ffe6b8' }));
    moon.position.set(-22, 22, -80);
    s.add(moon);

    // mặt đất tối bóng nhẹ
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1c1428', roughness: 0.35, metalness: 0.2 }));
    floor.receiveShadow = true;
    s.add(floor);

    // bệ ngọc ba tầng viền vàng
    const jade = new THREE.MeshStandardMaterial({ color: '#2e7a6a', roughness: 0.25, metalness: 0.1 });
    const white = new THREE.MeshStandardMaterial({ color: '#e8efe8', roughness: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: '#e0b050', roughness: 0.25, metalness: 0.9 });
    const tier = (r1, r2, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 64), mat); m.position.y = y; m.castShadow = m.receiveShadow = true; s.add(m); return m; };
    tier(1.45, 1.6, 0.22, 0.11, jade);
    tier(1.2, 1.3, 0.16, 0.3, white);
    const top = tier(1.05, 1.1, 0.1, 0.43, jade);
    for (const [r, y] of [[1.6, 0.0], [1.3, 0.22], [1.1, 0.38], [1.05, 0.48]]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 96).rotateX(Math.PI / 2), gold);
      t.position.y = y + 0.01;
      s.add(t);
    }
    // hoa sen cách điệu quanh bệ
    const petalGeo = new THREE.SphereGeometry(0.35, 12, 8);
    petalGeo.scale(0.55, 0.25, 1);
    const lotusMat = new THREE.MeshStandardMaterial({ color: '#ff9ac0', emissive: '#a0306a', emissiveIntensity: 0.35, roughness: 0.4 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, lotusMat);
      p.position.set(Math.sin(a) * 1.72, 0.12, Math.cos(a) * 1.72);
      p.rotation.set(-0.5, a, 0);
      s.add(p);
    }
    this.topY = 0.48;

    // pháp trận phát sáng dưới chân (xoay)
    const circleMat = new THREE.MeshBasicMaterial({ map: circleTexture(), color: this.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    this.circle = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1).rotateX(-Math.PI / 2), circleMat);
    this.circle.position.y = this.topY + 0.005;
    s.add(this.circle);
    this.circle2 = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5).rotateX(-Math.PI / 2), circleMat.clone());
    this.circle2.material.opacity = 0.35;
    this.circle2.position.y = 0.02;
    s.add(this.circle2);

    // cột sáng mờ
    const beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { color: { value: this.color } },
      vertexShader: 'varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; varying float vY; void main(){ gl_FragColor = vec4(color, (1.0 - vY) * 0.22); }',
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 4, 48, 1, true), beamMat);
    beam.position.y = this.topY + 2;
    s.add(beam);

    // cánh hoa rơi
    const N = 140, pos = new Float32Array(N * 3);
    this.petalV = [];
    for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 12, Math.random() * 7, (Math.random() - 0.5) * 8], i * 3); this.petalV.push(0.3 + Math.random() * 0.5); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.petals = new THREE.Points(pg, new THREE.PointsMaterial({ map: petalTexture(), color: '#ffb0d0', size: 0.14, transparent: true, depthWrite: false }));
    s.add(this.petals);

    // ánh sáng: dịu từ trên, đèn chính, hai đèn viền màu, đèn hắt từ pháp trận
    s.add(new THREE.HemisphereLight('#ffe8f0', '#30203a', 1.3));
    const key = new THREE.DirectionalLight('#fff4e0', 2.4);
    key.position.set(3, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 4, bottom: -1, near: 1, far: 20 });
    s.add(key);
    const rimL = new THREE.PointLight('#40d0ff', 18, 8); rimL.position.set(-2.2, 2.4, -1.8); s.add(rimL);
    const rimR = new THREE.PointLight('#ff4aa0', 18, 8); rimR.position.set(2.2, 2.2, -1.6); s.add(rimR);
    this.glow = new THREE.PointLight(this.color, 6, 4); this.glow.position.set(0, this.topY + 0.3, 0.6); s.add(this.glow);
    s.fog = new THREE.Fog('#2a1838', 18, 80);
  }

  /** màu chủ đạo theo môn phái */
  setColor(hex) { this.color.set(hex); this.circle2.material.color.set(hex); }

  update(dt, t) {
    this.circle.rotation.y += dt * 0.25;
    this.circle2.rotation.y -= dt * 0.08;
    this.glow.intensity = 6 + Math.sin(t * 2) * 1.5;
    const a = this.petals.geometry.attributes.position.array;
    for (let i = 0; i < this.petalV.length; i++) {
      a[i * 3 + 1] -= this.petalV[i] * dt;
      a[i * 3] += Math.sin(t + i) * dt * 0.3;
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 7;
    }
    this.petals.geometry.attributes.position.needsUpdate = true;
  }

  /** máy quay: nhân vật ở chính giữa */
  frame(aspect) {
    const cam = this.camera;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    const narrow = aspect < 1;
    // nhân vật đứng giữa màn hình, nhìn trọn bệ ngọc
    cam.position.set(0, 1.75, narrow ? 8.6 : 6.6);
    cam.lookAt(0, 1.2, 0);
  }
}
