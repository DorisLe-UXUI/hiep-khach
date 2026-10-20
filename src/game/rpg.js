/**
 * Hệ thống nhập vai: cảnh giới (cấp), kinh nghiệm, lượng bạc, hành trang, trang bị, võ học.
 */
export const REALMS = ['Sơ nhập giang hồ', 'Tam lưu cao thủ', 'Nhị lưu cao thủ', 'Nhất lưu cao thủ', 'Tuyệt đỉnh cao thủ', 'Tông sư'];
export const realmOf = (lv) => REALMS[Math.min(REALMS.length - 1, Math.floor((lv - 1) / 3))];
export const expNeed = (lv) => Math.round(70 * Math.pow(lv, 1.55));

/** Danh mục vật phẩm. slot: weapon | armor | trinket; use: hàm khi dùng. */
export const ITEMS = {
  potion: { name: 'Kim sang dược', han: '金創藥', icon: 'potion', type: 'consumable', price: 20, desc: 'Hồi 45% khí huyết. Phím R.' },
  qipill: { name: 'Hồi khí đan', han: '回氣丹', icon: 'qi', type: 'consumable', price: 25, desc: 'Hồi 60% nội lực.' },
  herb: { name: 'Linh chi thảo', han: '靈芝草', icon: 'lotus', type: 'material', price: 12, sell: 8, desc: 'Thảo dược quý mọc trong rừng. Có thể bán hoặc dùng để hồi 20 khí huyết.' },
  bounty: { name: 'Lệnh bài sơn tặc', han: '賊令', icon: 'skull', type: 'material', sell: 15, desc: 'Lệnh bài thu được từ sơn tặc. Bán cho chưởng quỹ lấy bạc.' },
  // vũ khí
  iron_sword: { name: 'Thiết kiếm', han: '鐵劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 0, model: 'sword', price: 0, desc: 'Thanh kiếm sắt sư phụ để lại. Bình thường nhưng bền bỉ.' },
  steel_sword: { name: 'Thanh Cương kiếm', han: '青鋼劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 7, model: 'sword', price: 160, desc: 'Kiếm thép xanh rèn ở Giang Nam. Công +7.' },
  dao: { name: 'Huyền Thiết đao', han: '玄鐵刀', icon: 'sword', type: 'equip', slot: 'weapon', atk: 11, model: 'saber', price: 280, desc: 'Đao nặng, chém mạnh. Công +11.' },
  bishui: { name: 'Bích Thủy kiếm', han: '碧水劍', icon: 'sword', type: 'equip', slot: 'weapon', atk: 16, crit: 0.06, model: 'sword', tint: 0x7fd0c0, desc: 'Kiếm báu của Lâm Thiên Hải, sáng trong như nước hồ. Công +16, bạo kích +6%.' },
  // y phục
  cloth: { name: 'Bố y', han: '布衣', icon: 'user', type: 'equip', slot: 'armor', hp: 0, def: 0, price: 0, desc: 'Áo vải giang hồ.' },
  leather: { name: 'Bì giáp', han: '皮甲', icon: 'shield', type: 'equip', slot: 'armor', hp: 35, def: 0.06, price: 130, desc: 'Giáp da thuộc. Khí huyết +35, giảm sát thương 6%.' },
  silk: { name: 'Huyền Tơ y', han: '玄絲衣', icon: 'shield', type: 'equip', slot: 'armor', hp: 70, def: 0.12, price: 320, desc: 'Áo dệt từ tơ tằm núi, đao kiếm khó xuyên. Khí huyết +70, giảm sát thương 12%.' },
  // bội sức
  charm: { name: 'Hộ thân phù', han: '護身符', icon: 'scroll', type: 'equip', slot: 'trinket', mp: 25, price: 110, desc: 'Bùa bình an của chùa trên núi. Nội lực +25.' },
  jade: { name: 'Ngọc bội Thanh Phong', han: '清風玉佩', icon: 'lotus', type: 'equip', slot: 'trinket', mp: 15, crit: 0.08, desc: 'Nửa miếng ngọc bội của sư phụ. Nội lực +15, bạo kích +8%.' },
};

export const SKILLS = {
  sword: { name: 'Thanh Phong kiếm pháp', han: '清風劍法', icon: 'sword', max: 5, desc: (l) => `Sát thương đòn kiếm +${l * 10}%.` },
  dash: { name: 'Lướt Kiếm', han: '流影劍', icon: 'dash', max: 5, desc: (l) => `Sát thương +${l * 15}%, hồi chiêu -${l * 0.3}s.` },
  palm: { name: 'Chưởng Phong', han: '掌風', icon: 'palm', max: 5, desc: (l) => `Sát thương +${l * 18}%, tốn ít hơn ${l * 2} nội lực.` },
  qinggong: { name: 'Khinh công', han: '輕功', icon: 'cloud', max: 3, desc: (l) => `Nhảy cao hơn ${l * 10}%, lượn tốn ít nội lực hơn.` },
  guard: { name: 'Hộ thể thần công', han: '護體神功', icon: 'shield', max: 5, desc: (l) => `Giảm thêm ${l * 4}% sát thương nhận vào.` },
};

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
  }

  get potions() { return this.bag.potion || 0; }

  // ───── chỉ số tổng hợp ─────
  stat(key) {
    let v = 0;
    for (const s of Object.values(this.equip)) v += ITEMS[s]?.[key] || 0;
    return v;
  }

  baseHp() { return 200 + (this.level - 1) * 22; }
  baseMp() { return 90 + (this.level - 1) * 8; }
  atk() { return 18 + (this.level - 1) * 2 + this.stat('atk') + (this.enh?.[this.equip.weapon] || 0) * 3 + (this.g.player?.attackBonus || 0); }
  crit() { return 0.08 + this.stat('crit'); }
  def() { return Math.min(0.6, this.stat('def') + this.skills.guard * 0.04); }

  /** Áp chỉ số vào người chơi (khi lên cấp, đổi trang bị, tải game). */
  apply(heal = false) {
    const p = this.g.player;
    if (!p) return;
    const bonusHp = p.storyHp || 0, bonusMp = p.storyMp || 0;
    p.maxHp = this.baseHp() + this.stat('hp') + bonusHp;
    p.maxMp = this.baseMp() + this.stat('mp') + bonusMp;
    if (heal) { p.hp = p.maxHp; p.mp = p.maxMp; }
    p.hp = Math.min(p.hp, p.maxHp);
    p.mp = Math.min(p.mp, p.maxMp);
  }

  gainExp(n) {
    this.exp += n;
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
    if (it.slot === 'weapon') this.g.player.char.swapWeapon(it.model, it.tint);
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

  toJSON() {
    return { level: this.level, exp: this.exp, gold: this.gold, points: this.points, bag: this.bag, equip: this.equip, owned: [...this.owned], skills: this.skills, enh: this.enh || {} };
  }

  load(d) {
    if (!d) return;
    Object.assign(this, { level: d.level, exp: d.exp, gold: d.gold, points: d.points, bag: { ...d.bag }, equip: { ...d.equip }, skills: { ...this.skills, ...d.skills } });
    this.owned = new Set(d.owned);
    this.enh = { ...(d.enh || {}) };
  }
}
