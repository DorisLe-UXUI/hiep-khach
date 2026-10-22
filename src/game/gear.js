/**
 * Trang bị sinh ngẫu nhiên: 7 ô, 5 phẩm cấp, thuộc tính phụ ngẫu nhiên.
 * Món đồ: { uid, slot, base, name, rarity, lv, stats: {atk,hp,mp,def,crit,spd}, enh }
 */
export const SLOTS = [
  { id: 'weapon', name: 'Vũ khí', icon: 'sword' },
  { id: 'helm', name: 'Mũ', icon: 'hood' },
  { id: 'armor', name: 'Y phục', icon: 'robe' },
  { id: 'belt', name: 'Đai lưng', icon: 'shield' },
  { id: 'boots', name: 'Hài', icon: 'dash' },
  { id: 'ring', name: 'Nhẫn', icon: 'rings' },
  { id: 'trinket', name: 'Ngọc bội', icon: 'lotus' },
];

export const RARITY = [
  { id: 0, name: 'Phàm', color: '#c8c8c8', mul: 1, affixes: 0, w: 55 },
  { id: 1, name: 'Tinh', color: '#6fd86a', mul: 1.25, affixes: 1, w: 28 },
  { id: 2, name: 'Hiếm', color: '#4aa8ff', mul: 1.55, affixes: 2, w: 12 },
  { id: 3, name: 'Sử thi', color: '#c070ff', mul: 1.95, affixes: 3, w: 4 },
  { id: 4, name: 'Truyền thuyết', color: '#ffa030', mul: 2.5, affixes: 4, w: 1 },
];

const BASES = {
  weapon: ['Thiết kiếm', 'Trường đao', 'Bích lạc kiếm', 'Long tuyền kiếm', 'Huyền thiết đao', 'Thanh phong kiếm'],
  helm: ['Bố mạo', 'Đấu lạp', 'Thiết khôi', 'Tử kim quan'],
  armor: ['Bố y', 'Bì giáp', 'Huyền tơ y', 'Kim tơ giáp', 'Long lân bào'],
  belt: ['Bố đai', 'Bì đai', 'Ngọc đai', 'Kim long đai'],
  boots: ['Thảo hài', 'Bì ngoa', 'Truy phong hài', 'Đạp vân ngoa'],
  ring: ['Đồng giới', 'Ngân giới', 'Phỉ thuý giới', 'Huyết ngọc giới'],
  trinket: ['Mộc bài', 'Ngọc bội', 'Hộ thân phù', 'Kỳ lân bội'],
};
const HAN = { weapon: '劍', helm: '冠', armor: '衣', belt: '帶', boots: '靴', ring: '戒', trinket: '佩' };

/** Chỉ số chính theo ô */
const MAIN = { weapon: 'atk', helm: 'hp', armor: 'def', belt: 'hp', boots: 'spd', ring: 'crit', trinket: 'mp' };
export const STAT_NAME = { atk: 'Công', hp: 'Khí huyết', mp: 'Nội lực', def: 'Giảm sát thương', crit: 'Bạo kích', spd: 'Thân pháp' };
const AFFIX_POOL = ['atk', 'hp', 'mp', 'def', 'crit', 'spd'];

function statValue(key, lv, mul) {
  const v = { atk: 3 + lv * 1.6, hp: 20 + lv * 12, mp: 10 + lv * 5, def: 0.01 + lv * 0.004, crit: 0.01 + lv * 0.003, spd: 0.02 + lv * 0.004 }[key];
  return key === 'def' || key === 'crit' || key === 'spd' ? +(v * mul).toFixed(3) : Math.round(v * mul);
}

export function rollRarity(bonus = 0) {
  const total = RARITY.reduce((s, r, i) => s + r.w * (i ? 1 + bonus : 1), 0);
  let x = Math.random() * total;
  for (let i = 0; i < RARITY.length; i++) { x -= RARITY[i].w * (i ? 1 + bonus : 1); if (x <= 0) return i; }
  return 0;
}

import { pickNamedWeapon } from './loot.js';

