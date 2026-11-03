import { ZONES } from './bestiary.js';
import { PLACES } from '../world/layout.js';
import { expNeed } from './rpg.js';
import { dropGear } from './gear.js';

/**
 * GIANG HỒ LỆNH: bảng nhiệm vụ nhận không giới hạn. Mỗi lệnh buộc dùng một hệ thống khác của game
 * (vận công, tuyệt kỹ, nộ khí, linh thú, luyện đan, cường hoá, phó bản, luận kiếm, Chính/Tà, truy nã, thủ thành...).
 * Sao (1–5) càng cao càng khó: mục tiêu nhiều hơn, truy nã/thủ thành mạnh hơn và có giới hạn thời gian.
 * Tiến độ lưu ở g.sys.s.bounty. Quái của lệnh có nhóm 'bty_<uid>'.
 */
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const WANTED = [
  ['bandit2', 'Độc Nhãn Lang'], ['assassin', 'Huyết Thủ Tú Tài'], ['situ', 'Phản đồ Võ Lâm Minh'], ['wumian', 'Vô Diện sát thủ'],
  ['hanbang', 'Băng Phách Quỷ Nữ'], ['mguard', 'Kim Giáp phản tướng'], ['duelist', 'Kiếm Si'], ['thief', 'Phi Thiên Đạo Tặc'],
];
// mục tiêu theo sao: [s1..s5]
const G = (...a) => (s) => a[s - 1];

