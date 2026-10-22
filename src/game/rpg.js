/**
 * Hệ thống nhập vai: cảnh giới (cấp), kinh nghiệm, lượng bạc, hành trang, trang bị, võ học.
 */
export const REALMS = ['Sơ nhập giang hồ', 'Tam lưu cao thủ', 'Nhị lưu cao thủ', 'Nhất lưu cao thủ', 'Tuyệt đỉnh cao thủ', 'Tông sư'];
export const realmOf = (lv) => REALMS[Math.min(REALMS.length - 1, Math.floor((lv - 1) / 3))];
export const expNeed = (lv) => Math.round(70 * Math.pow(lv, 1.55));

/** Danh mục vật phẩm. slot: weapon | armor | trinket; use: hàm khi dùng. */
import { LIFE_ITEMS } from './life.js';
import { LOOT_ITEMS, BUFF_NAME } from './loot.js';

export const ITEMS = {
  potion: { name: 'Kim sang dược', han: '金創藥', icon: 'potion', type: 'consumable', price: 20, desc: 'Hồi 45% khí huyết. Phím R.' },
  qipill: { name: 'Hồi khí đan', han: '回氣丹', icon: 'flask', type: 'consumable', price: 25, desc: 'Hồi 60% nội lực.' },
  herb: { name: 'Linh chi thảo', han: '靈芝草', icon: 'herb', type: 'material', price: 12, sell: 8, desc: 'Thảo dược quý mọc trong rừng. Có thể bán hoặc dùng để hồi 20 khí huyết.' },
  tame_charm: { name: 'Ngự thú phù', han: '御獸符', icon: 'scroll', type: 'material', price: 30, sell: 5, desc: 'Bùa thu phục thú hoang. Đánh thú còn dưới 35% khí huyết rồi đến gần bấm E.' },
  beast_pill: { name: 'Linh thú đan', han: '靈獸丹', icon: 'flask', type: 'material', price: 45, sell: 8, desc: 'Cho linh thú ăn: +120 kinh nghiệm linh thú.' },
  fodder: { name: 'Thảo liệu', han: '草料', icon: 'herb', type: 'material', price: 12, sell: 3, desc: 'Cỏ khô cho thú cưỡi: +90 kinh nghiệm thú cưỡi.' },
  essence: { name: 'Tinh thạch', han: '精石', icon: 'nugget', type: 'material', sell: 3, desc: 'Phân giải trang bị mà có. Dùng để cường hoá và tẩy luyện trang bị.' },
  bounty: { name: 'Lệnh bài sơn tặc', han: '賊令', icon: 'skull', type: 'material', sell: 15, desc: 'Lệnh bài thu được từ sơn tặc. Bán cho chưởng quỹ lấy bạc.' },
  // vũ khí
  iron_sword: { name: 'Thiết kiếm', han: '鐵劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 0, model: 'sword', price: 0, desc: 'Thanh kiếm sắt sư phụ để lại. Bình thường nhưng bền bỉ.' },
  steel_sword: { name: 'Thanh Cương kiếm', han: '青鋼劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 7, model: 'sword', price: 160, desc: 'Kiếm thép xanh rèn ở Giang Nam. Công +7.' },
  dao: { name: 'Huyền Thiết đao', han: '玄鐵刀', icon: 'battle', type: 'equip', slot: 'weapon', atk: 11, model: 'saber', price: 280, desc: 'Đao nặng, chém mạnh. Công +11.' },
  bishui: { name: 'Bích Thủy kiếm', han: '碧水劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 16, crit: 0.06, model: 'sword', tint: 0x7fd0c0, desc: 'Kiếm báu của Lâm Thiên Hải, sáng trong như nước hồ. Công +16, bạo kích +6%.' },
  // y phục
  cloth: { name: 'Bố y', han: '布衣', icon: 'robe', type: 'equip', slot: 'armor', hp: 0, def: 0, price: 0, desc: 'Áo vải giang hồ.' },
  leather: { name: 'Bì giáp', han: '皮甲', icon: 'shield', type: 'equip', slot: 'armor', hp: 35, def: 0.06, price: 130, desc: 'Giáp da thuộc. Khí huyết +35, giảm sát thương 6%.' },
  silk: { name: 'Huyền Tơ y', han: '玄絲衣', icon: 'robe', type: 'equip', slot: 'armor', hp: 70, def: 0.12, price: 320, desc: 'Áo dệt từ tơ tằm núi, đao kiếm khó xuyên. Khí huyết +70, giảm sát thương 12%.' },
  // bội sức
  charm: { name: 'Hộ thân phù', han: '護身符', icon: 'scroll', type: 'equip', slot: 'trinket', mp: 25, price: 110, desc: 'Bùa bình an của chùa trên núi. Nội lực +25.' },
  jade: { name: 'Ngọc bội Thanh Phong', han: '清風玉佩', icon: 'lotus', type: 'equip', slot: 'trinket', mp: 15, crit: 0.08, desc: 'Nửa miếng ngọc bội của sư phụ. Nội lực +15, bạo kích +8%.' },
};

Object.assign(ITEMS, LIFE_ITEMS, GEM_ITEMS, LOOT_ITEMS);

export const SKILLS = {
  sword: { name: 'Thanh Phong kiếm pháp', han: '清風劍法', icon: 'sword', max: 5, desc: (l) => `Sát thương đòn kiếm +${l * 10}%.` },
  dash: { name: 'Lướt Kiếm', han: '流影劍', icon: 'dash', max: 5, desc: (l) => `Sát thương +${l * 15}%, hồi chiêu -${l * 0.3}s.` },
  palm: { name: 'Chưởng Phong', han: '掌風', icon: 'palm', max: 5, desc: (l) => `Sát thương +${l * 18}%, tốn ít hơn ${l * 2} nội lực.` },
  qinggong: { name: 'Khinh công', han: '輕功', icon: 'cloud', max: 3, desc: (l) => `Nhảy cao hơn ${l * 10}%, lượn tốn ít nội lực hơn.` },
  guard: { name: 'Hộ thể thần công', han: '護體神功', icon: 'shield', max: 5, desc: (l) => `Giảm thêm ${l * 4}% sát thương nhận vào.` },
};

import { makeGear, RARITY, gearScore, GEM_ITEMS, parseGem, gemValue, gemId, socketsOf, GEM_MAX } from './gear.js';
import { TITLES } from './titles.js';

export class RPG {
  constructor(game) {
    this.g = game;
    this.level = 1;
    this.exp = 0;
    this.gold = 30;
    this.points = 0;
    this.bag = { potion: 3, herb: 0 };
    this.equip = { weapon: 'iron_sword', armor: 'cloth', trinket: 'jade' };
    this.owned = new Set(['iron_sword', 'cloth', 'jade']);
    this.skills = { sword: 0, dash: 0, palm: 0, qinggong: 0, guard: 0 };
    this.enh = {};
    this.gear = {}; // trang bị ngẫu nhiên đang mặc: slot → món
    this.gearBag = [];
    this.title = 'newbie';
  }

  get potions() { return this.bag.potion || 0; }

  // ───── chỉ số tổng hợp ─────
  stat(key) {
    let v = 0;
    for (const s of Object.values(this.equip)) v += ITEMS[s]?.[key] || 0;
    for (const it of Object.values(this.gear)) {
      if (!it) continue;
      v += (it.stats[key] || 0) * (1 + it.enh * 0.08);
      for (const gid of it.gems || []) { const gm = parseGem(gid); if (gm?.type === key) v += gemValue(gm.type, gm.lv); }
    }
    v += this.g.meridian?.stat(key) || 0;
    v += TITLES.find((t) => t.id === this.title)?.stats[key] || 0;
    const b = this.buffs?.[key];
    if (b && b.until > performance.now()) v += b.val;
    return key === 'atk' || key === 'hp' || key === 'mp' ? Math.round(v) : v;
  }

  baseHp() { return 200 + (this.level - 1) * 22; }
  baseMp() { return 90 + (this.level - 1) * 8; }
  atk() { return Math.round((this.g.sys?.buff('atk') ? 1.05 : 1) * (1 + (this.g.beasts?.bonus('atkMul') || 0)) * this.atkRaw()); }
  atkRaw() { return 18 + (this.level - 1) * 2 + this.stat('atk') + (this.g.beasts?.bonus('atk') || 0) + (this.enh?.[this.equip.weapon] || 0) * 3 + (this.g.player?.attackBonus || 0); }
  crit() { return 0.08 + this.stat('crit') + (this.g.beasts?.bonus('crit') || 0); }
  def() { return Math.min(0.65, this.stat('def') + this.skills.guard * 0.04 + (this.g.beasts?.bonus('def') || 0)); }

  /** Áp chỉ số vào người chơi (khi lên cấp, đổi trang bị, tải game). */
  apply(heal = false) {
    const p = this.g.player;
    if (!p) return;
    const bonusHp = p.storyHp || 0, bonusMp = p.storyMp || 0;
    p.maxHp = Math.round((this.baseHp() + this.stat('hp') + bonusHp) * (this.g.sys?.buff('hp') ? 1.08 : 1) * (1 + (this.g.beasts?.bonus('hpMul') || 0)));
    p.maxMp = this.baseMp() + this.stat('mp') + bonusMp;
    if (heal) { p.hp = p.maxHp; p.mp = p.maxMp; }
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
  }

  gainExp(n) {
    n = Math.round(n * (1 + (this.g.social?.expBonus() || 0)));
    this.exp += n;
    this.zhenqi = (this.zhenqi || 0) + Math.ceil(n * 0.35);
    let up = false;
    while (this.exp >= expNeed(this.level)) {
      this.exp -= expNeed(this.level);
      this.level++;
      this.points++;
      up = true;
    }
    if (up) {
      this.apply(true);
      const g = this.g;
      g.audio.levelUp();
      g.fx.levelUp(g.player.pos.clone());
      g.vfx.pillar(g.player.pos.clone(), 0xffd27a, 7);
      g.mhud?.log('system', `Chúc mừng <b class="cy">${g.profile.name}</b> đột phá lên <b class="cg">cấp ${this.level}</b>!`);
      g.toast(`<span class="han">突破</span> Đột phá! <b>Cấp ${this.level}</b><br><span class="sm">${realmOf(this.level)} · +1 điểm võ học (phím K)</span>`, 5);
    }
  }

  addGold(n) { this.gold += n; }

  add(id, n = 1) { this.bag[id] = (this.bag[id] || 0) + n; }

  remove(id, n = 1) {
    if ((this.bag[id] || 0) < n) return false;
    this.bag[id] -= n;
    return true;
  }

  /** Dùng vật phẩm tiêu hao. */
  use(id) {
    const p = this.g.player;
    if (!this.bag[id]) return false;
    if (id === 'potion') {
      if (p.hp >= p.maxHp) return false;
      this.remove('potion');
      p.heal(p.maxHp * 0.45);
    } else if (id === 'qipill') {
      this.remove('qipill');
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.6);
      this.g.fx.burst(p.pos.clone().setY(p.pos.y + 1), 0x8fc8ff, 30);
    } else if (id === 'grilled') {
      this.remove('grilled');
      p.heal(p.maxHp * 0.3);
      p.mp = Math.min(p.maxMp, p.mp + p.maxMp * 0.3);
    } else if (ITEMS[id]?.food) {
      const f = ITEMS[id].food;
      if (!f.buff && (!f.hp || p.hp >= p.maxHp) && (!f.mp || p.mp >= p.maxMp)) return false;
      this.remove(id);
      if (f.hp) p.heal(p.maxHp * f.hp);
      if (f.mp) p.mp = Math.min(p.maxMp, p.mp + p.maxMp * f.mp);
      if (f.buff) {
        const [k, val, dur] = f.buff;
        (this.buffs ??= {})[k] = { val, until: performance.now() + dur * 1000 };
        this.g.toast?.(`${ITEMS[id].name}: <b>${BUFF_NAME[k]} +${k === 'atk' ? val : Math.round(val * 100) + '%'}</b> trong ${dur} giây`, 2);
      }
      this.g.fx?.burst(p.pos.clone().setY(p.pos.y + 1), f.buff ? 0xffc04a : 0x9aff8a, 18);
    } else if (id === 'herb') {
      this.remove('herb');
      p.heal(20);
    } else return false;
    return true;
  }

  giveEquip(id) {
    this.owned.add(id);
    this.g.toast(`Nhận <b>${ITEMS[id].name}</b> <span class="han">${ITEMS[id].han}</span>`);
  }

  equipItem(id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'equip' || !this.owned.has(id)) return;
    this.equip[it.slot] = id;
    this.apply();
    // binh khí ngoại hình người chơi đã chọn được giữ nguyên; chỉ Kiếm Khách để mặc định mới đổi theo kiếm đang trang bị
    const h = this.g.profile.hero;
    if (it.slot === 'weapon' && h.cls === 'kiem' && !h.weapon) this.g.player.char.swapWeapon(it.model, it.tint);
    this.g.audio.clang();
  }

  upgrade(skill) {
    const s = SKILLS[skill];
    if (!s || this.points <= 0 || this.skills[skill] >= s.max) return false;
    this.points--;
    this.skills[skill]++;
    this.g.audio.chime();
    return true;
  }

  buy(id) {
    const it = ITEMS[id];
    if (!it || this.gold < it.price) return false;
    if (it.type === 'equip' && this.owned.has(id)) return false;
    this.gold -= it.price;
    if (it.type === 'equip') this.owned.add(id); else this.add(id);
    this.g.audio.coin();
    return true;
  }

  sell(id) {
    const it = ITEMS[id];
    if (!it?.sell || !this.remove(id)) return false;
    this.gold += it.sell;
    this.g.audio.coin();
    return true;
  }

  // ───── trang bị ngẫu nhiên ─────
  addGear(it) {
    if (this.gearBag.length >= 60) { this.essence(it); return false; }
    this.gearBag.push(it);
    if (it.rarity >= 4) { const st = this.g.sys.s.stats; st.legend = (st.legend || 0) + 1; }
    return true;
  }
  equipGear(uid) {
    const i = this.gearBag.findIndex((x) => x.uid === uid);
    if (i < 0) return;
    const it = this.gearBag.splice(i, 1)[0];
    if (this.gear[it.slot]) this.gearBag.push(this.gear[it.slot]);
    this.gear[it.slot] = it;
    this.apply();
    this.g.audio.clang();
  }
  unequipGear(slot) {
    if (!this.gear[slot] || this.gearBag.length >= 60) return;
    this.gearBag.push(this.gear[slot]);
    delete this.gear[slot];
    this.apply();
  }
  essence(it) {
    const n = Math.round([1, 2, 5, 12, 30][it.rarity] * (1 + it.lv / 10));
    this.add('essence', n);
    return n;
  }
  salvage(uid) {
    const i = this.gearBag.findIndex((x) => x.uid === uid);
    if (i < 0) return 0;
    return this.essence(this.gearBag.splice(i, 1)[0]);
  }
  salvageBelow(rarity) {
    let n = 0;
    this.gearBag = this.gearBag.filter((it) => { if (it.rarity < rarity) { n += this.essence(it); return false; } return true; });
    return n;
  }
  reforgeCost(it) { return 6 * (it.rarity + 1); }
  /** Tẩy luyện: đổ lại thuộc tính phụ, giữ phẩm cấp và cường hoá */
  reforge(it) {
    const c = this.reforgeCost(it);
    if (!this.remove('essence', c)) return false;
    const nu = makeGear(it.slot, it.lv, it.rarity);
    it.stats = nu.stats;
    this.apply();
    return true;
  }
  gearEnhCost(it) { return { essence: 4 + it.enh * 3, gold: 30 + it.enh * 25 }; }
  /** Cường hoá trang bị: tỉ lệ thành công giảm dần, thất bại không mất cấp */
  enhanceGear(it) {
    const c = this.gearEnhCost(it);
    if (it.enh >= 15 || this.gold < c.gold || (this.bag.essence || 0) < c.essence) return null;
    this.gold -= c.gold; this.remove('essence', c.essence);
    const ok = Math.random() < Math.max(0.25, 1 - it.enh * 0.06);
    if (ok) it.enh++;
    this.apply();
    return ok;
  }
  rarityOf(it) { return RARITY[it.rarity]; }

  // ───── khảm ngọc ─────
  socket(it, gid) {
    it.gems ??= [];
    if (it.gems.length >= socketsOf(it) || !this.remove(gid)) return false;
    it.gems.push(gid);
    this.apply();
    return true;
  }
  unsocket(it, i) {
    const gid = it.gems?.[i];
    if (!gid || this.gold < 20) return false;
    this.gold -= 20;
    it.gems.splice(i, 1);
    this.add(gid);
    this.apply();
    return true;
  }
  /** Hợp thành: 3 viên cấp L → 1 viên cấp L+1 */
  combineGem(gid) {
    const gm = parseGem(gid);
    if (!gm || gm.lv >= GEM_MAX || (this.bag[gid] || 0) < 3 || this.gold < 15 * gm.lv) return false;
    this.gold -= 15 * gm.lv;
    this.remove(gid, 3);
    this.add(gemId(gm.type, gm.lv + 1));
    return true;
  }

  toJSON() {
    return { level: this.level, exp: this.exp, gold: this.gold, points: this.points, bag: this.bag, equip: this.equip, owned: [...this.owned], skills: this.skills, enh: this.enh || {}, gear: this.gear, gearBag: this.gearBag, title: this.title, zhenqi: this.zhenqi || 0, meridians: this.meridians, meridianLuck: this.meridianLuck || 0 };
  }

  load(d) {
    if (!d) return;
    Object.assign(this, { level: d.level, exp: d.exp, gold: d.gold, points: d.points, bag: { ...d.bag }, equip: { ...d.equip }, skills: { ...this.skills, ...d.skills } });
    this.owned = new Set(d.owned);
    this.enh = { ...(d.enh || {}) };
    this.gear = { ...(d.gear || {}) };
    this.gearBag = [...(d.gearBag || [])];
    this.title = d.title || 'newbie';
    this.zhenqi = d.zhenqi || 0;
    this.meridians = d.meridians || null;
    this.meridianLuck = d.meridianLuck || 0;
  }
}
