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
import { CLASSES, heroLook } from './classes.js';
import { CHAPTERS, SPEAKERS, AMBIENT } from '../story/chapters.js';
import { HUD } from '../ui/hud.js';
import { renderPortrait } from '../ui/portraits.js';
import { PLACES } from '../world/layout.js';
import { DIFFICULTY, QUALITY, writeSave, saveSettings } from '../settings.js';
import { loadKit, loadModel } from '../engine/assets.js';
import { rng } from '../world/noise.js';
import { Systems, DUNGEONS, WORLD_BOSSES, RIVALS } from './systems.js';
import { Companions } from './companions.js';
import { LOOK_OPTIONS } from './classes.js';
import '../ui/panels.js';
import { VFX } from './vfx.js';
import { MonsterCharacter } from '../actors/monster.js';
import { MONSTERS, Spawner, monsterStats } from './bestiary.js';
import { AutoPilot } from './auto.js';
import { MobileHUD } from '../ui/mobilehud.js';
import { realmOf } from './rpg.js';

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
export function createHeroCharacter(h) {
  const cls = CLASSES[h.cls] || CLASSES.kiem;
  if (Character.chibi) {
    const f = LOOK_OPTIONS.fashion.find((x) => x.id === h.fashion);
    return ChibiCharacter.create({ ...chibiHero(h), tint: f?.color || null }, cls.weapon || 'staff');
  }
  return makeChar({ ...heroLook(h), hideHood: !h.hood }, cls.weapon);
}

