/**
 * Kinh mạch: Kỳ kinh bát mạch, mỗi mạch 6 huyệt. Đả thông huyệt bằng Chân khí (tích từ kinh nghiệm) + bạc.
 * Huyệt càng sâu tỉ lệ càng thấp; thất bại mất nửa chân khí. Thông trọn một mạch nhận thưởng gấp 3.
 */
export const MERIDIANS = [
  { id: 'nham', name: 'Nhâm mạch', han: '任脈', stat: 'hp', lv: 1, color: '#6adf8a', points: ['Thừa Tương', 'Thiên Đột', 'Đản Trung', 'Trung Quản', 'Khí Hải', 'Quan Nguyên'] },
  { id: 'doc', name: 'Đốc mạch', han: '督脈', stat: 'atk', lv: 2, color: '#ff6a5a', points: ['Bách Hội', 'Phong Phủ', 'Đại Chuỳ', 'Linh Đài', 'Mệnh Môn', 'Trường Cường'] },
  { id: 'xung', name: 'Xung mạch', han: '衝脈', stat: 'mp', lv: 4, color: '#5aa8ff', points: ['Âm Đô', 'Thông Cốc', 'U Môn', 'Thương Khúc', 'Hoang Du', 'Khí Xung'] },
  { id: 'doi', name: 'Đới mạch', han: '帶脈', stat: 'def', lv: 6, color: '#c08aff', points: ['Chương Môn', 'Đới Mạch', 'Ngũ Khu', 'Duy Đạo', 'Kinh Môn', 'Kỳ Môn'] },
  { id: 'amduy', name: 'Âm Duy mạch', han: '陰維脈', stat: 'crit', lv: 8, color: '#ffd23a', points: ['Trúc Tân', 'Phủ Xá', 'Đại Hoành', 'Phúc Ai', 'Liêm Tuyền', 'Thiên Trì'] },
  { id: 'duongduy', name: 'Dương Duy mạch', han: '陽維脈', stat: 'atk', lv: 10, color: '#ff8a3a', points: ['Kim Môn', 'Dương Giao', 'Nhu Du', 'Thiên Liêu', 'Kiên Tỉnh', 'Phong Trì'] },
  { id: 'amkieu', name: 'Âm Kiểu mạch', han: '陰蹻脈', stat: 'spd', lv: 12, color: '#6ae8e8', points: ['Chiếu Hải', 'Giao Tín', 'Nhân Nghênh', 'Khuyết Bồn', 'Tình Minh', 'Thừa Khấp'] },
  { id: 'duongkieu', name: 'Dương Kiểu mạch', han: '陽蹻脈', stat: 'hp', lv: 14, color: '#ffffff', points: ['Thân Mạch', 'Bộc Tham', 'Cư Liêu', 'Cự Cốt', 'Địa Thương', 'Phong Trì'] },
];
const PER = { hp: 14, atk: 1.6, mp: 9, def: 0.005, crit: 0.004, spd: 0.005 };

export const pointValue = (mi, stat) => { const v = PER[stat] * (1 + mi * 0.3); return stat === 'hp' || stat === 'mp' || stat === 'atk' ? Math.round(v) : +v.toFixed(4); };
export const pointCost = (mi, pi) => ({ qi: Math.round((40 + pi * 25) * (1 + mi * 0.6)), gold: Math.round((20 + pi * 15) * (1 + mi * 0.5)) });
export const pointRate = (pi) => Math.max(0.45, 1 - pi * 0.1);

export class Meridian {
  constructor(g) { this.g = g; }
  get open() { return (this.g.rpg.meridians ??= MERIDIANS.map(() => 0)); }
  stat(key) {
    let v = 0;
    MERIDIANS.forEach((m, i) => {
      if (m.stat !== key) return;
      const n = this.open[i] || 0;
      v += pointValue(i, key) * n + (n >= 6 ? pointValue(i, key) * 3 : 0);
    });
    return v;
  }
  total() { return this.open.reduce((a, b) => a + b, 0); }
  /** Đả thông huyệt tiếp theo của mạch mi. Trả về 'ok' | 'fail' | lý do */
  breakthrough(mi) {
    const g = this.g, r = g.rpg, m = MERIDIANS[mi], pi = this.open[mi];
    if (pi >= 6) return 'Đã thông toàn mạch';
    if (r.level < m.lv) return `Cần cấp ${m.lv}`;
    if (mi > 0 && this.open[mi - 1] < 3) return `Cần đả thông 3 huyệt ${MERIDIANS[mi - 1].name} trước`;
    const c = pointCost(mi, pi);
    if ((r.zhenqi || 0) < c.qi) return 'Không đủ Chân khí';
    if (r.gold < c.gold) return 'Không đủ lượng bạc';
    r.gold -= c.gold;
    if (Math.random() < pointRate(pi) + (r.meridianLuck || 0)) {
      r.zhenqi -= c.qi;
      r.meridianLuck = 0;
      this.open[mi]++;
      r.apply();
      if (this.open[mi] === 6) g.mhud?.announce(`<b>${g.profile.name}</b> đả thông <b>${m.name}</b> <span class="han">${m.han}</span>!`);
      return 'ok';
    }
    r.zhenqi -= Math.round(c.qi / 2);
    r.meridianLuck = (r.meridianLuck || 0) + 0.1; // thất bại tích "kinh nghiệm xung huyệt"
    return 'fail';
  }
}