export const BOUNTY_TYPES = [
  { id: 'hunt', icon: 'skull', ev: 'kill', goal: G(15, 25, 40, 60, 90), name: (n) => `Diệt ${n} yêu quái quanh vùng`, tip: 'Đánh quái ở bất kỳ khu săn nào.' },
  { id: 'elitekill', icon: 'dragon', ev: 'elite', goal: G(1, 2, 3, 4, 6), name: (n) => `Hạ ${n} quái tinh anh ("Hung ...")`, tip: 'Quái tinh anh to hơn, tên bắt đầu bằng "Hung", hay xuất hiện ở khu săn.', min: 2 },
  { id: 'night', icon: 'moon', ev: 'nightkill', goal: G(8, 14, 22, 32, 45), name: (n) => `Diệt ${n} yêu quái lúc đêm khuya`, tip: 'Ban đêm yêu quái mạnh hơn 25%.', min: 2 },
  { id: 'wanted', icon: 'swords', ev: 'bty', goal: () => 1, name: (n, b) => `Truy nã: ${b.target}`, tip: 'Mục tiêu đã xuất hiện, theo mũi tên tìm hắn. Có giới hạn thời gian.', timed: true },
  { id: 'horde', icon: 'battle', ev: 'bty', goal: G(6, 9, 12, 16, 22), name: (n, b) => `Thủ ${b.place}: chặn ${n} yêu quái`, tip: 'Tới nơi thì yêu quái kéo tới từng đợt. Có giới hạn thời gian.', timed: true },
  { id: 'qi', icon: 'qi', ev: 'qi', goal: G(2, 3, 4, 6, 8), name: (n) => `Vận công ${n} lần trong chiến đấu`, tip: 'Nhấn phím 3 (hoặc nút Vận công) để vận khí: hồi nội lực, tăng 30% sát thương 8 giây.' },
  { id: 'ult', icon: 'star', ev: 'ult', goal: G(3, 5, 8, 12, 16), name: (n) => `Thi triển tuyệt kỹ ${n} lần`, tip: 'Dùng hai chiêu tuyệt kỹ (phím 1, 2).' },
  { id: 'fury', icon: 'sparkles', ev: 'fury', goal: G(1, 1, 2, 3, 4), name: (n) => `Bộc phát nộ khí ${n} lần`, tip: 'Đánh trúng để tích nộ khí, đầy thì nhấn X.' },
  { id: 'crit', icon: 'fist', ev: 'crit', goal: G(15, 30, 50, 80, 120), name: (n) => `Đánh ${n} đòn bạo kích`, tip: 'Trang bị và ngọc có Bạo kích giúp hoàn thành nhanh hơn.' },
  { id: 'pet', icon: 'dog', ev: 'pethit', goal: G(15, 30, 50, 80, 120), name: (n) => `Linh thú ra đòn ${n} lần`, tip: 'Mở Ngự thú (B), triệu hồi linh thú cùng chiến đấu.' },
  { id: 'feed', icon: 'meal', ev: 'feed', goal: G(1, 2, 3, 4, 5), name: (n) => `Cho linh thú / thú cưỡi ăn ${n} lần`, tip: 'Ngự thú (B) → Cho ăn. Thức ăn mua ở tiệm hoặc rơi từ quái.' },
  { id: 'herb', icon: 'herb', ev: 'herb', goal: G(3, 5, 8, 10, 14), name: (n) => `Hái ${n} cây Linh chi thảo`, tip: 'Thảo dược phát sáng rải quanh bản đồ.' },
  { id: 'craft', icon: 'potion', ev: 'craft', goal: G(1, 2, 3, 4, 5), name: (n) => `Luyện đan / nấu ăn ${n} lần`, tip: 'Mở Sản xuất (T).' },
  { id: 'enhance', icon: 'anvil', ev: 'enhance', goal: G(1, 1, 2, 3, 4), name: (n) => `Cường hoá trang bị ${n} lần`, tip: 'Túi đồ (I) → chọn vũ khí → Cường hoá. Hoặc Chức năng (Y) → Cường hoá.' },
  { id: 'dungeon', icon: 'book', ev: 'dungeon', goal: G(1, 1, 1, 2, 2), name: (n) => `Vượt phó bản ${n} lần`, tip: 'Hoạt động (N) → Phó bản.', min: 2 },
  { id: 'pvp', icon: 'duel', ev: 'pvp', goal: G(1, 1, 2, 2, 3), name: (n) => `Luận kiếm ${n} trận`, tip: 'Hoạt động (N) → Luận kiếm, hoặc Luận Kiếm Đài trực tuyến.', min: 2 },
  { id: 'patrol', icon: 'scales', ev: 'patrol', goal: G(3, 5, 8, 10, 15), name: (n) => `Diệt ${n} tuần sứ phe đối địch`, tip: 'Cần gia nhập Chính phái hoặc Tà phái (Đạo lộ, U). Tuần sứ xuất hiện ở khu săn.', need: (g) => !!g.path?.s.faction },
];
export const BOUNTY_BY_ID = Object.fromEntries(BOUNTY_TYPES.map((t) => [t.id, t]));
export const BOUNTY_RANKS = [
  [0, 'Vô danh tiểu tốt'], [15, 'Giang hồ tân tú'], [50, 'Thành danh hiệp khách'], [120, 'Nhất phương hào kiệt'], [260, 'Uy chấn võ lâm'], [500, 'Võ lâm truyền kỳ'],
];
const HORDE_PLACES = [['Cổng trấn', PLACES.gate], ['Đình ven hồ', PLACES.pavilion], ['Chiến trường', PLACES.battle], ['Hắc Phong trại', PLACES.camp], ['Rừng trúc', PLACES.bamboo]];

export class Bounty {
  constructor(g) { this.g = g; this._t = 0; }
  get s() {
    const s = this.g.sys.s;
    s.bounty ??= { offers: [], active: [], done: 0, pts: 0, uid: 1 };
    return s.bounty;
  }
  maxStar() { return Math.min(5, 1 + Math.floor(this.g.rpg.level / 12)); }
  rank() { let r = 0; BOUNTY_RANKS.forEach(([p], i) => { if (this.s.pts >= p) r = i; }); return r; }
  rankName() { return BOUNTY_RANKS[this.rank()][1]; }
  /** thưởng thêm theo danh vọng: +6% mỗi bậc */
  rankMul() { return 1 + this.rank() * 0.06; }

