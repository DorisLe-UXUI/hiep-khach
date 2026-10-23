import { ITEMS } from '../game/rpg.js';
import { UI } from './ui.js';
import { icon, itemIcon } from './icons.js';
import { SLOTS, RARITY, STAT_NAME, fmtStat, gearScore, GEM_ITEMS, GEM_TYPES, GEM_MAX, socketsOf, parseGem, gemValue, gemId } from '../game/gear.js';
import { TITLES } from '../game/titles.js';
import { BEASTS, SKILL_TEXT, MAX_LV, expNeedBeast, WILD } from '../game/beasts.js';
import { ZONES } from '../game/bestiary.js';
import { MERIDIANS, pointValue, pointCost, pointRate } from '../game/meridian.js';

const $ = (id) => document.getElementById(id);
const statLines = (it, cmp) => Object.entries(it.stats).map(([k, v]) => {
  const val = v * (1 + it.enh * 0.08);
  const o = cmp ? (cmp.stats[k] || 0) * (1 + cmp.enh * 0.08) : null;
  const diff = o === null ? '' : val > o + 1e-6 ? '<i class="up">▲</i>' : val < o - 1e-6 ? '<i class="dn">▼</i>' : '';
  return `<div class="gs"><span>${STAT_NAME[k]}</span><b>${fmtStat(k, k === 'def' || k === 'crit' || k === 'spd' ? val : Math.round(val))}</b>${diff}</div>`;
}).join('');
const gcell = (it, extra = '') => {
  const R = RARITY[it.rarity];
  return `<button class="gcell r${it.rarity}" style="--rc:${R.color}" data-uid="${it.uid}" ${extra}>${it.thumb ? `<img class="thumb-img" src="/assets/thumbs/${it.thumb}.png" alt="" draggable="false" />` : icon(SLOTS.find((s) => s.id === it.slot).icon)}<span class="gh">${it.han}</span>${it.enh ? `<span class="ge">+${it.enh}</span>` : ''}<span class="gl">${it.lv}</span></button>`;
};

