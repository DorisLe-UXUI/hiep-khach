import * as THREE from 'three';
import { BEASTS, WILD } from './beasts.js';

/**
 * Bách quái phổ: quái vật theo khu vực, cấp độ, có hồi sinh như game online.
 * file: trong /assets/monsters ; h: chiều cao (m)
 */
export const MONSTERS = {
  // ── Blob (nhỏ, cấp thấp) ──
  lucnhay: { name: 'Lục Nhầy', han: '綠涎', file: 'blob_greenblob.glb', h: 0.9, lv: 1 },
  hongnhay: { name: 'Hồng Nhầy', han: '紅涎', file: 'blob_pinkblob.glb', h: 0.9, lv: 1 },
  ganhay: { name: 'Gai Nhầy', han: '棘涎', file: 'blob_greenspikyblob.glb', h: 1.0, lv: 2 },
  ketinh: { name: 'Kê Tinh', han: '雞精', file: 'blob_chicken.glb', h: 1.0, lv: 2 },
  chuot: { name: 'Thử Yêu', han: '鼠妖', file: 'fbx/Rat.fbx', h: 0.7, lv: 1 },
  namtinh: { name: 'Nấm Tinh', han: '菇精', file: 'blob_mushnub.glb', h: 1.0, lv: 3 },
  namyeu: { name: 'Nấm Yêu', han: '菇妖', file: 'blob_mushnub_evolved.glb', h: 1.3, lv: 4 },
  xuongrong: { name: 'Thứ Tiên Nhân', han: '刺仙人', file: 'blob_cactoro.glb', h: 1.2, lv: 4 },
  ech: { name: 'Oa Tinh', han: '蛙精', file: 'fbx/Frog.fbx', h: 0.8, lv: 3 },
  ngutinh: { name: 'Ngư Tinh', han: '魚精', file: 'blob_fish.glb', h: 1.1, lv: 5 },
  miuyeu: { name: 'Miêu Yêu', han: '貓妖', file: 'blob_cat.glb', h: 1.0, lv: 5 },
  tieunhan: { name: 'Tiểu Nhẫn Giả', han: '小忍', file: 'blob_ninja.glb', h: 1.2, lv: 7 },
  tieuman: { name: 'Tiểu Man Binh', han: '小蠻', file: 'blob_orc.glb', h: 1.2, lv: 7 },
  phapsu: { name: 'Yêu Pháp Sư', han: '妖法', file: 'blob_wizard.glb', h: 1.2, lv: 8, caster: true },
  // ── Bay ──
  giapphong: { name: 'Giáp Phong', han: '甲蜂', file: 'flying_armabee.glb', h: 1.3, lv: 5 },
  dongdoc: { name: 'Độc Phong', han: '毒蜂', file: 'fbx/Wasp.fbx', h: 0.9, lv: 4 },
  doi: { name: 'Huyết Biên Bức', han: '血蝙蝠', file: 'fbx/Bat.fbx', h: 0.9, lv: 6 },
  phonglinh: { name: 'Phong Linh', han: '風靈', file: 'flying_hywirl.glb', h: 1.4, lv: 6, caster: true },
  thuyphao: { name: 'Thủy Phao', han: '水泡', file: 'flying_glub.glb', h: 1.2, lv: 5 },
  thachlinh: { name: 'Thạch Linh', han: '石靈', file: 'flying_goleling.glb', h: 1.4, lv: 9 },
  uhon: { name: 'U Hồn', han: '幽魂', file: 'flying_ghost.glb', h: 1.5, lv: 10, caster: true },
  quydaulau: { name: 'Quỷ Đầu Lâu', han: '鬼骷', file: 'flying_ghost_skull.glb', h: 1.5, lv: 11, caster: true },
  tieulong: { name: 'Tiểu Long', han: '小龍', file: 'flying_dragon.glb', h: 1.6, lv: 10 },
  nhen: { name: 'Độc Chu', han: '毒蛛', file: 'fbx/Spider.fbx', h: 0.8, lv: 8 },
  ran: { name: 'Thanh Xà', han: '青蛇', file: 'fbx/Snake.fbx', h: 0.6, lv: 6 },
  // ── Lớn (tinh anh / boss) ──
  hauvuong: { name: 'Hầu Vương', han: '猴王', file: 'big_monkroose.glb', h: 2.4, lv: 6, elite: true },
  namvuong: { name: 'Nấm Vương', han: '菇王', file: 'big_mushroomking.glb', h: 2.6, lv: 5, elite: true },
  manthuong: { name: 'Man Tướng', han: '蠻將', file: 'big_orc.glb', h: 2.6, lv: 9, elite: true },
  cotman: { name: 'Cốt Man Vương', han: '骨蠻王', file: 'big_orc_skull.glb', h: 2.8, lv: 11, elite: true },
  hacnhan: { name: 'Hắc Nhẫn Giả', han: '黑忍', file: 'big_ninja.glb', h: 2.3, lv: 8, elite: true },
  tuyetquai: { name: 'Tuyết Quái Vương', han: '雪怪王', file: 'big_yeti.glb', h: 3.0, lv: 12, elite: true },
  xichma: { name: 'Xích Ma', han: '赤魔', file: 'big_demon.glb', h: 2.8, lv: 12, elite: true, caster: true },
  lamma: { name: 'Lam Ma', han: '藍魔', file: 'big_bluedemon.glb', h: 2.8, lv: 11, elite: true, caster: true },
  longthan: { name: 'Long Thằn', han: '龍蜥', file: 'big_dino.glb', h: 2.6, lv: 10, elite: true },
  hoalong: { name: 'Hỏa Long Vương', han: '火龍王', file: 'flying_dragon_evolved.glb', h: 4.2, lv: 14, elite: true, caster: true },
  coctinh: { name: 'Cóc Vương', han: '蛤王', file: 'big_frog.glb', h: 2.4, lv: 6, elite: true },
};

