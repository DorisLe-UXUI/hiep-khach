import * as THREE from 'three';
import { Character } from '../actors/character.js';
import { Player } from '../actors/player.js';
import { Enemy } from '../actors/enemy.js';
import { NPC } from '../actors/npc.js';
import { CameraRig } from './camera.js';
import { Combat } from './combat.js';
import { FX } from './fx.js';
import { Audio } from './audio.js';
import { QuestLog, QUESTS, DIALOGUE } from './quests.js';
import { HUD } from '../ui/hud.js';
import { PLACES } from '../world/layout.js';

const LOOKS = {
  hero: { outfit: 'male_ranger', base: 'male', hair: ['hair_buns'], brows: 'eyebrows_regular', hairColor: 0x2a2018, hideHood: true },
  bandit: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: 0x5a4d42, hairColor: 0x1a1410 },
  bandit2: { outfit: 'male_ranger', base: 'male', hair: ['hair_beard'], brows: 'eyebrows_regular', outfitColor: 0x3c3a36, hairColor: 0x1a1410 },
  boss: { outfit: 'male_ranger', base: 'male', hair: ['hair_long', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: 0x5a1c1c, hairColor: 0x0e0b09, hideHood: true },
  innkeeper: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted', 'hair_beard'], brows: 'eyebrows_regular', outfitColor: 0x8a6a45, hairColor: 0x8c8780 },
  maiden: { outfit: 'female_peasant', base: 'female', hair: ['hair_buns'], brows: 'eyebrows_female', outfitColor: 0xa9c4d6, hairColor: 0x1b1512 },
  villagerM: { outfit: 'male_peasant', base: 'male', hair: ['hair_simpleparted'], brows: 'eyebrows_regular', hairColor: 0x2a2018 },
  villagerF: { outfit: 'female_peasant', base: 'female', hair: ['hair_long'], brows: 'eyebrows_female', outfitColor: 0xc9a98a, hairColor: 0x2a2018 },
};

async function makeChar(lookName, weapon) {
  const look = { ...LOOKS[lookName] };
  const hideHood = look.hideHood;
  delete look.hideHood;
  const c = await Character.create(look, weapon);
  if (hideHood) c.model.traverse((o) => { if (o.isMesh && /hood/i.test(o.name)) o.visible = false; });
  return c;
}

export class Game {
  constructor(ctx) {
    Object.assign(this, ctx);
    this.enemies = [];
    this.npcs = [];
    this.quests = new QuestLog();
    this.combat = new Combat(this);
    this.fx = new FX(this.scene);
    this.audio = new Audio();
    this.camRig = new CameraRig(this.camera, this.terrain, this.colliders);
    this.running = false;
    this.dialogState = null;
    this.journalOpen = false;
    this.chestOpened = false;
  }

