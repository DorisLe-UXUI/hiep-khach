import { UI } from './ui.js';
import { icon } from './icons.js';
import { WORLD_SIZE, PLACES, PATHS, WATER_LEVEL } from '../world/layout.js';
import { ZONES, MONSTERS } from '../game/bestiary.js';
import { rng } from '../world/noise.js';
import { LANG, trData } from '../i18n.js';
import { trObjective } from '../story/objectives_i18n.js';

const $ = (id) => document.getElementById(id);
const S = 1024; // độ phân giải bản đồ vẽ sẵn (dự phòng)
// Bản đồ tranh vẽ: toạ độ thế giới → điểm ảnh trên tranh, khớp theo các địa danh (affine + bù sai số kiểu IDW)
const MAP_IMG = '/assets/ui/world_map.webp', W = 1312, H = 1199;
const CTRL = [
  [30, 40, 690, 560], [30, 98, 665, 628], [30, 6, 680, 515], [-56, 52, 505, 632], [-125, 50, 430, 640], [-150, -105, 370, 380],
  [-168, -118, 352, 400], [-222, -205, 235, 190], [-40, -245, 690, 170], [48, -200, 565, 230], [215, -215, 965, 180], [150, -120, 1065, 350],
  [132, 150, 985, 690], [-28, 116, 445, 770], [70, 160, 770, 860], [150, 70, 1040, 610], [-78, -18, 560, 360], [-112, 138, 330, 740], [30, 128, 710, 745],
  [-400, -400, 70, 50], [400, -400, 1240, 50], [-400, 400, 70, 1150], [400, 400, 1240, 1150],
];
const AFF = (() => {
  // bình phương tối thiểu: px = a*x + b*z + c
  const solve = (k) => {
    let sxx = 0, sxz = 0, sx = 0, szz = 0, sz = 0, n = 0, bx = 0, bz = 0, b1 = 0;
    for (const c of CTRL) { const [x, z] = c, v = c[k]; sxx += x * x; sxz += x * z; sx += x; szz += z * z; sz += z; n++; bx += x * v; bz += z * v; b1 += v; }
    const M = [[sxx, sxz, sx], [sxz, szz, sz], [sx, sz, n]], B = [bx, bz, b1];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M);
    return [0, 1, 2].map((i) => det(M.map((r, j) => r.map((v, l) => (l === i ? B[j] : v)))) / D);
  };
  return [solve(2), solve(3)];
})();
const aff = (x, z) => [AFF[0][0] * x + AFF[0][1] * z + AFF[0][2], AFF[1][0] * x + AFF[1][1] * z + AFF[1][2]];
const RES = CTRL.map(([x, z, px, py]) => { const [ax, ay] = aff(x, z); return [x, z, px - ax, py - ay]; });
export function worldToMap(x, z) {
  const [ax, ay] = aff(x, z);
  let wx = 0, wy = 0, ws = 0;
  for (const [cx, cz, dx, dy] of RES) { const d2 = (x - cx) ** 2 + (z - cz) ** 2; if (d2 < 1) return [ax + dx, ay + dy]; const w = 1 / (d2 + 400); wx += w * dx; wy += w * dy; ws += w; }
  return [ax + wx / ws, ay + wy / ws];
}
const MAP_K = Math.hypot(AFF[0][0], AFF[1][1]) / Math.SQRT2; // điểm ảnh / mét (xấp xỉ)
let mapImg = null;
function loadMapImg() {
  if (mapImg) return mapImg;
  mapImg = new Image();
  mapImg.src = MAP_IMG; // cùng kiểu đường dẫn với ảnh thumbs (bản Pages tự đổi gốc)
  return mapImg;
}
const trObj = (t) => trObjective(t);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// [id, icon, chữ Hán, tên {vi,en,zh}, ghi chú {vi,en,zh}, nhóm]
const PLACE_INFO = [
  ['square', 'village', '清風鎮', ['Trấn Thanh Phong', 'Pure Wind Town', '清風鎮'], ['Trung tâm trấn: người dân, chợ, nơi bắt đầu mọi chuyến đi.', 'Town centre: townsfolk, market, where every journey starts.', '鎮中心：鎮民、市集，一切旅程由此開始。'], 'town'],
  ['gate', 'door', '鎮門', ['Cổng trấn', 'Town gate', '鎮門'], ['Cửa ngõ phía nam. Vương lão bá gác cổng, hay kể chuyện cũ.', 'South entrance. Old Wang keeps the gate and knows old tales.', '南面入口。王老伯守門，熟知舊事。'], 'town'],
  ['inn', 'bag', '悅來客棧', ['Duyệt Lai khách điếm', 'Welcome Inn', '悅來客棧'], ['Mua bán, nghỉ ngơi hồi đầy máu, hỏi tin tức từ Lưu chưởng quỹ.', 'Buy and sell, rest to full HP, ask Shopkeeper Liu for news.', '買賣、休息回滿氣血，向劉掌櫃打聽消息。'], 'town'],
  ['home', 'home', '家園', ['Gia viên', 'Your home', '家園'], ['Nhà riêng của ngươi: bày trí, nâng cấp, nghỉ ngơi.', 'Your own house: decorate, upgrade, rest.', '你的住所：佈置、升級、休息。'], 'town'],
  ['pavilion', 'lotus', '望月亭', ['Vọng Nguyệt đình', 'Moonwatch Pavilion', '望月亭'], ['Đình ven hồ, nơi Lâm Uyển Nhi thường ngồi. (Chương Nhị)', "Lakeside pavilion where Lin Wan'er sits. (Chapter 2)", '湖畔小亭，林婉兒常坐於此。（第二章）'], 'story'],
  ['lake', 'wave', '碧水湖', ['Hồ Bích Thủy', 'Jade Water Lake', '碧水湖'], ['Hồ lớn. Học Lăng Ba Vi Bộ rồi giữ Shift để chạy trên mặt nước.', 'A wide lake. Learn Water Skimming, then hold Shift to run on water.', '大湖。學會凌波微步後按住 Shift 可踏水而行。'], 'story'],
  ['bamboo', 'cloud', '竹林', ['Rừng trúc', 'Bamboo Forest', '竹林'], ['Rừng phía tây bắc, có thám báo Hắc Phong trại canh giữ.', 'Northwest woods, watched by Black Wind scouts.', '西北竹林，有黑風寨探子把守。'], 'story'],
  ['chest', 'chest', '木箱', ['Rương gỗ', 'Wooden chest', '木箱'], ['Giữa rừng trúc. Cất Bích Thủy kiếm và thư của Lâm Thiên Hải. Bấm E để mở.', 'In the heart of the bamboo forest: the Jade Water Sword and a letter. Press E to open.', '竹林深處，藏有碧水劍與書信。按 E 打開。'], 'story'],
  ['camp', 'skull', '黑風寨', ['Hắc Phong trại', 'Black Wind Camp', '黑風寨'], ['Sào huyệt sơn tặc của Đồ Bá. Có lồng giam người. (Chương Tam)', "Tu Ba's bandit lair, with captives in cages. (Chapter 3)", '屠霸的山寨，關押著百姓。（第三章）'], 'story'],
  ['tomb', 'temple', '劍冢', ['Kiếm Mộ', 'Sword Tomb', '劍冢'], ['Trên núi tây, nơi chôn kiếm của các đời chưởng môn Thanh Phong.', 'On the western mountain, where Pure Wind masters lie with their swords.', '西山之上，清風歷代掌門埋劍之地。'], 'story'],
  ['battle', 'battle', '戰場', ['Chiến trường', 'Battlefield', '戰場'], ['Cùng đệ tử Thanh Phong đánh 3 đợt Huyết Ảnh Môn (hoạt động).', 'Fight three waves of the Blood Shadow Sect beside Pure Wind disciples (activity).', '與清風弟子並肩迎戰血影門三波攻勢（活動）。'], 'act'],
  ['ice', 'moon', '寒冰谷', ['Hàn Băng Cốc', 'Frost Valley', '寒冰谷'], ['Thung lũng tuyết phía nam. Hồi II bắt đầu ở đây.', 'Snowy valley to the south. Act II begins here.', '南方雪谷，第二幕由此開始。'], 'act2'],
  ['valley', 'ancient', '妖魔谷', ['Yêu Ma Cốc', 'Demon Valley', '妖魔谷'], ['Thung lũng đầy yêu ma, dấu vết Huyết Ảnh Môn.', 'A valley of demons and Blood Shadow traces.', '妖魔橫行之谷，血影門的蹤跡。'], 'act2'],
  ['fire', 'sun', '火焰山', ['Hỏa Diệm Sơn', 'Flame Mountain', '火焰山'], ['Núi lửa phía đông nam, trận cuối của Hồi II.', 'Volcano to the southeast, the last battle of Act II.', '東南火山，第二幕的最終決戰。'], 'act2'],
];
const XPLACES = { ...PLACES, ice: { x: -40, z: -245 }, valley: { x: 150, z: -120 }, fire: { x: 215, z: -215 } };
const GROUPS = { town: ['Trong trấn', 'In town', '鎮內'], story: ['Cốt truyện Hồi I', 'Act I story', '第一幕主線'], act: ['Hoạt động', 'Activities', '活動'], act2: ['Hồi II', 'Act II', '第二幕'] };
const ZONE_NAMES = { dongco: ['Pure Wind Meadow', '清風草原'], rungnam: ['Mushroom Forest', '蘑菇林'], bangho: ['Jade Water Shore', '碧水湖畔'], doigio: ['Windy Hills', '風丘'], thunglung: ['Demon Valley', '妖魔谷'], hangtuyet: ['Frost Valley', '寒冰谷'], hoason: ['Flame Mountain', '火焰山'] };
const L = (v) => (Array.isArray(v) ? (LANG === 'en' ? v[1] : LANG === 'zh' ? v[2] : v[0]) : v);
const T = (vi, en, zh) => L([vi, en, zh]);
const zoneName = (z) => (LANG === 'vi' ? z.name : ZONE_NAMES[z.id]?.[LANG === 'en' ? 0 : 1] || z.name);
const mobName = (id) => { const m = MONSTERS[id]; return LANG === 'zh' ? m.han : LANG === 'en' ? trData(m.name) || m.name : m.name; };