Object.assign(UI.prototype, {
  // ───────────── TRANG BỊ NGẪU NHIÊN ─────────────
  openGear(g, tab = 'gear', sel = null) {
    const r = g.rpg;
    if (tab === 'title') return this.openTitles(g);
    if (tab === 'gem') return this.openGems(g);
    const bag = [...r.gearBag].sort((a, b) => b.rarity - a.rarity || gearScore(b) - gearScore(a));
    const body = this.openPanel('Trang bị', `
      <div class="ctabs" style="--cols:3"><button data-tab="gear" class="on">${icon('crown')}Thần binh</button><button data-tab="gem" class="">${icon('nugget')}Bảo thạch</button><button data-tab="title" class="">${icon('trophy')}Danh hiệu</button></div>
      <div class="gear">
        <div class="gear-doll">
          <div class="gp">${icon('crown')} Lực chiến <b>${g.sys.power().toLocaleString('vi')}</b></div>
          <div class="gslots">${SLOTS.map((s) => { const it = r.gear[s.id]; return `<div class="gslot">${it ? gcell(it, 'data-eq="1"') : `<div class="gcell empty">${icon(s.icon)}</div>`}<small>${s.name}</small></div>`; }).join('')}</div>
          <div class="statgrid">${Object.keys(STAT_NAME).map((k) => `<span>${STAT_NAME[k]}</span><b>${fmtStat(k, r.stat(k))}</b>`).join('')}</div>
          <div class="gp sm">${itemIcon('essence', 'nugget')} Tinh thạch <b>${r.bag.essence || 0}</b> · ${icon('coins')} <b>${r.gold}</b></div>
        </div>
        <div class="gear-right">
          <div class="subtabs"><span>Kho trang bị <b>${bag.length}/60</b></span>
            <span class="rleg">${RARITY.map((R) => `<i style="color:${R.color}">■ ${R.name}</i>`).join('')}</span></div>
          <div class="ggrid">${bag.map((it) => gcell(it)).join('')}${Array.from({ length: Math.max(0, 30 - bag.length) }, () => '<div class="gcell empty"></div>').join('')}</div>
          <div class="gsalv">Phân giải tất cả dưới phẩm
            <select id="salv-r">${RARITY.slice(1).map((R) => `<option value="${R.id}" ${R.id === 2 ? 'selected' : ''}>${R.name}</option>`).join('')}</select>
            <button class="ghost sm" id="salv-go">${icon('anvil')} Phân giải</button></div>
          <div class="detail" id="g-detail"><p class="muted">Đánh quái có tỉ lệ rơi trang bị; quái <b style="color:#ff6a5a">Tinh anh</b> (tên "Hung…") và boss chắc chắn rơi. Chọn một món để xem, so sánh, mặc, cường hoá, tẩy luyện hoặc phân giải lấy Tinh thạch.</p></div>
        </div>
      </div>`);
    this.bindGearTabs(g, body);
    body.querySelector('#salv-go').onclick = () => {
      const n = r.salvageBelow(Number($('salv-r').value));
      g.toast(n ? `Phân giải nhận <b>${n}</b> Tinh thạch` : 'Không có món nào để phân giải', 1.6);
      if (n) g.audio.coin();
      this.openGear(g);
    };
    const show = (uid) => {
      const eq = Object.values(r.gear).find((x) => x?.uid === uid);
      const it = eq || r.gearBag.find((x) => x.uid === uid);
      if (!it) return;
      const R = RARITY[it.rarity], cur = !eq && r.gear[it.slot];
      const ec = r.gearEnhCost(it);
      body.querySelectorAll('.gcell.sel').forEach((x) => x.classList.remove('sel'));
      body.querySelectorAll(`[data-uid="${uid}"]`).forEach((x) => x.classList.add('sel'));
      $('g-detail').innerHTML = `
        <div class="gd-cols">
          <div class="gd" style="--rc:${R.color}">
            <div class="gd-h">${gcell(it)}<div><b style="color:${R.color}">${it.name}${it.enh ? ' +' + it.enh : ''}</b><small>${SLOTS.find((s) => s.id === it.slot).name} · Phẩm <span style="color:${R.color}">${R.name}</span> · Cấp ${it.lv}${eq ? ' · <em>Đang mặc</em>' : ''}</small></div></div>
            ${statLines(it, cur)}
            <div class="gs score"><span>Điểm trang bị</span><b>${gearScore(it).toLocaleString('vi')}</b>${cur ? (gearScore(it) > gearScore(cur) ? '<i class="up">▲</i>' : '<i class="dn">▼</i>') : ''}</div>
          </div>
          ${cur ? `<div class="gd cmp" style="--rc:${RARITY[cur.rarity].color}"><small class="muted">Đang mặc</small><b style="color:${RARITY[cur.rarity].color}">${cur.name}${cur.enh ? ' +' + cur.enh : ''}</b>${statLines(cur)}<div class="gs score"><span>Điểm</span><b>${gearScore(cur).toLocaleString('vi')}</b></div></div>` : ''}
        </div>
        ${socketsOf(it) ? `<div class="sockets"><small class="muted">Khảm ngọc:</small>${Array.from({ length: socketsOf(it) }, (_, i) => { const gid = it.gems?.[i], gi = GEM_ITEMS[gid]; return gi ? `<button class="sock full" style="--gc:${gi.color}" data-unsock="${i}" title="${gi.name}: ${STAT_NAME[gi.gem]} ${fmtStat(gi.gem, gemValue(gi.gem, gi.lv))} — bấm để tháo (20 lượng)">${itemIcon(gid)}</button>` : '<button class="sock" data-sock="1" title="Khảm bảo thạch">+</button>'; }).join('')}</div><div id="gem-pick"></div>` : '<p class="muted sm">Trang bị phẩm Tinh trở lên mới có lỗ khảm ngọc.</p>'}
        <div class="acts">
          ${eq ? '<button class="ghost sm" data-do="off">Tháo ra</button>' : '<button class="primary sm" data-do="on">Mặc vào</button>'}
          <button class="ghost sm" data-do="enh" ${it.enh >= 15 ? 'disabled' : ''}>${icon('anvil')} Cường hoá +${it.enh + 1} <small>(${ec.essence} tinh thạch · ${ec.gold} lượng · ${Math.round(Math.max(0.25, 1 - it.enh * 0.06) * 100)}%)</small></button>
          ${it.rarity ? `<button class="ghost sm" data-do="ref">${icon('sparkles')} Tẩy luyện <small>(${r.reforgeCost(it)} tinh thạch)</small></button>` : ''}
          ${eq ? '' : `<button class="ghost sm danger" data-do="salv">Phân giải <small>(+${Math.round([1, 2, 5, 12, 30][it.rarity] * (1 + it.lv / 10))})</small></button>`}
        </div><div id="g-msg" class="muted"></div>`;
      const msg = (t) => ($('g-msg').innerHTML = t);
      const act = (k, fn) => $('g-detail').querySelector(`[data-do="${k}"]`)?.addEventListener('click', fn);
      act('on', () => { r.equipGear(uid); g.hud.updateBadges(); this.openGear(g, 'gear', uid); });
      act('off', () => { r.unequipGear(it.slot); this.openGear(g, 'gear', uid); });
      act('salv', () => { const n = r.salvage(uid); g.toast(`Nhận <b>${n}</b> Tinh thạch`, 1.4); g.audio.coin(); this.openGear(g); });
      act('enh', () => {
        const ok = r.enhanceGear(it);
        if (ok === null) return msg('Không đủ Tinh thạch hoặc lượng bạc.');
        if (ok) { g.audio.levelUp(); g.fx.burst(g.player.pos.clone().setY(g.player.pos.y + 1.2), 0xffd27a, 24); }
        else g.audio.clang();
        this.openGear(g, 'gear', uid);
        msg(ok ? `<b style="color:#8aff8a">Cường hoá thành công! +${it.enh}</b>` : '<b style="color:#ff7a6a">Thất bại…</b> (không mất cấp)');
      });
      $('g-detail').querySelectorAll('[data-unsock]').forEach((b) => (b.onclick = () => { if (!r.unsocket(it, Number(b.dataset.unsock))) return msg('Cần 20 lượng để tháo ngọc.'); g.audio.sfx('latch'); this.openGear(g, 'gear', uid); }));
      $('g-detail').querySelector('[data-sock]')?.addEventListener('click', () => {
        const gems = Object.keys(GEM_ITEMS).filter((id) => r.bag[id] > 0).sort((a, b) => GEM_ITEMS[b].lv - GEM_ITEMS[a].lv);
        $('gem-pick').innerHTML = gems.length ? `<div class="gem-pick">${gems.map((id) => `<button class="ghost sm" data-gem="${id}">${itemIcon(id)}${STAT_NAME[GEM_ITEMS[id].gem]} ${fmtStat(GEM_ITEMS[id].gem, gemValue(GEM_ITEMS[id].gem, GEM_ITEMS[id].lv))} <small>×${r.bag[id]}</small></button>`).join('')}</div>` : '<p class="muted sm">Chưa có bảo thạch. Khai khoáng, đánh quái tinh anh và boss để nhận.</p>';
        $('gem-pick').querySelectorAll('[data-gem]').forEach((b) => (b.onclick = () => { if (r.socket(it, b.dataset.gem)) { g.audio.sfx('sparkle'); g.fx.burst(g.player.pos.clone().setY(g.player.pos.y + 1.2), 0xffffff, 14); } this.openGear(g, 'gear', uid); }));
      });
      act('ref', () => {
        if (!r.reforge(it)) return msg('Không đủ Tinh thạch.');
        g.audio.chime();
        this.openGear(g, 'gear', uid);
        msg('Đã tẩy luyện, thuộc tính phụ được đổ lại.');
      });
    };
    body.querySelectorAll('.gcell[data-uid]').forEach((b) => (b.onclick = () => show(b.dataset.uid)));
    if (sel) show(sel);
    this.relock(g);
  },

  bindGearTabs(g, body) {
    body.querySelectorAll('.ctabs [data-tab]').forEach((b) => (b.onclick = () => this.openGear(g, b.dataset.tab)));
  },

  // ───────────── BẢO THẠCH ─────────────
  openGems(g) {
    const r = g.rpg;
    const body = this.openPanel('Trang bị', `
      <div class="ctabs" style="--cols:3"><button data-tab="gear">${icon('crown')}Thần binh</button><button data-tab="gem" class="on">${icon('nugget')}Bảo thạch</button><button data-tab="title">${icon('trophy')}Danh hiệu</button></div>
      <p class="muted">Khảm bảo thạch vào lỗ trên trang bị (Tinh 1 lỗ · Hiếm 1 · Sử thi 2 · Truyền thuyết 3). Ba viên cùng loại cùng cấp hợp thành một viên cấp cao hơn, chỉ số gấp đôi cộng thêm.</p>
      <div class="gemlist">${Object.entries(GEM_TYPES).flatMap(([type, gt]) => Array.from({ length: GEM_MAX }, (_, i) => gemId(type, i + 1))).filter((id) => r.bag[id] > 0 || GEM_ITEMS[id].lv === 1).map((id) => { const gi = GEM_ITEMS[id], n = r.bag[id] || 0; return `
        <div class="gemrow">${itemIcon(id)}<div class="gi"><b style="color:${gi.color}">${gi.name}</b> <span class="han">${gi.han}</span><small>${STAT_NAME[gi.gem]} ${fmtStat(gi.gem, gemValue(gi.gem, gi.lv))} · có <b>${n}</b></small></div>
        ${gi.lv < GEM_MAX ? `<button class="ghost sm" data-comb="${id}" ${n >= 3 && r.gold >= 15 * gi.lv ? '' : 'disabled'} title="3 viên + ${15 * gi.lv} lượng">Hợp thành</button>` : ''}</div>`; }).join('')}</div>`);
    this.bindGearTabs(g, body);
    body.querySelectorAll('[data-comb]').forEach((b) => (b.onclick = () => { if (r.combineGem(b.dataset.comb)) { g.audio.levelUp(); g.toast(`Hợp thành <b>${GEM_ITEMS[gemId(parseGem(b.dataset.comb).type, parseGem(b.dataset.comb).lv + 1)].name}</b>!`, 2); } this.openGems(g); }));
    this.relock(g);
  },

  // ───────────── DANH HIỆU ─────────────
  openTitles(g) {
    const s = g.sys.s, got = s.titles || ['newbie'], r = g.rpg;
    const body = this.openPanel('Trang bị', `
      <div class="ctabs" style="--cols:3"><button data-tab="gear" class="">${icon('crown')}Thần binh</button><button data-tab="gem" class="">${icon('nugget')}Bảo thạch</button><button data-tab="title" class="on">${icon('trophy')}Danh hiệu</button></div>
      <p class="muted">Mỗi lúc chỉ đeo được một danh hiệu. Danh hiệu hiện trên đầu nhân vật và cộng chỉ số.</p>
      <div class="titles">${TITLES.map((t) => { const has = got.includes(t.id), on = r.title === t.id; return `
        <div class="title-row ${has ? '' : 'locked'} ${on ? 'on' : ''}">
          <div class="tb" style="--tc:${t.color}"><span class="han">${t.han}</span><b>${t.name}</b></div>
          <div class="ti"><small>${has ? 'Đã đạt' : 'Điều kiện: ' + t.req}</small><span>${Object.entries(t.stats).map(([k, v]) => `${STAT_NAME[k]} ${fmtStat(k, v)}`).join(' · ')}</span></div>
          <button class="${on ? 'ghost' : 'primary'} sm" data-t="${t.id}" ${has && !on ? '' : 'disabled'}>${on ? 'Đang đeo' : has ? 'Đeo' : icon('lock')}</button>
        </div>`; }).join('')}</div>`);
    this.bindGearTabs(g, body);
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { r.title = b.dataset.t; r.apply(); g.audio.chime(); this.openTitles(g); }));
    this.relock(g);
  },

  // ───────────── NGỰ THÚ: THÚ CƯỠI & LINH THÚ ─────────────
  openCompanions(g, tab = 'mount', sel = null) {
    const bs = g.beasts, r = g.rpg, st = bs.s;
    const ids = Object.keys(BEASTS).filter((id) => (tab === 'mount' ? BEASTS[id].mount : BEASTS[id].pet));
    sel = sel && ids.includes(sel) ? sel : (tab === 'mount' ? st.mount : st.pet) || ids[0];
    const d = BEASTS[sel], o = st.owned[sel], cur = tab === 'mount' ? st.mount : st.pet;
    const where = d.wild ? ZONES.filter((z) => WILD[z.id]?.includes(sel)).map((z) => z.name).join(', ') : '';
    const thumb = (id) => `/assets/thumbs/mon_b_${id}.png`;
    const bar = (v, max, c) => `<div class="statbar"><div style="width:${Math.min(100, (v / max) * 100)}%;${c ? 'background:' + c : ''}"></div></div>`;
    const info = tab === 'mount'
      ? `<div class="bst-stats"><span>Tốc độ</span>${bar(d.mount.speed * (1 + (o?.lv || 1) * 0.02), 2.6)}<b>×${(bs.lv(sel) ? (d.mount.speed / 1.6) * (1 + bs.lv(sel) * 0.02) : d.mount.speed / 1.6).toFixed(2)}</b>
          ${d.mount.def ? `<span>Hộ thể</span>${bar(d.mount.def, 0.1)}<b>-${d.mount.def * 100}%</b>` : ''}</div><p class="muted sm">Cưỡi càng xa càng lên cấp (mỗi cấp +2% tốc độ). Cho ăn <b>Thảo liệu</b> để lên nhanh.</p>`
      : `<div class="bst-stats"><span>Công</span>${bar(d.pet.atk, 2)}<b>${o ? g.companions.petAtk.call({ g, petId: sel }) : '—'}</b></div><p class="bst-skill">${icon('sparkles')} ${SKILL_TEXT[d.pet.skill]}</p><p class="muted sm">Linh thú cùng chủ đánh địch, lên cấp khi chủ diệt quái. Cho ăn <b>Linh thú đan</b> để lên nhanh.</p>`;
    const act = o
      ? `${cur === sel ? `<button class="ghost" disabled>${tab === 'mount' ? 'Đang dùng' : 'Đang theo'}</button>` : `<button class="primary" data-do="use">${tab === 'mount' ? 'Chọn làm thú cưỡi' : 'Cho xuất chiến'}</button>`}
         ${tab === 'mount' && cur === sel ? `<button class="primary" data-do="ride">${g.companions.riding ? 'Xuống' : 'Cưỡi ngay'} <kbd>H</kbd></button>` : ''}
         ${tab === 'pet' && cur === sel ? `<button class="ghost" data-do="rest">${g.sys.s.petOut === false ? 'Gọi ra' : 'Cho nghỉ'}</button>` : ''}
         <button class="ghost" data-do="feed" ${o.lv >= MAX_LV ? 'disabled' : ''}>${itemIcon(tab === 'mount' ? 'fodder' : 'beast_pill', tab === 'mount' ? 'herb' : 'flask')} Cho ăn <small>(có ${r.bag[tab === 'mount' ? 'fodder' : 'beast_pill'] || 0})</small></button>`
      : d.price ? `<button class="primary" data-do="buy" ${r.gold < d.price ? 'disabled' : ''}>${icon('coins')} Mua · ${d.price} lượng</button>`
      : `<p class="bst-wild">${icon('map')} Thú hoang ở <b>${where || 'ngoài hoang dã'}</b>. Đánh còn dưới 35% khí huyết, đến gần bấm <kbd>E</kbd> với <b>Ngự thú phù</b> (có ${r.bag.tame_charm || 0}).</p>`;
    const body = this.openPanel('Ngự thú', `
      <div class="ctabs" style="--cols:2"><button data-tab="mount" class="${tab === 'mount' ? 'on' : ''}">${icon('horse')}Thú cưỡi</button><button data-tab="pet" class="${tab === 'pet' ? 'on' : ''}">${icon('dog')}Linh thú</button></div>
      <div class="bst">
        <div class="bst-grid">${ids.map((id) => { const b = BEASTS[id], has = st.owned[id]; return `<button class="bst-cell ${id === sel ? 'on' : ''} ${has ? '' : 'locked'} ${b.rare || (b.price || 0) >= 2000 ? 'rare' : ''}" data-b="${id}"><img src="${thumb(id)}" alt="" onerror="this.style.display='none'" /><span class="han">${b.han}</span>${has ? `<i class="lv">${has.lv}</i>` : ''}${(tab === 'mount' ? st.mount : st.pet) === id ? '<i class="eq">✓</i>' : ''}</button>`; }).join('')}</div>
        <div class="bst-detail">
          <div class="bst-art"><img src="${thumb(sel)}" alt="" class="${o ? '' : 'silhouette'}" onerror="this.style.display='none'" /><span class="han huge">${d.han}</span></div>
          <h3>${d.name} ${o ? `<small>Cấp ${o.lv}/${MAX_LV}</small>` : ''}</h3>
          ${o && o.lv < MAX_LV ? `<div class="bst-exp">${bar(o.exp, expNeedBeast(o.lv), '#8affc0')}<small>${o.exp}/${expNeedBeast(o.lv)}</small></div>` : ''}
          <p class="muted">${d.desc}</p>
          ${info}
          <div class="acts">${act}</div>
          <p class="muted sm">${icon('coins')} ${r.gold} lượng · Đã có ${Object.keys(st.owned).length}/${Object.keys(BEASTS).length} thú</p>
        </div>
      </div>`);
    body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.openCompanions(g, b.dataset.tab)));
    body.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => this.openCompanions(g, tab, b.dataset.b)));
    const on = (k, fn) => body.querySelector(`[data-do="${k}"]`)?.addEventListener('click', fn);
    on('buy', () => { bs.buy(sel); this.openCompanions(g, tab, sel); });
    on('use', async () => {
      if (tab === 'mount') { const was = g.companions.riding; if (was) await g.companions.toggleMount(); st.mount = sel; if (was) await g.companions.toggleMount(); }
      else { st.pet = sel; g.sys.s.petOut = true; await g.companions.spawnPet(); }
      g.audio.chime();
      this.openCompanions(g, tab, sel);
    });
    on('ride', () => { this.closePanel(); g.toggleMount(); });
    on('rest', async () => { g.sys.s.petOut = g.sys.s.petOut === false; await g.companions.spawnPet(); this.openCompanions(g, tab, sel); });
    on('feed', () => { const it = bs.feed(sel); if (!it) g.toast('Hết thức ăn — mua ở Tạp hoá', 1.5); else g.fx.burst(g.player.pos.clone().setY(g.player.pos.y + 1), 0x8affc0, 16); this.openCompanions(g, tab, sel); });
    this.relock(g);
  },

  // ───────────── KINH MẠCH ─────────────
  openMeridian(g, mi = null) {
    const r = g.rpg, M = g.meridian, open = M.open;
    mi ??= Math.max(0, open.findIndex((n, i) => n < 6 && r.level >= MERIDIANS[i].lv));
    const m = MERIDIANS[mi], pi = open[mi], c = pointCost(mi, Math.min(pi, 5));
    const C = 200, R0 = 46, STEP = 24;
    const pos = (i, k) => { const a = -Math.PI / 2 + (i * Math.PI) / 4, rr = R0 + k * STEP; return [C + Math.cos(a) * rr, C + Math.sin(a) * rr]; };
    const svg = `<svg viewBox="-24 -24 448 448" class="mer-svg">
      <defs><radialGradient id="mer-bg"><stop offset="0" stop-color="#3a2a14"/><stop offset="1" stop-color="#0c0a08" stop-opacity="0"/></radialGradient>
      <filter id="mer-glow"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <circle cx="${C}" cy="${C}" r="196" fill="url(#mer-bg)"/>
      ${[1, 2, 3].map((k) => `<circle cx="${C}" cy="${C}" r="${R0 + k * STEP * 1.7}" fill="none" stroke="#5a4428" stroke-width="0.6" stroke-dasharray="2 5"/>`).join('')}
      ${MERIDIANS.map((mm, i) => { const n = open[i], lock = r.level < mm.lv;
        const pts = Array.from({ length: 6 }, (_, k) => pos(i, k));
        const [x0, y0] = pos(i, -1.2);
        return `<g class="mer-spoke ${i === mi ? 'sel' : ''} ${lock ? 'lock' : ''}" data-m="${i}">
          <polyline points="${[[x0, y0], ...pts].map((p) => p.join(',')).join(' ')}" fill="none" stroke="#4a3a24" stroke-width="3"/>
          ${n ? `<polyline points="${[[x0, y0], ...pts.slice(0, n)].map((p) => p.join(',')).join(' ')}" fill="none" stroke="${mm.color}" stroke-width="3" filter="url(#mer-glow)"/>` : ''}
          ${pts.map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${k < n ? 7 : 6}" fill="${k < n ? mm.color : '#1a140c'}" stroke="${k < n ? '#fff' : k === n && i === mi ? mm.color : '#6a5434'}" stroke-width="${k === n && i === mi ? 2.5 : 1.2}" ${k < n ? 'filter="url(#mer-glow)"' : ''}/>`).join('')}
          <text x="${pos(i, 6.4)[0]}" y="${pos(i, 6.4)[1] + 5}" text-anchor="middle" class="mer-lbl" fill="${lock ? '#8a7660' : mm.color}">${mm.han}</text>
        </g>`; }).join('')}
      <circle cx="${C}" cy="${C}" r="30" fill="#1a120a" stroke="#c8a060" stroke-width="1.5"/>
      <text x="${C}" y="${C - 2}" text-anchor="middle" class="mer-c">經脈</text>
      <text x="${C}" y="${C + 16}" text-anchor="middle" class="mer-n">${M.total()}/48</text>
    </svg>`;
    const lock = r.level < m.lv, need = mi > 0 && open[mi - 1] < 3;
    const body = this.openPanel('Kinh mạch', `
      <div class="mer">
        <div class="mer-left">${svg}<div class="mer-qi">${icon('qi')} Chân khí <b>${(r.zhenqi || 0).toLocaleString('vi')}</b> <small>· tích từ kinh nghiệm (35%)</small></div></div>
        <div class="mer-right">
          <h3 style="color:${m.color}">${m.name} <span class="han">${m.han}</span></h3>
          <p class="muted sm">Mỗi huyệt: <b>${STAT_NAME[m.stat]} ${fmtStat(m.stat, pointValue(mi, m.stat))}</b> · Thông toàn mạch thưởng thêm ${fmtStat(m.stat, pointValue(mi, m.stat) * 3)}</p>
          <ol class="mer-pts">${m.points.map((n, k) => `<li class="${k < pi ? 'done' : k === pi ? 'next' : ''}"><span>${n}</span>${k < pi ? '✓' : k === pi ? '◎' : ''}</li>`).join('')}</ol>
          ${pi >= 6 ? `<p class="mer-done">Đã đả thông toàn mạch!</p>`
            : lock ? `<p class="muted">${icon('lock')} Cần đạt cấp ${m.lv}</p>`
            : need ? `<p class="muted">${icon('lock')} Cần thông 3 huyệt ${MERIDIANS[mi - 1].name} trước</p>`
            : `<div class="enh-row"><span>Huyệt kế</span><b>${m.points[pi]}</b></div>
               <div class="enh-row"><span>Tỉ lệ</span><b>${Math.round(Math.min(1, pointRate(pi) + (r.meridianLuck || 0)) * 100)}%</b></div>
               <div class="enh-row"><span>Tiêu hao</span><b>${icon('qi')} ${c.qi} · ${icon('coins')} ${c.gold}</b></div>
               <button class="primary" id="mer-go">Vận công đả thông</button>`}
          <div id="mer-msg" class="muted sm"></div>
          <div class="mer-sum">${['hp', 'atk', 'mp', 'def', 'crit', 'spd'].map((k) => `<span>${STAT_NAME[k]}</span><b>${fmtStat(k, M.stat(k))}</b>`).join('')}</div>
        </div>
      </div>`);
    body.querySelectorAll('[data-m]').forEach((el) => el.addEventListener('click', () => this.openMeridian(g, Number(el.dataset.m))));
    body.querySelector('#mer-go')?.addEventListener('click', () => {
      const res = M.breakthrough(mi);
      if (res === 'ok') { g.audio.levelUp(); g.vfx.pillar(g.player.pos.clone(), parseInt(m.color.slice(1), 16), 5); this.openMeridian(g, mi); $('mer-msg').innerHTML = `<b style="color:#8aff8a">Đả thông ${m.points[pi]}!</b>`; }
      else if (res === 'fail') { g.audio.sfx('fail'); this.openMeridian(g, mi); $('mer-msg').innerHTML = '<b style="color:#ff7a6a">Chân khí nghịch loạn, xung huyệt thất bại!</b> (mất nửa chân khí, lần sau +10% tỉ lệ)'; }
      else $('mer-msg').textContent = res;
    });
    this.relock(g);
  },

  // ───────────── HỘP THƯ ─────────────
  openMail(g, after) {
    const list = g.sys.mails();
    const body = this.openPanel('Hộp thư', `<div class="mail-list">${list.map((m) => `
      <div class="mail ${m.claimed ? 'read' : ''}">
        <img class="mail-ic" src="/assets/ui/mail.png" alt="" />
        <div class="mail-b"><small>${m.from}</small><b>${m.title}</b><p>${m.body}</p>
          <div class="mail-rw">${Object.entries(m.reward).map(([k, v]) => `<span>${k === 'gold' ? itemIcon('gold') : itemIcon(k, ITEMS[k]?.icon)}<i>${v}</i></span>`).join('')}</div></div>
        <button class="${m.claimed ? 'ghost' : 'primary'} sm" data-mail="${m.id}" ${m.claimed ? 'disabled' : ''}>${m.claimed ? 'Đã nhận' : 'Nhận quà'}</button>
      </div>`).join('')}</div>`);
    body.querySelectorAll('[data-mail]').forEach((b) => (b.onclick = () => { const r = g.sys.claimMail(b.dataset.mail); if (r) { g.audio.coin(); g.toast('Nhận: ' + r, 3); } this.openMail(g, after); }));
    this.onPanelClose = () => after?.();
  },
});