  async init(progress) {
    progress('Hiệp khách xuất hiện...');
    const heroChar = await makeChar('hero', 'sword');
    this.player = new Player(this, heroChar);
    this.scene.add(heroChar.root);
    this.player.placeAt(PLACES.spawn.x, PLACES.spawn.z, Math.PI);
    this.camRig.target.copy(this.player.pos);
    this.camRig.pos.copy(this.player.pos).add(new THREE.Vector3(0, 3, 5));

    progress('Sơn tặc kéo về...');
    const C = PLACES.camp;
    const bandits = [
      [C.x - 4, C.z + 4, 'axe'], [C.x + 5, C.z + 3, 'machete'], [C.x - 15, C.z - 8, 'saber'], [C.x + 16, C.z - 10, 'axe'],
      [C.x - 4, C.z + 34, 'saber', [[C.x - 6, C.z + 44], [C.x + 6, C.z + 44]]],
      [C.x + 4, C.z + 34, 'machete'],
      [C.x - 12, C.z + 16, 'axe'], [C.x + 12, C.z + 18, 'saber'],
      // tuần tra trên đường
      [90, -60, 'machete', [[92, -40], [88, -95]]], [80, -110, 'axe'],
      // rừng trúc
      [PLACES.chest.x + 6, PLACES.chest.z + 5, 'saber'], [PLACES.chest.x - 5, PLACES.chest.z + 8, 'axe'], [PLACES.bamboo.x + 20, PLACES.bamboo.z + 18, 'machete', [[PLACES.bamboo.x + 25, PLACES.bamboo.z + 22], [PLACES.bamboo.x + 5, PLACES.bamboo.z + 30]]],
    ];
    let i = 0;
    for (const [x, z, w, patrol] of bandits) {
      const ch = await makeChar(i % 3 === 2 ? 'bandit2' : 'bandit', w);
      const e = new Enemy(this, ch, { name: 'Sơn tặc', hp: 70, dmg: 11, x, z, patrol, idleAnim: i % 2 ? 'Idle_FoldArms_Loop' : 'Idle_Loop' });
      e.placeAt(x, z, Math.random() * 6.28);
      this.scene.add(ch.root);
      this.enemies.push(e);
      i++;
    }
    const bc = await makeChar('boss', 'saber');
    bc.root.scale.setScalar(1.12);
    const boss = new Enemy(this, bc, { name: 'Hắc Phong trại chủ · Đồ Bá', hp: 520, dmg: 18, boss: true, x: this.spots.bossHall.x, z: this.spots.bossHall.z, aggro: 14, speed: 5.2, tag: 'boss', idleAnim: 'Idle_FoldArms_Loop' });
    boss.placeAt(this.spots.bossHall.x, this.spots.bossHall.z, 0);
    this.scene.add(bc.root);
    this.enemies.push(boss);

    progress('Dân trấn thức dậy...');
    const I = PLACES.inn;
    const keeper = new NPC(this, await makeChar('innkeeper'), { name: 'Lưu chưởng quỹ', dialogue: DIALOGUE.innkeeper, idleAnim: 'Idle_FoldArms_Loop' });
    keeper.placeAt(I.x + 5.2, I.z - 3.0, 0);
    keeper.homeYaw = 0;
    keeper.questId = 'bandits';
    const maiden = new NPC(this, await makeChar('maiden'), { name: 'Lâm Uyển Nhi', dialogue: DIALOGUE.maiden, idleAnim: 'Idle_Loop' });
    maiden.placeAt(PLACES.pavilion.x - 1.5, PLACES.pavilion.z + 0.5, -Math.PI / 2);
    maiden.homeYaw = -Math.PI / 2;
    maiden.questId = 'sword';
    this.npcs.push(keeper, maiden);
    const routes = [
      ['villagerM', [[10, 45], [50, 45], [50, 60], [12, 62]]],
      ['villagerF', [[20, 30], [42, 30], [44, 55], [18, 70]]],
      ['villagerM', [[30, 90], [30, 60], [60, 52]]],
      ['villagerF', [[-10, 50], [-40, 54], [-20, 40]]],
    ];
    for (const [look, route] of routes) {
      const n = new NPC(this, await makeChar(look), { name: 'Thôn dân', dialogue: DIALOGUE.villager, route });
      n.placeAt(route[0][0], route[0][1], 0);
      this.npcs.push(n);
    }
    for (const n of this.npcs) this.scene.add(n.root);
    this.hud = new HUD(this);

    document.getElementById('respawn').onclick = () => this.respawn();
    document.getElementById('resume').onclick = () => this.resume();
    document.addEventListener('pointerlockchange', () => {
      if (this.running && !document.pointerLockElement && !this.player.dead) this.pause();
    });
  }

  start() {
    this.running = true;
    this.audio.start();
    this.hud.show();
    this.input.lock();
    this.hud.toast('Thanh Phong trấn<br><span style="font-size:15px;color:#e8dcc0">Ghé Duyệt Lai khách điếm hỏi chuyện chưởng quỹ</span>', 6);
  }

  pause() {
    this.paused = true;
    document.getElementById('pause').classList.remove('hidden');
  }

  resume() {
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    this.input.lock();
  }

