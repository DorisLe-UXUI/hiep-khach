/**
 * Các hệ thống "game online" làm bản chơi đơn:
 * nhiệm vụ ngày + thành tựu, phúc lợi điểm danh, phó bản, boss thế giới, luận kiếm (PvP với cao thủ máy),
 * bảng xếp hạng, bang hội NPC, hảo cảm/kết duyên, kỳ ngộ, chế dược, chợ, thú cưỡi, pet.
 */
import { ITEMS } from './rpg.js';
import { PLACES } from '../world/layout.js';

const today = () => new Date().toISOString().slice(0, 10);

export const DAILY = [
  { id: 'kill', name: 'Diệt trừ ác đồ', goal: 20, pts: 20, reward: { gold: 40 }, icon: 'skull' },
  { id: 'herb', name: 'Hái Linh chi thảo', goal: 5, pts: 20, reward: { qipill: 1 }, icon: 'lotus' },
  { id: 'dungeon', name: 'Hoàn thành phó bản', goal: 1, pts: 20, reward: { gold: 60 }, icon: 'book' },
  { id: 'pvp', name: 'Luận kiếm 1 trận', goal: 1, pts: 20, reward: { bounty: 2 }, icon: 'sword' },
  { id: 'enhance', name: 'Cường hoá binh khí', goal: 1, pts: 10, reward: { potion: 2 }, icon: 'star' },
  { id: 'craft', name: 'Luyện đan', goal: 2, pts: 10, reward: { gold: 30 }, icon: 'potion' },
];

export const ACTIVITY_CHESTS = [20, 40, 60, 80, 100];

export const ACHIEVEMENTS = [
  { id: 'kill50', name: 'Bách nhân trảm', desc: 'Hạ 50 kẻ địch', stat: 'kills', goal: 50, reward: { gold: 120 } },
  { id: 'kill200', name: 'Thiên nhân địch', desc: 'Hạ 200 kẻ địch', stat: 'kills', goal: 200, reward: { gold: 400 } },
  { id: 'lv5', name: 'Tam lưu cao thủ', desc: 'Đạt cấp 5', stat: 'level', goal: 5, reward: { qipill: 3 } },
  { id: 'lv10', name: 'Nhất lưu cao thủ', desc: 'Đạt cấp 10', stat: 'level', goal: 10, reward: { gold: 500 } },
  { id: 'herb20', name: 'Dược sư', desc: 'Hái 20 Linh chi thảo', stat: 'herbs', goal: 20, reward: { potion: 5 } },
  { id: 'pvp5', name: 'Luận kiếm thắng 5 trận', desc: 'Thắng 5 trận ở Luận Kiếm Đài', stat: 'pvpWins', goal: 5, reward: { gold: 300 } },
  { id: 'enh5', name: 'Thần binh', desc: 'Cường hoá binh khí lên +5', stat: 'maxEnh', goal: 5, reward: { gold: 250 } },
  { id: 'story', name: 'Thanh Phong Kiếm Ký', desc: 'Hoàn thành cốt truyện chính', stat: 'chapter', goal: 6, reward: { gold: 1000 } },
];

export const SIGNIN = [
  { gold: 50 }, { potion: 3 }, { gold: 100 }, { qipill: 3 }, { gold: 150 }, { bounty: 5 }, { gold: 300, fashion: 'kim' },
];

export const DUNGEONS = [
  { id: 'luyenvo', name: 'Luyện Võ Trường', han: '練武場', lv: 1, desc: '3 đợt sơn tặc tràn vào bãi luyện võ.', waves: [['bandit', 3], ['bandit', 4], ['bandit2', 4]], at: 'camp', reward: { gold: 80, potion: 1 }, runs: 3 },
  { id: 'mattat', name: 'Huyết Ảnh Mật Thất', han: '血影密室', lv: 4, desc: 'Sát thủ Huyết Ảnh phục kích trong rừng trúc.', waves: [['assassin', 3], ['assassin', 4], ['hanbang', 1]], at: 'bamboo', reward: { gold: 180, qipill: 2 }, runs: 2 },
  { id: 'kiemmo', name: 'Kiếm Mộ Thử Luyện', han: '劍冢試煉', lv: 7, desc: 'Hồn kiếm Kiếm Mộ thử thách kẻ dám xâm phạm.', waves: [[['skeleton', 3], ['skeletonMage', 2]], [['skeleton', 4], ['skeletonMage', 2]], ['villain', 1]], at: 'tomb', reward: { gold: 400, silk: 1 }, runs: 1 },
];

