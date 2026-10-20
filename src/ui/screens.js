import * as THREE from 'three';
import { UI } from './ui.js';
import { icon } from './icons.js';
import { listProfiles, register, signIn, guest, saveProfile } from '../settings.js';
import { CLASSES, LOOK_OPTIONS, defaultHero } from '../game/classes.js';
import { ITEMS, SKILLS, expNeed, realmOf } from '../game/rpg.js';
import { WORLD_SIZE, PLACES, PATHS } from '../world/layout.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// biểu tượng khai báo bằng data-ico trong HTML
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-ico]').forEach((el) => { el.outerHTML = icon(el.dataset.ico); });
}

function petals(el, n = 26) {
  el.innerHTML = Array.from({ length: n }, () => {
    const l = Math.random() * 100, d = 8 + Math.random() * 10, dl = -Math.random() * 18, dx = (Math.random() - 0.3) * 30;
    const s = 0.6 + Math.random() * 0.9;
    return `<i style="left:${l}%;animation-duration:${d}s;animation-delay:${dl}s;--dx:${dx}vw;transform:scale(${s})"></i>`;
  }).join('');
}

Object.assign(UI.prototype, {
  decorate() {
    document.querySelectorAll('.petals').forEach((p) => petals(p));
    hydrateIcons();
  },

  // ───────────── ĐĂNG NHẬP ─────────────
  login() {
    return new Promise((resolve) => {
      $('login').classList.remove('hidden');
      this.fade(false);
      let mode = 'in';
      const err = (t) => { $('login-err').textContent = t || ''; };
      document.querySelectorAll('#login .tab').forEach((t) => (t.onclick = () => {
        mode = t.dataset.tab;
        document.querySelectorAll('#login .tab').forEach((x) => x.classList.toggle('on', x === t));
        document.querySelectorAll('#login .up-only').forEach((x) => x.classList.toggle('hidden', mode !== 'up'));
        $('login-go').textContent = mode === 'in' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ';
        err();
      }));
      const profiles = listProfiles().filter((p) => p.account);
      $('login-profiles').innerHTML = profiles.length ? `<div class="recent">Tài khoản gần đây</div>${profiles.slice(0, 3).map((p) => `<button class="profile-row" data-a="${esc(p.account)}">${icon('user')}<b>${esc(p.name)}</b><small>${p.hero ? CLASSES[p.hero.cls]?.name || '' : 'chưa tạo nhân vật'}</small></button>`).join('')}` : '';
      $('login-profiles').querySelectorAll('.profile-row').forEach((b) => (b.onclick = () => { $('login-acc').value = b.dataset.a; $('login-pass').focus(); }));
      const done = (prof) => { $('login').classList.add('hidden'); resolve(prof); };
      const go = async () => {
        const acc = $('login-acc').value.trim(), pass = $('login-pass').value;
        if (mode === 'up') {
          if (pass !== $('login-pass2').value) return err('Mật khẩu nhập lại không khớp.');
          const e = await register(acc, pass);
          if (e) return err(e);
        }
        const r = await signIn(acc, pass);
        if (typeof r === 'string') return err(r);
        done(r);
      };
      $('login-go').onclick = go;
      $('login-pass').onkeydown = $('login-pass2').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      $('login-guest').onclick = () => done(guest());
      setTimeout(() => $('login-acc').focus(), 300);
    });
  },

  // ───────────── TẠO NHÂN VẬT ─────────────
  /** preview(hero) dựng nhân vật xem trước trong cảnh 3D; trả về Promise<hero> */
  createCharacter(initial, preview, { editOnly = false } = {}) {
    const h = { ...defaultHero(), ...(initial || {}) };
    return new Promise((resolve) => {
      $('create').classList.remove('hidden');
      $('cr-title').textContent = editOnly ? 'Nhân vật & thời trang' : 'Chọn môn phái';
      $('cr-go').textContent = editOnly ? 'Lưu thay đổi' : 'Tạo nhân vật';
      $('cr-name').classList.toggle('hidden', editOnly);
      $('cr-name').value = initial?.name || '';
      let tab = 'hair';
      const refresh = () => { preview(h); renderInfo(); renderCustom(); };
      const renderClasses = () => {
        $('cr-classes').innerHTML = Object.entries(CLASSES).map(([id, c]) => `
          <button class="cls ${h.cls === id ? 'on' : ''}" data-c="${id}" ${editOnly ? 'disabled' : ''} style="--c:${c.color}">
            <span class="emblem">${icon(c.icon)}</span><span class="nm">${c.name}</span><span class="hz">${c.han}</span>
          </button>`).join('');
        $('cr-classes').querySelectorAll('.cls').forEach((b) => (b.onclick = () => { h.cls = b.dataset.c; renderClasses(); refresh(); }));
      };
      const bar = (v) => `<div class="statbar"><div style="width:${v * 20}%"></div></div>`;
      const renderInfo = () => {
        const c = CLASSES[h.cls];
        $('cr-info').innerHTML = `<div class="cls-han">${c.han}</div><h3>${c.name}</h3><p>${c.desc}</p>
          <div class="stats4"><span>Công</span>${bar(c.stats.atk)}<span>Thủ</span>${bar(c.stats.def)}<span>Tốc</span>${bar(c.stats.spd)}<span>Tầm</span>${bar(c.stats.range)}</div>
          <div class="cls-skills"><div>${icon('sword')}<b>Đòn thường</b>${c.attack === 'melee' ? 'Liên chiêu cận chiến' : c.attack === 'arrow' ? 'Bắn tên' : 'Chưởng khí'}</div>
          <div>${icon('dash')}<b>Q</b>${c.q.name}</div><div>${icon('palm')}<b>F</b>${c.f.name}</div></div>`;
      };
      const renderCustom = () => {
        const tabs = [['hair', 'Kiểu tóc', 'user'], ['color', 'Màu tóc', 'lotus'], ['outfit', 'Trang phục', 'shield'], ['fashion', 'Thời trang', 'star'], ['acc', 'Phụ kiện', 'bag']];
        let body = '';
        if (tab === 'hair') body = LOOK_OPTIONS.hair[h.gender].map((x) => `<button class="opt ${h.hair === x ? 'on' : ''}" data-k="hair" data-v="${x}">${icon('user')}<span>${LOOK_OPTIONS.hairLabel[x]}</span></button>`).join('');
        if (tab === 'color') body = LOOK_OPTIONS.hairColors.map((x) => `<button class="swatch ${h.hairColor === x ? 'on' : ''}" data-k="hairColor" data-v="${x}" style="background:${x}"></button>`).join('');
        if (tab === 'outfit') body = LOOK_OPTIONS.outfits[h.gender].map((x) => `<button class="opt ${h.outfit === x ? 'on' : ''}" data-k="outfit" data-v="${x}">${icon('shield')}<span>${LOOK_OPTIONS.outfitLabel[x]}</span></button>`).join('');
        if (tab === 'fashion') body = LOOK_OPTIONS.fashion.map((f) => `<button class="opt fashion ${h.fashion === f.id ? 'on' : ''}" data-k="fashion" data-v="${f.id}"><i class="dot" style="background:${f.color || 'linear-gradient(135deg,#6b5a3a,#2d3b2a)'}"></i><span>${f.name}</span>${f.price ? `<small>${icon('star')}${f.price}</small>` : ''}</button>`).join('');
        if (tab === 'acc') body = `<button class="opt ${h.hood ? 'on' : ''}" data-k="hood" data-v="${!h.hood}">${icon('shield')}<span>Mũ trùm</span></button>` + (h.gender === 'male' ? `<button class="opt ${h.beard ? 'on' : ''}" data-k="beard" data-v="${!h.beard}">${icon('user')}<span>Râu</span></button>` : '');
        $('cr-custom').innerHTML = `<div class="ctabs">${tabs.map(([id, n, ic]) => `<button class="${tab === id ? 'on' : ''}" data-t="${id}">${icon(ic)}<span>${n}</span></button>`).join('')}</div><div class="cbody">${body}</div>`;
        $('cr-custom').querySelectorAll('.ctabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.t; renderCustom(); }));
        $('cr-custom').querySelectorAll('.cbody button').forEach((b) => (b.onclick = () => {
          let v = b.dataset.v;
          if (v === 'true' || v === 'false') v = v === 'true';
          h[b.dataset.k] = v;
          refresh();
        }));
      };
      document.querySelectorAll('#cr-gender button').forEach((b) => {
        b.classList.toggle('on', b.dataset.g === h.gender);
        b.onclick = () => {
          h.gender = b.dataset.g;
          if (!LOOK_OPTIONS.hair[h.gender].includes(h.hair)) h.hair = LOOK_OPTIONS.hair[h.gender][0];
          document.querySelectorAll('#cr-gender button').forEach((x) => x.classList.toggle('on', x === b));
          refresh();
        };
      });
      $('cr-go').onclick = () => {
        const name = $('cr-name').value.trim();
        if (!editOnly && !name) { $('cr-name').focus(); $('cr-name').classList.add('shake'); setTimeout(() => $('cr-name').classList.remove('shake'), 400); return; }
        $('create').classList.add('hidden');
        resolve({ ...h, name: editOnly ? initial.name : name });
      };
      renderClasses();
      refresh();
    });
  },

  // ───────────── BẢN ĐỒ GIANG HỒ ─────────────
  openMap(g) {
    $('worldmap').classList.remove('hidden');
    const cv = $('map-canvas'), ctx = cv.getContext('2d'), S = cv.width;
    const toPx = (x, z) => [((x + WORLD_SIZE / 2) / WORLD_SIZE) * S, ((z + WORLD_SIZE / 2) / WORLD_SIZE) * S];
    if (!this.mapBg) {
      // vẽ một lần: giấy dó + núi mực + hồ + đường
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const m = c.getContext('2d');
      const img = m.createImageData(S, S), t = g.terrain;
      for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
        const x = (i / S - 0.5) * WORLD_SIZE, z = (j / S - 0.5) * WORLD_SIZE;
        const h = t.heightAt(x, z), n = t.normalAt(x, z);
        const shade = 0.75 + n.x * 0.5 - n.z * 0.15; // đổ bóng sườn núi
        let col = [233, 220, 190];
        if (h > 18) { const k = Math.min(1, (h - 18) / 70); col = col.map((v, q) => v * (1 - k * 0.55) + [40, 34, 28][q] * k * 0.55); }
        col = col.map((v) => v * Math.min(1.08, shade));
        if (t.splatAt(x, z).forest > 0.3 || (h > 6 && h < 40 && Math.sin(x * 0.7) * Math.cos(z * 0.7) > 0.6)) col = col.map((v) => v * 0.92);
        if (h < -0.6 && Math.hypot(x - PLACES.lake.x, (z - PLACES.lake.z) * 1.25) < PLACES.lake.r * 1.4) col = [150, 178, 170];
        const grain = (Math.random() - 0.5) * 10;
        img.data.set([col[0] + grain, col[1] + grain, col[2] + grain, 255], (j * S + i) * 4);
      }
      m.putImageData(img, 0, 0);
      m.lineCap = m.lineJoin = 'round';
      for (const p of PATHS) {
        m.strokeStyle = 'rgba(110,70,40,.75)';
        m.lineWidth = p.width * 0.9;
        m.setLineDash([10, 7]);
        m.beginPath();
        p.pts.forEach(([x, z], i) => { const [px, pz] = toPx(x, z); i ? m.lineTo(px, pz) : m.moveTo(px, pz); });
        m.stroke();
      }
      m.setLineDash([]);
      // viền giấy cháy + la bàn
      const gr = m.createRadialGradient(S / 2, S / 2, S * 0.35, S / 2, S / 2, S * 0.72);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(60,35,15,.55)');
      m.fillStyle = gr; m.fillRect(0, 0, S, S);
      m.save(); m.translate(S - 90, S - 90);
      m.strokeStyle = '#5a3a1e'; m.fillStyle = '#5a3a1e'; m.lineWidth = 2;
      m.beginPath(); m.arc(0, 0, 46, 0, Math.PI * 2); m.stroke();
      m.font = '28px "Ma Shan Zheng"'; m.textAlign = 'center'; m.textBaseline = 'middle';
      [['北', 0, -64], ['南', 0, 64], ['東', 64, 0], ['西', -64, 0]].forEach(([c, x, y]) => m.fillText(c, x, y));
      m.beginPath(); m.moveTo(0, -40); m.lineTo(8, 0); m.lineTo(0, 40); m.lineTo(-8, 0); m.closePath(); m.fill();
      m.restore();
      m.font = '64px "Ma Shan Zheng"'; m.fillStyle = 'rgba(60,30,15,.55)'; m.textAlign = 'left';
      m.fillText('碧水湖', toPx(PLACES.lake.x - 40, PLACES.lake.z + 20)[0], toPx(PLACES.lake.x - 40, PLACES.lake.z + 20)[1]);
      m.font = '42px "Ma Shan Zheng"'; m.fillStyle = 'rgba(40,30,20,.45)';
      m.fillText('群山', toPx(250, -250)[0], toPx(250, -250)[1]);
      m.fillText('群山', toPx(-320, 160)[0], toPx(-320, 160)[1]);
      this.mapBg = c;
    }
    ctx.drawImage(this.mapBg, 0, 0);
    // nhãn địa danh dạng HTML
    const places = [
      ['gate', 'door', '清風鎮', 'Cổng Thanh Phong'], ['inn', 'bag', '悅來客棧', 'Duyệt Lai khách điếm'], ['square', 'star', '廣場', 'Quảng trường'],
      ['pavilion', 'lotus', '望月亭', 'Vọng Nguyệt đình'], ['lake', 'wave', '碧水湖', 'Hồ Bích Thủy'], ['bamboo', 'cloud', '竹林', 'Rừng trúc'],
      ['camp', 'skull', '黑風寨', 'Hắc Phong trại'], ['tomb', 'sword', '劍冢', 'Kiếm Mộ'],
    ];
    const rect = cv.getBoundingClientRect(), wrap = $('map-labels').getBoundingClientRect();
    const k = rect.width / S, ox = rect.left - wrap.left, oy = rect.top - wrap.top;
    const pos = (x, z) => { const [px, pz] = toPx(x, z); return `left:${ox + px * k}px;top:${oy + pz * k}px`; };
    const mk = g.markerPos();
    let html = places.map(([id, ic, hz, vi]) => `<div class="map-lbl" style="${pos(PLACES[id].x, PLACES[id].z)}"><div class="pin">${icon(ic)}</div><div class="hz">${hz}</div><div class="vi">${vi}</div></div>`).join('');
    if (mk) html += `<div class="map-lbl quest" style="${pos(mk.x, mk.z)}"><div class="pin">${icon('star')}</div><div class="vi">Mục tiêu</div></div>`;
    const p = g.player.pos;
    html += `<div class="map-lbl me" style="${pos(p.x, p.z)}"><div class="pin" style="transform:rotate(${-g.player.yaw + Math.PI}rad)">${icon('dash')}</div><div class="vi">${esc(g.profile.name)}</div></div>`;
    $('map-labels').innerHTML = html;
    $('map-legend').innerHTML = [['door', 'Cổng trấn'], ['bag', 'Khách điếm · tiệm'], ['lotus', 'Đình'], ['skull', 'Sào huyệt địch'], ['sword', 'Kiếm Mộ'], ['star', 'Mục tiêu nhiệm vụ'], ['dash', 'Vị trí của ngươi']].map(([i, t]) => `<span>${icon(i)}${t}</span>`).join('') + '<span class="muted">· M hoặc Esc để đóng</span>';
    const close = () => { $('worldmap').classList.add('hidden'); removeEventListener('keydown', onKey, true); if (g.running && !g.paused) g.input.lock(); };
    const onKey = (e) => { if (e.code === 'Escape' || e.code === 'KeyM') { e.stopPropagation(); close(); } };
    addEventListener('keydown', onKey, true);
    $('map-close').onclick = close;
  },

  // ───────────── TÚI ĐỒ & TRANG BỊ ─────────────
  openBag(g, tab = 'all') {
    const r = g.rpg, p = g.player;
    const need = expNeed(r.level);
    const cell = (id, qty, owned) => {
      const it = ITEMS[id];
      const equipped = Object.values(r.equip).includes(id);
      return `<button class="cell q-${it.slot || it.type} ${equipped ? 'eq' : ''}" data-id="${id}" title="${esc(it.name)}">${icon(it.icon)}${qty > 1 ? `<span class="n">${qty}</span>` : ''}${equipped ? '<span class="e">Đ</span>' : ''}</button>`;
    };
    const items = [
      ...[...r.owned].map((id) => [id, 1]),
      ...Object.entries(r.bag).filter(([, n]) => n > 0),
    ].filter(([id]) => tab === 'all' || (tab === 'equip' ? ITEMS[id].type === 'equip' : ITEMS[id].type !== 'equip'));
    const slots = [['weapon', 'Vũ khí', 'sword'], ['armor', 'Y phục', 'shield'], ['trinket', 'Bội sức', 'lotus']];
    const body = this.openPanel('Túi đồ & trang bị', `
      <div class="bag">
        <div class="paperdoll">
          <div class="doll-head"><img src="${g.portraits.hero}" /><div><b>${esc(g.profile.name)}</b><small>${p.cls.name} · ${realmOf(r.level)}</small></div></div>
          ${slots.map(([s, n, ic]) => { const it = ITEMS[r.equip[s]]; return `<div class="eqslot">${icon(ic)}<div><small>${n}</small><b>${it ? it.name : '—'}</b></div></div>`; }).join('')}
          <div class="power">${icon('star')} Lực chiến <b>${Math.round(r.atk() * 40 + p.maxHp * 3 + p.maxMp * 2)}</b></div>
          <div class="statgrid">
            <span>Cấp</span><b>${r.level}</b><span>Kinh nghiệm</span><b>${r.exp}/${need}</b>
            <span>Khí huyết</span><b>${p.maxHp}</b><span>Nội lực</span><b>${p.maxMp}</b>
            <span>Công</span><b>${r.atk()}</b><span>Bạo kích</span><b>${Math.round(r.crit() * 100)}%</b>
            <span>Giảm sát thương</span><b>${Math.round(r.def() * 100)}%</b><span>Điểm võ học</span><b>${r.points}</b>
          </div>
        </div>
        <div class="bag-right">
          <div class="subtabs">${[['all', 'Toàn bộ'], ['equip', 'Trang bị'], ['items', 'Vật phẩm']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-t="${t}">${n}</button>`).join('')}<span class="gold">${icon('star')} ${r.gold} lượng</span></div>
          <div class="grid">${items.map(([id, n]) => cell(id, n)).join('')}${Array.from({ length: Math.max(0, 24 - items.length) }, () => '<div class="cell empty"></div>').join('')}</div>
          <div class="detail" id="bag-detail"><p class="muted">Chọn một vật phẩm để xem chi tiết.</p></div>
        </div>
      </div>`);
    body.querySelectorAll('.subtabs button').forEach((b) => (b.onclick = () => this.openBag(g, b.dataset.t)));
    body.querySelectorAll('.cell[data-id]').forEach((b) => (b.onclick = () => {
      const id = b.dataset.id, it = ITEMS[id];
      const equipped = Object.values(r.equip).includes(id);
      const act = it.type === 'equip' ? (equipped ? '<button class="ghost" disabled>Đang trang bị</button>' : '<button class="primary sm" data-do="equip">Trang bị</button>')
        : it.type === 'consumable' || id === 'herb' ? '<button class="primary sm" data-do="use">Sử dụng</button>' : '';
      const enh = it.type === 'equip' && it.slot === 'weapon' ? '<button class="ghost" data-do="enhance">Cường hoá</button>' : '';
      $('bag-detail').innerHTML = `<div class="dh">${icon(it.icon)}<div><b>${it.name}</b> <span class="han">${it.han}</span><small>${it.type === 'equip' ? { weapon: 'Vũ khí', armor: 'Y phục', trinket: 'Bội sức' }[it.slot] : it.type === 'consumable' ? 'Đan dược' : 'Nguyên liệu'}${r.enh?.[id] ? ` · +${r.enh[id]}` : ''}</small></div></div><p>${it.desc}</p><div class="acts">${act}${enh}</div>`;
      $('bag-detail').querySelector('[data-do="equip"]')?.addEventListener('click', () => { r.equipItem(id); this.openBag(g, tab); });
      $('bag-detail').querySelector('[data-do="use"]')?.addEventListener('click', () => { r.use(id); this.openBag(g, tab); });
      $('bag-detail').querySelector('[data-do="enhance"]')?.addEventListener('click', () => this.openEnhance(g, id));
    }));
    this.onPanelClose = () => g.running && !g.paused && g.input.lock();
  },

  // ───────────── CƯỜNG HOÁ ─────────────
  openEnhance(g, id) {
    const r = g.rpg, it = ITEMS[id];
    r.enh ??= {};
    const lv = r.enh[id] || 0;
    const cost = 40 + lv * 35, rate = Math.max(0.3, 1 - lv * 0.08);
    const body = this.openPanel('Cường hoá binh khí', `
      <div class="enh">
        <div class="enh-ring"><div class="enh-icon">${icon(it.icon)}</div><div class="enh-lv">+${lv}</div></div>
        <div class="enh-info">
          <h3>${it.name} <span class="han">${it.han}</span></h3>
          <div class="enh-row"><span>Cấp cường hoá</span><b>+${lv} → +${lv + 1}</b></div>
          <div class="enh-row"><span>Công</span><b>${(it.atk || 0) + lv * 3} → ${(it.atk || 0) + (lv + 1) * 3}</b></div>
          <div class="enh-row"><span>Tỉ lệ thành công</span><b>${Math.round(rate * 100)}%</b></div>
          <div class="enh-row"><span>Tiêu hao</span><b>${icon('star')} ${cost} lượng · ${icon('skull')} ${1 + Math.floor(lv / 2)} lệnh bài</b></div>
          <button class="primary" id="enh-go" ${lv >= 10 ? 'disabled' : ''}>${lv >= 10 ? 'Đã đạt tối đa' : 'Cường hoá'}</button>
          <div id="enh-msg"></div>
        </div>
      </div>`);
    body.querySelector('#enh-go').onclick = () => {
      const tokens = 1 + Math.floor(lv / 2);
      if (r.gold < cost || (r.bag.bounty || 0) < tokens) { $('enh-msg').textContent = 'Không đủ lượng bạc hoặc lệnh bài sơn tặc.'; return; }
      r.gold -= cost; r.remove('bounty', tokens);
      if (Math.random() < rate) {
        r.enh[id] = lv + 1;
        g.audio.levelUp();
        g.toast(`Cường hoá thành công! <b>${it.name} +${lv + 1}</b>`);
      } else {
        g.audio.clang();
        g.toast('Cường hoá thất bại...');
      }
      this.openEnhance(g, id);
    };
  },

  // ───────────── VÕ HỌC ─────────────
  openSkills(g) {
    const r = g.rpg, c = g.player.cls;
    const body = this.openPanel('Võ học', `
      <div class="sk-head">${icon(c.icon)}<div><b>${c.name}</b> <span class="han">${c.han}</span><small>Điểm võ học còn lại: <b>${r.points}</b> · Lên cấp để nhận thêm</small></div></div>
      <div class="skill-list">${Object.entries(SKILLS).map(([id, s]) => {
        const lv = r.skills[id] || 0;
        return `<div class="skill"><div class="ic">${icon(s.icon)}</div><div><b>${s.name}</b> <span class="han">${s.han}</span>
          <div class="pips">${Array.from({ length: s.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
          <p>${s.desc(lv)}${lv < s.max ? ` → <span class="up">${s.desc(lv + 1)}</span>` : ' (tối đa)'}</p></div>
          <button class="primary sm" data-s="${id}" ${r.points <= 0 || lv >= s.max ? 'disabled' : ''}>Lĩnh ngộ</button></div>`;
      }).join('')}</div>`);
    body.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { r.upgrade(b.dataset.s); this.openSkills(g); }));
    this.onPanelClose = () => g.running && !g.paused && g.input.lock();
  },

  // ───────────── TIỆM ─────────────
  openShop(g, tab = 'buy') {
    const r = g.rpg;
    const stock = ['potion', 'qipill', 'steel_sword', 'dao', 'leather', 'silk', 'charm'];
    const sellable = Object.entries(r.bag).filter(([id, n]) => n > 0 && ITEMS[id].sell);
    const body = this.openPanel('Tiệm Duyệt Lai', `
      <div class="subtabs">${[['buy', 'Mua'], ['sell', 'Bán']].map(([t, n]) => `<button class="${tab === t ? 'on' : ''}" data-t="${t}">${n}</button>`).join('')}<span class="gold">${icon('star')} ${r.gold} lượng</span></div>
      <div class="shop">${(tab === 'buy' ? stock.map((id) => [id, ITEMS[id].price]) : sellable.map(([id, n]) => [id, ITEMS[id].sell, n])).map(([id, price, n]) => {
        const it = ITEMS[id], owned = it.type === 'equip' && r.owned.has(id);
        return `<div class="ware"><div class="ic">${icon(it.icon)}</div><div class="wi"><b>${it.name}</b> <span class="han">${it.han}</span><small>${it.desc}</small></div>
          <div class="wp">${icon('star')}${price}${n ? ` <small>×${n}</small>` : ''}</div>
          <button class="primary sm" data-id="${id}" ${owned || (tab === 'buy' && r.gold < price) ? 'disabled' : ''}>${owned ? 'Đã có' : tab === 'buy' ? 'Mua' : 'Bán'}</button></div>`;
      }).join('') || '<p class="muted">Không có gì để bán. Lệnh bài sơn tặc và Linh chi thảo bán được ở đây.</p>'}</div>`);
    body.querySelectorAll('.subtabs button').forEach((b) => (b.onclick = () => this.openShop(g, b.dataset.t)));
    body.querySelectorAll('.ware button').forEach((b) => (b.onclick = () => { tab === 'buy' ? r.buy(b.dataset.id) : r.sell(b.dataset.id); this.openShop(g, tab); }));
    this.onPanelClose = () => g.running && !g.paused && g.input.lock();
  },
});

// Ghi đè line()/chapterCard() để hiện chữ Hán
const baseLine = UI.prototype.line;
UI.prototype.line = function (name, portrait, text, narrator, han = '') {
  $('dlg-han').textContent = han;
  return baseLine.call(this, name, portrait, text, narrator);
};
const baseCard = UI.prototype.chapterCard;
UI.prototype.chapterCard = function (title, sub, hanSub = '') {
  $('cc-han').textContent = hanSub;
  $('cc-han-sub').textContent = hanSub;
  return baseCard.call(this, title, sub);
};

export { saveProfile, THREE };
