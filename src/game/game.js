import * as THREE from 'three';
import { Character } from '../actors/character.js';
import { ChibiCharacter, CHIBI_LOOKS, chibiHero } from '../actors/chibi.js';
import { Player } from '../actors/player.js';
import { Enemy } from '../actors/enemy.js';
import { NPC } from '../actors/npc.js';
import { CameraRig } from './camera.js';
import { Combat } from './combat.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { RPG, ITEMS } from './rpg.js';
import { CLASSES, heroLook, heroWeapon } from './classes.js';
import { CHAPTERS, SPEAKERS, AMBIENT } from '../story/chapters.js';
import { HUD } from '../ui/hud.js';
import { renderPortrait } from '../ui/portraits.js';
import { PLACES } from '../world/layout.js';
import { DIFFICULTY, QUALITY, writeSave, saveSettings } from '../settings.js';
import { loadKit, loadModel } from '../engine/assets.js';
import { rng } from '../world/noise.js';
import { loadGLTF } from '../engine/assets.js';
import { Systems, DUNGEONS, WORLD_BOSSES, RIVALS } from './systems.js';
import { Companions } from './companions.js';
import { LOOK_OPTIONS } from './classes.js';
import '../ui/panels.js';
import '../ui/panels2.js';
import { VFX } from './vfx.js';
import { Ally } from '../actors/ally.js';
import { Life } from './life.js';
import { Social, RECRUITS } from './social.js';
import { REVEAL } from '../world/stylized.js';
import { MonsterCharacter } from '../actors/monster.js';
import { MeshyCharacter, MESHY_DEFAULT, meshyFile } from '../actors/meshy.js';
import { MONSTERS, Spawner, monsterStats } from './bestiary.js';
import { AutoPilot } from './auto.js';
import { MobileHUD } from '../ui/mobilehud.js';
import { realmOf } from './rpg.js';
import { Fury } from './fury.js';
import { setLang, trLine, voiceOf, SPEAKER_NAMES, LANG } from '../i18n.js';
import { Beasts, BEASTS } from './beasts.js';
import { dropGear, RARITY, randomGem } from './gear.js';
import { randomFood, randomMat } from './loot.js';
import { Status } from './status.js';
import { TITLES } from './titles.js';
import { Meridian } from './meridian.js';
import { Telegraphs } from './telegraph.js';
import { Clock } from './clock.js';
import '../ui/panels3.js';

export const LOOKS = {
  guard: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: '#6b5a44', hairColor: '#c9c4bb' },
  innkeeper: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: '#8a6a45', hairColor: '#8c8780' },
  maiden: { outfit: 'female_peasant', base: 'female', hair: ['hair_buns'], brows: 'eyebrows_female', outfitColor: '#a9c4d6', hairColor: '#1b1512' },
  villagerM: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted'], brows: 'eyebrows_regular', hairColor: '#2a2018' },
  villagerF: { outfit: 'female_peasant', base: 'female', hair: ['hair_long'], brows: 'eyebrows_female', outfitColor: '#c9a98a', hairColor: '#2a2018' },
  bandit: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: '#5a4d42', hairColor: '#1a1410' },
  bandit2: { outfit: 'male_ranger', base: 'male', hair: ['hair_beard'], brows: 'eyebrows_regular', outfitColor: '#3c3a36', hairColor: '#1a1410' },
  boss: { outfit: 'male_ranger', base: 'male', hair: ['hair_long', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: '#5a1c1c', hairColor: '#0e0b09', hideHood: true },
  assassin: { outfit: 'male_ranger', base: 'male', hair: [], brows: 'eyebrows_regular', outfitColor: '#18171b', hairColor: '#0e0b09' },
  hanbang: { outfit: 'female_ranger', base: 'female', hair: ['hair_long'], brows: 'eyebrows_female', outfitColor: '#1d2a3a', hairColor: '#0c0c10', hideHood: true },
  skeleton: { outfit: 'male_ranger', base: 'male', hair: [], outfitColor: '#d8d0c0' },
  skeletonMage: { outfit: 'male_ranger', base: 'male', hair: [], outfitColor: '#6a5a8a' },
  skeletonKing: { outfit: 'male_ranger', base: 'male', hair: [], outfitColor: '#8a2a20' },
  villain: { outfit: 'male_ranger', base: 'male', hair: ['hair_long'], brows: 'eyebrows_regular', outfitColor: '#4a0d12', hairColor: '#d8d2c8', hideHood: true },
};

const ENEMY_TYPES = {
  bandit: { look: 'bandit', name: 'Sơn tặc', hp: 70, dmg: 11, exp: 30, gold: 8, weapon: 'axe' },
  bandit2: { look: 'bandit2', name: 'Sơn tặc', hp: 80, dmg: 12, exp: 34, gold: 10, weapon: 'machete' },
  boss: { look: 'boss', name: 'Đồ Bá', hp: 520, dmg: 18, exp: 320, gold: 160, weapon: 'saber', scale: 1.12, idleAnim: 'Idle_FoldArms_Loop' },
  assassin: { look: 'assassin', name: 'Huyết Ảnh sát thủ', hp: 95, dmg: 13, exp: 55, gold: 14, weapon: 'sword', speed: 5.6 },
  hanbang: { look: 'hanbang', name: 'Hàn Băng', hp: 620, dmg: 17, exp: 480, gold: 220, weapon: 'sword', speed: 6.2 },
  skeleton: { look: 'skeleton', name: 'Kiếm hồn binh', hp: 110, dmg: 14, exp: 60, gold: 16, weapon: 'axe' },
  skeletonMage: { look: 'skeletonMage', name: 'Âm hồn pháp sư', hp: 90, dmg: 16, exp: 70, gold: 18, weapon: 'staff', caster: true },
  skeletonKing: { look: 'skeletonKing', name: 'Kiếm Mộ Vương', hp: 3000, dmg: 24, exp: 900, gold: 600, weapon: 'axe' },
  villain: { look: 'villain', name: 'Mộ Dung Huyết', hp: 1100, dmg: 22, exp: 900, gold: 500, weapon: 'golden', scale: 1.08, caster: true },
};

for (const k in LOOKS) LOOKS[k]._role = k;

/** Tạo nhân vật chính (dùng chung cho game và màn tạo nhân vật). */
export async function createHeroCharacter(h) {
  const cls = CLASSES[h.cls] || CLASSES.kiem;
  if (Character.chibi) {
    const f = null; // đã bỏ phần thời trang
    const mx = h.model?.startsWith('mx:') ? h.model : MESHY_DEFAULT[`${h.cls}:${h.gender}`];
    if (mx && meshyFile(mx)) return MeshyCharacter.create(meshyFile(mx), heroWeapon(h), { tint: f?.color || null });
    if (h.model?.startsWith('folk:')) {
      const c = await MonsterCharacter.create({ file: `/assets/folk/${h.model.slice(5)}.glb`, height: 1.55, folk: true, tint: f?.color || null });
      await c.equip(cls.weapon || 'staff');
      return c;
    }
    return ChibiCharacter.create({ ...chibiHero(h), tint: f?.color || null }, cls.weapon || 'staff');
  }
  return makeChar({ ...heroLook(h), hideHood: !h.hood }, cls.weapon);
}