// ── Thú hoang (thu phục được) ──
const BEAST_LV = { donkey: 2, rabbit: 1, alpaca: 3, deer: 4, fox: 4, raccoon: 3, wolf: 7, bull: 7, stag: 9 };
for (const [id, lv] of Object.entries(BEAST_LV)) {
  const b = BEASTS[id];
  MONSTERS['b_' + id] = { name: b.name, han: b.han, file: b.file, h: b.mount ? b.mount.h * 0.9 : b.pet.h * 1.3, lv, beast: id, passive: !!b.passive, rare: !!b.rare };
}

/** Khu vực săn quái. */
export const ZONES = [
  { id: 'dongco', name: 'Đồng cỏ Thanh Phong', han: '清風草原', x: 70, z: 160, r: 42, n: 9, mobs: ['lucnhay', 'hongnhay', 'ketinh', 'chuot'], elite: null },
  { id: 'rungnam', name: 'Rừng Nấm', han: '蘑菇林', x: -78, z: -18, r: 40, n: 9, mobs: ['namtinh', 'namyeu', 'ganhay', 'xuongrong'], elite: 'namvuong' },
  { id: 'bangho', name: 'Bờ hồ Bích Thủy', han: '碧水湖畔', x: -112, z: 138, r: 36, n: 8, mobs: ['ech', 'ngutinh', 'thuyphao', 'ran'], elite: 'coctinh' },
  { id: 'doigio', name: 'Đồi Gió', han: '風丘', x: 150, z: 70, r: 44, n: 9, mobs: ['giapphong', 'dongdoc', 'phonglinh', 'miuyeu'], elite: 'hauvuong' },
  { id: 'thunglung', name: 'Thung lũng Yêu Ma', han: '妖魔谷', x: 150, z: -120, r: 44, n: 10, mobs: ['tieunhan', 'tieuman', 'phapsu', 'doi', 'nhen'], elite: 'manthuong' },
  { id: 'hangtuyet', name: 'Hàn Băng Cốc', han: '寒冰谷', x: -40, z: -245, r: 38, n: 9, mobs: ['thachlinh', 'uhon', 'quydaulau', 'tieulong'], elite: 'tuyetquai' },
  { id: 'hoason', name: 'Hỏa Diệm Sơn', han: '火焰山', x: 215, z: -215, r: 34, n: 6, mobs: ['xichma', 'lamma', 'longthan'], elite: 'hoalong' },
];

