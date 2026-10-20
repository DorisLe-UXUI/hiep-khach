import { PLACES } from '../world/layout.js';

/**
 * Các hệ thống "xã hội" làm bản chơi đơn:
 * tổ đội (đồng đội máy), sư đồ, gia viên, đấu giá, chiến trường phe phái, con cái.
 */
export const RECRUITS = [
  { id: 'tieuhoa', name: 'Tiểu Hoả', han: '小火', cls: 'Đao khách', model: 'barbarian', weapon: 'axe', ranged: false, hp: 420, atk: 22, price: 120, color: 0xffa040 },
  { id: 'baclang', name: 'Bạch Lang', han: '白狼', cls: 'Kiếm khách', model: 'knight', weapon: 'sword', ranged: false, hp: 380, atk: 24, price: 150, color: 0xbfe8ff },
  { id: 'lamtuyet', name: 'Lam Tuyết', han: '藍雪', cls: 'Cung thủ', model: 'ranger', weapon: 'bow', ranged: true, hp: 300, atk: 20, price: 140, color: 0xffe6a0 },
  { id: 'huyenco', name: 'Huyền Cơ', han: '玄機', cls: 'Pháp sư', model: 'mage', weapon: 'staff', ranged: true, hp: 280, atk: 26, price: 180, color: 0xb7a8ff },
  { id: 'anhanh', name: 'Ảnh Ảnh', han: '影影', cls: 'Thích khách', model: 'rogue_hooded', weapon: 'dagger', ranged: false, hp: 320, atk: 28, price: 200, color: 0x9fe8c8 },
];

export const MASTER_TASKS = [
  { id: 'm_kill', text: 'Hạ 15 quái vật bất kỳ', stat: 'kills', goal: 15, reward: { points: 1, gold: 60 } },
  { id: 'm_fish', text: 'Câu được 3 con cá', item: 'fish', goal: 3, reward: { exp: 200, qipill: 1 } },
  { id: 'm_ore', text: 'Khai thác 4 Huyền thiết khoáng', item: 'ore', goal: 4, reward: { points: 1 } },
  { id: 'm_herb', text: 'Hái 3 Linh chi thảo', item: 'herb', goal: 3, reward: { exp: 150, potion: 2 } },
];

export const HOUSE_LEVELS = [
  { lv: 1, name: 'Mao ốc', han: '茅屋', need: {}, buff: 'Nghỉ ngơi hồi đầy khí huyết.' },
  { lv: 2, name: 'Mộc ốc', han: '木屋', need: { wood: 6, gold: 100 }, buff: 'Kinh nghiệm +5%.' },
  { lv: 3, name: 'Thanh ngõa trạch', han: '青瓦宅', need: { wood: 12, ore: 6, gold: 300 }, buff: 'Kinh nghiệm +10%, nội lực hồi nhanh hơn.' },
  { lv: 4, name: 'Đình viện', han: '庭院', need: { wood: 20, ore: 12, jade_ore: 3, gold: 800 }, buff: 'Kinh nghiệm +15%, công +5%.' },
  { lv: 5, name: 'Thế gia phủ đệ', han: '世家府第', need: { wood: 30, ore: 20, jade_ore: 8, gold: 2000 }, buff: 'Kinh nghiệm +20%, công +10%, khí huyết +10%.' },
];

const AUCTION_POOL = [
  { id: 'dao', base: 220 }, { id: 'silk', base: 260 }, { id: 'steel_sword', base: 120 }, { id: 'charm', base: 90 },
  { id: 'qipill', base: 18, n: 5 }, { id: 'potion', base: 14, n: 8 }, { id: 'jade_ore', base: 30, n: 3 }, { id: 'goldfish', base: 60 },
];
const BIDDERS = ['Hạo Thiên', 'Minh Nguyệt', 'Băng Tuyết', 'Vô Danh', 'Thiết Thủ', 'Lãnh Nguyệt', 'A Phúc', 'Đại Hộ Họ Tiền'];

export class Social {
  constructor(g) { this.g = g; this.auction = null; }
  get s() { return this.g.sys.s; }

  // ─── tổ đội ───
  party() { return this.s.party || []; }
  async recruit(id) {
    const r = RECRUITS.find((x) => x.id === id);
    const party = this.party();
    if (!r || party.includes(id) || party.length >= 3 || this.g.rpg.gold < r.price) return false;
    this.g.rpg.gold -= r.price;
    this.s.party = [...party, id];
    await this.g.spawnAllies();
    this.g.mhud?.log('team', `<b class="cy">${r.name}</b> gia nhập tổ đội!`);
    return true;
  }
  async dismiss(id) {
    this.s.party = this.party().filter((x) => x !== id);
    await this.g.spawnAllies();
  }

