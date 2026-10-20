import { UI } from './ui.js';
import { icon } from './icons.js';
import { WORLD_SIZE, PLACES, PATHS, WATER_LEVEL } from '../world/layout.js';
import { ZONES, MONSTERS } from '../game/bestiary.js';
import { rng } from '../world/noise.js';

const $ = (id) => document.getElementById(id);
const S = 1024; // độ phân giải bản đồ vẽ sẵn
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PLACE_INFO = [
  ['gate', 'door', '清風鎮', 'Cổng Thanh Phong', 'Cửa ngõ vào trấn. Lão gác cổng Vương lão bá.'],
  ['inn', 'bag', '悅來客棧', 'Duyệt Lai khách điếm', 'Tiệm, nghỉ ngơi, Lưu chưởng quỹ.'],
  ['pavilion', 'lotus', '望月亭', 'Vọng Nguyệt đình', 'Đình ven hồ, nơi Lâm Uyển Nhi thường ngồi.'],
  ['lake', 'wave', '碧水湖', 'Hồ Bích Thủy', 'Mặt hồ rộng, có thể chạy trên nước bằng Lăng Ba Vi Bộ.'],
  ['bamboo', 'cloud', '竹林', 'Rừng trúc', 'Rừng trúc tây bắc, nơi cất giấu Bích Thủy kiếm.'],
  ['camp', 'skull', '黑風寨', 'Hắc Phong trại', 'Sào huyệt sơn tặc. Phó bản Luyện Võ Trường.'],
  ['tomb', 'sword', '劍冢', 'Kiếm Mộ', 'Nơi chôn kiếm của Thanh Phong kiếm phái.'],
];

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
    if (!this.mapBase) this.mapBase = paintBase(g.terrain);
    const cv = $('map-canvas');
    cv.width = cv.height = S;
    cv.getContext('2d').drawImage(this.mapBase, 0, 0);
    const P = (x, z) => [((x + WORLD_SIZE / 2) / WORLD_SIZE) * S, ((z + WORLD_SIZE / 2) / WORLD_SIZE) * S];
    const lbl = (x, z, cls, inner, data = '') => { const [px, py] = P(x, z); return `<div class="map-lbl ${cls}" style="left:${px}px;top:${py}px" ${data}>${inner}</div>`; };

    // nhãn
    let html = PLACE_INFO.map(([id, ic, hz, vi], i) => lbl(PLACES[id].x, PLACES[id].z, 'place', `<div class="pin">${icon(ic)}</div><div class="hz">${hz}</div><div class="vi">${vi}</div>`, `data-i="p${i}"`)).join('');
    html += ZONES.map((z, i) => { const lv = z.mobs.map((m) => MONSTERS[m].lv); return lbl(z.x, z.z, 'zone', `<div class="ring" style="width:${(z.r * 2 / WORLD_SIZE) * S}px;height:${(z.r * 2 / WORLD_SIZE) * S}px"></div><div class="pin">${icon(z.elite ? 'dragon' : 'skull')}</div><div class="hz">${z.han}</div><div class="vi">${z.name} · Lv.${Math.min(...lv)}–${Math.max(...lv)}</div>`, `data-i="z${i}"`); }).join('');
    const mk = g.markerPos();
    if (mk) html += lbl(mk.x, mk.z, 'quest', `<div class="pin">${icon('star')}</div><div class="vi">Mục tiêu</div>`);
    const p = g.player.pos;
    html += lbl(p.x, p.z, 'me', `<div class="pin" style="transform:rotate(${-g.player.yaw + Math.PI}rad)">${icon('dash')}</div><div class="vi">${esc(g.profile.name)}</div>`);
    if (g.auto.dest) html += lbl(g.auto.dest.x, g.auto.dest.z, 'dest', `<div class="pin">${icon('plus')}</div>`);
    $('map-labels').innerHTML = html;

    // lướt + phóng to
    const wrap = $('map-wrap'), stage = $('map-stage');
    const fit = Math.min(wrap.clientWidth, wrap.clientHeight) / S;
    const st = this.mapView ??= { z: Math.max(fit, 0.9), x: 0, y: 0 };
    const clampZ = (z) => Math.min(3, Math.max(fit * 0.9, z));
    const apply = () => {
      st.z = clampZ(st.z);
      const w = S * st.z, h = S * st.z;
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
    $('map-all').onclick = () => { st.z = fit; st.x = (wrap.clientWidth - S * fit) / 2; st.y = (wrap.clientHeight - S * fit) / 2; apply(); };

    // bấm địa danh: thông tin + tự tìm đường
    const info = $('map-info');
    info.classList.add('hidden');
    $('map-labels').querySelectorAll('[data-i]').forEach((el) => (el.onclick = (e) => {
      e.stopPropagation();
      const k = el.dataset.i, isZone = k[0] === 'z', i = Number(k.slice(1));
      let x, z, title, han, desc;
      if (isZone) {
        const zn = ZONES[i]; x = zn.x; z = zn.z; title = zn.name; han = zn.han;
        desc = `Quái: ${zn.mobs.map((m) => MONSTERS[m].name).join(', ')}${zn.elite ? `<br>Tinh anh: <b>${MONSTERS[zn.elite].name}</b>` : ''}`;
      } else {
        const [id, , hz, vi, d] = PLACE_INFO[i]; x = PLACES[id].x; z = PLACES[id].z; title = vi; han = hz; desc = d;
      }
      const dist = Math.round(Math.hypot(x - p.x, z - p.z));
      info.innerHTML = `<div class="mi-han">${han}</div><b>${title}</b><p>${desc}</p><small>Cách ${dist} trượng</small><button class="primary sm" id="map-go">${icon('dash')} Tự tìm đường</button>`;
      info.classList.remove('hidden');
      $('map-go').onclick = () => { g.auto.goTo(x, z, title); close(); };
    }));

    $('map-legend').innerHTML = [['door', 'Cổng trấn'], ['bag', 'Khách điếm'], ['skull', 'Khu săn quái'], ['dragon', 'Có tinh anh'], ['star', 'Mục tiêu'], ['dash', 'Vị trí của ngươi']].map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('') + '<span class="muted">Kéo để lướt · Cuộn/chụm để phóng to · Bấm địa danh để tự tìm đường</span>';
    const close = () => { box.classList.add('hidden'); removeEventListener('keydown', onKey, true); if (g.running && !g.paused) g.input.lock(); };
    const onKey = (e) => { if (e.code === 'Escape' || e.code === 'KeyM') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    $('map-close').onclick = close;
  },
});
