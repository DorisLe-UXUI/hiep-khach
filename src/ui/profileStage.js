import * as THREE from 'three';
import { HeroStage } from '../world/stage.js';

/**
 * Sân khấu 3D nhỏ trong bảng Hồ sơ: nhân vật thật đứng trên bệ ngọc, thở/đứng nghỉ tự nhiên, xoay chậm, kéo để xoay.
 * Dùng renderer riêng gắn vào ô HTML; tự dọn khi ô bị gỡ khỏi trang.
 */
let shared = null; // giữ renderer + sân khấu giữa các lần mở cho nhanh

export async function mountProfileStage(host, hero, color) {
  const { createHeroCharacter } = await import('../game/game.js');
  if (!shared) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    shared = { renderer, stage: new HeroStage(), char: null, key: '' };
  }
  const { renderer, stage } = shared;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  stage.setColor(color);
  stage.circle.material.color.set(color);

  // dựng lại nhân vật khi đổi hình tượng/binh khí
  const key = JSON.stringify(hero);
  if (shared.key !== key) {
    shared.char?.root.removeFromParent();
    shared.char = null;
    shared.key = key;
    const c = await createHeroCharacter(hero);
    c.root.position.set(0, stage.topY, 0);
    stage.scene.add(c.root);
    shared.char = c;
  }
  const c = shared.char;
  c.play('Yes', { fade: 0, once: true, speed: 0.9, onDone: () => c.play('Idle_Loop', { fade: 0.35 }) });

  let angle = 0.35, drag = null, last = performance.now(), alive = true;
  const el = renderer.domElement;
  el.style.cssText = 'width:100%;height:100%;display:block;border-radius:inherit;touch-action:none;cursor:grab';
  el.onpointerdown = (e) => { drag = e.clientX; el.setPointerCapture(e.pointerId); };
  el.onpointermove = (e) => { if (drag !== null) { angle += (e.clientX - drag) * 0.012; drag = e.clientX; } };
  el.onpointerup = () => (drag = null);

  const loop = () => {
    if (!alive) return;
    if (!host.isConnected) { alive = false; return; }
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const w = host.clientWidth, h = host.clientHeight;
    if (w && h) {
      const sz = renderer.getSize(new THREE.Vector2());
      if (sz.x !== w || sz.y !== h) renderer.setSize(w, h, false);
      const cam = stage.camera;
      cam.aspect = w / h;
      cam.fov = 30;
      cam.updateProjectionMatrix();
      // khung dọc: thấy trọn người và bệ
      cam.position.set(0, 1.6, w / h < 0.8 ? 5.8 : 5.0);
      cam.lookAt(0, 1.32, 0);
      // đứng hơi nghiêng, đung đưa nhẹ; kéo chuột để xoay tuỳ ý
      c.root.rotation.y = angle + Math.sin(now / 2500) * 0.25;
      stage.update(dt, now / 1000);
      c.update(dt);
      renderer.render(stage.scene, cam);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return () => { alive = false; };
}