async function makeChar(look, weapon) {
  if (Character.chibi) {
    const cl = look._hero ? chibiHero(look._hero) : CHIBI_LOOKS[look._role] || CHIBI_LOOKS.villagerM;
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
    this.auto = new AutoPilot(this);
    this.chatT = 20;
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
      n.root.visible = false;
    }

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
    const fern = await loadModel('fern_02');
    const r = rng(404);
    for (let i = 0; i < 40; i++) {
      let x, z, tries = 0;
      do {
        x = (r() * 2 - 1) * 300; z = (r() * 2 - 1) * 300; tries++;
      } while (tries < 50 && (this.terrain.splatAt(x, z).path > 0.1 || this.terrain.heightAt(x, z) < 0.5 || Math.hypot(x - 30, z - 50) < 90));
      const m = fern.clone(true);
      m.scale.setScalar(0.6);
      m.position.set(x, this.terrain.heightAt(x, z), z);
      m.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x2a5a1a); o.material.emissiveIntensity = 0.6; } });
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
    this.companions.spawnPet();
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
    await this.sky.set(ch.time);
    // NPC theo chương
    const night = ch.time === 'night';
    for (const n of this.npcs) {
      if (n.id.startsWith('villager')) n.root.visible = !night && ch.id !== 'c5';
      if (n.id.startsWith('captive')) n.root.visible = false;
      if (n.home) n.placeAt(n.home[0], n.home[1], n.homeYaw);
    }
    this.npcById.maiden.root.visible = ch.id !== 'c5';
    this.chestOpened = this.chapterIdx > 2;
    this.freedCages.clear();
    for (const c of this.spots.cages) c.userData.bars.visible = true;
    const sp = ch.spawn;
    this.player.revive(sp.x, sp.z, sp.yaw);
    this.camRig.yaw = sp.yaw + Math.PI;
    this.camRig.snap(this.player.pos);
    this.save();
    const narration = typeof ch.narration === 'function' ? ch.narration(this) : ch.narration;
    if (narration) await this.ui.narrate(narration);
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
        const name = who === 'hero' ? this.profile.name : sp.name;
        await this.ui.line(name, this.portraits[who], this.ui.gender(text, who === 'hero'), false, sp.han && who !== 'hero' ? sp.han : '');
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
    PLACES.cages.forEach((_, i) => { this.npcById['captive' + i].root.visible = v && !this.freedCages.has(i); });
  }

  freeCaptive(i) {
    this.freedCages.add(i);
    this.counts.freed = (this.counts.freed || 0) + 1;
    this.spots.cages[i].userData.bars.visible = false;
    this.fx.burst(this.npcById['captive' + i].pos.clone().setY(1), 0xffe2a0, 30);
    this.rpg.gainExp(40);
    this.dialog([['captive', 'Đa tạ đại hiệp cứu mạng! Bọn chúng định bắt chúng tôi lên Kiếm Mộ làm khổ sai...']], this.npcById['captive' + i])
      .then(() => { this.npcById['captive' + i].root.visible = false; });
  }

  // ─────────────────── chiến đấu, phần thưởng ───────────────────
  onEnemyKilled(e) {
    if (e.group) this.kills[e.group] = (this.kills[e.group] || 0) + 1;
    if (e.group === 'doba') this.dobaSpot = { x: e.pos.x, z: e.pos.z };
    this.rpg.gainExp(Math.round(e.exp * (this.sys.buff('exp') ? 1.1 : 1)));
    this.sys.progress('kill');
    this.mhud.log('system', `<b class="cy">${this.profile.name}</b> đã hạ <b class="cr">${e.name}</b>${e.boss ? ' sau một trận ác chiến!' : '.'}`);
    if (e.boss) this.mhud.announce(`Đại hiệp <b>${this.profile.name}</b> đã đánh bại <b>${e.name}</b>!`);
    if (this.activity && e.group === this.activity.group) this.activityKill();
    this.dropLoot(e);
    if (e.boss) this.camRig.shake = 1.2;
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
    if (e.tag === 'hanbang') drops.push(['silk', 1]);
    for (const [kind, amount] of drops) {
      const model = { gold: 'coin_pile', potion: 'potion_1', qipill: 'potion_2', bounty: 'scroll_1' }[kind] || 'chest_wood';
      const m = (await loadKit(model)).clone(true);
      const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      m.scale.setScalar(0.45 / Math.max(size.x, size.y, size.z));
      const a = Math.random() * Math.PI * 2;
      const pos = e.pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8));
      m.position.copy(pos);
      this.scene.add(m);
      this.loot.push({ mesh: m, kind, amount, t: 0, base: pos.y });
    }
  }

  clearLoot() {
    for (const l of this.loot) this.scene.remove(l.mesh);
    this.loot = [];
  }

  collect(l) {
    const r = this.rpg;
    if (l.kind === 'gold') { r.addGold(l.amount); this.toast(`+${l.amount} lượng bạc`, 1.5); }
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
      if (d < (this.companions.pet?.root.visible ? 12 : 4.5) && l.t > 0.6) l.mesh.position.lerp(p.clone().setY(p.y + 0.8), Math.min(1, dt * 8));
      else l.mesh.position.y = l.base + Math.sin(l.t * 3) * 0.12;
      if (Math.random() < 0.1) this.fx.sparkle(l.mesh.position, l.kind === 'gold' ? 0xffd27a : 0xbfe6ff);
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
    return best;
  }

  interact(it) {
    if (it.kind === 'npc') this.talkTo(it.npc);
    else if (it.kind === 'chest') this.step.interact.chest(this);
    else if (it.kind === 'cage') this.step.interact.cage(this, it.i);
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
    const ch = await MonsterCharacter.create({ file: m.file, height: m.h * (opts.scale || 1), tint: m.tint });
    const e = new Enemy(this, ch, {
      name: m.name, hp: st.hp, dmg: st.dmg, x, z, boss: !!opts.boss, aggro: opts.aggro ?? (m.elite ? 14 : 10), speed: m.elite ? 4.2 : 3.6,
      patrol: opts.patrol, idleAnim: 'Idle_Loop', caster: m.caster, exp: st.exp, gold: st.gold, group: opts.group || 'mob:' + id, tag: id,
      monster: m, reach: Math.max(1.6, m.h * 0.75), zone: opts.zone, lv: m.lv,
    });
    e.radius = Math.max(0.35, m.h * 0.28);
    e.placeAt(x, z, Math.random() * 6.28);
    this.scene.add(ch.root);
    this.enemies.push(e);
    return e;
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
      const a = time * 0.035;
      this.camera.position.set(PLACES.square.x + Math.sin(a) * 75, 26, PLACES.square.z + Math.cos(a) * 75);
      this.camera.lookAt(PLACES.square.x, 7, PLACES.square.z - 12);
      this.updateSun(this.camera.position);
      this.grass.update(PLACES.square.x, PLACES.square.z, time);
      return;
    }
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

    if (!this.dialogOpen) {
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
      if (input.pressed('KeyU')) open(() => this.ui.openFashion(this));
      if (input.pressed('KeyY')) open(() => this.ui.openBond(this));
      if (input.pressed('KeyT')) open(() => this.ui.openCraft(this));
      if (input.pressed('KeyB')) open(() => this.ui.openCompanions(this));
      if (input.pressed('KeyH')) this.toggleMount();
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
    const actors = [this.player];
    for (const e of this.enemies) if (e.pos.distanceTo(pp) < 140 || e.alerted) { e.update(adt); actors.push(e); }
    for (const n of this.npcs) if (n.root.visible && n.pos.distanceTo(pp) < 120) { n.update(adt); actors.push(n); }
    for (const a of actors) if (!a.dead) a.separate(actors);
    this.combat.update(adt);
    this.fx.update(dt);
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
    this.mhudT = (this.mhudT || 0) - dt;
    if (this.mhudT <= 0) { this.mhudT = 0.1; this.mhud.update(); }
    this.worldChat(dt);
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