  acceptQuest(id) {
    this.quests.accept(id);
    this.quests.refresh();
    this.audio.chime();
    this.hud.toast(`Nhận nhiệm vụ<br><b>${QUESTS[id].title}</b>`);
  }

  completeQuest(id) {
    this.quests.complete(id);
    this.audio.chime();
    const p = this.player;
    if (id === 'bandits') {
      p.attackBonus += 8; p.maxHp += 40; p.hp = p.maxHp;
      this.hud.toast('Hoàn thành: <b>Diệt trừ Hắc Phong trại</b><br><span style="font-size:15px">Lĩnh ngộ Thanh Phong kiếm phổ · công +8 · khí huyết +40</span>', 5);
    }
    if (id === 'sword') {
      p.canWaterRun = true; p.maxMp += 30; p.mp = p.maxMp;
      this.hud.toast('Hoàn thành: <b>Thanh kiếm của phụ thân</b><br><span style="font-size:15px">Học được Lăng Ba Vi Bộ · nội lực +30</span>', 5);
    }
  }

  onEnemyKilled(e) {
    const d = this.quests.data.bandits;
    if (e.tag === 'boss') { d.boss = true; this.hud.toast('Đã hạ <b>Hắc Phong trại chủ Đồ Bá</b>!', 4); this.camRig.shake = 1.2; }
    else d.kills++;
    const before = this.quests.status('bandits');
    this.quests.refresh();
    if (before === 'active' && this.quests.status('bandits') === 'ready') { this.audio.chime(); this.hud.toast('Đã dẹp yên Hắc Phong trại<br><span style="font-size:15px">Quay về gặp Lưu chưởng quỹ</span>', 5); }
  }

  alertNearby(src) {
    for (const e of this.enemies) if (!e.dead && e !== src && e.pos.distanceTo(src.pos) < 16) e.alerted = true;
  }

  onPlayerDeath() {
    setTimeout(() => {
      this.input.unlock();
      document.getElementById('death').classList.remove('hidden');
    }, 2500);
  }

  respawn() {
    document.getElementById('death').classList.add('hidden');
    this.player.revive(PLACES.inn.x, PLACES.inn.z + 14);
    for (const e of this.enemies) if (!e.dead) { e.alerted = false; e.setState('return'); }
    this.input.lock();
  }

  questMarkers() {
    const q = this.quests, out = [];
    const keeper = this.npcs[0], maiden = this.npcs[1];
    const sb = q.status('bandits'), ss = q.status('sword');
    if (!sb || sb === 'ready') out.push({ x: keeper.pos.x, z: keeper.pos.z });
    else if (sb === 'active') {
      const boss = this.enemies.find((e) => e.boss);
      out.push(boss && !boss.dead ? { x: boss.home.x, z: boss.home.z } : { x: PLACES.camp.x, z: PLACES.camp.z });
    }
    if (!ss || ss === 'ready') out.push({ x: maiden.pos.x, z: maiden.pos.z });
    else if (ss === 'active') out.push({ x: PLACES.chest.x, z: PLACES.chest.z });
    return out;
  }

  // ---------- hội thoại & tương tác ----------
  nearestInteract() {
    const p = this.player.pos;
    let best = null, bd = 2.8;
    for (const n of this.npcs) { const d = n.pos.distanceTo(p); if (d < bd) { bd = d; best = { kind: 'npc', npc: n, label: `E · Nói chuyện với ${n.name}` }; } }
    if (!this.chestOpened && this.quests.status('sword') === 'active') {
      const d = Math.hypot(p.x - PLACES.chest.x, p.z - PLACES.chest.z);
      if (d < 2.6) best = { kind: 'chest', label: 'E · Mở rương gỗ' };
    }
    return best;
  }

  startDialog(npc) {
    const lines = npc.dialogue(this);
    this.dialogState = { npc, lines, i: 0 };
    npc.talking = true;
    this.player.setState('talk');
    this.showLine();
  }

  showLine() {
    const d = this.dialogState;
    const [name, text, cb] = d.lines[d.i];
    this.hud.dialog(name, text);
    cb?.();
  }