  make() {
    const g = this.g, ms = this.maxStar();
    const pool = BOUNTY_TYPES.filter((t) => (!t.need || t.need(g)) && ms >= (t.min || 1));
    const t = pick(pool);
    const star = Math.max(t.min || 1, Math.min(ms, 1 + Math.floor(Math.random() * ms)));
    const b = { uid: this.s.uid++, type: t.id, star, n: 0 };
    b.goal = t.goal(star);
    if (t.id === 'wanted') { const [look, nm] = pick(WANTED); b.look = look; b.target = nm; b.zone = pick(ZONES.filter((z) => z.id !== 'dongco' || star === 1)).id; }
    if (t.id === 'horde') { const [nm, pl] = pick(HORDE_PLACES); b.place = nm; b.x = pl.x; b.z = pl.z; }
    return b;
  }
  fill() { while (this.s.offers.length < 4) this.s.offers.push(this.make()); }
  refresh(paid = true) {
    const cost = 20 + this.g.rpg.level * 3;
    if (paid) { const r = this.g.rpg; if (r.gold < cost) { this.g.toast(`Cần ${cost} lượng để làm mới`, 1.6); return false; } r.gold -= cost; }
    this.s.offers = []; this.fill(); return true;
  }
  title(b) { const t = BOUNTY_BY_ID[b.type]; return t.name(b.goal, b); }
  reward(b) {
    const lv = this.g.rpg.level, k = this.rankMul();
    return { exp: Math.round(expNeed(lv) * (0.1 + 0.07 * b.star) * k), gold: Math.round((30 + lv * 5) * b.star * k), gear: b.star >= 3 };
  }

  accept(uid) {
    const s = this.s;
    if (s.active.length >= 3) { this.g.toast('Chỉ nhận tối đa 3 Giang Hồ Lệnh cùng lúc', 1.6); return false; }
    const i = s.offers.findIndex((o) => o.uid === uid);
    if (i < 0) return false;
    const b = s.offers.splice(i, 1)[0];
    const t = BOUNTY_BY_ID[b.type];
    if (t.timed) b.left = 240 + b.star * 60;
    s.active.push(b);
    this.fill();
    this.enter(b);
    this.g.toast(`Nhận lệnh: <b>${this.title(b)}</b> ${'★'.repeat(b.star)}<br><span class="sm">${t.tip}</span>`, 3.5);
    return true;
  }
  abandon(uid) {
    const s = this.s, b = s.active.find((x) => x.uid === uid);
    if (!b) return;
    this.cleanup(b);
    s.active = s.active.filter((x) => x !== b);
  }
  cleanup(b) {
    const g = this.g, grp = 'bty_' + b.uid;
    for (const e of g.enemies.filter((e) => e.group === grp && !e.dead)) { e.dead = true; g.scene.remove(e.root); }
    g.enemies = g.enemies.filter((e) => e.group !== grp || e.dead);
  }

  /** Sinh mục tiêu truy nã ngay khi nhận (vào lại game thì sinh lại). */
  async enter(b) {
    const g = this.g, lv = g.rpg.level;
    if (b.type !== 'wanted' || b.n >= 1 || b.spawned) return;
    b.spawned = true;
    const zn = ZONES.find((z) => z.id === b.zone) || ZONES[0];
    const a = Math.random() * Math.PI * 2;
    const e = await g.spawn(b.look, zn.x + Math.cos(a) * zn.r * 0.5, zn.z + Math.sin(a) * zn.r * 0.5, { group: 'bty_' + b.uid, name: `Truy nã · ${b.target}`, lv: lv + b.star, boss: b.star >= 4, aggro: 20 });
    if (b.star < 4) { e.maxHp = e.hp = Math.round(e.maxHp * (1.5 + b.star * 0.5)); e.dmg = Math.round(e.dmg * 1.3); }
  }
  async startHorde(b) {
    const g = this.g, lv = g.rpg.level;
    const zn = ZONES.reduce((a, z) => (Math.hypot(z.x - b.x, z.z - b.z) < Math.hypot(a.x - b.x, a.z - b.z) ? z : a));
    const wave = Math.min(b.goal - b.n, 3 + b.star);
    b.wave = (b.wave || 0) + 1;
    g.vfx?.banner?.('守', `Thủ ${b.place} · Đợt ${b.wave}`, '#ff6a3a');
    for (let i = 0; i < wave; i++) {
      const a = (i / wave) * Math.PI * 2, id = pick(zn.mobs);
      const e = await g.spawnMonster(id, b.x + Math.cos(a) * 14, b.z + Math.sin(a) * 14, { group: 'bty_' + b.uid, lv: lv + b.star - 1, aggro: 60 });
      e.maxHp = e.hp = Math.round(e.maxHp * (1 + b.star * 0.25));
    }
  }