  // ─── sư đồ ───
  apprentice() {
    this.s.master = { since: Date.now(), done: [], base: {} };
    this.snapshotTask();
    this.g.toast('<span class="han">拜師</span> Bái <b>Huyền Cơ Tử</b> làm sư phụ', 4);
  }
  snapshotTask() {
    const m = this.s.master;
    const t = this.masterTask();
    if (t) m.base[t.id] = t.stat ? this.g.sys.s.stats[t.stat] || 0 : 0;
  }
  masterTask() { const m = this.s.master; return m && MASTER_TASKS.find((t) => !m.done.includes(t.id)); }
  masterProgress(t) {
    const m = this.s.master;
    if (t.stat) return Math.min(t.goal, (this.g.sys.s.stats[t.stat] || 0) - (m.base[t.id] || 0));
    return Math.min(t.goal, this.g.rpg.bag[t.item] || 0);
  }
  submitMasterTask() {
    const t = this.masterTask();
    if (!t || this.masterProgress(t) < t.goal) return null;
    if (t.item) this.g.rpg.remove(t.item, t.goal);
    this.s.master.done.push(t.id);
    const r = this.g.sys.give(t.reward);
    if (!this.masterTask()) this.g.toast('Xuất sư! Danh hiệu <b>Chân truyền đệ tử</b>', 4);
    this.snapshotTask();
    return r;
  }

  // ─── gia viên ───
  houseLv() { return this.s.house || 1; }
  upgradeHouse() {
    const next = HOUSE_LEVELS[this.houseLv()];
    if (!next) return false;
    const r = this.g.rpg;
    for (const [k, n] of Object.entries(next.need)) if ((k === 'gold' ? r.gold : r.bag[k] || 0) < n) return false;
    for (const [k, n] of Object.entries(next.need)) { if (k === 'gold') r.gold -= n; else r.remove(k, n); }
    this.s.house = next.lv;
    this.g.audio.levelUp();
    this.g.decorateHouse?.();
    return true;
  }
  expBonus() { return [0, 0, 0.05, 0.1, 0.15, 0.2][this.houseLv()] || 0; }

  // ─── đấu giá ───
  openAuction() {
    if (this.auction && this.auction.end > Date.now()) return this.auction;
    const pick = [...AUCTION_POOL].sort(() => Math.random() - 0.5).slice(0, 5);
    this.auction = {
      end: Date.now() + 90000,
      lots: pick.map((p) => ({ ...p, n: p.n || 1, bid: p.base, by: BIDDERS[Math.floor(Math.random() * BIDDERS.length)], mine: false, closed: false })),
    };
    return this.auction;
  }
  bid(i) {
    const lot = this.auction?.lots[i];
    if (!lot || lot.closed) return false;
    const next = Math.ceil(lot.bid * 1.12) + 2;
    if (this.g.rpg.gold < next) return false;
    lot.bid = next; lot.by = this.g.profile.name; lot.mine = true;
    this.g.audio.coin();
    return true;
  }
  tickAuction(dt) {
    const a = this.auction;
    if (!a) return;
    for (const lot of a.lots) {
      if (lot.closed) continue;
      // người mua ảo trả giá ngẫu nhiên, càng gần hết giờ càng gắt
      if (Math.random() < dt * 0.12 && lot.bid < lot.base * 2.4) {
        lot.bid = Math.ceil(lot.bid * (1.05 + Math.random() * 0.1));
        lot.by = BIDDERS[Math.floor(Math.random() * BIDDERS.length)];
        lot.mine = false;
      }
    }
    if (Date.now() > a.end) {
      for (const lot of a.lots) {
        if (lot.closed) continue;
        lot.closed = true;
        if (lot.mine && this.g.rpg.gold >= lot.bid) {
          this.g.rpg.gold -= lot.bid;
          this.g.sys.give({ [lot.id]: lot.n });
          this.g.mhud?.log('system', `Đấu giá thành công: <b class="cp">${lot.id}</b> giá ${lot.bid} lượng`);
        }
      }
      this.auction = null;
    }
  }

  // ─── chiến trường ───
  battlefield() {
    return { x: 105, z: 150, name: 'Thanh Phong chiến trường', han: '清風戰場' };
  }

  // ─── con cái ───
  canHaveChild() { return this.s.married && !this.s.child; }
  adoptChild(name) {
    this.s.child = { name: name || 'Tiểu Bảo', lv: 1, exp: 0, bond: 0, born: Date.now() };
    this.g.spawnChild?.();
  }
  careChild(kind) {
    const c = this.s.child;
    if (!c) return null;
    const cost = { feed: ['fish', 1], study: ['gold', 30], play: null }[kind];
    if (cost) {
      const [k, n] = cost;
      if (k === 'gold') { if (this.g.rpg.gold < n) return null; this.g.rpg.gold -= n; } else if (!this.g.rpg.remove(k, n)) return null;
    }
    c.exp += kind === 'study' ? 30 : 15;
    c.bond = Math.min(100, c.bond + (kind === 'play' ? 8 : 4));
    while (c.exp >= c.lv * 60) { c.exp -= c.lv * 60; c.lv++; }
    return c;
  }
}

export { PLACES };
