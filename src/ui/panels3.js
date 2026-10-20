import { UI } from './ui.js';
import { icon, itemIcon } from './icons.js';
import { SLOTS, RARITY, STAT_NAME, fmtStat, gearScore } from '../game/gear.js';
import { TITLES } from '../game/titles.js';
import { BEASTS, SKILL_TEXT, MAX_LV, expNeedBeast, WILD } from '../game/beasts.js';
import { ZONES } from '../game/bestiary.js';

const $ = (id) => document.getElementById(id);
const statLines = (it, cmp) => Object.entries(it.stats).map(([k, v]) => {
  const val = v * (1 + it.enh * 0.08);
  const o = cmp ? (cmp.stats[k] || 0) * (1 + cmp.enh * 0.08) : null;
  const diff = o === null ? '' : val > o + 1e-6 ? '<i class="up">▲</i>' : val < o - 1e-6 ? '<i class="dn">▼</i>' : '';
  return `<div class="gs"><span>${STAT_NAME[k]}</span><b>${fmtStat(k, k === 'def' || k === 'crit' || k === 'spd' ? val : Math.round(val))}</b>${diff}</div>`;
}).join('');
const gcell = (it, extra = '') => {
  const R = RARITY[it.rarity];
  return `<button class="gcell r${it.rarity}" style="--rc:${R.color}" data-uid="${it.uid}" ${extra}>${icon(SLOTS.find((s) => s.id === it.slot).icon)}<span class="gh">${it.han}</span>${it.enh ? `<span class="ge">+${it.enh}</span>` : ''}<span class="gl">${it.lv}</span></button>`;
};

Object.assign(UI.prototype, {
  // ───────────── TRANG BỊ NGẪU NHIÊN ─────────────
  openGear(g, tab = 'gear', sel = null) {
    const r = g.rpg;
    if (tab === 'title') return this.openTitles(g);
    const bag = [...r.gearBag].sort((a, b) => b.rarity - a.rarity || gearScore(b) - gearScore(a));
    const body = this.openPanel('Trang bị', `
      <div class="ctabs" style="--cols:2"><button class="on">${icon('crown')}Thần binh</button><button data-tab="title">${icon('trophy')}Danh hiệu</button></div>
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
    body.querySelector('[data-tab="title"]').onclick = () => this.openTitles(g);
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

  // ───────────── DANH HIỆU ─────────────
  openTitles(g) {
    const s = g.sys.s, got = s.titles || ['newbie'], r = g.rpg;
    const body = this.openPanel('Trang bị', `
      <div class="ctabs" style="--cols:2"><button data-tab="gear">${icon('crown')}Thần binh</button><button class="on">${icon('trophy')}Danh hiệu</button></div>
      <p class="muted">Mỗi lúc chỉ đeo được một danh hiệu. Danh hiệu hiện trên đầu nhân vật và cộng chỉ số.</p>
      <div class="titles">${TITLES.map((t) => { const has = got.includes(t.id), on = r.title === t.id; return `
        <div class="title-row ${has ? '' : 'locked'} ${on ? 'on' : ''}">
          <div class="tb" style="--tc:${t.color}"><span class="han">${t.han}</span><b>${t.name}</b></div>
          <div class="ti"><small>${has ? 'Đã đạt' : 'Điều kiện: ' + t.req}</small><span>${Object.entries(t.stats).map(([k, v]) => `${STAT_NAME[k]} ${fmtStat(k, v)}`).join(' · ')}</span></div>
          <button class="${on ? 'ghost' : 'primary'} sm" data-t="${t.id}" ${has && !on ? '' : 'disabled'}>${on ? 'Đang đeo' : has ? 'Đeo' : icon('lock')}</button>
        </div>`; }).join('')}</div>`);
    body.querySelector('[data-tab="gear"]').onclick = () => this.openGear(g);
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
});