/** Chỉ số theo cấp. */
export function monsterStats(m) {
  const lv = m.lv, k = m.elite ? 7 : 1;
  return { hp: Math.round((45 + lv * 22) * k), dmg: Math.round((6 + lv * 2.2) * (m.elite ? 1.6 : 1)), exp: Math.round((14 + lv * 9) * (m.elite ? 6 : 1)), gold: Math.round((3 + lv * 2) * (m.elite ? 8 : 1)) };
}

/** Sinh quái quanh người chơi theo khu vực, hồi sinh sau khi chết. */
export class Spawner {
  constructor(g) {
    this.g = g;
    this.zones = ZONES.map((z) => ({ ...z, alive: [], eliteAlive: null, cool: 0, eliteCool: 0, busy: false }));
    this.t = 0;
  }

  zoneAt(x, z) { return this.zones.find((zn) => Math.hypot(x - zn.x, z - zn.z) < zn.r + 10); }

  clear() {
    for (const zn of this.zones) {
      for (const e of zn.alive) this.g.scene.remove(e.root);
      if (zn.eliteAlive) this.g.scene.remove(zn.eliteAlive.root);
      zn.alive = []; zn.eliteAlive = null;
    }
    this.g.enemies = this.g.enemies.filter((e) => !e.zone);
  }

  async update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 1;
    const g = this.g, p = g.player.pos;
    for (const zn of this.zones) {
      zn.alive = zn.alive.filter((e) => !e.dead || e.deadT < 12);
      const near = Math.hypot(p.x - zn.x, p.z - zn.z) < zn.r + 110;
      if (!near || zn.busy) continue;
      const living = zn.alive.filter((e) => !e.dead).length;
      zn.cool -= 1;
      if (living < zn.n && zn.cool <= 0) {
        zn.busy = true;
        zn.cool = living < zn.n / 2 ? 0 : 6;
        const wild = WILD[zn.id];
        let id = zn.mobs[Math.floor(Math.random() * zn.mobs.length)];
        if (wild && Math.random() < 0.28) { const b = wild[Math.floor(Math.random() * wild.length)]; if (!BEASTS[b].rare || Math.random() < 0.35) id = 'b_' + b; }
        const e = await this.spawnIn(zn, id);
        if (e) zn.alive.push(e);
        zn.busy = false;
      }
      zn.eliteCool -= 1;
      if (zn.elite && (!zn.eliteAlive || (zn.eliteAlive.dead && zn.eliteAlive.deadT > 12)) && zn.eliteCool <= 0) {
        zn.busy = true;
        zn.eliteCool = 120;
        zn.eliteAlive = await this.spawnIn(zn, zn.elite, true);
        if (zn.eliteAlive) g.mhud?.log('system', `<b class="cr">${MONSTERS[zn.elite].name}</b> xuất hiện tại <b class="cg">${zn.name}</b>!`);
        zn.busy = false;
      }
    }
  }

  async spawnIn(zn, id, center = false) {
    const g = this.g;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2, d = center ? 0 : Math.sqrt(Math.random()) * zn.r;
      const x = zn.x + Math.cos(a) * d, z = zn.z + Math.sin(a) * d;
      const h = g.terrain.heightAt(x, z);
      if (h < 0 || g.terrain.normalAt(x, z).y < 0.75) continue;
      // tránh mọc ngay cạnh người chơi
      if (Math.hypot(x - g.player.pos.x, z - g.player.pos.z) < 12) continue;
      const patrol = Array.from({ length: 3 }, () => { const b = Math.random() * Math.PI * 2, r = Math.random() * zn.r * 0.8; return [zn.x + Math.cos(b) * r, zn.z + Math.sin(b) * r]; });
      return g.spawnMonster(id, x, z, { zone: zn.id, patrol: center ? null : patrol });
    }
    return null;
  }
}

export { THREE };