/** Vẽ nền bản đồ kiểu tranh màu (một lần, từ lưới độ cao có sẵn — nhanh). */
function paintBase(terrain) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const N = 256, img = g.createImageData(N, N);
  const h = (i, j) => terrain.heightAt((i / N - 0.5) * WORLD_SIZE, (j / N - 0.5) * WORLD_SIZE);
  const H = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = h(i + 0.5, j + 0.5);
  const L = PLACES.lake;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const v = H[j * N + i];
      const dx = (H[j * N + Math.min(N - 1, i + 1)] - H[j * N + Math.max(0, i - 1)]);
      const dz = (H[Math.min(N - 1, j + 1) * N + i] - H[Math.max(0, j - 1) * N + i]);
      const shade = Math.max(0.55, Math.min(1.25, 1 - dx * 0.035 + dz * 0.02));
      const x = (i / N - 0.5) * WORLD_SIZE, z = (j / N - 0.5) * WORLD_SIZE;
      let col;
      const lake = v < WATER_LEVEL + 0.2 && Math.hypot(x - L.x, (z - L.z) * 1.25) < L.r * 1.45;
      if (lake) col = v < WATER_LEVEL - 2 ? [74, 150, 196] : [118, 186, 214];
      else if (v > 95) col = [244, 246, 250];
      else if (v > 45) col = [150 - (v - 45) * 0.3, 132 - (v - 45) * 0.2, 110];
      else if (v > 22) col = [124, 150, 86];
      else col = [146 + v * 0.6, 186 - v * 0.4, 96];
      const sp = terrain.splatAt(x, z);
      if (!lake && sp.forest > 0.3) col = [col[0] * 0.82, col[1] * 0.9, col[2] * 0.8];
      const o = (j * N + i) * 4;
      img.data[o] = col[0] * shade; img.data[o + 1] = col[1] * shade; img.data[o + 2] = col[2] * shade; img.data[o + 3] = 255;
    }
  }
  const small = document.createElement('canvas');
  small.width = small.height = N;
  small.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingQuality = 'high';
  g.drawImage(small, 0, 0, S, S);
  const P = (x, z) => [((x + WORLD_SIZE / 2) / WORLD_SIZE) * S, ((z + WORLD_SIZE / 2) / WORLD_SIZE) * S];

  // viền bờ hồ
  g.save();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  g.restore();

  // núi: biểu tượng tam giác mực có tuyết
  const r = rng(77);
  for (let k = 0; k < 420; k++) {
    const x = (r() - 0.5) * WORLD_SIZE, z = (r() - 0.5) * WORLD_SIZE;
    const v = terrain.heightAt(x, z);
    if (v < 40) continue;
    const [px, py] = P(x, z), s = 10 + Math.min(18, (v - 40) * 0.18) + r() * 6;
    g.fillStyle = 'rgba(70,58,48,.85)';
    g.beginPath(); g.moveTo(px - s, py + s * 0.5); g.lineTo(px, py - s); g.lineTo(px + s, py + s * 0.5); g.closePath(); g.fill();
    g.fillStyle = 'rgba(140,124,104,.9)';
    g.beginPath(); g.moveTo(px, py - s); g.lineTo(px + s, py + s * 0.5); g.lineTo(px + s * 0.25, py + s * 0.5); g.closePath(); g.fill();
    if (v > 75) { g.fillStyle = '#fbfbff'; g.beginPath(); g.moveTo(px - s * 0.35, py - s * 0.3); g.lineTo(px, py - s); g.lineTo(px + s * 0.35, py - s * 0.3); g.closePath(); g.fill(); }
  }
  // cây: chấm tán tròn trong vùng rừng
  for (let k = 0; k < 1400; k++) {
    const x = (r() - 0.5) * WORLD_SIZE * 0.95, z = (r() - 0.5) * WORLD_SIZE * 0.95;
    const v = terrain.heightAt(x, z), sp = terrain.splatAt(x, z);
    const d = Math.hypot(x, z);
    if (v < 1 || v > 45 || sp.path > 0.2 || sp.paved > 0.1) continue;
    if (d < 160 && r() > 0.25) continue;
    if (Math.hypot(x - PLACES.square.x, z - PLACES.square.z - 15) < 90) continue;
    const [px, py] = P(x, z), s = 3 + r() * 3;
    g.fillStyle = 'rgba(60,40,20,.5)'; g.fillRect(px - 0.6, py, 1.2, s);
    g.fillStyle = r() < 0.12 ? '#d0503a' : r() < 0.5 ? '#3f7a32' : '#56923c';
    g.beginPath(); g.arc(px, py, s, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(px - s * 0.3, py - s * 0.3, s * 0.45, 0, Math.PI * 2); g.fill();
  }
  // đường đất
  g.lineCap = g.lineJoin = 'round';
  for (const p of PATHS) {
    const path = () => { g.beginPath(); p.pts.forEach(([x, z], i) => { const [px, py] = P(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); };
    g.strokeStyle = 'rgba(90,60,30,.55)'; g.lineWidth = p.width * 1.6 + 3; path(); g.stroke();
    g.strokeStyle = '#e8c890'; g.lineWidth = p.width * 1.6; path(); g.stroke();
  }
  // trấn
  const [tx, ty] = P(PLACES.square.x, PLACES.square.z);
  g.fillStyle = 'rgba(232,210,170,.9)'; g.strokeStyle = 'rgba(120,80,40,.7)'; g.lineWidth = 2;
  g.beginPath(); g.arc(tx, ty, 28, 0, Math.PI * 2); g.fill(); g.stroke();
  // giấy dó: vân + viền tối
  const vg = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(70,40,15,.55)');
  g.fillStyle = vg; g.fillRect(0, 0, S, S);
  // la bàn
  g.save(); g.translate(S - 80, S - 80);
  g.fillStyle = 'rgba(250,240,215,.85)'; g.beginPath(); g.arc(0, 0, 50, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#7a4a22'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#b32a26'; g.beginPath(); g.moveTo(0, -42); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fill();
  g.fillStyle = '#5a3a1e'; g.beginPath(); g.moveTo(0, 42); g.lineTo(8, 0); g.lineTo(-8, 0); g.closePath(); g.fill();
  g.font = '22px "Ma Shan Zheng"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3a2410';
  [['北', 0, -62], ['南', 0, 64], ['東', 64, 0], ['西', -64, 0]].forEach(([t, x, y]) => g.fillText(t, x, y));
  g.restore();
  return c;
}

Object.assign(UI.prototype, {
  openMap(g) {
    const box = $('worldmap');
    box.classList.remove('hidden');
    const img = loadMapImg();
    if (!img.complete) { img.onload = () => { if (!box.classList.contains('hidden')) this.openMap(g); }; }
    const cv = $('map-canvas');
    cv.width = W; cv.height = H;
    $('map-stage').style.width = W + 'px'; $('map-stage').style.height = H + 'px';
    if (img.complete && img.naturalWidth) cv.getContext('2d').drawImage(img, 0, 0, W, H);
    else { if (!this.mapBase) this.mapBase = paintBase(g.terrain); cv.getContext('2d').drawImage(this.mapBase, 0, 0, W, H); }
    const P = worldToMap;
    const lbl = (x, z, cls, inner, data = '') => { const [px, py] = P(x, z); return `<div class="map-lbl ${cls}" style="left:${px}px;top:${py}px" ${data}>${inner}</div>`; };

    // đường chỉ tới mục tiêu (vẽ lên canvas, mỗi lần mở)
    const mk = g.markerPos();
    const p = g.player.pos;
    const cg = cv.getContext('2d');
    if (mk) {
      const [ax, ay] = P(p.x, p.z), [bx, by] = P(mk.x, mk.z);
      cg.save(); cg.lineCap = 'round';
      cg.strokeStyle = 'rgba(40,20,5,.55)'; cg.lineWidth = 7; cg.setLineDash([2, 12]);
      cg.beginPath(); cg.moveTo(ax, ay); cg.lineTo(bx, by); cg.stroke();
      cg.strokeStyle = '#ffd36a'; cg.lineWidth = 4;
      cg.beginPath(); cg.moveTo(ax, ay); cg.lineTo(bx, by); cg.stroke();
      cg.restore();
    }
    const near = (x, z) => PLACE_INFO.some(([id]) => Math.hypot(XPLACES[id].x - x, XPLACES[id].z - z) < 12);
    const cur = g.chapter?.subtitle;

    // nhãn: số thứ tự + chữ Hán + tên theo ngôn ngữ
    let html = PLACE_INFO.map(([id, ic, hz, nm, , grp], i) => {
      if (id === 'chest' && !(g.step?.interact?.chest && !g.chestOpened)) return ''; // chỉ hiện khi đang tìm rương
      const hot = nm[0] === cur ? ' hot' : '';
      return lbl(XPLACES[id].x, XPLACES[id].z, `place g-${grp}${hot}`, `<div class="pin">${icon(ic)}<i class="no">${i + 1}</i></div>${LANG === 'zh' ? '' : `<div class="hz">${hz}</div>`}<div class="vi">${esc(L(nm))}</div>`, `data-i="p${i}"`);
    }).join('');
    html += ZONES.map((z, i) => {
      const lv = z.mobs.map((m) => MONSTERS[m].lv), lvT = `Lv.${Math.min(...lv)}–${Math.max(...lv)}`;
      const ring = `<div class="ring" style="width:${z.r * 2 * MAP_K}px;height:${z.r * 2 * MAP_K}px"></div>`;
      if (near(z.x, z.z)) return lbl(z.x, z.z, 'zone ring-only', ring, `data-i="z${i}"`);
      return lbl(z.x, z.z, 'zone', `${ring}<div class="pin">${icon(z.elite ? 'dragon' : 'skull')}</div><div class="vi">${esc(zoneName(z))} · ${lvT}</div>`, `data-i="z${i}"`);
    }).join('');
    let objT = '';
    try { objT = g.step?.objective?.(g) || ''; } catch { objT = ''; }
    if (mk) html += lbl(mk.x, mk.z, 'quest', `<div class="pin">${icon('star')}</div><div class="vi">${T('Mục tiêu', 'Objective', '目標')}</div>`);
    html += lbl(p.x, p.z, 'me', `<div class="pin" style="transform:rotate(${-g.player.yaw + Math.PI}rad)">${icon('dash')}</div><div class="vi">${esc(g.profile.name)}</div>`);
    if (g.auto.dest) html += lbl(g.auto.dest.x, g.auto.dest.z, 'dest', `<div class="pin">${icon('plus')}</div>`);
    $('map-labels').innerHTML = html;

    // cột bên: mục tiêu hiện tại + danh sách địa danh có ghi chú
    const side = $('map-side');
    const dist = (x, z) => Math.round(Math.hypot(x - p.x, z - p.z));
    let sh = '';
    if (mk) sh += `<div class="ms-obj"><div class="ms-k">${T('Nhiệm vụ hiện tại', 'Current quest', '當前任務')}</div><b>${esc(trObj(g.ui.nh(objT)))}</b><small>${T('Cách', 'Distance', '距離')} ${dist(mk.x, mk.z)} ${T('trượng', 'm', '丈')} · ${T('đường vàng trên bản đồ', 'follow the gold line', '沿地圖金線前進')}</small><button class="primary sm" data-go="obj">${icon('dash')} ${T('Tự tìm đường', 'Auto-path', '自動尋路')}</button></div>`;
    for (const [grp, gname] of Object.entries(GROUPS)) {
      sh += `<div class="ms-g">${L(gname)}</div>`;
      PLACE_INFO.forEach(([id, ic, hz, nm, note, g2], i) => {
        if (g2 !== grp) return;
        const hot = nm[0] === cur ? ' hot' : '';
        sh += `<div class="ms-item${hot}" data-i="p${i}"><span class="ms-no">${i + 1}</span><div><b>${esc(L(nm))} <em>${hz}</em></b><p>${esc(L(note))}</p><small>${dist(XPLACES[id].x, XPLACES[id].z)} ${T('trượng', 'm', '丈')}${hot ? ` · <span class="ms-now">${T('chương đang chơi', 'current chapter', '當前章節')}</span>` : ''}</small></div></div>`;
      });
    }
    sh += `<div class="ms-g">${T('Khu săn quái', 'Hunting grounds', '狩獵區')}</div>`;
    ZONES.forEach((z, i) => {
      const lv = z.mobs.map((m) => MONSTERS[m].lv);
      sh += `<div class="ms-item zone" data-i="z${i}"><span class="ms-no">${icon(z.elite ? 'dragon' : 'skull')}</span><div><b>${esc(zoneName(z))} <em>${z.han}</em></b><p>Lv.${Math.min(...lv)}–${Math.max(...lv)} · ${z.mobs.slice(0, 4).map(mobName).join(', ')}…</p></div></div>`;
    });
    side.innerHTML = sh;

    // lướt + phóng to
    const wrap = $('map-wrap'), stage = $('map-stage');
    const fit = Math.min(wrap.clientWidth / W, wrap.clientHeight / H);
    const st = this.mapView ??= { z: Math.max(fit, 0.9), x: 0, y: 0 };
    const clampZ = (z) => Math.min(3, Math.max(fit * 0.9, z));
    const apply = () => {
      st.z = clampZ(st.z);
      const w = W * st.z, h = H * st.z;
      st.x = Math.min(Math.max(st.x, wrap.clientWidth - w - 60), 60);
      st.y = Math.min(Math.max(st.y, wrap.clientHeight - h - 60), 60);
      stage.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.z})`;
      stage.style.setProperty('--inv', 1 / st.z);
      stage.classList.toggle('far', st.z < 0.8);
    };
    const centerOn = (x, z) => { const [px, py] = P(x, z); st.x = wrap.clientWidth / 2 - px * st.z; st.y = wrap.clientHeight / 2 - py * st.z; apply(); };
    if (!st.init) { st.init = true; centerOn(p.x, p.z); } else apply();

    const zoomAt = (k, cx, cy) => {
      const r = wrap.getBoundingClientRect(), mx = cx - r.left, my = cy - r.top;
      const old = st.z; st.z = clampZ(st.z * k);
      st.x = mx - (mx - st.x) * (st.z / old); st.y = my - (my - st.y) * (st.z / old);
      apply();
    };
    wrap.onwheel = (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); };
    const pts = new Map();
    let pinch = 0;
    wrap.onpointerdown = (e) => { if (e.target.closest('.map-lbl, .map-tools, .map-info')) return; wrap.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); wrap.classList.add('grab'); };
    wrap.onpointermove = (e) => {
      const q = pts.get(e.pointerId);
      if (!q) return;
      if (pts.size === 2) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = d;
        return;
      }
      st.x += e.clientX - q.x; st.y += e.clientY - q.y;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      apply();
    };
    wrap.onpointerup = wrap.onpointercancel = (e) => { pts.delete(e.pointerId); pinch = 0; if (!pts.size) wrap.classList.remove('grab'); };
    $('map-zin').onclick = () => { const r = wrap.getBoundingClientRect(); zoomAt(1.3, r.left + r.width / 2, r.top + r.height / 2); };
    $('map-zout').onclick = () => { const r = wrap.getBoundingClientRect(); zoomAt(1 / 1.3, r.left + r.width / 2, r.top + r.height / 2); };
    $('map-me').onclick = () => centerOn(p.x, p.z);
    $('map-all').onclick = () => { st.z = fit; st.x = (wrap.clientWidth - W * fit) / 2; st.y = (wrap.clientHeight - H * fit) / 2; apply(); };

    // bấm địa danh (trên bản đồ hoặc cột bên): thông tin + tự tìm đường
    const info = $('map-info');
    info.classList.add('hidden');
    info.classList.add('no-i18n');
    const show = (k) => {
      const isZone = k[0] === 'z', i = Number(k.slice(1));
      let x, z, title, han, desc;
      if (isZone) {
        const zn = ZONES[i]; x = zn.x; z = zn.z; title = zoneName(zn); han = zn.han;
        desc = `${T('Quái', 'Monsters', '怪物')}: ${zn.mobs.map(mobName).join(', ')}${zn.elite ? `<br>${T('Tinh anh', 'Elite', '精英')}: <b>${mobName(zn.elite)}</b>` : ''}`;
      } else {
        const [id, , hz, nm, note] = PLACE_INFO[i]; x = XPLACES[id].x; z = XPLACES[id].z; title = L(nm); han = hz; desc = esc(L(note));
      }
      info.innerHTML = `<div class="mi-han">${han}</div><b>${esc(title)}</b><p>${desc}</p><small>${T('Cách', 'Distance', '距離')} ${dist(x, z)} ${T('trượng', 'm', '丈')}</small><button class="primary sm" id="map-go">${icon('dash')} ${T('Tự tìm đường', 'Auto-path', '自動尋路')}</button>`;
      info.classList.remove('hidden');
      centerOn(x, z);
      $('map-go').onclick = () => { g.auto.goTo(x, z, title); close(); };
    };
    $('map-labels').querySelectorAll('[data-i]').forEach((el) => (el.onclick = (e) => { e.stopPropagation(); show(el.dataset.i); }));
    side.querySelectorAll('[data-i]').forEach((el) => (el.onclick = () => show(el.dataset.i)));
    side.querySelector('[data-go]')?.addEventListener('click', () => { g.auto.goTo(mk.x, mk.z, T('Mục tiêu', 'Objective', '目標')); close(); });

    $('map-legend').classList.add('no-i18n');
    $('map-legend').innerHTML = [['pagoda', T('Địa danh (số = danh sách bên phải)', 'Place (number = list on the right)', '地點（編號對應右側列表）')], ['skull', T('Khu săn quái', 'Hunting ground', '狩獵區')], ['dragon', T('Có tinh anh', 'Elite inside', '有精英')], ['star', T('Mục tiêu nhiệm vụ', 'Quest objective', '任務目標')], ['dash', T('Vị trí của ngươi', 'You are here', '你的位置')]].map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('') + `<span class="muted">${T('Kéo để lướt · Cuộn/chụm để phóng to · Bấm địa danh để xem ghi chú và tự tìm đường', 'Drag to pan · Scroll/pinch to zoom · Click a place for notes and auto-path', '拖曳移動 · 滾輪/雙指縮放 · 點擊地點查看說明並自動尋路')}</span>`;
    const close = () => { box.classList.add('hidden'); removeEventListener('keydown', onKey, true); if (g.running && !g.paused) g.input.lock(); };
    const onKey = (e) => { if (e.code === 'Escape' || e.code === 'KeyM') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    $('map-close').onclick = close;
  },
});