async function makeChar(look, weapon) {
  if (Character.chibi) {
    const cl = look._hero ? chibiHero(look._hero) : CHIBI_LOOKS[look._role] || CHIBI_LOOKS.villagerM;
    if (cl.meshy) return MeshyCharacter.create(cl.meshy, weapon, { scale: cl.scale, tint: cl.meshyTint });
    const hm = look._hero && MESHY_DEFAULT[`${look._hero.cls}:${look._hero.gender}`];
    if (hm) return MeshyCharacter.create(meshyFile(hm), weapon);
    return ChibiCharacter.create(cl, cl.skeleton && weapon ? (weapon === 'staff' ? 'skelstaff' : 'skelaxe') : weapon);
  }
  const l = { ...look };
  delete l._role;
  delete l._hero;
  const hideHood = l.hideHood;
  delete l.hideHood;
  const c = await Character.create(l, weapon);
  c.model.traverse((o) => { if (o.isMesh && /hood/i.test(o.name) && (hideHood || l.hood === false)) o.visible = false; });
  return c;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** NPC dịch vụ trong trấn (game nhập vai): mỗi người mở một màn. */
const SERVICE_NPCS = [
  { id: 'merchant', name: 'Tiền Đa Bảo', han: '錢多寶', model: 'mx:merchant', x: 12, z: 38, yaw: Math.PI / 2, greet: 'Hàng tốt giá rẻ, vào xem đi khách quan!', action: 'Xem hàng (tiệm tạp hoá)', open: 'openShopPanel' },
  { id: 'smith', name: 'Thiết Ngưu', han: '鐵牛', model: 'mx:barbarian_warrior', x: 60, z: 36, yaw: -Math.PI / 2, greet: 'Đưa binh khí đây, lão Ngưu rèn cho sắc bén!', action: 'Cường hoá binh khí', open: 'openForge' },
  { id: 'apothecary', name: 'Tô Linh', han: '蘇靈', model: 'mx:village_girl', x: 4, z: 56, yaw: Math.PI / 2, greet: 'Thảo dược, cá tươi đem tới đây, tiểu nữ luyện đan nấu món cho.', action: 'Luyện đan & nấu ăn', open: 'openCraftPanel' },
  { id: 'auctioneer', name: 'Kim lão', han: '金老', model: 'mx:old_master', x: 48, z: 46, yaw: -Math.PI / 2, greet: 'Đấu giá hội Thanh Phong sắp mở phiên mới, mời quý khách!', action: 'Vào phiên đấu giá', open: 'openAuctionPanel' },
  { id: 'trainer', name: 'Giáo đầu Lý Hổ', han: '李虎', model: 'mx:red_armor_warrior', x: 30, z: 62, yaw: Math.PI, greet: 'Đi giang hồ một mình nguy hiểm lắm. Võ quán có người giỏi, thuê theo cùng không?', action: 'Chiêu mộ đồng đội (tổ đội)', open: 'openPartyPanel' },
  { id: 'mentor', name: 'Huyền Cơ Tử', han: '玄機子', model: 'mx:old_master', x: 14, z: 86, yaw: Math.PI, greet: 'Lão phu thấy ngươi cốt cách thanh kỳ...', action: 'Sư đồ', open: 'openMasterPanel' },
  { id: 'herald', name: 'Lệnh sứ chiến trường', han: '戰令使', model: 'mx:forest_archer', x: 44, z: 92, yaw: Math.PI, greet: 'Huyết Ảnh Môn đang tập kết ở đồng cỏ phía đông nam. Thanh Phong cần người!', action: 'Ra chiến trường', open: 'openBattlePanel' },
  { id: 'fisher', name: 'Ngư ông', han: '漁翁', model: 'mx:straw_hat_boy', x: -60, z: 80, yaw: -Math.PI / 2, greet: 'Hồ Bích Thủy nhiều cá lắm. Muốn học nghề sinh hoạt không?', action: 'Hướng dẫn sinh hoạt', open: 'openLifePanel' },
  { id: 'matchmaker', name: 'Hồng nương', han: '紅娘', model: 'mx:pink_maiden', x: 54, z: 72, yaw: -Math.PI / 2, greet: 'Duyên phận trời định, hôn nhân người lo~', action: 'Kết duyên & gia đình', open: 'openFamilyPanel' },
  { id: 'steward', name: 'Quản gia', han: '管家', model: 'mx:merchant', x: -24, z: 106, yaw: Math.PI, greet: 'Chủ nhân, gia viên cần tu sửa thêm ạ.', action: 'Quản lý gia viên', open: 'openHousePanel' },
];

export class Game {
  constructor(ctx) {
    Object.assign(this, ctx);
    this.enemies = [];
    this.npcs = [];
    this.npcById = {};
    this.rpg = new RPG(this);
    this.combat = new Combat(this);
    this.fx = new FX(this.scene);
    this.audio = new Audio();
    this.camRig = new CameraRig(this.camera, this.terrain, this.colliders);
    this.running = false;
    this.paused = false;
    this.dialogOpen = false;
    this.dialogQueue = [];
    this.portraits = {};
    this.chapterIdx = 0;
    this.stepIdx = 0;
    this.flags = {};
    this.counts = {};
    this.kills = {};
    this.unlocks = {};
    this.unlockedChapter = 0;
    this.loot = [];
    this.herbs = [];
    this.chestOpened = false;
    this.freedCages = new Set();
    this.sys = new Systems(this);
    this.vfx = new VFX(this.scene);
    this.spawner = new Spawner(this);
    this.allies = [];
    this.life = new Life(this);
    this.social = new Social(this);
    this.fury = new Fury(this);
    this.status = new Status(this);
    this.meridian = new Meridian(this);
    this.telegraphs = new Telegraphs(this);
    this.clock = new Clock(this);
    this.titleT = 5;
    this.auto = new AutoPilot(this);
    this.chatT = 20;
    this.beasts = new Beasts(this);
    // lồng tiếng + phụ đề cho lời dẫn truyện và câu nói nhanh
    this.ui.tr = (t) => trLine(t);
    this.ui.speak = (t, isHero) => this.audio.voice(t ? voiceOf(t, isHero !== false && this.profile.hero?.gender === 'female') : null);
    this.ui.sound = (n) => this.audio.ui(n);
    document.addEventListener('pointerdown', (e) => { if (e.target.closest?.('button')) this.audio.ui('click'); }, true);
    this.companions = new Companions(this);
    this.activity = null;
    this.fashionOwned = [];
    this.applySettings(this.settings);
  }

  get potions() { return this.rpg.potions; }
  get diff() { return DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal; }
  get chapter() { return CHAPTERS[this.chapterIdx]; }
  get step() { return this.chapter.steps[this.stepIdx]; }

  applySettings(s) {
    this.settings = s;
    saveSettings(s);
    const q = QUALITY[s.quality] || QUALITY.high;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    if (this.sun.shadow.mapSize.x !== q.shadow) {
      this.sun.shadow.mapSize.set(q.shadow, q.shadow);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.grass.setRadius?.(q.grass);
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.camRig.sens = s.sens;
    this.camRig.invertY = s.invertY;
    this.audio.setVolume(s.volume);
    this.audio.setMusicVolume(s.music ?? 0.5);
    this.audio.voiceVol = s.voice ?? 0.9;
    setLang(s.lang || 'vi');
    const mmo = s.controlMode !== 'action';
    this.input.noLock = mmo;
    if (mmo && this.input.locked) this.input.unlock();
    this.camRig.mode = mmo ? 'top' : 'third';
    if (mmo && (this.camRig.dist < 6 || this.camRig.dist === 4.6)) this.camRig.dist = 10.5;
    if (!mmo && this.camRig.dist > 11) this.camRig.dist = 4.6;
    document.body.classList.toggle('mmo', mmo);
    document.body.classList.toggle('style-bright', s.style !== 'realistic');
  }

  // ─────────────────── khởi tạo ───────────────────
  async init(progress) {
    progress('Hiệp khách xuất hiện...');
    await this.buildHero(this.profile.hero);

    progress('Dân trấn thức dậy...');
    const I = PLACES.inn;
    const add = async (id, look, opts, x, z, yaw) => {
      const n = new NPC(this, await makeChar(LOOKS[look]), { name: SPEAKERS[id]?.name || 'Thôn dân', ...opts });
      n.id = id;
      n.placeAt(x, z, yaw);
      n.homeYaw = yaw;
      n.home = [x, z];
      this.npcs.push(n);
      this.npcById[id] = n;
      this.scene.add(n.root);
      return n;
    };
    await add('guard', 'guard', { idleAnim: 'Idle_FoldArms_Loop' }, PLACES.gate.x + 5, PLACES.gate.z - 1.5, 0);
    await add('keeper', 'innkeeper', { idleAnim: 'Idle_FoldArms_Loop' }, I.x + 5.2, I.z - 3.0, 0);
    await add('maiden', 'maiden', { idleAnim: 'Idle_Loop' }, PLACES.pavilion.x - 1.5, PLACES.pavilion.z + 0.5, -Math.PI / 2);
    const routes = [
      ['villagerM', [[10, 45], [50, 45], [50, 60], [12, 62]]],
      ['villagerF', [[20, 30], [42, 30], [44, 55], [18, 70]]],
      ['villagerM', [[30, 90], [30, 60], [60, 52]]],
      ['villagerF', [[-10, 50], [-40, 54], [-20, 40]]],
    ];
    for (let i = 0; i < routes.length; i++) {
      const [look, route] = routes[i];
      const n = await add('villager' + i, look, { route }, route[0][0], route[0][1], 0);
      n.speaker = 'villager';
    }
    for (let i = 0; i < PLACES.cages.length; i++) {
      const [x, z] = PLACES.cages[i];
      const n = await add('captive' + i, i ? 'villagerM' : 'villagerF', { idleAnim: 'Sitting_Idle_Loop', talkAnim: 'Sitting_Talking_Loop' }, x, z, Math.PI * 0.2);
      n.speaker = 'captive';
      n.hidden = true;
      n.root.visible = false;
    }

    progress('Mở hàng quán, võ quán...');
    const folk = async (model, h = 1.5, tint = null) => (model.startsWith('mx:') ? MeshyCharacter.create(meshyFile(model), null, { tint }) : Character.chibi ? MonsterCharacter.create({ file: `/assets/folk/${model}.glb`, height: h, folk: true }) : makeChar(LOOKS.villagerM));
    for (const sv of SERVICE_NPCS) {
      const n = new NPC(this, await folk(sv.model), { name: sv.name, idleAnim: 'Idle_Loop', talkAnim: 'Idle_Loop' });
      n.id = sv.id; n.role = sv; n.speaker = sv.id;
      SPEAKERS[sv.id] = { name: sv.name, han: sv.han, look: 'villagerM' };
      n.placeAt(sv.x, sv.z, sv.yaw ?? 0);
      n.homeYaw = sv.yaw ?? 0; n.home = [sv.x, sv.z];
      this.npcs.push(n); this.npcById[sv.id] = n; this.scene.add(n.root);
      this.portraits[sv.id] = renderPortrait(this.renderer, n.char);
    }
    const crowd = ['mx:straw_hat_boy', 'mx:village_girl', 'mx:straw_hat_boy', 'mx:village_girl', 'mx:merchant', 'mx:village_girl', 'mx:straw_hat_boy', 'mx:village_girl'];
    const r0 = rng(77);
    for (let i = 0; i < crowd.length; i++) {
      const route = Array.from({ length: 4 }, () => [PLACES.square.x + (r0() - 0.5) * 70, PLACES.square.z + (r0() - 0.3) * 60]);
      const tints = [null, '#8ab0d8', '#d89a7a', '#9ac08a', null, '#c8a0d0', '#d8c080', '#a0a0a0'];
      const n = new NPC(this, await folk(crowd[i], 1.4, tints[i]), { name: 'Thôn dân', route });
      n.id = 'crowd' + i; n.speaker = 'villager';
      n.placeAt(route[0][0], route[0][1], 0); n.home = route[0];
      this.npcs.push(n); this.npcById[n.id] = n; this.scene.add(n.root);
    }

    progress('Rải mỏ quặng, bến câu...');
    await this.life.build();

    progress('Vẽ chân dung...');
    for (const [id, sp] of Object.entries(SPEAKERS)) {
      if (id === 'hero') continue;
      const c = await makeChar(LOOKS[sp.look] || LOOKS.villagerM);
      this.portraits[id] = renderPortrait(this.renderer, c);
    }

    progress('Rải thảo dược...');
    await this.placeHerbs();
    this.hud = new HUD(this);
    this.hud.setClass(this.profile.hero?.cls);
    this.mhud = new MobileHUD(this);
    this.mhud.setClass(this.profile.hero?.cls || 'kiem', this.player.cls);
    this.mhud.log('system', 'Chào mừng đến với <b class="cy">Thiên Kiếm Giang Hồ</b>. Bấm <b>Auto</b> để tự động chiến đấu và làm nhiệm vụ.');
    this.wireUI();
  }

  async buildHero(h) {
    this.ui.female = h.gender === 'female';
    const cls = CLASSES[h.cls] || CLASSES.kiem;
    const ch = await createHeroCharacter(h);
    const old = this.player;
    if (old) this.scene.remove(old.char.root);
    ch.model.traverse((o) => { if (o.isMesh && o.material) o.material = o.material.clone(); });
    this.player = new Player(this, ch, cls);
    this.player.clsId = h.cls;
    this.scene.add(ch.root);
    this.mhud?.setClass(h.cls, cls);
    if (old) {
      this.player.pos.copy(old.pos);
      this.player.yaw = old.yaw;
      Object.assign(this.player, { attackBonus: old.attackBonus, storyHp: old.storyHp, storyMp: old.storyMp, hp: old.hp, mp: old.mp });
    }
    this.rpg.apply(!old);
    this.portraits.hero = renderPortrait(this.renderer, ch);
    document.getElementById('hero-portrait').src = this.portraits.hero;
    document.getElementById('hero-name').textContent = this.profile.name;
    this.hud?.setClass(h.cls);
    document.getElementById('hero-title').textContent = `${cls.name} · Cấp ${this.rpg.level}`;
  }

  async placeHerbs() {
    // dương xỉ kiểu hoạt hình nhẹ (bản Polyhaven ~6k tam giác mỗi bụi × 40 bụi rất nặng)
    const fern = (await loadGLTF('/assets/nature/fern_1.glb')).scene;
    const r = rng(404);
    for (let i = 0; i < 40; i++) {
      let x, z, tries = 0;
      do {
        x = (r() * 2 - 1) * 300; z = (r() * 2 - 1) * 300; tries++;
      } while (tries < 50 && (this.terrain.splatAt(x, z).path > 0.1 || this.terrain.heightAt(x, z) < 0.5 || Math.hypot(x - 30, z - 50) < 90));
      const m = fern.clone(true);
      m.scale.setScalar(1.6);
      m.position.set(x, this.terrain.heightAt(x, z), z);
      m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x2a5a1a); o.material.emissiveIntensity = 0.6; } });
      this.scene.add(m);
      this.herbs.push({ mesh: m, x, z, taken: false });
    }
  }

  wireUI() {
    const ui = this.ui;
    const q = (sel) => document.querySelector(sel);
    q('#pause [data-act="resume"]').onclick = () => this.resume();
    q('#pause [data-act="journal"]').onclick = () => { ui.openJournal(CHAPTERS, this.chapterIdx, this.flags); };
    q('#pause [data-act="map"]').onclick = () => ui.openMap(this);
    q('#pause [data-act="inventory"]').onclick = () => ui.openBag(this);
    q('#pause [data-act="settings"]').onclick = () => ui.openSettings(this.settings, (s) => this.applySettings(s));
    q('#pause [data-act="controls"]').onclick = () => ui.openControls();
    q('#pause [data-act="quit"]').onclick = () => { this.save(); location.reload(); };
    q('#death [data-act="retry"]').onclick = () => this.respawn();
    q('#death [data-act="quit"]').onclick = () => location.reload();
    document.addEventListener('pointerlockchange', () => {
      if (this.running && !document.pointerLockElement && !this.player.dead && !this.dialogOpen && !this.panelOpen() && !this.cursorMode) this.pause();
    });
  }

  panelOpen() {
    return ['panel', 'worldmap', 'pause', 'death'].some((id) => !document.getElementById(id).classList.contains('hidden'));
  }

  // ─────────────────── vòng đời phiên chơi ───────────────────
  async begin(save) {
    if (save) {
      this.flags = save.flags || {};
      this.unlocks = save.unlocks || {};
      this.unlockedChapter = save.unlocked || 0;
      this.rpg.load(save.rpg);
      Object.assign(this.player, { attackBonus: save.attackBonus || 0, storyHp: save.storyHp || 0, storyMp: save.storyMp || 0 });
      this.rpg.apply(true);
      this.fashionOwned = save.fashion || [];
    }
    this.sys.load(save?.sys);
    this.running = true;
    // linh thú khởi đầu: ai chưa có con nào được tặng Tiểu Hoàng để có bạn đánh phụ ngay từ đầu
    const bs = this.beasts.s;
    if (!Object.keys(bs.owned).some((k) => BEASTS[k]?.pet)) {
      bs.owned.shiba_inu = { lv: 1, exp: 0 };
      bs.pet = 'shiba_inu';
      this.sys.s.petOut = true;
      setTimeout(() => { this.toast('<b>Tiểu Hoàng</b> 小黃 theo ngươi hành tẩu giang hồ! Bấm nút linh thú để đổi chế độ <b>Đánh phụ / Chủ động / Nghỉ</b>.', 5); this.mhud?.log('system', 'Nhận linh thú <b class="cp">Tiểu Hoàng</b>.'); }, 6000);
    }
    this.companions.spawnPet();
    await this.spawnAllies();
    await this.spawnChild();
    await this.decorateHouse();
    if (this.sys.canSignIn()) setTimeout(() => this.hud.toast('Phúc lợi: hôm nay chưa điểm danh <span class="sm">(phím O)</span>', 4), 9000);
    this.audio.start();
    await this.startChapter(save?.chapter ?? 0);
  }

  save() {
    writeSave(this.profile, {
      chapter: this.chapterIdx, unlocked: Math.max(this.unlockedChapter, this.chapterIdx), flags: this.flags, unlocks: this.unlocks,
      rpg: this.rpg.toJSON(), attackBonus: this.player.attackBonus, storyHp: this.player.storyHp, storyMp: this.player.storyMp,
      sys: this.sys.toJSON(), fashion: this.fashionOwned,
    });
  }

  async startChapter(i) {
    this.chapterIdx = i;
    this.unlockedChapter = Math.max(this.unlockedChapter, i);
    this.stepIdx = 0;
    this.kills = {};
    this.counts = {};
    const ch = this.chapter;
    this.hud.show(false);
    await this.ui.fade(true);
    // dọn kẻ địch cũ
    this.spawner.clear();
    for (const e of this.enemies) this.scene.remove(e.root);
    this.enemies = [];
    this.clearLoot();
    this.clock.setTo(ch.time);
    await this.sky.set(ch.time);
    // NPC theo chương
    const night = ch.time === 'night';
    for (const n of this.npcs) {
      n.hidden = false;
      if (n.id.startsWith('villager')) n.hidden = night || ch.id === 'c5';
      if (n.id.startsWith('captive')) n.hidden = true;
      n.root.visible = !n.hidden;
      if (n.home) n.placeAt(n.home[0], n.home[1], n.homeYaw);
    }
    this.npcById.maiden.hidden = ch.id === 'c5';
    this.npcById.maiden.root.visible = ch.id !== 'c5';
    this.chestOpened = this.chapterIdx > 2;
    this.freedCages.clear();
    for (const c of this.spots.cages) c.userData.bars.visible = true;
    const sp = ch.spawn;
    this.player.revive(sp.x, sp.z, sp.yaw);
    this.status.clearBad();
    this.camRig.yaw = sp.yaw + Math.PI;
    this.camRig.snap(this.player.pos);
    this.save();
    const narration = typeof ch.narration === 'function' ? ch.narration(this) : ch.narration;
    if (narration) {
      this.ui.narrBg = ['town', 'bamboo', 'lake', 'valley', 'ice', 'fire'][this.chapterIdx % 6];
      await this.ui.narrate(narration);
    }
    await this.ui.fade(false);
    this.hud.show(true);
    this.input.lock();
    await this.ui.chapterCard(`${ch.han} · ${ch.title}`, ch.subtitle, ch.hanSub);
    this.enterStep();
  }

  enterStep() {
    const st = this.step;
    st?.enter?.(this);
  }

  next() {
    this.stepIdx++;
    if (this.stepIdx >= this.chapter.steps.length) return this.finishChapter();
    this.audio.chime();
    this.enterStep();
  }

  finishChapter() {
    const nextIdx = this.chapterIdx + 1;
    if (nextIdx >= CHAPTERS.length) return;
    this.unlockedChapter = Math.max(this.unlockedChapter, nextIdx);
    this.rpg.gainExp(120 + this.chapterIdx * 60);
    this.toast(`<span class="han">${this.chapter.han}</span> Hoàn thành <b>${this.chapter.subtitle}</b>`, 3);
    this.chapterIdx = nextIdx;
    this.save();
    setTimeout(() => this.startChapter(nextIdx), 3200);
  }

  // ─────────────────── API dùng trong kịch bản ───────────────────
  npc(id) { return this.npcById[id]; }
  flag(name) { this.flags[name] = true; }
  count(k) { return this.counts[k] || 0; }
  killCount(group) { return this.kills[group] || 0; }
  unlock(k) { this.unlocks[k] = true; }
  addPotions(n) { this.rpg.add('potion', n); }
  toast(html, t) { this.hud.toast(html, t); }
  tip(text, t) { this.hud.tip(text, t); }
  say(id, text) { this.hud.bark(SPEAKERS[id]?.name || '', this.portraits[id], text); }

  nearestOf(group) {
    let best = null, bd = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e.group !== group) continue;
      const d = e.pos.distanceTo(this.player.pos);
      if (d < bd) { bd = d; best = e; }
    }
    return best ? { x: best.pos.x, z: best.pos.z } : null;
  }

  markerPos() {
    if (this.activity) return this.nearestOf(this.activity.group);
    const st = this.step;
    try { return st?.marker?.(this) || null; } catch { return null; }
  }

  async spawn(type, x, z, opts = {}) {
    const t = ENEMY_TYPES[type];
    const ch = await makeChar(opts.look || LOOKS[t.look], opts.weapon || t.weapon);
    if (opts.scale || t.scale) ch.root.scale.setScalar(opts.scale || t.scale);
    ch.model.traverse((o) => { if (o.isMesh && o.material) o.material = o.material.clone(); });
    const e = new Enemy(this, ch, {
      name: opts.name || t.name, hp: opts.hp || t.hp, dmg: opts.dmg || t.dmg, x, z, boss: opts.boss, aggro: opts.aggro,
      speed: opts.speed || t.speed, patrol: opts.patrol, idleAnim: t.idleAnim || 'Sword_Idle', caster: opts.caster ?? t.caster,
      exp: t.exp, gold: t.gold, group: opts.group, tag: type,
    });
    e.placeAt(x, z, Math.random() * 6.28);
    this.scene.add(ch.root);
    this.enemies.push(e);
    return e;
  }

  // ─────────────────── hội thoại ───────────────────
  dialog(lines, npc = null) {
    return new Promise((resolve) => {
      this.dialogQueue.push({ lines, npc, resolve });
      if (!this.dialogOpen) this.pumpDialog();
    });
  }

  async pumpDialog() {
    this.dialogOpen = true;
    document.body.classList.add('in-dialog');
    this.input.unlock();
    this.hud.prompt(null);
    while (this.dialogQueue.length) {
      const { lines, npc, resolve } = this.dialogQueue.shift();
      if (npc) { npc.talking = true; this.camRig.frameDialog(this.player, npc); }
      this.player.setState('talk');
      await this.runLines(lines);
      if (npc) npc.talking = false;
      resolve();
    }
    this.ui.hideDialog();
    this.audio.voice(null);
    this.camRig.cinematic = null;
    this.dialogOpen = false;
    document.body.classList.remove('in-dialog');
    if (this.player.state === 'talk') this.player.setState('free');
    if (!this.panelOpen()) this.input.lock();
  }

  async runLines(lines) {
    for (const l of lines) {
      if (Array.isArray(l)) {
        const [who, text] = l;
        const sp = SPEAKERS[who] || { name: who };
        const name = who === 'hero' ? this.profile.name : LANG === 'en' ? SPEAKER_NAMES.en[who] || sp.name : LANG === 'zh' && sp.han ? sp.han : sp.name;
        this.ui.speak(text, who === 'hero');
        const sub = trLine(text);
        await this.ui.line(name, this.portraits[who], sub ? this.zhGender(sub, who === 'hero') : this.ui.gender(text, who === 'hero'), false, sp.han && who !== 'hero' ? sp.han : '');
      } else if (l.choice) {
        const i = await this.ui.choose(l.choice);
        const more = l.choice[i].then?.(this);
        if (more) await this.runLines(more);
      } else if (l.run) {
        l.run(this);
      }
    }
  }

  talkTo(npc) {
    const st = this.step;
    const id = npc.speaker || npc.id;
    const scripted = st?.talk?.[npc.id];
    let lines = scripted ? scripted(this) : (AMBIENT[id] || AMBIENT.villager)(this);
    if (!scripted && npc.role) {
      const r = npc.role;
      lines = [[npc.id, r.greet], { choice: [{ text: r.action, then: (g) => { g[r.open]?.(); } }, { text: 'Cáo từ', then: () => null }] }];
    }
    if (!scripted && npc.id === 'keeper') {
      lines = [...lines, { choice: [
        { text: 'Mua bán (tiệm Duyệt Lai)', then: (g) => { g.ui.openShop(g); } },
        { text: 'Nghỉ ngơi một lát (hồi đầy khí huyết, nội lực)', then: (g) => { g.player.hp = g.player.maxHp; g.player.mp = g.player.maxMp; return [['keeper', 'Phòng thượng hạng, chăn ấm nệm êm. Khách quan nghỉ ngơi cho khoẻ!']]; } },
        { text: 'Cáo từ', then: () => null },
      ] }];
    }
    this.dialog(lines, npc);
  }

  openChest(cb) {
    this.chestOpened = true;
    const p = this.player;
    p.setState('talk');
    p.faceTowards(Math.atan2(PLACES.chest.x - p.pos.x, PLACES.chest.z - p.pos.z), 1, 100);
    this.fx.burst(this.chest.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xffe2a0, 40);
    p.char.play('Chest_Open', { once: true, restart: true, onDone: () => {
      p.setState('free');
      this.rpg.giveEquip('bishui');
      this.rpg.addGold(80);
      cb?.();
    } });
  }

  nextCage() {
    for (let i = 0; i < PLACES.cages.length; i++) if (!this.freedCages.has(i)) return { x: PLACES.cages[i][0], z: PLACES.cages[i][1] };
    return null;
  }

  showCaptives(v) {
    PLACES.cages.forEach((_, i) => { const n = this.npcById['captive' + i]; n.hidden = !(v && !this.freedCages.has(i)); n.root.visible = !n.hidden; });
  }

  freeCaptive(i) {
    this.freedCages.add(i);
    this.counts.freed = (this.counts.freed || 0) + 1;
    this.spots.cages[i].userData.bars.visible = false;
    this.fx.burst(this.npcById['captive' + i].pos.clone().setY(1), 0xffe2a0, 30);
    this.rpg.gainExp(40);
    this.dialog([['captive', 'Đa tạ đại hiệp cứu mạng! Bọn chúng định bắt chúng tôi lên Kiếm Mộ làm khổ sai...']], this.npcById['captive' + i])
      .then(() => { const n = this.npcById['captive' + i]; n.hidden = true; n.root.visible = false; });
  }

  // ─────────────────── chiến đấu, phần thưởng ───────────────────
  onEnemyKilled(e) {
    if (e.group) this.kills[e.group] = (this.kills[e.group] || 0) + 1;
    if (e.group === 'doba') this.dobaSpot = { x: e.pos.x, z: e.pos.z };
    this.rpg.gainExp(Math.round(e.exp * (this.sys.buff('exp') ? 1.1 : 1)));
    this.sys.progress('kill');
    if (this.companions.pet?.root.visible) this.beasts.gainExp(this.companions.petId, Math.ceil(e.exp * 0.5));
    if (e.elite || e.monster?.elite) this.sys.s.stats.elites = (this.sys.s.stats.elites || 0) + 1;
    if (e.monster) {
      const b = (this.sys.s.bestiary ??= {});
      if (!b[e.tag]) this.toast(`Bách quái phổ: ghi chép <b>${e.name}</b>`, 2);
      b[e.tag] = (b[e.tag] || 0) + 1;
    }
    this.mhud.log('system', `<b class="cy">${this.profile.name}</b> đã hạ <b class="cr">${e.name}</b>${e.boss ? ' sau một trận ác chiến!' : '.'}`);
    if (e.boss) this.mhud.announce(`Đại hiệp <b>${this.profile.name}</b> đã đánh bại <b>${e.name}</b>!`);
    if (this.activity && e.group === this.activity.group) this.activityKill();
    this.dropLoot(e);
    if (e.boss) this.camRig.shake = 1.2;
  }

  /** Nhạc nền theo nơi đang đứng */
  pickMusic() {
    const p = this.player.pos;
    if (this.activity) return this.audio.trackName || 'dungeon';
    if (this.enemies.some((e) => (e.boss || e.monster?.elite) && e.alerted && !e.dead && e.pos.distanceTo(p) < 40)) return 'boss';
    if (Math.hypot(p.x - this.spots.home.x, p.z - this.spots.home.z) < 40) return 'home';
    const zn = this.spawner.zoneAt(p.x, p.z);
    if (zn) return zn.id === 'bangho' ? 'lake' : zn.id === 'hangtuyet' || zn.id === 'thunglung' ? 'dungeon' : 'wild';
    if (Math.hypot(p.x - PLACES.square.x, p.z - PLACES.square.z) < 95) return 'town';
    return 'wild';
  }

  /** Phụ đề tiếng Trung: đổi xưng hô khi nhân vật chính là nữ */
  zhGender(text, isHero) {
    if (LANG !== 'zh' || this.profile.hero?.gender !== 'female') return text;
    return isHero ? text.replaceAll('在下', '小女子') : text.replaceAll('公子', '姑娘').replaceAll('少俠', '女俠').replaceAll('大俠', '女俠');
  }

  checkTitles() {
    const s = this.sys.s, got = (s.titles ??= ['newbie']);
    for (const t of TITLES) if (!got.includes(t.id) && t.cond(s, this)) {
      got.push(t.id);
      this.toast(`<span class="han">${t.han}</span> Mở khoá danh hiệu <b style="color:${t.color}">${t.name}</b>`, 4);
      this.mhud.log('system', `Đạt danh hiệu <b style="color:${t.color}">${t.name}</b>`);
      this.audio.chime();
    }
  }

  alertNearby(src) {
    for (const e of this.enemies) if (!e.dead && e !== src && e.pos.distanceTo(src.pos) < 16) e.alerted = true;
  }

  async dropLoot(e) {
    const drops = [['gold', Math.round(e.gold * (0.7 + Math.random() * 0.6))]];
    if (Math.random() < (e.boss ? 1 : 0.22)) drops.push(['potion', e.boss ? 2 : 1]);
    if (Math.random() < 0.35 && !e.boss) drops.push(['bounty', 1]);
    if (Math.random() < (e.boss ? 0.8 : 0.12)) drops.push(['qipill', 1]);
    if (e.tag === 'boss') drops.push(['dao', 1]);
    const lv = e.lv || this.rpg.level;
    const big = e.boss || e.elite || e.monster?.elite;
    if (e.beast && Math.random() < 0.4) drops.push(['fodder', 1]);
    if (Math.random() < (e.boss ? 1 : big ? 0.5 : 0.03)) drops.push([randomGem(e.boss ? 3 : big ? 2 : 1), 1]);
    if (Math.random() < 0.06) drops.push(['tame_charm', 1]);
    if (Math.random() < (big ? 1 : 0.14 * (1 + this.beasts.bonus('drop')))) drops.push(['gear', dropGear(lv, big)]);
    if (e.boss && Math.random() < 0.5) drops.push(['gear', dropGear(lv + 2, true)]);
    if (e.tag === 'hanbang') drops.push(['silk', 1]);
    if (Math.random() < (e.boss ? 1 : big ? 0.7 : 0.28)) drops.push([randomFood(), e.boss ? 3 : 1]);
    if (Math.random() < (e.boss ? 1 : big ? 0.8 : 0.3)) drops.push([randomMat(big), 1]);
    if (e.boss) drops.push([randomMat(true), 1]);
    for (const [kind, amount] of drops) {
      const model = { gold: 'coin_pile', potion: 'potion_1', qipill: 'potion_2', bounty: 'scroll_1' }[kind] || 'chest_wood';
      const own = ITEMS[kind]?.model;
      if (kind === 'gear') this.vfx.pillar(e.pos.clone(), new THREE.Color(RARITY[amount.rarity].color).getHex(), 2 + amount.rarity);
      const m = (own ? (await loadGLTF(own)).scene : await loadKit(model)).clone(true);
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(0.45 / Math.max(size.x, size.y, size.z));
      const a = Math.random() * Math.PI * 2;
      const pos = e.pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8));
      m.position.copy(pos);
      this.scene.add(m);
      this.loot.push({ mesh: m, kind, amount, t: 0, base: pos.y, color: kind === 'gear' ? new THREE.Color(RARITY[amount.rarity].color).getHex() : null });
    }
  }

  clearLoot() {
    for (const l of this.loot) this.scene.remove(l.mesh);
    this.loot = [];
  }

  collect(l) {
    const r = this.rpg;
    if (l.kind === 'gold') { l.amount = Math.round(l.amount * (1 + this.beasts.bonus('gold'))); r.addGold(l.amount); this.toast(`+${l.amount} lượng bạc`, 1.5); }
    else if (l.kind === 'gear') {
      const it = l.amount, R = RARITY[it.rarity];
      r.addGear(it);
      this.toast(`Nhặt được <b style="color:${R.color}">[${R.name}] ${it.name}</b> Lv.${it.lv}`, 2.2);
      this.mhud.log('system', `Nhặt được <b style="color:${R.color}">[${R.name}] ${it.name}</b>`);
      if (it.rarity >= 3) this.mhud.announce(`<b>${this.profile.name}</b> nhặt được <b style="color:${R.color}">${it.name}</b> phẩm ${R.name}!`);
      this.hud.updateBadges?.();
    }
    else if (ITEMS[l.kind]?.type === 'equip') r.giveEquip(l.kind);
    else { r.add(l.kind, l.amount); this.toast(`Nhặt được <b>${ITEMS[l.kind].name}</b> ×${l.amount}`, 1.8); this.mhud.log('system', `Nhặt được <b class="cp">${ITEMS[l.kind].name}</b> ×${l.amount}`); }
    this.audio.coin();
  }

  updateLoot(dt) {
    const p = this.player.pos;
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      l.t += dt;
      l.mesh.rotation.y += dt * 2;
      const d = l.mesh.position.distanceTo(p);
      if (d < (this.beasts.bonus('magnet') && this.companions.pet?.root.visible ? 12 : 4.5) && l.t > 0.6) l.mesh.position.lerp(p.clone().setY(p.y + 0.8), Math.min(1, dt * 8));
      else l.mesh.position.y = l.base + Math.sin(l.t * 3) * 0.12;
      if (Math.random() < (l.color ? 0.4 : 0.1)) this.fx.sparkle(l.mesh.position, l.color || (l.kind === 'gold' ? 0xffd27a : 0xbfe6ff));
      if (d < 1 && l.t > 0.6) { this.collect(l); this.scene.remove(l.mesh); this.loot.splice(i, 1); }
    }
    for (const h of this.herbs) {
      if (h.taken) continue;
      if (Math.random() < 0.04) this.fx.sparkle(h.mesh.position.clone().setY(h.mesh.position.y + 0.4), 0xb8ff9a);
    }
  }

  onPlayerDeath() {
    setTimeout(() => {
      this.input.unlock();
      document.getElementById('death').classList.remove('hidden');
    }, 2200);
  }

  respawn() {
    document.getElementById('death').classList.add('hidden');
    const sp = this.chapter.spawn;
    this.player.revive(sp.x, sp.z, sp.yaw);
    for (const e of this.enemies) if (!e.dead) { e.alerted = false; e.setState('return'); e.hp = e.maxHp; }
    this.input.lock();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.ui.showPause(`${this.chapter.han} ${this.chapter.title} · ${this.chapter.subtitle}`);
  }

  resume() {
    this.paused = false;
    this.ui.hidePause();
    this.input.lock();
  }

  // ─────────────────── tương tác ───────────────────
  nearestInteract() {
    const p = this.player.pos, st = this.step;
    let best = null, bd = 2.8;
    for (const n of this.npcs) {
      if (!n.root.visible) continue;
      const d = n.pos.distanceTo(p);
      if (d < bd && !n.id.startsWith('captive')) { bd = d; best = { kind: 'npc', npc: n, label: `Nói chuyện · ${n.name}` }; }
    }
    if (st?.interact?.chest && !this.chestOpened && Math.hypot(p.x - PLACES.chest.x, p.z - PLACES.chest.z) < 2.6) best = { kind: 'chest', label: 'Mở rương gỗ' };
    if (st?.interact?.cage) {
      PLACES.cages.forEach(([x, z], i) => { if (!this.freedCages.has(i) && Math.hypot(p.x - x, p.z - z) < 2.8) best = { kind: 'cage', i, label: 'Phá lồng, cứu người' }; });
    }
    for (const h of this.herbs) if (!h.taken && Math.hypot(p.x - h.x, p.z - h.z) < 2) best = { kind: 'herb', herb: h, label: 'Hái Linh chi thảo' };
    for (const e of this.enemies) if (this.beasts.canTame(e) && e.pos.distanceTo(p) < e.radius + 2.6) { best = { kind: 'tame', e, label: `Thu phục ${e.name} · Ngự thú phù ×${this.rpg.bag.tame_charm || 0}` }; break; }
    const ln = this.life.nearest(p);
    if (ln && !best) best = { kind: 'life', node: ln, label: this.life.label(ln) };
    if (!best && Math.hypot(p.x - this.spots.home.x, p.z - this.spots.home.z) < 3) best = { kind: 'home', label: 'Vào gia viên' };
    return best;
  }

  interact(it) {
    if (it.kind === 'npc') this.talkTo(it.npc);
    else if (it.kind === 'chest') this.step.interact.chest(this);
    else if (it.kind === 'cage') this.step.interact.cage(this, it.i);
    else if (it.kind === 'life') this.life.start(it.node);
    else if (it.kind === 'tame') this.beasts.tame(it.e);
    else if (it.kind === 'home') this.ui.openHouse(this);
    else if (it.kind === 'herb') {
      it.herb.taken = true;
      this.scene.remove(it.herb.mesh);
      this.rpg.add('herb');
      this.rpg.gainExp(8);
      this.sys.progress('herb');
      this.toast('Hái được <b>Linh chi thảo</b>', 1.6);
      this.player.char.play('PickUp_Table', { once: true, restart: true, speed: 1.6, onDone: () => this.player.setState('free') });
      this.player.setState('talk');
    }
  }

  // ─────────────────── hoạt động: phó bản, boss thế giới, luận kiếm ───────────────────
  async beginActivity(act, place) {
    await this.ui.fade(true);
    this.companions.dismount();
    for (const e of this.enemies) if (e.group?.startsWith('act')) this.scene.remove(e.root);
    this.enemies = this.enemies.filter((e) => !e.group?.startsWith('act'));
    this.player.revive(place.x, place.z, Math.PI);
    this.camRig.snap(this.player.pos);
    this.activity = { ...act, wave: 0, group: 'act' + Date.now(), left: 0 };
    this.audio.music(/chiến trường/i.test(act.title) ? 'battle' : act.waves.flat().some((w) => w[2]?.boss) ? 'boss' : 'dungeon');
    await this.ui.fade(false);
    this.input.lock();
    this.ui.chapterCard(act.han, act.title, act.han);
    setTimeout(() => this.spawnWave(), 2500);
  }

  async spawnWave() {
    const a = this.activity;
    if (!a) return;
    const wave = a.waves[a.wave];
    a.left = wave.reduce((n, w) => n + w[1], 0);
    this.toast(a.waves.length > 1 ? `Đợt ${a.wave + 1}/${a.waves.length}` : a.title, 2);
    const p = this.player.pos;
    let k = 0;
    for (const [type, n, extra] of wave) {
      for (let i = 0; i < n; i++, k++) {
        const ang = (k / a.left) * Math.PI * 2;
        this.spawn(type, p.x + Math.cos(ang) * 12, p.z + Math.sin(ang) * 12, { group: a.group, aggro: 80, ...(extra || {}) });
      }
    }
  }

  activityKill() {
    const a = this.activity;
    if (--a.left > 0) return;
    if (++a.wave < a.waves.length) { setTimeout(() => this.spawnWave(), 1800); return; }
    this.activity = null;
    a.onWin?.();
    this.save();
  }

  startDungeon(id) {
    const d = DUNGEONS.find((x) => x.id === id);
    const place = { camp: { x: PLACES.camp.x, z: PLACES.camp.z + 10 }, bamboo: { x: PLACES.bamboo.x + 10, z: PLACES.bamboo.z + 10 }, tomb: { x: PLACES.tomb.x, z: PLACES.tomb.z + 4 } }[d.at];
    this.beginActivity({ title: d.name, han: d.han, waves: d.waves.map((w) => (Array.isArray(w[0]) ? w : [w])), onWin: () => {
      this.sys.s.dungeonRuns[id] = (this.sys.s.dungeonRuns[id] || 0) + 1;
      this.sys.progress('dungeon');
      const r = this.sys.give(d.reward);
      this.toast(`<span class="han">${d.han}</span> Vượt ải <b>${d.name}</b><br><span class="sm">${r}</span>`, 5);
      this.audio.levelUp();
    } }, place);
  }

  startWorldBoss(id) {
    const b = WORLD_BOSSES.find((x) => x.id === id);
    const type = Character.chibi ? 'skeletonKing' : 'villain';
    this.beginActivity({ title: b.name, han: b.han, waves: [[[type, 1, { name: b.name, hp: b.hp, boss: true, scale: Character.chibi ? undefined : 1.9, dmg: 20 + b.lv }]]], onWin: () => {
      this.sys.s.bossDone[id] = true;
      const r = this.sys.give({ gold: 400 + b.lv * 30, qipill: 2, points: 1 });
      this.toast(`Hạ boss thế giới <b>${b.name}</b><br><span class="sm">${r}</span>`, 5);
    } }, { x: PLACES.camp.x, z: PLACES.camp.z + 60 });
  }

  startDuel(name) {
    const r = RIVALS.find((x) => x.name === name);
    const k = r.power / 10000;
    const rh = { gender: r.gender, cls: r.cls, hair: r.gender === 'male' ? 'hair_long' : 'hair_buns', hairColor: '#1b1512', outfit: 'ranger', fashion: ['thanh', 'hac', 'bach', 'xich'][r.lv % 4] };
    const look = { ...heroLook(rh), _hero: rh };
    this.beginActivity({ title: `Luận kiếm · ${r.name}`, han: '論劍', waves: [[['bandit', 1, { name: `${r.name} · ${CLASSES[r.cls].name}`, hp: Math.round(300 * k + 150), dmg: Math.round(10 + 8 * k), boss: true, look, weapon: CLASSES[r.cls].weapon || 'staff', caster: r.cls === 'phap' || r.cls === 'cung', speed: 5.8 }]]], onWin: () => {
      this.sys.s.stats.pvpWins++;
      this.sys.progress('pvp');
      r.power = Math.min(r.power, this.sys.power() - 50);
      this.sys.give({ gold: 80, bounty: 1 });
      this.toast(`Luận kiếm thắng <b>${r.name}</b>! Thứ hạng tăng.`, 4);
    } }, { x: PLACES.square.x, z: PLACES.square.z });
  }

  /** Mục tiêu hiện tại: con vừa đánh / Auto đang nhắm / con gần nhất đang đuổi mình. */
  currentTarget() {
    const ok = (e) => e && !e.dead && e.root.visible && e.pos.distanceTo(this.player.pos) < 30;
    if (ok(this.lastTarget)) return this.lastTarget;
    if (ok(this.auto.target)) return this.auto.target;
    let best = null, bd = 16;
    for (const e of this.enemies) if (!e.dead && e.alerted && e.root.visible) { const d = e.pos.distanceTo(this.player.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }

  /** Vòng sáng dưới chân nhân vật và vòng đỏ dưới mục tiêu. */
  updateRings(dt) {
    if (!this.rings) {
      const make = (color, size, op) => {
        const m = this.vfx.magicCircle(new THREE.Vector3(), color, size, 1e9);
        m.material.opacity = op;
        this.vfx.items.find((it) => it.obj === m).update = (o, k, d) => { o.rotation.z += d * 0.6; };
        return m;
      };
      this.rings = { me: make(0x6ad0ff, 1.3, 0.45), tg: make(0xff3a2a, 1.2, 0.85) };
      // bỏ cột sáng đi kèm vòng phép
      this.vfx.items.filter((it) => it.max === 1e9 * 0.7).forEach((it) => { it.life = 0; });
    }
    const p = this.player.pos;
    this.rings.me.position.set(p.x, p.y + 0.05, p.z);
    this.rings.me.visible = !this.player.dead;
    const t = this.currentTarget();
    this.rings.tg.visible = !!t;
    if (t) {
      this.rings.tg.position.set(t.pos.x, t.pos.y + 0.06, t.pos.z);
      const s = Math.max(1, (t.monster?.h || 1.6) * 0.7) * (t.boss ? 1.5 : 1);
      this.rings.tg.scale.setScalar(s);
    }
  }

  /** Tin giang hồ lác đác cho thế giới sống động (nhân vật trong game). */
  worldChat(dt) {
    this.chatT -= dt;
    if (this.chatT > 0) return;
    this.chatT = 25 + Math.random() * 30;
    const rv = RIVALS[Math.floor(Math.random() * RIVALS.length)];
    const lines = [
      `<b class="cy">${rv.name}</b> của <b class="cg">Thanh Phong Bang</b> đã hạ gục <b class="cr">Huyết Ảnh sát thủ</b>.`,
      `<b class="cy">${rv.name}</b> vượt ải <b class="cp">Luyện Võ Trường</b>, nhận được <b class="cp">Hồi khí đan</b>.`,
      `<b class="cy">${rv.name}</b> cường hoá binh khí thành công lên <b class="cg">+${3 + Math.floor(Math.random() * 6)}</b>!`,
      `Boss thế giới <b class="cr">Ma Tôn · Huyết Lang</b> sắp xuất hiện trước Hắc Phong trại.`,
      `<b class="cy">Lưu chưởng quỹ</b>: Duyệt Lai khách điếm vừa nhập lô Kim sang dược mới!`,
    ];
    this.mhud.log(Math.random() < 0.6 ? 'world' : 'system', lines[Math.floor(Math.random() * lines.length)]);
  }

  /** Sinh một con quái theo bách quái phổ. */
  async spawnMonster(id, x, z, opts = {}) {
    const m = MONSTERS[id];
    const st = monsterStats(m);
    const ch = m.meshy ? await MeshyCharacter.create(m.meshy, null, { scale: (m.h * (opts.scale || 1)) / 1.75 }) : await MonsterCharacter.create({ file: m.file, height: m.h * (opts.scale || 1), tint: m.tint });
    const e = new Enemy(this, ch, {
      name: m.name, hp: st.hp, dmg: st.dmg, x, z, boss: !!opts.boss, aggro: opts.aggro ?? (m.passive ? 0 : m.elite ? 14 : m.beast ? 7 : 10), speed: m.elite ? 4.2 : 3.6,
      patrol: opts.patrol, idleAnim: 'Idle_Loop', caster: m.caster, exp: st.exp, gold: st.gold, group: opts.group || 'mob:' + id, tag: id,
      monster: m, reach: Math.max(1.6, m.h * 0.75), zone: opts.zone, lv: m.lv,
    });
    e.radius = Math.max(0.35, m.h * 0.28);
    if (m.beast) e.beast = m.beast;
    // ban đêm yêu quái mạnh hơn
    if (opts.zone && !m.beast && this.clock.night) { e.maxHp = e.hp = Math.round(e.maxHp * 1.25); e.dmg = Math.round(e.dmg * 1.25); e.exp = Math.round(e.exp * 1.3); e.night = true; }
    // quái tinh anh ngẫu nhiên: to hơn, trâu hơn, chắc chắn rơi trang bị tốt
    if (opts.zone && !opts.boss && !m.elite && !m.beast && Math.random() < 0.07) {
      e.elite = true;
      e.maxHp = e.hp = Math.round(e.maxHp * 3.2);
      e.dmg = Math.round(e.dmg * 1.5);
      e.exp *= 3; e.gold *= 3;
      e.name = 'Hung ' + e.name;
      ch.root.scale.multiplyScalar(1.3);
      e.radius *= 1.3;
    }
    e.placeAt(x, z, Math.random() * 6.28);
    this.scene.add(ch.root);
    this.enemies.push(e);
    return e;
  }

  openShopPanel() { this.ui.openShop(this); }
  openForge() { this.ui.openEnhance(this, this.rpg.equip.weapon); }
  openCraftPanel() { this.ui.openCraft(this, 'craft'); }
  openAuctionPanel() { this.ui.openAuction(this); }
  openPartyPanel() { this.ui.openParty(this); }
  openMasterPanel() { this.ui.openMaster(this); }
  openBattlePanel() { this.ui.openBattlefield(this); }
  openLifePanel() { this.ui.openLife(this); }
  openFamilyPanel() { this.ui.openFamily(this); }
  openHousePanel() { this.ui.openHouse(this); }

  /** Đồng đội theo tổ đội đã chiêu mộ. */
  async spawnAllies() {
    for (const a of this.allies) if (!a.battle) this.scene.remove(a.root);
    this.allies = this.allies.filter((a) => a.battle);
    const ids = this.social.party();
    for (let i = 0; i < ids.length; i++) {
      const r = RECRUITS.find((x) => x.id === ids[i]);
      const ch = await MeshyCharacter.create(r.meshy, r.weapon);
      const lvK = 1 + (this.rpg.level - 1) * 0.12;
      const a = new Ally(this, ch, { name: r.name, hp: Math.round(r.hp * lvK), atk: Math.round(r.atk * lvK), ranged: r.ranged, color: r.color, slot: i });
      a.placeAt(this.player.pos.x + (i - 1) * 1.5, this.player.pos.z - 2, this.player.yaw);
      this.scene.add(ch.root);
      this.allies.push(a);
    }
  }

  /** Con cái (sau khi kết duyên): đi theo như đồng đội nhỏ. */
  async spawnChild() {
    if (this.childActor) { this.scene.remove(this.childActor.root); this.allies = this.allies.filter((a) => a !== this.childActor); this.childActor = null; }
    const c = this.sys.s.child;
    if (!c) return;
    const ch = Character.chibi ? await MonsterCharacter.create({ file: '/assets/folk/mini-female-c.glb', height: 0.85, folk: true }) : await makeChar(LOOKS.villagerF);
    await ch.equip?.('dagger');
    const a = new Ally(this, ch, { name: c.name, hp: 150 + c.lv * 40, atk: 6 + c.lv * 3, slot: 3, color: 0xffd0e0 });
    a.radius = 0.25;
    a.placeAt(this.player.pos.x + 1, this.player.pos.z - 1, 0);
    this.scene.add(ch.root);
    this.childActor = a;
    this.allies.push(a);
  }

  /** Gia viên: trang trí thêm theo cấp nhà. */
  async decorateHouse() {
    if (this.houseDeco) this.scene.remove(this.houseDeco);
    const lv = this.social.houseLv();
    const g = new THREE.Group();
    const H = this.spots.home;
    const { signBoard } = await import('../world/architecture.js');
    const names = ['', '茅屋', '木屋', '青瓦宅', '庭院', '世家府第'];
    const plaque = signBoard(names[lv], 2.4, 0.7);
    plaque.position.set(H.x, H.y + 3.0, H.z + 2.9);
    plaque.rotation.y = Math.PI;
    g.add(plaque);
    const lantern = (await loadModel('wooden_lantern_01'));
    const flowers = (await loadGLTF('/assets/nature/flower_3_group.glb')).scene;
    const bush = (await loadGLTF('/assets/nature/bush_common_flowers.glb')).scene;
    const put = (src, x, z, s = 1) => { const m = src.clone(true); m.position.set(H.x + x, this.terrain.heightAt(H.x + x, H.z + z), H.z + z); m.scale.setScalar(s); g.add(m); };
    if (lv >= 2) { put(lantern, -3, -1.5, 1.4); put(lantern, 3, -1.5, 1.4); }
    if (lv >= 3) for (let i = -4; i <= 4; i += 2) put(flowers, i, -3.5, 0.9);
    if (lv >= 4) { put(bush, -6, -2, 1.6); put(bush, 6, -2, 1.6); put(await loadModel('horse_statue_01'), 0, -6, 1.8); }
    if (lv >= 5) { put(await loadModel('chinese_screen_panels'), -6, 3, 1.5); put(await loadModel('antique_ceramic_vase_01'), 6, 3, 2); put(lantern, -6, -6, 1.8); put(lantern, 6, -6, 1.8); }
    this.scene.add(g);
    this.houseDeco = g;
  }

  /** Chiến trường: phe ta (đồng đội máy) đánh 3 đợt Huyết Ảnh. */
  async startBattlefield() {
    const B = PLACES.battle;
    for (const a of this.allies.filter((x) => x.battle)) this.scene.remove(a.root);
    this.allies = this.allies.filter((x) => !x.battle);
    const side = [['swordsman_ribbon', 'sword'], ['green_warrior', 'axe'], ['forest_archer', 'bow'], ['taoist_scholar', 'staff']];
    for (let i = 0; i < side.length; i++) {
      const [model, w] = side[i];
      const ch = await MeshyCharacter.create(model, w);
      const a = new Ally(this, ch, { name: 'Thanh Phong đệ tử', hp: 500 + this.rpg.level * 40, atk: 18 + this.rpg.level * 2, ranged: w === 'bow' || w === 'staff', slot: 4 + i, anchor: new THREE.Vector3(B.x, 0, B.z), color: 0x7ab8ff });
      a.battle = true;
      a.placeAt(B.x - 4 + i * 2.5, B.z + 6, Math.PI);
      this.scene.add(ch.root);
      this.allies.push(a);
    }
    this.beginActivity({ title: 'Thanh Phong chiến trường', han: '清風戰場', waves: [[['assassin', 5]], [['assassin', 4], ['skeleton', 3]], [['hanbang', 1, { name: 'Huyết Ảnh tướng quân', hp: 1500, boss: true }], ['assassin', 3]]], onWin: () => {
      const r = this.sys.give({ gold: 300, bounty: 4, points: 1 });
      this.toast(`<span class="han">戰勝</span> Phe Thanh Phong toàn thắng!<br><span class="sm">${r}</span>`, 5);
      this.sys.s.stats.battleWins = (this.sys.s.stats.battleWins || 0) + 1;
      for (const a of this.allies.filter((x) => x.battle)) this.scene.remove(a.root);
      this.allies = this.allies.filter((x) => !x.battle);
    } }, { x: B.x, z: B.z + 8 });
  }

  toggleMount() { this.companions.toggleMount(); }
  spawnPet() { this.companions.spawnPet(); }
  ownedFashion() { return this.fashionOwned; }
  unlockFashion(id) { if (!this.fashionOwned.includes(id)) this.fashionOwned.push(id); }
  async setFashion(id) {
    const h = { ...this.profile.hero, fashion: id };
    this.profile = { ...this.profile, hero: h };
    (await import('../settings.js')).saveProfile(this.profile);
    await this.buildHero(h);
  }

  // ─────────────────── vòng lặp ───────────────────
  update(dt, time) {
    const input = this.input;
    this.sky.update(this.running ? this.player.pos : this.camera.position, time);
    if (!this.running) {
      // máy quay menu: thấp, lia chậm qua mái nhà, cây đỏ và dãy núi; bớt sương cho màu tươi
      if (this._menuFog == null) { this._menuFog = this.scene.fog.density; this.scene.fog.density *= 0.35; }
      const a = time * 0.03;
      this.camera.position.set(PLACES.square.x + Math.sin(a) * 46, 9, PLACES.square.z + Math.cos(a) * 46);
      this.camera.lookAt(PLACES.square.x - Math.sin(a) * 90, 16, PLACES.square.z - Math.cos(a) * 90);
      this.updateSun(this.camera.position);
      this.grass.update(PLACES.square.x, PLACES.square.z, time);
      return;
    }
    if (this._menuFog != null) { this.scene.fog.density = this._menuFog; this._menuFog = null; }
    if (this.paused || this.panelOpen()) {
      this.hud.update(0);
      return;
    }

    // Auto: tự đánh / đi nhiệm vụ
    const ad = this.auto.drive(dt);
    input.autoMove = ad?.move || null;
    input.autoSprint = ad?.sprint || false;
    if (ad) for (const k of ad.press) input.justDown.add(k);
    if (input.pressed('KeyZ')) this.auto.toggle();

    const busyLife = this.life.update(dt, input);
    this.social.tickAuction(dt);

    if (!this.dialogOpen && !busyLife) {
      if (input.pressed('KeyV')) { this.camRig.toggleMode(); this.toast(this.camRig.mode === 'third' ? 'Góc nhìn sau lưng' : 'Góc nhìn từ trên cao', 1.2); }
      if (input.pressed('KeyM')) { this.input.unlock(); this.ui.openMap(this); }
      if (input.pressed('KeyI')) { this.input.unlock(); this.ui.openBag(this); }
      if (input.pressed('KeyK')) { this.input.unlock(); this.ui.openSkills(this); }
      const open = (fn) => { this.input.unlock(); fn(); };
      if (input.pressed('KeyJ') || input.pressed('Tab')) open(() => this.ui.openQuests(this));
      if (input.pressed('KeyO')) open(() => this.ui.openWelfare(this));
      if (input.pressed('KeyN')) open(() => this.ui.openEvents(this));
      if (input.pressed('KeyP')) open(() => this.ui.openRanking(this));
      if (input.pressed('KeyG')) open(() => this.ui.openGuild(this));
      if (input.pressed('KeyT')) open(() => this.ui.openCraft(this));
      if (input.pressed('KeyB')) open(() => this.ui.openCompanions(this));
      if (input.pressed('KeyL')) open(() => this.ui.openBestiary(this));
      if (input.pressed('Backslash') || input.pressed('KeyY')) open(() => this.ui.openHub(this));
      if (input.pressed('KeyH')) this.toggleMount();
      if (input.pressed('KeyX') && !this.fury.activate() && this.fury.rage < 100) this.toast('Nộ khí chưa đầy', 1);
      if (input.pressed('AltLeft') || input.pressed('Backquote')) {
        if (this.input.locked) { this.cursorMode = true; this.input.unlock(); } else { this.cursorMode = false; this.input.lock(); }
      }
      if (this.cursorMode && !this.input.locked && input.pressed('Mouse0')) { this.cursorMode = false; this.input.lock(); input.justDown.delete('Mouse0'); }
      const it = this.player.dead ? null : this.nearestInteract();
      this.hud.prompt(it?.label);
      if (it && input.pressed('KeyE') && this.player.state === 'free') this.interact(it);
    }

    let adt = dt;
    if (this.combat.hitStop > 0) { this.combat.hitStop -= dt; adt = dt * 0.08; }
    const frozen = this.dialogOpen ? { held: () => false, pressed: () => false, mouseDX: 0, mouseDY: 0, wheel: 0 } : input;
    this.player.update(adt, frozen, this.camRig);
    const pp = this.player.pos;
    // tiếng bước chân
    const hs = Math.hypot(this.player.vel.x, this.player.vel.z);
    if (hs > 2 && this.player.onGround && !this.player.mounted && !this.player.inWater) { this.stepT = (this.stepT || 0) - dt * hs; if (this.stepT <= 0) { this.stepT = 2.3; this.audio.step(); } }
    const actors = [this.player];
    for (const e of this.enemies) {
      const d = e.pos.distanceTo(pp);
      const near = d < 75 || e.alerted;
      // ở xa: ẩn hẳn (không vẽ, không cập nhật xương)
      if (!e.dead || e.deadT < 12) e.root.visible = near;
      if (near) { e.update(adt); actors.push(e); }
    }
    for (const n of this.npcs) {
      if (n.hidden) { n.root.visible = false; continue; }
      const near = n.pos.distanceTo(pp) < 70;
      n.root.visible = near;
      if (near) { n.update(adt); actors.push(n); }
    }
    for (const a of this.allies) { if (!a.dead || a.deadT < 30) { a.update(adt); actors.push(a); } }
    for (const a of actors) if (!a.dead) a.separate(actors);
    this.combat.update(adt);
    this.fx.update(dt);
    this.fury.update(dt);
    this.status.update(dt);
    this.telegraphs.update(dt);
    this.clock.update(dt);
    if ((this.musicT = (this.musicT || 0) - dt) <= 0) { this.musicT = 1.5; this.audio.music(this.pickMusic()); }
    if ((this.titleT -= dt) <= 0) { this.titleT = 4; this.checkTitles(); }
    this.updateLoot(dt);
    // dọn xác đã nằm lâu
    if (this.enemies.length > 40) {
      this.enemies = this.enemies.filter((e) => {
        const gone = e.dead && e.deadT > 14;
        if (gone) this.scene.remove(e.root);
        return !gone;
      });
    }
    this.sys.update(dt);
    if (!this.activity) this.spawner.update(dt);
    this.companions.update(dt);
    this.vfx.update(dt);
    this.updateRings(dt);
    REVEAL.uReveal.value.copy(pp);
    this.mhudT = (this.mhudT || 0) - dt;
    if (this.mhudT <= 0) { this.mhudT = 0.1; this.mhud.update(); }
    this.worldChat(dt);
    const zn = this.spawner.zoneAt(pp.x, pp.z);
    if (zn?.id !== this.curZone) {
      this.curZone = zn?.id;
      if (zn) this.ui.zoneBanner(zn);
    }
    this.saveT = (this.saveT ?? 20) - dt;
    if (this.saveT <= 0) { this.saveT = 20; this.save(); }
    this.camRig.update(dt, pp, frozen);
    this.updateSun(pp);
    this.grass.update(pp.x, pp.z, time);

    // tiến độ cốt truyện
    const st = this.step;
    if (st?.done && !this.dialogOpen && st.done(this)) this.next();
    const ch = this.chapter;
    const a = this.activity;
    if (a) this.hud.objective(`<span class="han">${a.han}</span>${a.title}`, a.waves.length > 1 ? `Đợt ${a.wave + 1}/${a.waves.length} · còn ${a.left} địch` : `Đánh bại đối thủ`);
    else this.hud.objective(`<span class="han">${ch.han}</span>${ch.title} · ${ch.subtitle}`, st ? this.ui.nh(st.objective(this)) : '');
    document.getElementById('hero-title').textContent = `${this.player.cls.name} · Cấp ${this.rpg.level}`;
    this.hud.update(dt);
  }

  updateSun(center) {
    const c = new THREE.Vector3(Math.round(center.x / 4) * 4, 0, Math.round(center.z / 4) * 4);
    c.y = this.terrain.heightAt(c.x, c.z);
    this.sun.position.copy(c).addScaledVector(this.sky.sunDir, 150);
    this.sun.target.position.copy(c);
  }
}
