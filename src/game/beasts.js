/**
 * Ngự thú: thú cưỡi & linh thú (model Quaternius CC0 qua poly.pizza).
 * - Thú hoang xuất hiện ở các vùng săn; đánh còn dưới 35% khí huyết rồi dùng Ngự thú phù (E) để thu phục.
 * - Thú cưỡi lên cấp theo quãng đường cưỡi (cho ăn Thảo liệu để nhanh hơn): tốc độ +2%/cấp.
 * - Linh thú lên cấp khi chủ nhân diệt quái (cho ăn Linh thú đan): đánh cùng chủ và có kỹ năng riêng.
 */
export const BEASTS = {
  horse: { name: 'Xích Diễm Câu', han: '赤焰駒', file: '/assets/beasts/horse.glb', mount: { h: 1.75, speed: 1.6 }, price: 500, desc: 'Tuấn mã vó đỏ, bền bỉ, phi nhanh.' },
  white_horse: { name: 'Bạch Long Câu', han: '白龍駒', file: '/assets/beasts/white_horse.glb', mount: { h: 1.8, speed: 1.75 }, price: 1600, desc: 'Ngựa trắng như tuyết, truyền rằng có huyết thống long mã.' },
  donkey: { name: 'Tiểu Mao Lư', han: '小毛驢', file: '/assets/beasts/donkey.glb', mount: { h: 1.45, speed: 1.3 }, wild: true, desc: 'Lừa con chậm mà chắc, thu phục ngoài đồng cỏ.' },
  deer: { name: 'Hoa Lộc', han: '花鹿', file: '/assets/beasts/deer.glb', mount: { h: 1.6, speed: 1.7 }, wild: true, passive: true, desc: 'Nai đốm nhanh nhẹn trong Rừng Nấm.' },
  stag: { name: 'Cửu Sắc Lộc', han: '九色鹿', file: '/assets/beasts/stag.glb', mount: { h: 1.95, speed: 1.85 }, wild: true, rare: true, desc: 'Hươu thần sừng lớn, hiếm gặp, chạy như gió.' },
  bull: { name: 'Thanh Ngưu', han: '青牛', file: '/assets/beasts/bull.glb', mount: { h: 1.7, speed: 1.4, def: 0.06 }, wild: true, desc: 'Trâu xanh như toạ kỵ của Lão Tử. Giảm sát thương 6% khi cưỡi.' },
  alpaca: { name: 'Vân Đà', han: '雲駝', file: '/assets/beasts/alpaca.glb', mount: { h: 1.65, speed: 1.5 }, wild: true, passive: true, desc: 'Lạc đà lông mây, hiền lành và êm ái.' },
  wolf: { name: 'Phong Lang', han: '風狼', file: '/assets/beasts/wolf.glb', mount: { h: 1.45, speed: 1.8 }, pet: { h: 0.8, atk: 1.3, skill: 'bite' }, wild: true, desc: 'Sói gió Đồi Gió. Cưỡi được, hoặc làm linh thú cắn xé kẻ địch.' },
  fox: { name: 'Hồ Ly', han: '狐狸', file: '/assets/beasts/fox.glb', pet: { h: 0.6, atk: 0.9, skill: 'charm' }, wild: true, desc: 'Hồ ly lửa tinh quái. Chủ nhân bạo kích +6%.' },
  rabbit: { name: 'Ngọc Thố', han: '玉兔', file: '/assets/beasts/rabbit.glb', pet: { h: 0.6, atk: 0.6, skill: 'heal' }, wild: true, passive: true, desc: 'Thỏ ngọc cung trăng. Mỗi 12 giây hồi 8% khí huyết cho chủ.' },
  raccoon: { name: 'Tham Tài Ly', han: '貪財狸', file: '/assets/beasts/raccoon.glb', pet: { h: 0.55, atk: 0.7, skill: 'greed' }, wild: true, passive: true, desc: 'Gấu mèo tham của. Hút đồ rơi từ xa, tăng tỉ lệ rơi trang bị.' },
  shiba_inu: { name: 'Tiểu Hoàng', han: '小黃', file: '/assets/beasts/shiba_inu.glb', pet: { h: 0.55, atk: 0.9, skill: 'loyal' }, price: 200, desc: 'Chó vàng trung thành. Hút đồ rơi, giảm sát thương 4% cho chủ.' },
  husky: { name: 'Tuyết Khuyển', han: '雪犬', file: '/assets/beasts/husky.glb', pet: { h: 0.7, atk: 1.1, skill: 'loyal' }, price: 450, desc: 'Chó tuyết Hàn Băng Cốc. Hút đồ rơi, giảm sát thương 4%.' },
  cat: { name: 'Chiêu Tài Miêu', han: '招財貓', file: '/assets/beasts/cat.glb', pet: { h: 0.45, atk: 0.7, skill: 'fortune' }, price: 350, desc: 'Mèo thần tài. Bạc nhặt được +20%.' },
  panda: { name: 'Thực Thiết Thú', han: '食鐵獸', file: '/assets/beasts/panda.glb', pet: { h: 0.9, atk: 1.2, skill: 'iron' }, price: 2500, desc: 'Gấu trúc thượng cổ, da sắt. Chủ nhân giảm sát thương 8%, khí huyết +10%.' },
  dragon: { name: 'Tiểu Xích Long', han: '小赤龍', file: '/assets/beasts/dragon.glb', pet: { h: 0.9, atk: 1.8, skill: 'breath', fly: 1.4 }, price: 6000, desc: 'Rồng con lửa đỏ. Mỗi 10 giây phun long tức thiêu cháy kẻ địch quanh chủ, công +5%.' },
};