  advanceDialog() {
    const d = this.dialogState;
    d.i++;
    if (d.i >= d.lines.length) {
      d.npc.talking = false;
      this.dialogState = null;
      this.hud.dialog(null);
      this.player.setState('free');
      return;
    }
    this.showLine();
  }

  openChest() {
    this.chestOpened = true;
    const p = this.player;
    p.setState('talk');
    p.faceTowards(Math.atan2(PLACES.chest.x - p.pos.x, PLACES.chest.z - p.pos.z), 1, 100);
    p.char.play('Chest_Open', { once: true, restart: true, onDone: () => {
      p.setState('free');
      this.quests.data.sword.found = true;
      this.quests.refresh();
      this.audio.chime();
      this.hud.toast('Nhận được <b>Bích Thủy kiếm</b><br><span style="font-size:15px">Mang về cho Lâm Uyển Nhi ở đình ven hồ</span>', 5);
    } });
    this.chest.rotation.x = 0; // nắp rương (model gộp) — rung nhẹ cho có cảm giác
    this.fx.burst(this.chest.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xffe2a0, 40);
  }

  update(dt, time) {
    const input = this.input;
    if (!this.running || this.paused) {
      // màn hình tiêu đề: camera bay chậm quanh trấn
      if (!this.running) {
        const a = time * 0.04;
        this.camera.position.set(PLACES.square.x + Math.sin(a) * 70, 30, PLACES.square.z + Math.cos(a) * 70);
        this.camera.lookAt(PLACES.square.x, 6, PLACES.square.z - 10);
        this.updateSun(this.camera.position);
        this.grass.update(PLACES.square.x, PLACES.square.z, time);
      }
      return;
    }

    if (input.pressed('KeyV')) { this.camRig.toggleMode(); this.hud.toast(this.camRig.mode === 'third' ? 'Góc nhìn sau lưng' : 'Góc nhìn từ trên cao', 1.2); }
    if (input.pressed('Tab')) { this.journalOpen = !this.journalOpen; this.hud.journal(this.journalOpen, this.quests.journal()); }

    // tương tác
    if (this.dialogState) {
      if (input.pressed('KeyE') || input.pressed('Space') || input.pressed('Mouse0')) this.advanceDialog();
      this.hud.prompt(null);
    } else if (!this.player.dead) {
      const it = this.nearestInteract();
      this.hud.prompt(it?.label);
      if (it && input.pressed('KeyE') && this.player.state === 'free') {
        if (it.kind === 'npc') this.startDialog(it.npc);
        else if (it.kind === 'chest') this.openChest();
      }
    }

    // hit-stop: khựng hình ngắn khi chém trúng cho đã tay
    let adt = dt;
    if (this.combat.hitStop > 0) { this.combat.hitStop -= dt; adt = dt * 0.08; }

    const swallow = this.dialogState ? { ...input, pressed: () => false, held: () => false, mouseDX: input.mouseDX, mouseDY: input.mouseDY, wheel: input.wheel } : input;
    this.player.update(adt, swallow, this.camRig);
    const pp = this.player.pos;
    const actors = [this.player];
    for (const e of this.enemies) {
      if (e.pos.distanceTo(pp) < 140 || e.alerted) { e.update(adt); actors.push(e); }
    }
    for (const n of this.npcs) {
      if (n.pos.distanceTo(pp) < 120) { n.update(adt); actors.push(n); }
    }
    for (const a of actors) if (!a.dead) a.separate(actors);
    this.combat.update(adt);
    this.fx.update(dt);
    this.camRig.update(dt, pp, input);
    this.updateSun(pp);
    this.grass.update(pp.x, pp.z, time);
    this.hud.update(dt);
  }

  updateSun(center) {
    const c = new THREE.Vector3(Math.round(center.x / 4) * 4, 0, Math.round(center.z / 4) * 4);
    c.y = this.terrain.heightAt(c.x, c.z);
    this.sun.position.copy(c).addScaledVector(this.sunDir, 150);
    this.sun.target.position.copy(c);
  }
}
