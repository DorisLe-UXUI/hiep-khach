import { ITEMS, realmOf, expNeed } from '../game/rpg.js';
import { CLASSES } from '../game/classes.js';
import { MESHY_DEFAULT } from '../actors/meshy.js';
import { MONSTERS } from '../game/bestiary.js';
import { ACHIEVEMENTS, GUILD } from '../game/systems.js';
import { UI } from './ui.js';
import { icon, itemIcon } from './icons.js';
import { SLOTS, RARITY, STAT_NAME, fmtStat, gearScore, GEM_ITEMS, GEM_TYPES, GEM_MAX, socketsOf, parseGem, gemValue, gemId } from '../game/gear.js';
import { TITLES, TITLE_BADGE } from '../game/titles.js';
import { BEASTS, SKILL_TEXT, MAX_LV, expNeedBeast, WILD } from '../game/beasts.js';
import { BOND_TIERS, STAGES, MAX_BOND } from '../game/bond.js';
import { ELEMENT_BY_ID } from '../game/loot.js';
import { ADV, ADV_LV, ADV_TEXT, FACTIONS, MERIT } from '../game/path.js';
import { ZONES } from '../game/bestiary.js';
import { MERIDIANS, pointValue, pointCost, pointRate } from '../game/meridian.js';

const $ = (id) => document.getElementById(id);
const statLines = (it, cmp) => Object.entries(it.stats).map(([k, v]) => {
  const val = v * (1 + it.enh * 0.08);
  const o = cmp ? (cmp.stats[k] || 0) * (1 + cmp.enh * 0.08) : null;
  const diff = o === null ? '' : val > o + 1e-6 ? '<i class="up">▲</i>' : val < o - 1e-6 ? '<i class="dn">▼</i>' : '';
  return `<div class="gs"><span>${STAT_NAME[k]}</span><b>${fmtStat(k, k === 'def' || k === 'crit' || k === 'spd' ? val : Math.round(val))}</b>${diff}</div>`;
}).join('');
/** ảnh 3D cho từng ô trang bị (vũ khí cũ chưa có ảnh riêng dùng ảnh kiếm) */
const EQ3D = { weapon: 'sk_atk', helm: 'eq_helm', armor: 'eq_armor', belt: 'eq_belt', boots: 'eq_boots', ring: 'eq_ring', trinket: 'eq_trinket' };
const gcell = (it, extra = '') => {
  const R = RARITY[it.rarity];
  const E = it.elem && ELEMENT_BY_ID[it.elem];
  return `<button class="gcell r${it.rarity} ${E ? 'divine' : ''}" style="--rc:${R.color};${E ? `--ec:#${E.color.toString(16).padStart(6, '0')};--eh:${E.hue}deg` : ''}" data-uid="${it.uid}" ${extra}><img class="thumb-img" src="${it.thumb ? `/assets/thumbs/${it.thumb}.png` : `/assets/ui/${EQ3D[it.slot]}.png`}" alt="" draggable="false" />${E ? `<span class="gel">${E.el}</span>` : ''}<span class="gh">${it.han}</span>${it.enh ? `<span class="ge">+${it.enh}</span>` : ''}<span class="gl">${it.lv}</span></button>`;
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
          <div class="gslots">${SLOTS.map((s) => { const it = r.gear[s.id]; return `<div class="gslot">${it ? gcell(it, 'data-eq="1"') : `<div class="gcell empty"><img class="slot-ghost" src="/assets/ui/${EQ3D[s.id]}.png" alt="" /></div>`}<small>${s.name}</small></div>`; }).join('')}</div>
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
          <img class="t-badge" src="/assets/ui/${TITLE_BADGE[t.id] || 'bd_bronze'}.png" alt="" />
          <div class="tb" style="--tc:${t.color}"><span class="han">${t.han}</span><b>${t.name}</b></div>
          <div class="ti"><small>${has ? 'Đã đạt' : 'Điều kiện: ' + t.req}</small><span>${Object.entries(t.stats).map(([k, v]) => `${STAT_NAME[k]} ${fmtStat(k, v)}`).join(' · ')}</span></div>
          <button class="${on ? 'ghost' : 'primary'} sm" data-t="${t.id}" ${has && !on ? '' : 'disabled'}>${on ? 'Đang đeo' : has ? 'Đeo' : icon('lock')}</button>
        </div>`; }).join('')}</div>`);
    this.bindGearTabs(g, body);
    body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { r.title = b.dataset.t; r.apply(); g.audio.chime(); this.openTitles(g); }));
    this.relock(g);
  },

  // ───────────── GIANG HỒ TRỰC TUYẾN ─────────────
  async openOnline(g, tab = 'arena') {
    const on = g.online, r = g.rpg;
    const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const CLSN = { kiem: 'Kiếm', thuong: 'Thương', cung: 'Cung', phap: 'Pháp', dao: 'Đạo' };
    const tabs = `<div class="ctabs" style="--cols:3"><button data-tab="arena" class="${tab === 'arena' ? 'on' : ''}">${icon('duel')}Luận Kiếm Đài</button><button data-tab="market" class="${tab === 'market' ? 'on' : ''}">${icon('scales')}Chợ giang hồ</button><button data-tab="chat" class="${tab === 'chat' ? 'on' : ''}">${icon('team')}Kênh thế giới</button></div>`;
    let body = this.openPanel('Giang hồ trực tuyến', `${tabs}<p class="muted">Đang kết nối…</p>`);
    const bindTabs = () => body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.openOnline(g, b.dataset.tab)));
    bindTabs();
    this.relock(g);
    if (!on.base) { body.innerHTML = `${tabs}<div class="ol-off">${icon('lock')}<p><b>Máy chủ trực tuyến chưa mở.</b><br>Luận Kiếm Đài, Chợ giang hồ và Kênh thế giới sẽ hoạt động khi máy chủ được bật.</p></div>`; bindTabs(); return; }
    let html = tabs;
    try {
      if (tab === 'arena') {
        await on.call('/arena/submit', on.snapshot());
        const d = await on.call('/arena/opponents');
        html += `<p class="muted">Đấu với <b>bản sao nhân vật</b> của người chơi khác (máy điều khiển, theo đúng chỉ số của họ). Thắng: +bạc, +điểm. Bản sao của ngươi cũng được người khác khiêu chiến.</p>
          <div class="ol-me">Điểm luận kiếm: <b>${d.me ?? 1000}</b> · Đang trực tuyến: <b>${on.users}</b></div>
          <div class="ol-cols"><div><h4 class="sub-h">Đối thủ ngang tài</h4>${d.list.length ? d.list.map((o, i) => `<div class="ol-row"><span class="ol-cls">${CLSN[o.cls] || ''}</span><div><b>${esc(o.name)}</b> <small>Lv.${o.level} · ${esc(o.snap.title)}${o.snap.faction ? ' · ' + (o.snap.faction === 'chinh' ? 'Chính' : 'Tà') : ''}</small><br><small>Lực chiến ${o.power.toLocaleString('vi-VN')} · Điểm ${o.rating} · ${o.wins}T/${o.losses}B</small></div><button class="primary sm" data-duel="${i}">Khiêu chiến</button></div>`).join('') : '<p class="muted">Chưa có ai. Mời bằng hữu cùng chơi!</p>'}</div>
          <div><h4 class="sub-h">Bảng phong thần</h4><ol class="ol-top">${d.top.map((o) => `<li><b>${esc(o.name)}</b> <small>${CLSN[o.cls] || ''} Lv.${o.level}</small><span>${o.rating}</span></li>`).join('')}</ol></div></div>`;
        body = this.openPanel('Giang hồ trực tuyến', html);
        body.querySelectorAll('[data-duel]').forEach((b) => (b.onclick = () => { this.closePanel(); on.duel(d.list[+b.dataset.duel]); }));
      } else if (tab === 'market') {
        const d = await on.call('/market');
        if (d.owed) { const c = await on.call('/market/claim'); r.addGold(c.gold); g.toast(`Bán được ${c.sold.map((x) => `<b>${esc(x.name)}</b>`).join(', ')} · nhận <b>${c.gold}</b> lượng (đã trừ 5% thuế chợ)`, 5); }
        const bag = r.gearBag || [];
        html += `<p class="muted">Rao bán trang bị cho người chơi khác, hoặc mua đồ họ bán. Thuế chợ 5%. Tối đa 10 món đang rao. ${icon('coins')} Ngươi có <b>${r.gold}</b> lượng.</p>
          <div class="ol-cols"><div><h4 class="sub-h">Đang bán trên chợ</h4>${d.list.length ? d.list.map((o) => `<div class="ol-row"><span class="ol-cls r${o.item.rarity || 0}">${esc(o.item.han || '')}</span><div><b style="color:${RARITY[o.item.rarity || 0]?.color}">${esc(o.item.name)}</b> <small>Lv.${o.item.lv || '?'}${o.item.elem ? ' · thần binh' : ''}</small><br><small>${Object.entries(o.item.stats || {}).map(([k, v]) => `${STAT_NAME[k] || k} ${fmtStat(k, v)}`).join(' · ')} · người bán ${esc(o.name)}</small></div>${o.mine ? `<button class="ghost sm" data-cancel="${o.lid}">Gỡ</button>` : `<button class="primary sm" data-buy="${o.lid}" data-price="${o.price}" ${r.gold < o.price ? 'disabled' : ''}>${o.price} lượng</button>`}</div>`).join('') : '<p class="muted">Chợ đang vắng.</p>'}</div>
          <div><h4 class="sub-h">Rao bán từ kho của ngươi</h4>${bag.length ? bag.map((it, i) => `<div class="ol-row"><span class="ol-cls r${it.rarity}">${esc(it.han)}</span><div><b style="color:${RARITY[it.rarity].color}">${esc(it.name)}</b> <small>Lv.${it.lv}</small></div><input type="number" min="1" value="${Math.max(10, Math.round(gearScore(it) / 20))}" data-pi="${i}" class="ol-price" /><button class="ghost sm" data-sell="${i}">Rao</button></div>`).join('') : '<p class="muted">Kho trang bị trống (đồ đang mặc không rao được).</p>'}</div></div>`;
        body = this.openPanel('Giang hồ trực tuyến', html);
        body.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = async () => {
          const price = +b.dataset.price;
          if (r.gold < price) return;
          try { const res = await on.call('/market/buy', { lid: +b.dataset.buy }); r.gold -= price; r.gearBag.push({ ...res.item, uid: 'm' + Date.now() }); g.audio.coin(); g.toast(`Mua được <b>${esc(res.item.name)}</b>`, 2); } catch { g.toast('Món này vừa có người mua mất', 2); }
          this.openOnline(g, 'market');
        }));
        body.querySelectorAll('[data-cancel]').forEach((b) => (b.onclick = async () => { try { const res = await on.call('/market/cancel', { lid: +b.dataset.cancel }); r.gearBag.push({ ...res.item, uid: 'm' + Date.now() }); } catch {} this.openOnline(g, 'market'); }));
        body.querySelectorAll('[data-sell]').forEach((b) => (b.onclick = async () => {
          const i = +b.dataset.sell, it = r.gearBag[i], price = +body.querySelector(`[data-pi="${i}"]`).value;
          try { await on.call('/market/list', { item: it, price }); r.gearBag.splice(i, 1); g.toast(`Đã rao <b>${esc(it.name)}</b> giá ${price} lượng`, 2); } catch (e) { g.toast(e.code === 'limit' ? 'Đã rao đủ 10 món' : 'Không rao được', 2); }
          this.openOnline(g, 'market');
        }));
      } else {
        const d = await on.call('/state?since=0');
        html += `<div class="ol-chat" id="ol-chat">${d.chat.map((m) => `<p><b>${esc(m.name)}</b> ${esc(m.text)}</p>`).join('') || '<p class="muted">Chưa có tin nhắn.</p>'}</div>
          <div class="ol-say"><input id="ol-text" maxlength="140" placeholder="Nói với cả giang hồ…" /><button class="primary" id="ol-send">Gửi</button></div><p class="muted sm">Đang trực tuyến: ${on.users} · Tin nhắn cũng hiện ở khung chat kênh Giang Hồ.</p>`;
        body = this.openPanel('Giang hồ trực tuyến', html);
        const box = body.querySelector('#ol-chat'); box.scrollTop = box.scrollHeight;
        const send = async () => { const t = body.querySelector('#ol-text').value.trim(); if (!t) return; try { await on.say(t); on.pollT = 0; } catch (e) { g.toast(e.code === 'slow' ? 'Gửi chậm lại một chút' : 'Không gửi được', 1.5); } this.openOnline(g, 'chat'); };
        body.querySelector('#ol-send').onclick = send;
        body.querySelector('#ol-text').onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); };
      }
    } catch {
      body = this.openPanel('Giang hồ trực tuyến', `${tabs}<div class="ol-off">${icon('lock')}<p><b>Không kết nối được máy chủ.</b><br>Thử lại sau ít phút.</p></div>`);
    }
    bindTabs();
    this.relock(g);
  },

  // ───────────── ĐẠO LỘ: CHUYỂN CHỨC & CHÍNH TÀ ─────────────
  openPath(g, tab = 'adv') {
    const pa = g.path, s = pa.s, lv = g.rpg.level, cls = pa.cls, a = pa.adv();
    const bar = (v, max, c) => `<div class="statbar"><div style="width:${Math.min(100, (v / max) * 100)}%;${c ? 'background:' + c : ''}"></div></div>`;
    let html = `<div class="ctabs" style="--cols:2"><button data-tab="adv" class="${tab === 'adv' ? 'on' : ''}">${icon('crown')}Chuyển chức</button><button data-tab="fac" class="${tab === 'fac' ? 'on' : ''}">${icon('scales')}Chính · Tà</button></div>`;
    if (tab === 'adv') {
      html += `<p class="muted">Đủ cấp thì nhận thử thách: đánh bại người thủ thí để thăng chức. Mỗi bậc mạnh hơn và chiêu thức đẹp hơn.</p><div class="adv-row">${(ADV[cls] || ADV.kiem).map(([n, h], i) => `
        <div class="adv-step ${i <= a ? 'on' : ''} ${i === a + 1 ? 'next' : ''}"><span class="han">${h}</span><b>${n}</b><small>Cấp ${ADV_LV[i]}</small>${i ? `<p>${ADV_TEXT[i]}</p>` : '<p>Khởi đầu</p>'}</div>`).join('<em>›</em>')}</div>`;
      if (a < 3) html += `<div class="acts">${pa.canAdvance() ? `<button class="primary" data-do="trial">${icon('swords')} Nhận thử thách · ${pa.advName(a + 1)[0]}</button>` : `<button class="ghost" disabled>Cần cấp ${ADV_LV[a + 1]} (đang ${lv})</button>`}</div>`;
      else html += '<p class="sm">Đã đạt bậc cao nhất.</p>';
    } else {
      const F = FACTIONS[s.faction];
      if (!F) {
        html += `<p class="muted">Từ cấp 20 có thể gia nhập một phe. Đổi phe về sau sẽ mất một nửa công trạng.</p><div class="fac-pick">${Object.entries(FACTIONS).map(([id, f]) => `
          <div class="fac" style="--fc:${f.color}"><span class="han">${f.han}</span><b>${f.name}</b><p>${f.desc}</p><p class="sm muted">Phẩm hàm: ${f.ranks.join(' › ')}</p>
          <button class="primary" data-join="${id}" ${lv < 20 ? 'disabled' : ''}>${lv < 20 ? `Cần cấp 20` : `Gia nhập ${f.name}`}</button></div>`).join('')}</div>`;
      } else {
        const r = pa.rank(), nx = MERIT[r + 1], d = s.daily.d === new Date().toDateString() ? s.daily.n : 0;
        html += `<div class="fac on" style="--fc:${F.color}"><span class="han">${F.han}</span><b>${F.name} · ${F.ranks[r]}</b>
          <div>${bar(s.merit, nx || s.merit, F.color)}<small>Công trạng ${s.merit}${nx ? ` / ${nx} → ${F.ranks[r + 1]}` : ' · tối đa'}</small></div>
          <p>${F.desc}</p><p class="sm">Đang được: ${s.faction === 'chinh' ? `Khí huyết +${(r + 1) * 4}%, Giảm sát thương +${(r + 1) * 2}%` : `Bạo kích +${(r + 1) * 2}%, hút máu ${(r + 1)}%`}</p>
          <p class="sm">${icon('skull')} <b>${F.patrol}</b> xuất hiện ở các khu săn quái. Mỗi tên +15 công trạng. Nhiệm vụ ngày: diệt 10 tên (${Math.min(10, d)}/10) thưởng +100.</p>
          <button class="ghost" data-do="leave">Rời ${F.name} (mất nửa công trạng)</button></div>`;
      }
    }
    const body = this.openPanel('Đạo lộ', html);
    body.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => this.openPath(g, b.dataset.tab)));
    body.querySelector('[data-do="trial"]')?.addEventListener('click', async () => { this.closePanel(); await pa.startTrial(); });
    body.querySelectorAll('[data-join]').forEach((b) => (b.onclick = () => { pa.join(b.dataset.join); this.openPath(g, 'fac'); }));
    body.querySelector('[data-do="leave"]')?.addEventListener('click', () => { pa.leave(); this.openPath(g, 'fac'); });
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
    // tâm giao: thân mật, tiến hoá, ký ức (chỉ linh thú)
    let bondHtml = '';
    if (tab === 'pet' && o) {
      const bd = g.bond, rec = bd.rec(sel), ti = bd.tier(sel), stg = bd.stage(sel), nx = STAGES[stg + 1], nt = BOND_TIERS[ti + 1];
      const mems = bd.memories(sel);
      bondHtml = `<div class="bond">
        <div class="bond-head"><span class="han">${STAGES[stg].han}</span><b>${STAGES[stg].name}</b><span class="bond-tier"><span class="han">${BOND_TIERS[ti].han}</span> ${BOND_TIERS[ti].name}</span></div>
        <div class="bond-bar">${bar(rec.bond, nt ? nt.at : MAX_BOND, 'linear-gradient(90deg,#ff8ab0,#ffd86a)')}<small>Thân mật ${rec.bond}${nt ? ` / ${nt.at} → ${nt.name}` : ' · tối đa'}</small></div>
        <div class="bond-stages">${STAGES.map((st, i) => `<span class="${i <= stg ? 'on' : ''}" title="${st.unlock || ''}"><i class="han">${st.han}</i>${st.name}</span>`).join('<em>›</em>')}</div>
        ${nx ? `<p class="sm">Tiến hoá <b>${nx.name}</b>: cấp ${o.lv}/${nx.lv} · thân mật ${rec.bond}/${nx.bond}<br><span class="muted">Mở: ${nx.unlock}</span></p>` : '<p class="sm">Đã là <b>Thần thú</b>. Mọi hiệu quả ×1.5.</p>'}
        ${STAGES.slice(1, stg + 1).map((st) => `<p class="bond-unl">${icon('check')} ${st.unlock}</p>`).join('')}
        <p class="muted sm">Thân mật tăng khi cùng diệt quái, cho ăn, vuốt ve (5 phút một lần) và đi cùng nhau.</p>
        ${mems.length ? `<details class="bond-mem"><summary>${icon('book')} Ký ức (${mems.length}/4)</summary>${mems.map((m, i) => `<p><b>${BOND_TIERS[i + 1].name}.</b> ${m}</p>`).join('')}</details>` : ''}
      </div>`;
    }
    const act = o
      ? `${cur === sel ? `<button class="ghost" disabled>${tab === 'mount' ? 'Đang dùng' : 'Đang theo'}</button>` : `<button class="primary" data-do="use">${tab === 'mount' ? 'Chọn làm thú cưỡi' : 'Cho xuất chiến'}</button>`}
         ${tab === 'mount' && cur === sel ? `<button class="primary" data-do="ride">${g.companions.riding ? 'Xuống' : 'Cưỡi ngay'} <kbd>H</kbd></button>` : ''}
         ${tab === 'pet' && cur === sel ? `<button class="ghost" data-do="rest">${g.sys.s.petOut === false ? 'Gọi ra' : 'Cho nghỉ'}</button>` : ''}
         ${tab === 'pet' ? `<button class="ghost" data-do="pat">${icon('heart')} Vuốt ve</button>${g.bond.canEvolve(sel) ? `<button class="primary bond-evo" data-do="evolve">${icon('sparkles')} Tiến hoá</button>` : ''}` : ''}
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
          ${bondHtml}
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
    on('pat', () => { g.bond.pat(sel); this.openCompanions(g, tab, sel); });
    on('evolve', () => { if (g.bond.evolve(sel)) { this.closePanel(); } });
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
  // ───────────── HỒ SƠ NHÂN VẬT (bấm vào avatar) ─────────────
  openProfile(g) {
    const r = g.rpg, sy = g.sys, h = g.profile.hero || {}, c = CLASSES[h.cls] || CLASSES.kiem;
    const mx = (h.model?.startsWith('mx:') ? h.model : MESHY_DEFAULT[`${h.cls}:${h.gender}`] || 'mx:swordsman_blue').slice(3);
    const title = TITLES.find((t) => t.id === r.title);
    const bs = g.beasts?.s || {}, mount = BEASTS[bs.mount], pet = BEASTS[bs.pet];
    const killed = Object.keys(sy.s.bestiary || {}).length, totalMon = Object.keys(MONSTERS).length;
    const stat = (k) => fmtStat(k, r.stat(k)).replace('+', '');
    const p = g.player;
    const slot = (sl) => {
      const it = r.gear[sl.id];
      if (!it) return `<div class="pf-slot empty" title="${sl.name}"><img src="/assets/ui/${{ weapon: 'sk_atk', helm: 'eq_helm', armor: 'eq_armor', belt: 'eq_belt', boots: 'eq_boots', ring: 'eq_ring', trinket: 'eq_trinket' }[sl.id]}.png" alt="" /><small>${sl.name}</small></div>`;
      return `<div class="pf-slot" style="--rc:${RARITY[it.rarity].color}" title="${it.name} · ${RARITY[it.rarity].name}">${gcell(it)}<small>${it.name}${it.enh ? ' +' + it.enh : ''}</small></div>`;
    };
    const info = [
      ['Cảnh giới', realmOf(r.level)], ['Danh hiệu', title ? title.name : '—'],
      ['Bang hội', sy.s.guild ? `${GUILD.name} · ${sy.guildRank()}` : 'Chưa gia nhập'], ['Tổ đội', `${g.social?.party().length || 0}/3 đồng đội`],
      ['Thú cưỡi', mount ? `${mount.name} Lv.${g.beasts.lv(bs.mount)}` : '—'], ['Linh thú', pet ? `${pet.name} Lv.${g.beasts.lv(bs.pet)}` : '—'],
      ['Kinh mạch', `${g.meridian?.total() || 0}/48 huyệt`], ['Bách quái phổ', `${killed}/${totalMon} loại`],
      ['Thành tựu', `${sy.s.achDone?.length || 0}/${ACHIEVEMENTS.length}`], ['Lượng bạc', r.gold.toLocaleString('vi')],
      ['Đạo tâm', (() => { const k = g.flags.karma || 0; return k >= 3 ? `<span style="color:#8fd8ff">正 Chính đạo (+${k})</span>` : k <= -3 ? `<span style="color:#ff6a5a">邪 Tà đạo (${k})</span>` : `Trung dung (${k >= 0 ? '+' : ''}${k})`; })()],
      ['Hồi truyện', g.chapter ? `${g.chapter.title} · ${g.chapter.subtitle}` : '—'],
    ];
    const body = this.openPanel('Hồ sơ nhân vật', `
      <div class="pf">
        <div class="pf-hero" style="--c:${c.color}">
          <div class="pf-stage" id="pf-stage"><img class="pf-full" src="/assets/thumbs/hero_${mx}.png" alt="" /></div>
          <img class="pf-emblem" src="/assets/ui/cls_${h.cls || 'kiem'}.png" alt="" />
          <div class="pf-name"><b>${g.profile.name}</b><span class="m-vip">VIP</span></div>
          <div class="pf-sub">${c.name} <span class="han">${c.han}</span> · Cấp ${r.level}</div>
          ${title ? `<div class="pf-title">${title.name}</div>` : ''}
          <div class="pf-exp"><div style="width:${Math.min(100, (r.exp / expNeed(r.level)) * 100)}%"></div></div>
        </div>
        <div class="pf-right">
          <div class="pf-power">${icon('crown')} Lực chiến <b>${sy.power().toLocaleString('vi')}</b></div>
          <div class="pf-stats">
            <div><span>Khí huyết</span><b>${p.maxHp}</b></div><div><span>Nội lực</span><b>${p.maxMp}</b></div>
            <div><span>Công</span><b>${r.atk()}</b></div><div><span>Bạo kích</span><b>${Math.round(r.crit() * 100)}%</b></div>
            <div><span>Giảm sát thương</span><b>${Math.round(r.def() * 100)}%</b></div><div><span>Thân pháp</span><b>${stat('spd')}</b></div>
          </div>
          <h4 class="sub-h">Trang bị đang mặc</h4>
          <div class="pf-gear">${SLOTS.map(slot).join('')}</div>
          <h4 class="sub-h">Giang hồ lộ</h4>
          <div class="pf-info">${info.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
          <div class="pf-acts"><button class="primary sm" data-go="gear">Trang bị</button><button class="ghost sm" data-go="skill">Võ học</button><button class="ghost sm" data-go="meridian">Kinh mạch</button><button class="ghost sm" data-go="title">Danh hiệu</button></div>
        </div>
      </div>`);
    // sân khấu 3D: nhân vật thật trên bệ ngọc (ảnh tĩnh hiện tạm trong lúc dựng)
    import('./profileStage.js').then(({ mountProfileStage }) => mountProfileStage($('pf-stage'), h, c.color)).then(() => $('pf-stage')?.classList.add('live')).catch((e) => console.warn('hồ sơ 3D', e));
    const go = { gear: () => this.openGear(g), skill: () => this.openSkills(g), meridian: () => this.openMeridian(g), title: () => this.openTitles(g) };
    body.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go[b.dataset.go]()));
    body.querySelectorAll('.pf-slot .gcell').forEach((b) => (b.onclick = () => this.openGear(g, 'gear', b.dataset.uid)));
    this.relock?.(g);
  },

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
