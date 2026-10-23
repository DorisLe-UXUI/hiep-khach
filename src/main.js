import * as THREE from 'three';
import { manager, setMaxAnisotropy } from './engine/assets.js';
import { preloadModels } from './engine/preload.js';
import { HeroStage } from './world/stage.js';
import { setLang } from './i18n.js';
import { Input } from './engine/input.js';
import { Terrain } from './world/terrain.js';
import { Colliders } from './world/colliders.js';
import { createWater } from './world/water.js';
import { buildArchitecture, ARCH } from './world/architecture.js';
import { buildVegetation, GrassField } from './world/vegetation.js';
import { buildProps } from './world/props.js';
import { Sky } from './world/sky.js';
import { Game, createHeroCharacter } from './game/game.js';
import { UI } from './ui/ui.js';
import './ui/screens.js';
import './ui/mapview.js';
import { Character } from './actors/character.js';
import { CLASSES, defaultHero, heroLook } from './game/classes.js';
import { CHAPTERS } from './story/chapters.js';
import { PLACES } from './world/layout.js';
import { loadSettings, currentProfile, loadSave, saveProfile, logout } from './settings.js';

// Bản claude.ai không phục vụ file .glb/.fbx: model được lưu dạng base64 (.b64.txt) và giải mã khi tải.
if (import.meta.env.VITE_LITE) {
  const orig = THREE.FileLoader.prototype.load;
  THREE.FileLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    if (!/\.(glb|fbx)$/i.test(url)) return orig.call(this, url, onLoad, onProgress, onError);
    const full = this.manager.resolveURL((this.path || '') + url);
    this.manager.itemStart(full);
    fetch(full + '.b64.txt')
      .then((r) => { if (!r.ok) throw new Error(`${r.status} ${full}`); return r.text(); })
      .then((t) => {
        const bin = atob(t.trim()), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        onLoad?.(u.buffer);
        this.manager.itemEnd(full);
      })
      .catch((e) => { onError ? onError(e) : console.error(e); this.manager.itemError(full); this.manager.itemEnd(full); });
  };
}

const ui = new UI();
ui.decorate();
const settings = loadSettings();
setLang(settings.lang || 'vi');
// bản rút gọn đăng claude.ai chỉ có phong cách chibi
if (import.meta.env.VITE_LITE) settings.style = 'bright';
Character.chibi = settings.style !== 'realistic';
// phong cách hoạt hình cho toàn bộ cảnh vật
Terrain.stylized = GrassField.stylized = Sky.stylized = ARCH.stylized = Character.chibi;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

let pct = 0;
let stepText = 'Đang mài kiếm...';
const step = (text, to) => { pct = Math.max(pct, to); stepText = text; ui.progress(pct, text); };
// không hiện tên file kỹ thuật, chỉ hiện câu mô tả của bước đang làm
manager.onProgress = (url, loaded, total) => ui.progress(Math.max(pct, Math.min(95, pct + (loaded / total) * 8)), stepText);

let mode = 'loading';
let game = null;
const preview = { char: null, token: 0, angle: 0.35 };