export const WORLD_BOSSES = [
  { id: 'mathon', name: 'Ma Tôn · Huyết Lang', han: '魔尊', hour: 10, hp: 3000, lv: 8 },
  { id: 'bangho', name: 'Băng Hồn Lão Quái', han: '冰魂', hour: 15, hp: 3600, lv: 10 },
  { id: 'thienma', name: 'Thiên Ma Kiếm Chủ', han: '天魔', hour: 20, hp: 4500, lv: 12 },
];

/** Cao thủ máy cho bảng xếp hạng và Luận Kiếm Đài. */
export const RIVALS = [
  { name: 'Hạo Thiên', cls: 'kiem', lv: 14, power: 18200, gender: 'male' },
  { name: 'Minh Nguyệt', cls: 'phap', lv: 13, power: 15800, gender: 'female' },
  { name: 'Băng Tuyết', cls: 'cung', lv: 11, power: 12400, gender: 'female' },
  { name: 'Vô Danh', cls: 'thuong', lv: 9, power: 9900, gender: 'male' },
  { name: 'Thiết Thủ', cls: 'kiem', lv: 7, power: 7600, gender: 'male' },
  { name: 'Lãnh Nguyệt', cls: 'dao', lv: 5, power: 5200, gender: 'female' },
  { name: 'A Phúc', cls: 'thuong', lv: 3, power: 3100, gender: 'male' },
];

export const GUILD = {
  name: 'Thanh Phong Bang', han: '清風幫',
  ranks: ['Bang chúng', 'Tinh anh', 'Đường chủ', 'Trưởng lão', 'Phó bang chủ'],
  buffs: [
    { id: 'atk', name: 'Thanh Phong Kiếm Trận', desc: 'Công +5%', cost: 100 },
    { id: 'hp', name: 'Hộ Bang Thần Công', desc: 'Khí huyết +8%', cost: 100 },
    { id: 'exp', name: 'Tụ Nghĩa Đường', desc: 'Kinh nghiệm +10%', cost: 150 },
  ],
};

export const RECIPES = [
  { id: 'potion', name: 'Kim sang dược', need: { herb: 2 }, gold: 5 },
  { id: 'qipill', name: 'Hồi khí đan', need: { herb: 3 }, gold: 10 },
  { id: 'grilled', name: 'Cá nướng', need: { fish: 1, wood: 1 }, gold: 0 },
];

export const ENCOUNTERS = [
  { title: 'Kỳ ngộ: Rương báu ven đường', text: 'Ngươi phát hiện một chiếc rương cũ phủ rêu, bên trong có vật gì lấp lánh...', reward: { gold: 120, qipill: 1 } },
  { title: 'Kỳ ngộ: Lão ẩn sĩ', text: 'Một lão già áo vải ngồi đánh cờ một mình, ngẩng lên cười: "Tiểu tử có cốt cách, lão phu chỉ điểm vài chiêu."', reward: { points: 1 } },
  { title: 'Kỳ ngộ: Dược thảo ngàn năm', text: 'Dưới gốc cây cổ thụ mọc một cây linh chi to bằng bàn tay.', reward: { herb: 4, potion: 1 } },
  { title: 'Kỳ ngộ: Bia đá cổ', text: 'Trên bia đá khắc kiếm pháp đã mờ, ngươi ngồi lĩnh ngộ nửa canh giờ.', reward: { exp: 200 } },
];

export class Systems {
  constructor(g) {
    this.g = g;
    this.s = {
      day: today(), daily: {}, activity: 0, claimedChests: [], achDone: [],
      stats: { kills: 0, herbs: 0, pvpWins: 0, maxEnh: 0 },
      signin: { last: null, count: 0 }, dungeonRuns: {}, bossDone: {},
      guild: null, contrib: 0, guildBuffs: [],
      affinity: { maiden: 0 }, married: false,
      mount: false, mountOwned: false, pet: null, pvpRank: RIVALS.length + 1,
      market: {},
    };
    this.encounterT = 90 + Math.random() * 120;
  }

