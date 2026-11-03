/**
 * Đạo lộ: chuyển chức theo môn phái (4 bậc, mỗi bậc qua một trận thử thách) và Chính / Tà phái
 * (chọn từ cấp 20, lập công trạng bằng cách diệt tuần sứ phe đối địch, lên 5 bậc phẩm hàm).
 */
export const ADV = {
  kiem: [['Kiếm Khách', '劍客'], ['Kiếm Sĩ', '劍士'], ['Kiếm Hiệp', '劍俠'], ['Kiếm Thánh', '劍聖']],
  thuong: [['Thương Khách', '槍客'], ['Thương Tướng', '槍將'], ['Thương Vương', '槍王'], ['Thương Thần', '槍神']],
  cung: [['Cung Thủ', '弓手'], ['Thần Xạ', '神射'], ['Xạ Điêu', '射鵰'], ['Tiễn Thánh', '箭聖']],
  phap: [['Pháp Sư', '法師'], ['Chân Nhân', '真人'], ['Thiên Sư', '天師'], ['Lôi Tôn', '雷尊']],
  dao: [['Đạo Sĩ', '道士'], ['Pháp Đạo', '法道'], ['Huyền Chân', '玄真'], ['Đạo Tổ', '道祖']],
};
export const ADV_LV = [1, 15, 30, 45];
export const ADV_TEXT = [
  '',
  'Công +10%, Khí huyết +10%, sát thương tuyệt kỹ +15%',
  'Thêm: chiêu 1 bắn thêm 2 luồng kiếm khí, sát thương tuyệt kỹ +30%',
  'Thêm: tuyệt kỹ mưa đòn gấp đôi, phạm vi +30%, sát thương tuyệt kỹ +50%, khí toả thường trực',
];
// người thủ thí: hình dạng + sức mạnh theo bậc
const TRIAL = [null,
  { type: 'hanbang', name: 'Thủ thí · Kiếm Các trưởng lão', hp: 1400, dmg: 22 },
  { type: 'honglian', name: 'Thủ thí · Thiên Cơ Các chủ', hp: 3200, dmg: 30 },
  { type: 'huyetma', name: 'Thủ thí · Võ Thần ảo ảnh', hp: 6500, dmg: 40 },
];

export const FACTIONS = {
  chinh: { name: 'Chính phái', han: '正', color: '#ffd86a', foe: 'ta', ranks: ['Đệ tử', 'Hiệp sĩ', 'Hiệp khách', 'Đại hiệp', 'Hộ pháp Minh chủ'],
    desc: 'Trừ gian diệt ác. Mỗi bậc: Khí huyết +4%, Giảm sát thương +2%.', patrol: 'Tà phái thích khách' },
  ta: { name: 'Tà phái', han: '邪', color: '#d04aff', foe: 'chinh', ranks: ['Môn đồ', 'Sát thủ', 'Ma đầu', 'Đại ma đầu', 'Tà vương'],
    desc: 'Mạnh được yếu thua. Mỗi bậc: Bạo kích +2%, hút máu 1% sát thương.', patrol: 'Chính phái tuần sứ' },
};
export const MERIT = [0, 200, 600, 1500, 3000];

export class Path {
  constructor(g) { this.g = g; this.patrolT = 20; }
  get s() { return (this.g.sys.s.path ??= { adv: 0, faction: null, merit: 0, daily: { d: '', n: 0 } }); }
  get cls() { return this.g.profile.hero?.cls || 'kiem'; }
  adv() { return this.s.adv || 0; }
  advName(i = this.adv()) { return (ADV[this.cls] || ADV.kiem)[i]; }
  rank() { let r = 0; MERIT.forEach((m, i) => { if (this.s.merit >= m) r = i; }); return this.s.faction ? r : -1; }
  rankName() { const f = FACTIONS[this.s.faction]; return f ? f.ranks[this.rank()] : ''; }

  /** Chỉ số cộng thêm (rpg dùng). */
  bonus(key) {
    const a = this.adv(), f = this.s.faction, r = this.rank() + 1;
    let v = 0;
    if (key === 'atkMul') v += a ? 0.1 : 0;
    if (key === 'hpMul') v += (a ? 0.1 : 0) + (f === 'chinh' ? r * 0.04 : 0);
    if (key === 'def') v += f === 'chinh' ? r * 0.02 : 0;
    if (key === 'crit') v += f === 'ta' ? r * 0.02 : 0;
    if (key === 'leech') v += f === 'ta' ? r * 0.01 : 0;
    return v;
  }
  ultMul() { return [1, 1.15, 1.3, 1.5][this.adv()]; }