let uidN = Date.now() % 100000;
export function makeGear(slot, lv, rarity = rollRarity()) {
  const R = RARITY[rarity];
  const bases = BASES[slot];
  const base = bases[Math.min(bases.length - 1, Math.floor(lv / 4 + Math.random() * 1.5))];
  const stats = { [MAIN[slot]]: statValue(MAIN[slot], lv, R.mul * 1.3) };
  const pool = AFFIX_POOL.filter((k) => k !== MAIN[slot]);
  for (let i = 0; i < R.affixes; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    stats[k] = (stats[k] || 0) + statValue(k, lv, R.mul * (0.5 + Math.random() * 0.5));
  }
  if (slot === 'weapon') {
    const w = pickNamedWeapon(lv, rarity);
    return { uid: 'g' + uidN++, slot, base: w.name, name: w.name, rarity, lv, stats, enh: 0, han: w.han[0], thumb: w.thumb };
  }
  return { uid: 'g' + uidN++, slot, base, name: base, rarity, lv, stats, enh: 0, han: HAN[slot] };
}

export function gearScore(it) {
  if (!it) return 0;
  const s = it.stats;
  return Math.round(((s.atk || 0) * 40 + (s.hp || 0) * 3 + (s.mp || 0) * 2 + (s.def || 0) * 4000 + (s.crit || 0) * 3000 + (s.spd || 0) * 2500) * (1 + it.enh * 0.08));
}

export function fmtStat(k, v) {
  return k === 'def' || k === 'crit' || k === 'spd' ? `+${(v * 100).toFixed(1)}%` : `+${v}`;
}

/** Món đồ ngẫu nhiên rơi từ quái */
export function dropGear(lv, elite) {
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)].id;
  return makeGear(slot, Math.max(1, lv + Math.floor(Math.random() * 3) - 1), rollRarity(elite ? 2.5 : 0));
}

// ───────── Bảo thạch (khảm ngọc) ─────────
export const GEM_TYPES = {
  atk: { name: 'Hồng ngọc', han: '紅玉', color: '#ff4a4a', per: 4 },
  hp: { name: 'Lục ngọc', han: '綠玉', color: '#4adf6a', per: 40 },
  mp: { name: 'Lam ngọc', han: '藍玉', color: '#4a9aff', per: 22 },
  crit: { name: 'Hoàng ngọc', han: '黃玉', color: '#ffd23a', per: 0.012 },
  def: { name: 'Tử ngọc', han: '紫玉', color: '#c06aff', per: 0.01 },
};
export const GEM_MAX = 5;
/** Số lỗ khảm theo phẩm cấp */
export const socketsOf = (it) => [0, 1, 1, 2, 3][it.rarity] || 0;
export const gemId = (type, lv) => `gem_${type}_${lv}`;
export function parseGem(id) {
  const m = /^gem_(\w+)_(\d)$/.exec(id || '');
  return m ? { type: m[1], lv: Number(m[2]) } : null;
}
/** Chỉ số 1 viên: cấp L = per × (2^L - 1) */
export function gemValue(type, lv) {
  const v = GEM_TYPES[type].per * (2 ** lv - 1);
  return type === 'crit' || type === 'def' ? +v.toFixed(3) : Math.round(v);
}
/** Vật phẩm bảo thạch cho túi đồ */
export const GEM_ITEMS = {};
for (const [type, g] of Object.entries(GEM_TYPES)) {
  for (let lv = 1; lv <= GEM_MAX; lv++) {
    GEM_ITEMS[gemId(type, lv)] = { name: `${g.name} cấp ${lv}`, han: g.han, icon: 'nugget', type: 'gem', gem: type, lv, color: g.color, sell: 6 * 3 ** (lv - 1), desc: `Khảm vào trang bị: ${STAT_NAME[type]} ${fmtStat(type, gemValue(type, lv))}. Ba viên cùng cấp hợp thành một viên cấp ${lv + 1}.` };
  }
}
export function randomGem(maxLv = 1) {
  const types = Object.keys(GEM_TYPES);
  return gemId(types[Math.floor(Math.random() * types.length)], 1 + Math.floor(Math.random() * maxLv));
}
