import * as THREE from 'three';
import { manager, setMaxAnisotropy, loadHDR } from './engine/assets.js';
import { Input } from './engine/input.js';
import { Terrain } from './world/terrain.js';
import { Colliders } from './world/colliders.js';
import { createWater } from './world/water.js';
import { buildArchitecture } from './world/architecture.js';
import { buildVegetation } from './world/vegetation.js';
import { buildProps } from './world/props.js';
import { Game } from './game/game.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

const loadFill = document.getElementById('load-fill');
const loadText = document.getElementById('load-text');
let stepsDone = 0;
const STEPS = 40;
const progress = (msg) => {
  stepsDone++;
  loadFill.style.width = Math.min(100, (stepsDone / STEPS) * 100) + '%';
  if (msg) loadText.textContent = msg;
};
manager.onProgress = (url, loaded, total) => { loadText.textContent = `Đang tải ${url.split('/').pop()} (${loaded}/${total})`; };

async function boot() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1600);

  // Trời: HDRI vừa làm nền vừa làm ánh sáng môi trường
  progress('Vén mây...');
  const hdr = await loadHDR('kloofendal_misty_morning_puresky');
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(hdr).texture;
  scene.background = hdr;
  scene.backgroundIntensity = 0.9;
  scene.environmentIntensity = 0.75;
  scene.fog = new THREE.FogExp2(0xb7c0c2, 0.0032);

  const sunDir = new THREE.Vector3(-0.55, 0.42, 0.35).normalize();
  const sun = new THREE.DirectionalLight(0xffe2bd, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -55; sc.right = sc.top = 55; sc.near = 1; sc.far = 300;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xcfd8e6, 0x4b4232, 0.35));

  progress('Đắp núi, đào hồ...');
  const terrain = new Terrain();
  scene.add(terrain.mesh);
  const colliders = new Colliders();
  scene.add(createWater(sunDir));

  progress('Dựng nhà, lợp ngói...');
  const arch = buildArchitecture(terrain, colliders);
  scene.add(arch.group);

  progress('Bày biện khách điếm...');
  const props = await buildProps(terrain, colliders, arch.spots);
  scene.add(props.group);

  progress('Trồng rừng...');
  const veg = await buildVegetation(terrain, colliders, renderer, progress);
  scene.add(veg.group);

  const input = new Input(canvas);
  const game = new Game({ renderer, scene, camera, sun, sunDir, terrain, colliders, input, grass: veg.grass, spots: arch.spots, chest: props.chest });
  await game.init(progress);

  // Biên dịch shader trước để vào game không bị khựng
  progress('Mài kiếm...');
  await renderer.compileAsync(scene, camera);
  loadFill.style.width = '100%';
  loadText.textContent = 'Sẵn sàng.';

  const startBtn = document.getElementById('start');
  startBtn.disabled = false;
  startBtn.onclick = () => {
    document.getElementById('title').classList.add('hidden');
    game.start();
  };

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    game.update(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    input.endFrame();
  });
  window.__game = game; // tiện gỡ lỗi trong console
}

boot().catch((e) => {
  console.error(e);
  loadText.textContent = 'Lỗi khi tải: ' + e.message;
});