export const SKILL_TEXT = {
  bite: 'Lang nha: cắn gây 250% sát thương mỗi 8s',
  charm: 'Mị hoặc: chủ nhân bạo kích +6%',
  heal: 'Hồi xuân: hồi 8% khí huyết cho chủ mỗi 12s',
  greed: 'Tham tài: hút đồ rơi, rơi trang bị +50%',
  loyal: 'Trung khuyển: hút đồ rơi, chủ giảm sát thương 4%',
  fortune: 'Chiêu tài: bạc nhặt được +20%',
  iron: 'Thiết bì: chủ giảm sát thương 8%, khí huyết +10%',
  breath: 'Long tức: phun lửa quanh chủ mỗi 10s, công +5%',
};

/** Thú hoang trong các vùng săn (dùng chung hệ quái vật). */
export const WILD = {
  dongco: ['donkey', 'rabbit', 'alpaca'],
  rungnam: ['deer', 'fox', 'raccoon'],
  bangho: ['raccoon', 'rabbit'],
  doigio: ['wolf', 'bull', 'stag'],
  thunglung: ['wolf'],
};

export const MAX_LV = 30;
export const expNeedBeast = (lv) => 40 + lv * lv * 12;

export class Beasts {
  constructor(g) { this.g = g; }
  get s() {
    const s = this.g.sys.s;
    if (!s.beasts) {
      // chuyển dữ liệu cũ: ngựa & cún
      s.beasts = { owned: {}, mount: null, pet: null };
      if (s.mountOwned) { s.beasts.owned.horse = { lv: 1, exp: 0 }; s.beasts.mount = 'horse'; }
      if (s.pet) { s.beasts.owned.shiba_inu = { lv: 1, exp: 0 }; s.beasts.pet = 'shiba_inu'; }
    }
    return s.beasts;
  }
  has(id) { return !!this.s.owned[id]; }
  lv(id) { return this.s.owned[id]?.lv || 0; }
  mountDef() { return BEASTS[this.s.mount]; }
  petDef() { return this.g.sys.s.petOut === false ? null : BEASTS[this.s.pet]; }

  /** Hệ số tốc độ khi cưỡi so với ngựa thường */
  mountSpeed() {
    const d = this.mountDef();
    if (!d) return 1;
    return (d.mount.speed / 1.6) * (1 + this.lv(this.s.mount) * 0.02);
  }