  load(d) {
    if (d) this.s = { ...this.s, ...d, stats: { ...this.s.stats, ...(d.stats || {}) }, affinity: { ...this.s.affinity, ...(d.affinity || {}) } };
    if (this.s.day !== today()) { this.s.day = today(); this.s.daily = {}; this.s.activity = 0; this.s.claimedChests = []; this.s.dungeonRuns = {}; this.s.bossDone = {}; }
  }

  toJSON() { return this.s; }

  /** Ghi nhận tiến độ: 'kill' | 'herb' | 'dungeon' | 'pvp' | 'enhance' | 'craft' */
  progress(id, n = 1) {
    const t = DAILY.find((d) => d.id === id);
    if (t) {
      const cur = this.s.daily[id] || 0;
      if (cur < t.goal) {
        this.s.daily[id] = Math.min(t.goal, cur + n);
        if (this.s.daily[id] >= t.goal) {
          this.s.activity += t.pts;
          this.g.toast(`Nhiệm vụ ngày hoàn thành: <b>${t.name}</b> · Sôi nổi +${t.pts}`, 3);
        }
      }
    }
    const st = this.s.stats;
    if (id === 'kill') st.kills += n;
    if (id === 'herb') st.herbs += n;
    this.checkAchievements();
  }

  statValue(stat) {
    if (stat === 'level') return this.g.rpg.level;
    if (stat === 'chapter') return this.g.unlockedChapter;
    if (stat === 'maxEnh') return Math.max(0, ...Object.values(this.g.rpg.enh || {}));
    return this.s.stats[stat] || 0;
  }

  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.s.achDone.includes(a.id) || this.statValue(a.stat) < a.goal) continue;
      this.s.achDone.push(a.id);
      this.give(a.reward);
      this.g.toast(`<span class="han">成就</span> Thành tựu: <b>${a.name}</b>`, 4);
      this.g.audio.levelUp();
    }
  }

  /** Phát thưởng: { gold, exp, points, fashion, <itemId>: n } */
  give(r) {
    const rpg = this.g.rpg;
    const out = [];
    for (const [k, v] of Object.entries(r)) {
      if (k === 'gold') { rpg.addGold(v); out.push(`${v} lượng`); }
      else if (k === 'exp') { rpg.gainExp(v); out.push(`${v} kinh nghiệm`); }
      else if (k === 'points') { rpg.points += v; out.push(`${v} điểm võ học`); }
      else if (k === 'fashion') { this.g.unlockFashion?.(v); out.push('thời trang Kim Long'); }
      else if (ITEMS[k]?.type === 'equip') { rpg.giveEquip(k); }
      else if (ITEMS[k]) { rpg.add(k, v); out.push(`${ITEMS[k].name} ×${v}`); }
    }
    return out.join(', ');
  }

  claimChest(i) {
    const need = ACTIVITY_CHESTS[i];
    if (this.s.activity < need || this.s.claimedChests.includes(i)) return null;
    this.s.claimedChests.push(i);
    const r = [{ gold: 30 }, { potion: 2 }, { gold: 60, qipill: 1 }, { bounty: 3 }, { gold: 150, points: 1 }][i];
    return this.give(r);
  }

  // ─── hộp thư hệ thống ───
  mails() {
    this.s.mail ??= [
      { id: 'welcome', from: 'Thanh Phong trấn', title: 'Chào mừng thiếu hiệp tới Thanh Phong', body: 'Giang hồ hiểm ác, chút quà mọn này mong thiếu hiệp nhận lấy phòng thân. Hẹn gặp ở Duyệt Lai khách điếm!', reward: { gold: 200, potion: 5, qipill: 3 } },
      { id: 'beast', from: 'Mã phu', title: 'Quà ra mắt Ngự thú', body: 'Thú hoang ngoài đồng cỏ có thể thu phục bằng Ngự thú phù. Tặng thiếu hiệp vài lá dùng thử.', reward: { tame_charm: 3, fodder: 2 } },
      { id: 'voice', from: 'Ban biên soạn', title: 'Bản cập nhật mới', body: 'Đã có lồng tiếng tiếng Anh, ba ngôn ngữ phụ đề, 20 nhân vật mới và 20 yêu quái. Chúc thiếu hiệp chơi vui!', reward: { essence: 20 } },
    ];
    return this.s.mail;
  }
  mailUnread() { return this.mails().some((m) => !m.claimed); }
  claimMail(id) {
    const m = this.mails().find((x) => x.id === id);
    if (!m || m.claimed) return null;
    m.claimed = true;
    return this.give(m.reward);
  }

  canSignIn() { return this.s.signin.last !== today(); }
  signIn() {
    if (!this.canSignIn()) return null;
    const i = this.s.signin.count % SIGNIN.length;
    this.s.signin = { last: today(), count: this.s.signin.count + 1 };
    return this.give(SIGNIN[i]);
  }

  // ─── bang hội ───
  joinGuild() { this.s.guild = GUILD.name; this.s.contrib = 0; this.g.toast(`Gia nhập <b>${GUILD.name}</b> <span class="han">${GUILD.han}</span>`); }
  guildRank() { return GUILD.ranks[Math.min(GUILD.ranks.length - 1, Math.floor(this.s.contrib / 200))]; }
  donate(gold) {
    if (!this.s.guild || this.g.rpg.gold < gold) return false;
    this.g.rpg.gold -= gold;
    this.s.contrib += gold;
    return true;
  }
  buyBuff(id) {
    const b = GUILD.buffs.find((x) => x.id === id);
    if (!b || this.s.guildBuffs.includes(id) || this.s.contrib < b.cost) return false;
    this.s.contrib -= b.cost;
    this.s.guildBuffs.push(id);
    this.g.rpg.apply();
    return true;
  }
  buff(id) { return this.s.guildBuffs.includes(id); }

  // ─── hảo cảm / kết duyên ───
  gift(npc, item) {
    if (!this.g.rpg.remove(item)) return 0;
    const gain = { herb: 6, potion: 4, qipill: 8 }[item] || 3;
    this.s.affinity[npc] = Math.min(100, (this.s.affinity[npc] || 0) + gain);
    return gain;
  }

  // ─── chế dược ───
  craft(id) {
    const r = RECIPES.find((x) => x.id === id);
    const rpg = this.g.rpg;
    if (!r || rpg.gold < r.gold || Object.entries(r.need).some(([k, n]) => (rpg.bag[k] || 0) < n)) return false;
    for (const [k, n] of Object.entries(r.need)) rpg.remove(k, n);
    rpg.gold -= r.gold;
    rpg.add(id);
    this.progress('craft');
    return true;
  }

  // ─── chợ: giá dao động theo ngày ───
  marketPrice(id) {
    const base = ITEMS[id].price || ITEMS[id].sell * 2 || 20;
    const seed = [...(today() + id)].reduce((a, c) => a + c.charCodeAt(0), 0);
    return Math.round(base * (0.75 + ((seed * 9301 + 49297) % 233280) / 233280 * 0.6));
  }

  // ─── xếp hạng ───
  power() {
    const p = this.g.player, r = this.g.rpg;
    return Math.round(r.atk() * 40 + p.maxHp * 3 + p.maxMp * 2 + r.level * 120);
  }

  ranking() {
    const me = { name: this.g.profile.name, cls: this.g.player.cls.name, lv: this.g.rpg.level, power: this.power(), me: true };
    return [...RIVALS.map((r) => ({ ...r })), me].sort((a, b) => b.power - a.power);
  }

  // ─── kỳ ngộ: ngẫu nhiên khi đang đi ngoài trấn ───
  update(dt) {
    const g = this.g;
    if (!g.running || g.dialogOpen || g.panelOpen() || g.player.inCombat > 0) return;
    const p = g.player.pos;
    if (Math.hypot(p.x - PLACES.square.x, p.z - PLACES.square.z) < 90) return;
    this.encounterT -= dt;
    if (this.encounterT <= 0) {
      this.encounterT = 160 + Math.random() * 200;
      g.ui.openEncounter(g, ENCOUNTERS[Math.floor(Math.random() * ENCOUNTERS.length)]);
    }
  }
}