  canAdvance() { const n = this.adv() + 1; return n < 4 && this.g.rpg.level >= ADV_LV[n]; }
  /** Bắt đầu trận thử thách chuyển chức. */
  async startTrial() {
    const g = this.g, n = this.adv() + 1;
    if (!this.canAdvance() || this.trial) return false;
    const t = TRIAL[n], p = g.player.pos;
    const lvK = 1 + (g.rpg.level - ADV_LV[n]) * 0.05;
    g.vfx.banner('試', `Thử thách chuyển chức · ${this.advName(n)[0]}`, '#ffd86a');
    const e = await g.spawn(t.type, p.x + Math.sin(g.player.yaw) * 8, p.z + Math.cos(g.player.yaw) * 8, { group: 'advtrial', boss: true, name: t.name, hp: Math.round(t.hp * lvK), dmg: Math.round(t.dmg * lvK), aggro: 60 });
    this.trial = e;
    g.toast(`Đánh bại <b>${t.name}</b> để thăng làm <b>${this.advName(n)[0]}</b>`, 4);
    return true;
  }
  promote() {
    const g = this.g;
    this.s.adv = Math.min(3, this.adv() + 1);
    const [name, han] = this.advName();
    const pal = g.player.pal, hex = '#' + pal[0].toString(16).padStart(6, '0');
    g.vfx.pillar(g.player.pos.clone(), pal[0], 9);
    g.vfx.rings(g.player.pos.clone(), pal, 9);
    g.vfx.spiral(g.player.pos.clone(), pal, 140, 6, 1.6);
    g.vfx.banner(han, `Chuyển chức · ${name}`, hex);
    g.vfx.flashScreen(hex, 0.5);
    g.audio.skill('ult');
    g.mhud?.announce(`<b>${g.profile.name}</b> chuyển chức thành công: <b>${name}</b> <span class="han">${han}</span>!`);
    g.toast(`<span class="han">${han}</span> Thăng làm <b>${name}</b><br><span class="sm">${ADV_TEXT[this.adv()]}</span>`, 6);
    g.rpg.apply(true);
    g.save?.();
  }

  join(f) {
    if (this.s.faction || !FACTIONS[f] || this.g.rpg.level < 20) return false;
    this.s.faction = f;
    const F = FACTIONS[f], g = this.g;
    g.vfx.banner(F.han, `Gia nhập ${F.name}`, F.color);
    g.vfx.flashScreen(F.color, 0.35);
    g.audio.skill('rage', 0.8);
    g.rpg.apply(true);
    g.save?.();
    return true;
  }
  /** Đổi phe: mất nửa công trạng. */
  leave() { if (!this.s.faction) return; this.s.faction = null; this.s.merit = Math.floor(this.s.merit / 2); this.g.rpg.apply(true); }

  addMerit(n) {
    const before = this.rank();
    this.s.merit += n;
    if (this.rank() > before) {
      const F = FACTIONS[this.s.faction];
      this.g.vfx.banner(F.han, `${F.name} · ${this.rankName()}`, F.color);
      this.g.audio.levelUp();
      this.g.rpg.apply(true);
    }
  }

  onKill(e) {
    if (e === this.trial) { this.trial = null; setTimeout(() => this.promote(), 800); return; }
    if (e.group === 'patrol' && this.s.faction) {
      const today = new Date().toDateString(), d = this.s.daily;
      if (d.d !== today) { d.d = today; d.n = 0; }
      d.n++;
      this.addMerit(15);
      this.g.bounty?.on('patrol');
      if (d.n === 10) { this.addMerit(100); this.g.toast(`<b>Nhiệm vụ phe ngày</b> hoàn thành · Công trạng +100`, 3); }
    }
  }

  /** Tuần sứ phe đối địch xuất hiện quanh vùng săn khi đã chọn phe. */
  update(dt) {
    const g = this.g, f = FACTIONS[this.s.faction];
    if (this.trial && this.trial.dead === false && this.trial.pos.distanceTo(g.player.pos) > 60) { g.scene.remove(this.trial.root); this.trial.dead = true; this.trial = null; g.toast('Thử thách bị huỷ (đi quá xa)', 2); }
    if (!f || g.activity || g.dialogOpen) return;
    if ((this.patrolT -= dt) > 0) return;
    this.patrolT = 75;
    if (!g.spawner?.zoneAt(g.player.pos.x, g.player.pos.z)) return;
    if (g.enemies.some((e) => !e.dead && e.group === 'patrol')) return;
    const p = g.player.pos, lv = g.rpg.level;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      g.spawn(this.s.faction === 'chinh' ? 'assassin' : 'bandit2', p.x + Math.cos(a) * 16, p.z + Math.sin(a) * 16, { group: 'patrol', name: `${f.patrol}`, hp: 120 + lv * 22, dmg: 10 + lv * 1.2, aggro: 22 });
    }
    g.toast(`<span class="han">${FACTIONS[f.foe].han}</span> <b>${f.patrol}</b> xuất hiện gần đây · diệt để lập công trạng`, 3);
  }
}
