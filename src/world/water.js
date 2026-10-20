import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { PLACES, WATER_LEVEL } from './layout.js';

/** Normal map sóng lặp liền mạch, sinh bằng tổng các sóng sin tần số nguyên. */
function waveNormals(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const waves = [];
  for (let i = 0; i < 24; i++) {
    const kx = Math.round((Math.random() * 2 - 1) * 9), kz = Math.round((Math.random() * 2 - 1) * 9);
    if (!kx && !kz) continue;
    waves.push([kx, kz, Math.random() * Math.PI * 2, 1 / Math.hypot(kx, kz)]);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0, dz = 0;
      const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
      for (const [kx, kz, ph, a] of waves) {
        const c0 = Math.cos(kx * u + kz * v + ph) * a;
        dx += c0 * kx; dz += c0 * kz;
      }
      const n = new THREE.Vector3(-dx * 0.08, -dz * 0.08, 1).normalize();
      const o = (y * size + x) * 4;
      img.data[o] = (n.x * 0.5 + 0.5) * 255;
      img.data[o + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[o + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createWater(sun, stylized = false) {
  const L = PLACES.lake;
  const geo = new THREE.CircleGeometry(L.r * 1.7, 64);
  if (stylized) {
    // nước hoạt hình: không vẽ phản chiếu (rẻ), gợn sóng trôi bằng normal map
    const nm = waveNormals();
    nm.repeat.set(18, 18);
    const mat = new THREE.MeshStandardMaterial({ color: 0x3aa8d0, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.88, normalMap: nm, normalScale: new THREE.Vector2(0.6, 0.6) });
    const w = new THREE.Mesh(geo, mat);
    w.rotation.x = -Math.PI / 2;
    w.position.set(L.x, WATER_LEVEL, L.z);
    w.name = 'water';
    w.receiveShadow = true;
    w.onBeforeRender = () => { nm.offset.x += 0.0004; nm.offset.y += 0.00025; };
    w.userData.simple = true;
    return w;
  }
  const water = new Water(geo, {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: waveNormals(),
    sunDirection: sun.clone().normalize(),
    sunColor: 0xfff2dd,
    waterColor: 0x1d3b3a,
    distortionScale: 2.2,
    fog: true,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.set(L.x, WATER_LEVEL, L.z);
  water.material.uniforms.size.value = 3.5;
  water.name = 'water';
  return water;
}