async function boot() {
  // chibi: tải song song mọi model của màn hình chính ngay từ đầu
  if (Character.chibi) preloadModels();
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb7c0c2, 0.003);
  const camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.3, 1500);
  const sunDir = new THREE.Vector3(-0.55, 0.42, 0.35).normalize();
  const sun = new THREE.DirectionalLight(0xffe2bd, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -38; sc.right = sc.top = 38; sc.near = 1; sc.far = 300;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const hemi = new THREE.HemisphereLight(0xcfd8e6, 0x4b4232, 0.35);
  scene.add(sun, sun.target, hemi);

  step('Đắp núi, đào hồ...', 8);
  await new Promise((r) => setTimeout(r, 30));
  const terrain = new Terrain();
  scene.add(terrain.mesh);
  const colliders = new Colliders();
  const water = createWater(sunDir, Character.chibi);
  scene.add(water);

  step('Viết câu đối, treo biển hiệu...', 14);
  await Promise.race([document.fonts.load('120px "Ma Shan Zheng"', '悅來客棧清風鎮望月亭黑風寨劍冢賓至如歸酒香百里'), new Promise((r) => setTimeout(r, 4000))]);
  step('Dựng nhà, lợp ngói...', 18);
  const arch = buildArchitecture(terrain, colliders);
  scene.add(arch.group);

  step('Bày biện khách điếm...', 26);
  const props = buildProps(terrain, colliders, arch.spots); // đồ đạc tải nền, không chặn màn hình chính
  scene.add(props.group);

  step('Trồng rừng trúc, rừng thông...', 40);
  const veg = await buildVegetation(terrain, colliders, renderer, (m) => step(m, Math.min(70, pct + 2)));
  scene.add(veg.group);

  step('Vén mây, gọi gió...', 72);
  const sky = new Sky({ renderer, scene, sun, sunDir, hemi, water, lights: props.lights });
  await sky.set('morning');

  const input = new Input(canvas);
  const profile = currentProfile() || { name: 'Tiêu Vân', hero: defaultHero() };
  game = new Game({ renderer, scene, camera, sun, sunDir, hemi, terrain, colliders, input, grass: veg.grass, spots: arch.spots, chest: props.chest, sky, ui, settings, profile: { ...profile, hero: profile.hero || defaultHero() } });
  step('Triệu tập giang hồ nhân sĩ...', 78);
  await game.init((m) => step(m, Math.min(94, pct + 3)));

  step('Mài kiếm...', 96);
  await renderer.compileAsync(scene, camera);
  step('Sẵn sàng.', 100);

  // khớp khung vẽ với cửa sổ; bỏ qua lúc cửa sổ tạm có cỡ 0 (bị ẩn) và tự sửa ở khung hình sau
  const size = new THREE.Vector2();
  const fit = () => {
    if (!innerWidth || !innerHeight) return;
    renderer.getSize(size);
    if (size.x === innerWidth && size.y === innerHeight) return;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', fit);

  const clock = new THREE.Clock();
  // độ phân giải tự động: giữ khoảng 50+ khung hình/giây
  let avg = 16, adjT = 0, slowT = 0;
  const loopErrs = new Set();
  const maxPR = () => Math.min(devicePixelRatio, ({ low: 0.75, medium: 1, high: 1.5 })[game.settings.quality] || 1);
  renderer.setAnimationLoop(() => {
    fit();
    const raw = clock.getDelta();
    const dt = Math.min(raw, 1 / 20);
    avg = avg * 0.95 + raw * 1000 * 0.05;
    adjT += raw;
    if (adjT > 1.5 && document.visibilityState === 'visible') {
      adjT = 0;
      const pr = renderer.getPixelRatio();
      if (avg > 22 && pr > 0.55) renderer.setPixelRatio(Math.max(0.55, pr - 0.15));
      else if (avg < 14 && pr < maxPR()) renderer.setPixelRatio(Math.min(maxPR(), pr + 0.1));
      // đã hạ độ phân giải hết mức mà vẫn chậm: tự chuyển đồ hoạ Thấp (một lần)
      slowT = mode === 'play' && avg > 30 && renderer.getPixelRatio() <= 0.56 ? slowT + 1 : 0;
      if (slowT >= 5 && game.settings.quality !== 'low' && !game._autoLow) {
        game._autoLow = true;
        game.applySettings({ ...game.settings, quality: 'low' });
        game.toast('Máy hơi yếu — đã chuyển đồ hoạ <b>Thấp</b> cho mượt. Mở lại game để bớt cây cỏ.', 4);
      }
    }
    window.__fps = Math.round(1000 / avg);
    // một lỗi lẻ trong khung hình không được làm dừng cả vòng lặp (three.js ngừng gọi tiếp nếu hàm ném lỗi)
    try {
      if (mode === 'create') updatePreview(dt);
      else game.update(dt, clock.elapsedTime);
      if (mode === 'create' && stage) renderer.render(stage.scene, stage.camera); else renderer.render(scene, camera);
    } catch (err) {
      if (!loopErrs.has(String(err))) { loopErrs.add(String(err)); console.error('Lỗi trong khung hình (game vẫn chạy tiếp):', err); }
    }
    input.endFrame();
  });
  window.__game = game;

  mode = 'menu';
  await new Promise((r) => setTimeout(r, 500));
  await ui.hideLoading();
  await flow();
}

// ───────────── luồng màn hình ─────────────
async function flow() {
  let profile = currentProfile();
  if (!profile) profile = await ui.login();
  if (!profile.hero) {
    const hero = await createHero(null);
    profile = saveProfile({ ...profile, name: hero.name, hero });
  }
  game.profile = profile;
  await game.buildHero(profile.hero);
  ui.heroName = profile.name;
  showMenu(profile);
  await ui.fade(false);
}

let stage = null; // sân khấu tạo nhân vật (cảnh riêng)

async function createHero(initial, editOnly = false) {
  mode = 'create';
  ui.hideMenu();
  stage ??= new HeroStage();
  await ui.fade(false);
  const hero = await ui.createCharacter(initial, (h) => buildPreview(h), { editOnly });
  if (preview.char) preview.char.root.removeFromParent();
  preview.char = null;
  mode = 'menu';
  return hero;
}

async function buildPreview(h) {
  const token = ++preview.token;
  const cls = CLASSES[h.cls];
  const c = await createHeroCharacter(h);
  if (token !== preview.token) return;
  if (!Character.chibi) c.model.traverse((o) => { if (o.isMesh && /hood/i.test(o.name)) o.visible = !!h.hood; });
  if (preview.char) preview.char.root.removeFromParent();
  preview.char = c;
  c.root.position.set(0, stage.topY, 0);
  c.root.rotation.y = preview.angle;
  stage.setColor(cls.color || '#d6b062');
  stage.scene.add(c.root);
  // dáng đứng thư thả; mới chọn thì chào một cái rồi đứng nghỉ
  c.play('Yes', { fade: 0, once: true, speed: 0.9, onDone: () => c.play('Idle_Loop', { fade: 0.35 }) });
}

let dragX = null;
addEventListener('pointerdown', (e) => { if (mode === 'create' && e.target === canvas) dragX = e.clientX; });
addEventListener('pointermove', (e) => { if (dragX !== null) { preview.angle += (e.clientX - dragX) * 0.01; dragX = e.clientX; } });
addEventListener('pointerup', () => (dragX = null));

function updatePreview(dt) {
  stage.frame(innerWidth / innerHeight);
  stage.update(dt, performance.now() / 1000);
  if (preview.char) {
    preview.char.root.rotation.y = preview.angle;
    preview.char.update(dt);
  }
}

function showMenu(profile) {
  game.audio.music('menu');
  const save = loadSave(profile);
  ui.showMenu(profile, save, CHAPTERS, {
    className: CLASSES[profile.hero.cls]?.name,
    avatar: game.portraits.hero,
    ranking: () => ui.openRanking(game),
    // nhận quà phải ở trong game (bản lưu được nạp xong) nên vào game trước rồi mở bảng
    welfare: async () => { await start(save); game.input.unlock(); ui.openWelfare(game); },
    mail: async () => { await start(save); game.input.unlock(); ui.openMail(game); },
    mailUnread: () => game.sys.mailUnread(),
    giftReady: () => game.sys.canSignIn(),
    continue: () => start(save),
    newGame: () => start(null),
    chapter: (i) => start({ ...(save || {}), chapter: i }),
    hero: async () => {
      const h = await createHero({ ...profile.hero, name: profile.name }, true);
      profile = saveProfile({ ...profile, hero: h });
      game.profile = profile;
      await game.buildHero(h);
      showMenu(profile);
    },
    settings,
    onSettings: (s) => game.applySettings(s),
    switchProfile: () => { logout(); location.reload(); },
  });
}

async function start(save) {
  ui.hideMenu();
  mode = 'play';
  await game.begin(save);
}

boot().catch((e) => {
  console.error(e);
  ui.progress(100, 'Lỗi khi tải: ' + e.message);
});
