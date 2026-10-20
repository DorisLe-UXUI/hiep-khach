/**
 * Môn phái (lớp nhân vật). Mỗi phái có vũ khí, đòn đánh thường (LMB) và 2 tuyệt kỹ (Q, F).
 * attack: 'melee' (liên chiêu 3 đòn) | 'arrow' (bắn tên) | 'orb' (phóng chưởng khí)
 */
export const CLASSES = {
  kiem: {
    name: 'Kiếm Khách', han: '劍客', icon: 'sword', color: '#d6b062', weapon: 'sword',
    desc: 'Kiếm pháp cân bằng công thủ, liên chiêu nhanh, lướt kiếm xuyên trận.',
    stats: { atk: 4, def: 3, spd: 4, range: 2 },
    attack: 'melee', range: 2.5, dmgMul: 1,
    q: { name: 'Lướt Kiếm', kind: 'dash', mp: 15, cd: 2.5 },
    f: { name: 'Chưởng Phong', kind: 'orb', mp: 20, cd: 0.8 },
  },
  thuong: {
    name: 'Thương Khách', han: '槍客', icon: 'dash', color: '#c95a3c', weapon: 'spear',
    desc: 'Trường thương tầm xa, đòn nặng, càn quét cả đám địch.',
    stats: { atk: 5, def: 4, spd: 3, range: 3 },
    attack: 'melee', range: 3.3, dmgMul: 1.15, speed: 0.95,
    q: { name: 'Bá Vương Thương', kind: 'dash', mp: 15, cd: 3 },
    f: { name: 'Hoành Tảo Thiên Quân', kind: 'nova', mp: 25, cd: 4 },
  },
  cung: {
    name: 'Cung Thủ', han: '弓手', icon: 'star', color: '#6fb59a', weapon: 'bow',
    desc: 'Bách bộ xuyên dương, tiêu diệt kẻ thù từ xa trước khi chúng kịp áp sát.',
    stats: { atk: 4, def: 2, spd: 5, range: 5 },
    attack: 'arrow', range: 30, dmgMul: 0.9,
    q: { name: 'Liên Châu Tiễn', kind: 'volley', mp: 18, cd: 3 },
    f: { name: 'Lộn Ngược Tiễn', kind: 'backflip', mp: 12, cd: 2 },
  },
  phap: {
    name: 'Pháp Sư', han: '法師', icon: 'palm', color: '#7a6fd8', weapon: null,
    desc: 'Vận nội công thành chưởng khí, hô phong hoán vũ, sát thương phép lớn.',
    stats: { atk: 5, def: 2, spd: 3, range: 4 },
    attack: 'orb', range: 25, dmgMul: 0.85,
    q: { name: 'Phong Lôi Trận', kind: 'nova', mp: 22, cd: 4 },
    f: { name: 'Huyền Băng Chưởng', kind: 'bigorb', mp: 28, cd: 1.5 },
  },
  dao: {
    name: 'Đạo Sĩ', han: '道士', icon: 'qi', color: '#5aa7e0', weapon: 'dagger',
    desc: 'Đoản kiếm nhanh nhẹn kết hợp phù chú, tự trị thương giữa trận.',
    stats: { atk: 3, def: 3, spd: 5, range: 2 },
    attack: 'melee', range: 2.2, dmgMul: 0.9, speed: 1.25,
    q: { name: 'Hồi Xuân Phù', kind: 'heal', mp: 25, cd: 6 },
    f: { name: 'Lôi Phù', kind: 'orb', mp: 18, cd: 0.8 },
  },
};

/** Ngoại hình có thể tùy chỉnh. */
export const LOOK_OPTIONS = {
  hair: { male: ['hair_buns', 'hair_long', 'hair_simpleparted'], female: ['hair_buns', 'hair_long'] },
  hairLabel: { hair_buns: 'Búi tóc', hair_long: 'Tóc dài', hair_simpleparted: 'Rẽ ngôi' },
  hairColors: ['#1b1512', '#3b2618', '#6b4a2b', '#8c8780', '#e8e2d6', '#5a1e1e'],
  outfits: { male: ['ranger', 'peasant'], female: ['ranger', 'peasant'] },
  outfitLabel: { ranger: 'Hiệp phục', peasant: 'Bố y' },
  /** thời trang = màu trang phục */
  fashion: [
    { id: 'default', name: 'Nguyên bản', color: null },
    { id: 'thanh', name: 'Thanh Y', color: '#4f7f8f' },
    { id: 'hong', name: 'Hồng Liên', color: '#c27b8f' },
    { id: 'hac', name: 'Hắc Dạ', color: '#2b2a2e' },
    { id: 'bach', name: 'Bạch Tuyết', color: '#e6e2da' },
    { id: 'xich', name: 'Xích Diễm', color: '#9b2a24' },
    { id: 'kim', name: 'Kim Long', color: '#c9a04a', price: 300 },
    { id: 'tu', name: 'Tử Vân', color: '#6b4f8f', price: 300 },
  ],
};

export function defaultHero(gender = 'male', cls = 'kiem') {
  return { gender, cls, hair: 'hair_buns', hairColor: '#1b1512', outfit: 'ranger', fashion: 'default', beard: false, hood: false };
}

/** Chuyển cấu hình nhân vật sang "look" cho Character.create */
export function heroLook(h) {
  const look = {
    outfit: `${h.gender}_${h.outfit}`,
    base: h.gender,
    hair: [h.hair, ...(h.beard && h.gender === 'male' ? ['hair_beard'] : [])],
    brows: h.gender === 'male' ? 'eyebrows_regular' : 'eyebrows_female',
    hairColor: h.hairColor,
  };
  const f = LOOK_OPTIONS.fashion.find((x) => x.id === h.fashion);
  if (f?.color) look.outfitColor = f.color;
  return look;
}