  /** Sự kiện từ các hệ thống khác. */
  on(ev, n = 1) {
    for (const b of this.s.active) if (BOUNTY_BY_ID[b.type].ev === ev && b.n < b.goal) { b.n = Math.min(b.goal, b.n + n); if (b.n >= b.goal) this.complete(b); }
  }
  onKill(e) {
    const grp = String(e.group || '');
    if (grp.startsWith('bty_')) { const b = this.s.active.find((x) => 'bty_' + x.uid === grp); if (b && b.n < b.goal) { b.n++; if (b.n >= b.goal) this.complete(b); } }
    if (e.elite || e.monster?.elite) this.on('elite');
    if (e.night) this.on('nightkill');
  }

  complete(b) {
    const g = this.g, s = this.s, r = this.reward(b);
    s.active = s.active.filter((x) => x !== b);
    s.done++; s.pts += b.star;
    const before = this.rank();
    const parts = [g.sys.give({ exp: r.exp, gold: r.gold })];
    if (r.gear) { const it = dropGear(g.rpg.level + b.star - 2, b.star >= 4); g.rpg.addGear(it); parts.push(`<b>${it.name}</b>`); }
    if (s.done % 10 === 0) { const it = dropGear(g.rpg.level + 3, true); g.rpg.addGear(it); parts.push(`rương ${s.done} lệnh: <b>${it.name}</b>`); }
    g.audio?.levelUp?.();
    g.vfx?.banner?.('令', `Hoàn thành Giang Hồ Lệnh ${'★'.repeat(b.star)}`, '#ffd86a');
    g.toast(`<b>${this.title(b)}</b> hoàn thành<br><span class="sm">${parts.join(', ')}</span>`, 4);
    if (this.rank() > before) { g.mhud?.announce?.(`<b>${g.profile.name}</b> danh chấn giang hồ: <b>${this.rankName()}</b>!`); }
    g.save?.();
  }
  fail(b, why) { this.cleanup(b); this.s.active = this.s.active.filter((x) => x !== b); this.g.toast(`Giang Hồ Lệnh thất bại: <b>${this.title(b)}</b> (${why})`, 3); }

  reenter() { for (const b of this.s.active) { b.spawned = false; b.hordeOn = false; this.enter(b); } }

  update(dt) {
    const g = this.g;
    if (g.dialogOpen) return;
    for (const b of [...this.s.active]) {
      if (b.left != null) { b.left -= dt; if (b.left <= 0) { this.fail(b, 'hết giờ'); continue; } }
      if (b.type === 'horde') {
        const grp = 'bty_' + b.uid, alive = g.enemies.some((e) => e.group === grp && !e.dead);
        const near = Math.hypot(g.player.pos.x - b.x, g.player.pos.z - b.z) < 22;
        if (near && !alive && !b.busy && b.n < b.goal) { b.busy = true; this.startHorde(b).finally(() => (b.busy = false)); }
      }
    }
    if ((this._t -= dt) > 0) return;
    this._t = 1;
    if (!this.s.offers.length) this.fill();
  }

  tracker() {
    return this.s.active.map((b) => ({ uid: b.uid, name: this.title(b), star: b.star, text: `${b.n}/${b.goal}${b.left != null ? ` · ${Math.floor(b.left / 60)}:${String(Math.floor(b.left % 60)).padStart(2, '0')}` : ''}` }));
  }
  marker() {
    const g = this.g;
    for (const b of this.s.active) {
      if (b.type === 'wanted') { const e = g.enemies.find((x) => x.group === 'bty_' + b.uid && !x.dead); if (e) return { x: e.pos.x, z: e.pos.z }; }
      if (b.type === 'horde') { const e = g.nearestOf?.('bty_' + b.uid); return e || { x: b.x, z: b.z }; }
    }
    return null;
  }
}
