import * as THREE from 'three';

/**
 * Chụp chân dung (đầu + vai) của nhân vật 3D để dùng trong khung hội thoại.
 * Trả về dataURL PNG nền trong suốt.
 */
export function renderPortrait(renderer, character, size = 384) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a3028, 1.4));
  const key = new THREE.DirectionalLight(0xffe6c8, 2.4);
  key.position.set(0.8, 1.2, 1.4);
  const rim = new THREE.DirectionalLight(0x9fb6ff, 1.6);
  rim.position.set(-1.2, 0.8, -1.2);
  scene.add(key, rim);

  const root = character.root;
  const prevParent = root.parent;
  const prevPos = root.position.clone(), prevRot = root.rotation.y;
  scene.add(root);
  root.position.set(0, 0, 0);
  root.rotation.y = 0.32; // nghiêng 3/4 cho có chiều sâu
  character.play('Idle_Loop', { fade: 0 });
  character.mixer.setTime(0.6);
  character.update?.(0); // nhân vật Meshy: chép tư thế từ khung điều khiển sang
  root.updateMatrixWorld(true);
  const head = new THREE.Vector3();
  character.bones.Head.getWorldPosition(head);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 10);
  const top = character.bones.head_end?.getWorldPosition(new THREE.Vector3());
  if (top) {
    // Meshy: canh theo cả khối đầu (gốc đầu → đỉnh đầu), lấy thêm chút vai
    const h = top.y - head.y, c = new THREE.Vector3(head.x, head.y + h * 0.42, head.z);
    cam.position.set(c.x + 0.25, c.y + h * 0.12, c.z + h * 3.3);
    cam.lookAt(c.x, c.y - h * 0.08, c.z);
  } else if (!character.bones.neck_01) {
    // KayKit: xương đầu ở gáy, đầu to
    cam.position.set(head.x + 0.2, head.y + 0.42, head.z + 1.9);
    cam.lookAt(head.x, head.y + 0.32, head.z);
  } else {
    cam.position.set(head.x + 0.12, head.y + 0.02, head.z + 1.15);
    cam.lookAt(head.x, head.y - 0.06, head.z);
  }
  // đèn viền vàng ấm cho nổi khối trong khung vàng
  const warm = new THREE.DirectionalLight(0xffd090, 1.4);
  warm.position.set(1.2, 0.4, -0.8);
  scene.add(warm);

  const rt = new THREE.WebGLRenderTarget(size, size, { colorSpace: THREE.SRGBColorSpace });
  const prevTarget = renderer.getRenderTarget();
  const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rt);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(size * size * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, size, size, px);
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClear, prevAlpha);
  rt.dispose();

  // trả nhân vật về chỗ cũ
  scene.remove(root);
  if (prevParent) prevParent.add(root);
  root.position.copy(prevPos);
  root.rotation.y = prevRot;

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const img = new ImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const s = ((size - 1 - y) * size + x) * 4, d = (y * size + x) * 4;
      // RT sRGB: giá trị đã ở không gian sRGB
      img.data[d] = px[s]; img.data[d + 1] = px[s + 1]; img.data[d + 2] = px[s + 2]; img.data[d + 3] = px[s + 3];
    }
  }
  c.getContext('2d').putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
