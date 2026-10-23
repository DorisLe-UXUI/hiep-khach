/**
 * Trạng thái trên người chơi: buff (tăng công, bạo kích, thân pháp, hộ thể, hồi phục)
 * và hiệu ứng xấu do quái gây ra (trúng độc, bỏng, băng giá, choáng, chảy máu).
 * Mỗi trạng thái: { until (giây game), val }. Sát thương/hồi máu theo nhịp mỗi giây.
 */
export const STATUS = {
  atk: { name: 'Tăng công', icon: 'st_atk', good: true, fmt: (v) => `Công +${v}` },
  crit: { name: 'Bạo kích', icon: 'st_crit', good: true, fmt: (v) => `Bạo kích +${Math.round(v * 100)}%` },
  spd: { name: 'Thân pháp', icon: 'st_spd', good: true, fmt: (v) => `Thân pháp +${Math.round(v * 100)}%` },
  shield: { name: 'Hộ thể', icon: 'st_shield', good: true, fmt: (v) => `Giảm sát thương +${Math.round(v * 100)}%` },
  regen: { name: 'Hồi phục', icon: 'st_regen', good: true, fmt: (v) => `Hồi ${Math.round(v * 100)}% khí huyết mỗi giây` },
  poison: { name: 'Trúng độc', icon: 'st_poison', dot: 0.012, color: '#8aff6a', fmt: () => 'Mất 1,2% khí huyết mỗi giây' },
  burn: { name: 'Bỏng', icon: 'st_burn', dot: 0.02, color: '#ffa040', fmt: () => 'Mất 2% khí huyết mỗi giây' },
  bleed: { name: 'Chảy máu', icon: 'st_bleed', dot: 0.015, color: '#ff4a4a', fmt: () => 'Mất 1,5% khí huyết mỗi giây' },
  freeze: { name: 'Băng giá', icon: 'st_freeze', fmt: () => 'Di chuyển chậm 45%' },
  stun: { name: 'Choáng', icon: 'st_stun', fmt: () => 'Không thể hành động' },
};

/** Quái nào gây hiệu ứng gì khi đánh trúng: [trạng thái, tỉ lệ, giây] */
const POISON_MOBS = /nhen|ran|dongdoc|chutinh|doc|xayeu|ech|thuyeu/;
export function onHitEffect(e) {
  const id = e.tag || '';
  const zone = e.zone || '';
  if (e.boss && Math.random() < 0.25) return ['stun', 1.2];
  if (zone === 'hoason' || /hoa|xich|long/.test(id)) return Math.random() < 0.3 ? ['burn', 4] : null;
  if (zone === 'hangtuyet' || /bang|tuyet|bangling/.test(id)) return Math.random() < 0.3 ? ['freeze', 3] : null;
  if (POISON_MOBS.test(id)) return Math.random() < 0.3 ? ['poison', 6] : null;
  if (/bandit|assassin|hanbang|villain/.test(id)) return Math.random() < 0.22 ? ['bleed', 5] : null;
  return null;
}

export class Status {
  constructor(g) { this.g = g; this.t = 0; this.list = {}; this.tick = 0; }

  add(id, dur, val = 0) {
    const cur = this.list[id];
    const until = this.t + dur;
    // trạng thái xấu: không cộng dồn thời gian, chỉ làm mới; buff: lấy giá trị lớn hơn
    this.list[id] = { until: Math.max(cur?.until || 0, until), val: Math.max(cur?.val || 0, val), dur: Math.max(cur?.dur || 0, dur) };
    const S = STATUS[id];
    if (S && !S.good) this.g.hud?.damage?.(this.g.player.pos.clone().setY(this.g.player.pos.y + 2.4), S.name, 'player');
    this.g.mhud?.renderBuffs?.(true);
  }
  has(id) { const s = this.list[id]; return !!s && s.until > this.t; }
  val(id) { return this.has(id) ? this.list[id].val : 0; }
  left(id) { return this.has(id) ? this.list[id].until - this.t : 0; }
  clearBad() { for (const k in this.list) if (!STATUS[k]?.good) delete this.list[k]; }

  /** hệ số tốc độ di chuyển */
  speedMul() { return this.has('stun') ? 0 : this.has('freeze') ? 0.55 : 1; }

  update(dt) {
    this.t += dt;
    const p = this.g.player;
    if (!p || p.dead) { if (p?.dead) this.list = {}; return; }
    this.tick += dt;
    if (this.tick >= 1) {
      this.tick -= 1;
      for (const [id, s] of Object.entries(this.list)) {
        if (s.until <= this.t) continue;
        const S = STATUS[id];
        if (S.dot) {
          const dmg = Math.max(1, Math.round(p.maxHp * S.dot));
          p.hp = Math.max(1, p.hp - dmg); // hiệu ứng không tự giết người chơi
          this.g.hud?.damage?.(p.pos.clone().setY(p.pos.y + 1.9), dmg, 'player');
        }
        if (id === 'regen') p.heal(p.maxHp * s.val);
      }
    }
    let changed = false;
    for (const k in this.list) if (this.list[k].until <= this.t) { delete this.list[k]; changed = true; }
    if (changed) this.g.mhud?.renderBuffs?.(true);
  }
}