  /** Chỉ số cộng thêm cho chủ nhân */
  bonus(key) {
    let v = 0;
    const p = this.petDef();
    if (p) {
      const sk = p.pet.skill, plv = this.lv(this.s.pet);
      if (key === 'crit' && sk === 'charm') v += 0.06;
      if (key === 'def' && sk === 'loyal') v += 0.04;
      if (key === 'def' && sk === 'iron') v += 0.08;
      if (key === 'hpMul' && sk === 'iron') v += 0.1;
      if (key === 'atkMul' && sk === 'breath') v += 0.05;
      if (key === 'gold' && sk === 'fortune') v += 0.2;
      if (key === 'drop' && sk === 'greed') v += 0.5;
      if (key === 'magnet' && (sk === 'greed' || sk === 'loyal')) v = 1;
      if (key === 'atk') v += Math.round(plv * 0.6);
    }
    const m = this.g.companions?.riding && this.mountDef();
    if (m && key === 'def') v += m.mount.def || 0;
    return v;
  }

  add(id, silent) {
    if (this.has(id)) return false;
    this.s.owned[id] = { lv: 1, exp: 0 };
    const d = BEASTS[id];
    if (d.pet && !this.s.pet) this.s.pet = id;
    if (d.mount && !this.s.mount) this.s.mount = id;
    const st = this.g.sys.s.stats; st.beasts = Object.keys(this.s.owned).length;
    if (!silent) {
      this.g.toast(`<span class="han">${d.han}</span> Thu nhận <b>${d.name}</b>!`, 3.5);
      this.g.mhud?.announce(`<b>${this.g.profile.name}</b> đã thu phục <b>${d.name}</b> <span class="han">${d.han}</span>!`);
      this.g.audio.levelUp();
    }
    return true;
  }

  buy(id) {
    const d = BEASTS[id];
    if (!d.price || this.has(id) || this.g.rpg.gold < d.price) return false;
    this.g.rpg.gold -= d.price;
    return this.add(id);
  }

  gainExp(id, n) {
    const o = this.s.owned[id];
    if (!o || o.lv >= MAX_LV) return;
    o.exp += n;
    while (o.lv < MAX_LV && o.exp >= expNeedBeast(o.lv)) {
      o.exp -= expNeedBeast(o.lv);
      o.lv++;
      this.g.toast(`<b>${BEASTS[id].name}</b> lên cấp <b>${o.lv}</b>!`, 2);
      this.g.audio.chime();
    }
  }

  feed(id) {
    const d = BEASTS[id], r = this.g.rpg;
    const item = d.pet && (!d.mount || id === this.s.pet) ? 'beast_pill' : 'fodder';
    if (!r.remove(item)) return null;
    this.gainExp(id, item === 'beast_pill' ? 120 : 90);
    return item;
  }

  /** Thu phục thú hoang đang yếu */
  canTame(e) { return e && !e.dead && e.beast && e.hp / e.maxHp < 0.35; }
  tame(e) {
    const g = this.g, r = g.rpg;
    if (!this.canTame(e)) return;
    if (!r.remove('tame_charm')) { g.toast('Cần <b>Ngự thú phù</b> (mua ở Tạp hoá)', 2); g.audio.sfx?.('error'); return; }
    const d = BEASTS[e.beast];
    const chance = (d.rare ? 0.25 : 0.45) + (1 - e.hp / e.maxHp * 2.8) * 0.35 + (this.has(e.beast) ? 0.2 : 0);
    g.player.char.play('Spell_Simple_Shoot', { once: true, restart: true });
    g.vfx.magicCircle?.(e.pos.clone(), 0x8affc0, 2);
    if (Math.random() < chance) {
      e.tamed = true;
      e.dead = true;
      e.hp = 0;
      g.fx.burst(e.pos.clone().setY(e.pos.y + 1), 0x8affc0, 40);
      setTimeout(() => { g.scene.remove(e.root); }, 300);
      if (this.has(e.beast)) {
        this.gainExp(e.beast, 200);
        g.toast(`Đã có <b>${d.name}</b> — chuyển thành 200 kinh nghiệm thú`, 2.5);
      } else this.add(e.beast);
      const st = g.sys.s.stats; st.tamed = (st.tamed || 0) + 1;
    } else {
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.15);
      e.alerted = true;
      g.toast(`<b>${d.name}</b> giãy thoát! (tỉ lệ ${Math.round(Math.min(1, chance) * 100)}%)`, 2);
      g.audio.sfx?.('fail');
    }
  }
}
