import { SIDE_QUESTS } from '../story/sidequests.js';
import { LORE } from '../story/lore.js';
import { SPEAKERS } from '../story/chapters.js';
const SPEAKER_NAME = (id) => ({ hanxue_npc: 'Hàn Tuyết', honglian_npc: 'Hồng Liên' }[id] || SPEAKERS[id]?.name || id);
import { UI, SUMMARIES } from './ui.js';
import { icon, itemIcon } from './icons.js';
import { ITEMS } from '../game/rpg.js';
import { CLASSES, LOOK_OPTIONS } from '../game/classes.js';
import { CHAPTERS } from '../story/chapters.js';
import { MONSTERS, ZONES, monsterStats } from '../game/bestiary.js';
import { DAILY, ACTIVITY_CHESTS, ACHIEVEMENTS, SIGNIN, DUNGEONS, WORLD_BOSSES, GUILD, RECIPES } from '../game/systems.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rewardIcons = (r) => Object.entries(r).map(([k, v]) => {
  const ic = k === 'gold' ? 'coins' : k === 'exp' ? 'qi' : k === 'points' ? 'book' : k === 'fashion' ? 'user' : ITEMS[k]?.icon || 'bag';
  const label = k === 'gold' ? `${v} lượng` : k === 'exp' ? `${v} KN` : k === 'points' ? `${v} điểm` : k === 'fashion' ? 'Thời trang' : `${ITEMS[k]?.name || k} ×${v}`;
  const img = k === 'gold' ? itemIcon('gold') : ITEMS[k] ? itemIcon(k, ic) : icon(ic);
  return `<span class="rw" title="${label}">${img}<small>${typeof v === 'number' ? v : ''}</small></span>`;
}).join('');

/** Khung bảng có thanh tab bên trái như các game nhập vai. */
function sideTabs(tabs, active) {
  return `<div class="side-tabs">${tabs.map(([id, n, ic]) => `<button class="${id === active ? 'on' : ''}" data-st="${id}">${icon(ic)}<span>${n}</span></button>`).join('')}</div>`;
}

Object.assign(UI.prototype, {
  bindSide(body, fn) { body.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => fn(b.dataset.st))); },
  relock(g) { this.onPanelClose = () => g.running && !g.paused && g.input.lock(); },

  // ───────────── NHIỆM VỤ ─────────────
  openQuests(g, tab = 'main') {
    const sy = g.sys;
    let html = '';
    if (tab === 'main') {
      const ch = g.chapter, st = g.step;
      html = `<div class="q-main"><div class="q-ch"><span class="han">${ch.han}</span><b>${ch.title} · ${ch.subtitle}</b></div>
        <div class="q-obj">${icon('star')}<span>${st ? this.nh(st.objective(g)) : 'Đã hoàn thành'}</span></div>
        <p class="muted">${this.nh(SUMMARIES[ch.id] || '')}</p>
        <div class="q-steps">${ch.steps.map((s, i) => `<div class="${i < g.stepIdx ? 'done' : i === g.stepIdx ? 'cur' : ''}">${icon(i < g.stepIdx ? 'check' : i === g.stepIdx ? 'play' : 'lock')}<span>${i <= g.stepIdx ? this.nh(s.objective(g)) : '???'}</span></div>`).join('')}</div>
        <button class="primary sm" id="q-map">${icon('map')} Xem trên bản đồ</button></div>`;
    } else if (tab === 'daily') {
      html = `<div class="activity"><span>Điểm sôi nổi: <b>${sy.s.activity}</b></span><div class="act-track"><div style="width:${sy.s.activity}%"></div>${ACTIVITY_CHESTS.map((n, i) => `<button class="act-chest ${sy.s.claimedChests.includes(i) ? 'got' : sy.s.activity >= n ? 'ready' : ''}" data-c="${i}" style="left:${n}%">${icon('chest')}<small>${n}</small></button>`).join('')}</div></div>
        <div class="tasks">${DAILY.map((t) => { const v = sy.s.daily[t.id] || 0; return `<div class="task ${v >= t.goal ? 'ok' : ''}">${icon(t.icon)}<div><b>${t.name}</b> <small>(${v}/${t.goal})</small><div class="tbar"><div style="width:${(v / t.goal) * 100}%"></div></div></div><div class="rws">${rewardIcons(t.reward)}</div><span class="pts">+${t.pts}</span></div>`; }).join('')}</div>`;
    } else if (tab === 'side') {
      const sd = g.side.s;
      const row = (q, state) => `<div class="task side-q ${state}"><span class="han sq-han">${q.han}</span><div><b>${q.name}</b> <small>${state === 'done' ? 'Đã hoàn thành' : state === 'active' ? this.nh(g.side.step(q.id)?.objective(g, g.side.api(q.id)) || '') : state === 'open' ? `Gặp ${SPEAKER_NAME(q.giver)} để nhận` : 'Chưa tới lúc'}</small><p class="muted sm">${state === 'locked' ? '???' : q.summary}</p></div></div>`;
      html = `<p class="muted">Kỳ duyên là những câu chuyện riêng của người giang hồ. Có nhân vật chỉ xuất hiện nếu trước đó ngươi chọn tha cho họ.</p>
        <div class="tasks">${SIDE_QUESTS.map((q) => row(q, sd.done.includes(q.id) ? 'done' : q.id in sd.active ? 'active' : q.unlock(g) ? 'open' : 'locked')).join('')}</div>`;
    } else if (tab === 'lore') {
      const got = g.lore.got;
      html = `<p class="muted">Thanh Phong kiếm phổ tàn trang: <b>${got.length}/12</b>. Trang phát sáng trắng, rải khắp bản đồ.</p>
        <div class="lore-list">${LORE.map((L, i) => got.includes(i) ? `<div class="lore-p"><b>${i + 1}. ${L.title}</b><p>${L.text}</p></div>` : `<div class="lore-p locked"><b>${i + 1}. ???</b><p class="muted">Chưa tìm thấy.</p></div>`).join('')}</div>`;
    } else {
      html = `<div class="tasks">${ACHIEVEMENTS.map((a) => { const v = Math.min(a.goal, sy.statValue(a.stat)), ok = sy.s.achDone.includes(a.id); return `<div class="task ${ok ? 'ok' : ''}">${icon(ok ? 'check' : 'star')}<div><b>${a.name}</b> <small>${a.desc} (${v}/${a.goal})</small><div class="tbar"><div style="width:${(v / a.goal) * 100}%"></div></div></div><div class="rws">${rewardIcons(a.reward)}</div></div>`; }).join('')}</div>`;
    }
    const body = this.openPanel('Nhiệm vụ', `<div class="with-side">${sideTabs([['main', 'Chính tuyến', 'scroll'], ['side', 'Kỳ duyên', 'lotus'], ['lore', 'Tàn trang', 'book'], ['daily', 'Hằng ngày', 'calendar'], ['ach', 'Thành tựu', 'trophy']], tab)}<div class="side-body">${html}</div></div>`);
    this.bindSide(body, (t) => this.openQuests(g, t));
    body.querySelector('#q-map')?.addEventListener('click', () => { this.closePanel(); this.openMap(g); });
    body.querySelectorAll('.act-chest.ready').forEach((b) => (b.onclick = () => { const r = sy.claimChest(Number(b.dataset.c)); if (r) g.toast('Nhận: ' + r); this.openQuests(g, 'daily'); }));
    this.relock(g);
  },

  // ───────────── PHÚC LỢI ─────────────
  openWelfare(g) {
    const sy = g.sys, c = sy.s.signin.count % 7, can = sy.canSignIn();
    const body = this.openPanel('Phúc lợi', `<div class="welfare"><div class="w-head"><span class="han">福利</span><div><b>Điểm danh 7 ngày</b><small>Đăng nhập mỗi ngày để nhận thưởng. Ngày thứ 7 tặng thời trang Kim Long.</small></div></div>
      <div class="signin">${SIGNIN.map((r, i) => `<div class="day ${i < c ? 'got' : i === c && can ? 'today' : ''}"><small>Ngày ${i + 1}</small>${rewardIcons(r)}${i < c ? `<span class="stamp">${icon('check')}</span>` : ''}</div>`).join('')}</div>
      <button class="primary" id="w-go" ${can ? '' : 'disabled'}>${can ? 'Điểm danh hôm nay' : 'Đã điểm danh, mai quay lại nhé'}</button></div>`);
    body.querySelector('#w-go').onclick = () => { const r = sy.signIn(); if (r) { g.audio.levelUp(); g.toast('Điểm danh: ' + r); } this.openWelfare(g); };
    this.relock(g);
  },

  // ───────────── HOẠT ĐỘNG (phó bản, boss, luận kiếm) ─────────────
  openEvents(g, tab = 'dungeon') {
    const sy = g.sys;
    let html = '';
    if (tab === 'dungeon') {
      html = `<div class="dungeons">${DUNGEONS.map((d) => { const used = sy.s.dungeonRuns[d.id] || 0, left = d.runs - used, lock = g.rpg.level < d.lv; return `
        <div class="dg ${lock ? 'locked' : ''}" style="--bg:url(/brand/bg.jpg)"><div class="dg-l"><span class="han">${d.han}</span><b>${d.name}</b><small>Cấp ${d.lv} · Lượt ${left}/${d.runs}</small><p>${d.desc}</p></div>
        <div class="dg-r"><div class="rws">${rewardIcons(d.reward)}</div><button class="primary sm" data-d="${d.id}" ${lock || left <= 0 ? 'disabled' : ''}>${lock ? `Cần cấp ${d.lv}` : left <= 0 ? 'Hết lượt' : 'Vào phó bản'}</button></div></div>`; }).join('')}</div>`;
    } else if (tab === 'boss') {
      const h = new Date().getHours();
      html = `<p class="muted">Boss thế giới xuất hiện ở bãi đất trước Hắc Phong trại. Mỗi boss hạ được một lần mỗi ngày. Bản chơi đơn: có thể khiêu chiến bất cứ lúc nào sau giờ xuất hiện.</p><div class="bosses">${WORLD_BOSSES.map((b) => { const open = h >= b.hour, done = sy.s.bossDone[b.id]; return `
        <div class="boss-row"><span class="han big2">${b.han}</span><div><b>${b.name}</b><small>Cấp ${b.lv} · Xuất hiện ${b.hour}:00 · ${b.hp} khí huyết</small></div>
        <button class="primary sm" data-b="${b.id}" ${!open || done ? 'disabled' : ''}>${done ? 'Đã hạ' : open ? 'Khiêu chiến' : `Chờ ${b.hour}:00`}</button></div>`; }).join('')}</div>`;
    } else {
      const list = sy.ranking();
      html = `<p class="muted">Luận Kiếm Đài: khiêu chiến cao thủ hạng trên. Thắng sẽ đổi chỗ trên bảng xếp hạng. (Đối thủ do máy điều khiển, chơi đơn.)</p><div class="ladder">${list.map((r, i) => `
        <div class="lad ${r.me ? 'me' : ''}"><span class="rk">${i + 1}</span><div><b>${esc(r.name)}</b><small>${r.me ? r.cls : CLASSES[r.cls].name} · Cấp ${r.lv}</small></div><span class="pw">${icon('crown')} ${r.power}</span>
        ${r.me ? '<span class="muted sm">Ngươi</span>' : `<button class="ghost" data-pvp="${esc(r.name)}">Khiêu chiến</button>`}</div>`).join('')}</div>`;
    }
    const body = this.openPanel('Hoạt động', `<div class="with-side">${sideTabs([['dungeon', 'Phó bản', 'temple'], ['boss', 'Boss thế giới', 'dragon'], ['pvp', 'Luận Kiếm Đài', 'duel']], tab)}<div class="side-body">${html}</div></div>`);
    this.bindSide(body, (t) => this.openEvents(g, t));
    body.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { this.closePanel(); g.startDungeon(b.dataset.d); }));
    body.querySelectorAll('[data-b]').forEach((b) => (b.onclick = () => { this.closePanel(); g.startWorldBoss(b.dataset.b); }));
    body.querySelectorAll('[data-pvp]').forEach((b) => (b.onclick = () => { this.closePanel(); g.startDuel(b.dataset.pvp); }));
    this.relock(g);
  },

  // ───────────── XẾP HẠNG ─────────────
  openRanking(g) {
    const list = g.sys.ranking(), top = list.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    // chân dung: người chơi dùng ảnh thật, cao thủ NPC lấy ảnh anh hùng theo tên
    const HEROES = ['swordsman_blue', 'pink_maiden', 'ice_assassin', 'purple_fairy', 'red_fighter', 'old_master', 'forest_archer', 'hooded_ninja', 'swordsman_ribbon', 'taoist_scholar', 'green_warrior', 'red_armor_warrior', 'black_robes', 'village_girl'];
    const av = (r) => `<img class="${r.me ? "" : "full"}" src="${r.me ? g.portraits.hero : `/assets/thumbs/hero_${HEROES[[...r.name].reduce((h, c) => h * 31 + c.charCodeAt(0), 7) % HEROES.length]}.png`}" alt="" draggable="false" />`;
    const body = this.openPanel('Bảng xếp hạng', `
      <div class="podium">${order.map((r) => { const i = list.indexOf(r); return `<div class="pod p${i + 1} ${r.me ? 'me' : ''}"><div class="medal">${i + 1}</div><div class="pod-av">${av(r)}</div><b>${esc(r.name)}</b><small>Lực chiến ${r.power}</small></div>`; }).join('')}</div>
      <div class="ladder">${list.slice(3).map((r, k) => `<div class="lad ${r.me ? 'me' : ''}"><span class="rk">${k + 4}</span><span class="lad-av">${av(r)}</span><div><b>${esc(r.name)}</b><small>${r.me ? r.cls : CLASSES[r.cls].name} · Cấp ${r.lv}</small></div><span class="pw">${icon('crown')} ${r.power}</span></div>`).join('')}</div>`);
    this.relock(g);
    return body;
  },

  // ───────────── BANG HỘI ─────────────
  openGuild(g) {
    const sy = g.sys;
    if (!sy.s.guild) {
      const body = this.openPanel('Bang hội', `<div class="guild-join"><span class="han huge">${GUILD.han}</span><h3>${GUILD.name}</h3><p class="muted">Bang hội của dân trấn Thanh Phong, bảo vệ quê nhà khỏi sơn tặc. Gia nhập để đóng góp và nhận bang phúc (tăng chỉ số vĩnh viễn).</p>
        <button class="primary" id="g-join">Xin vào bang</button><p class="muted sm">Chơi đơn: bang hội NPC. Bang hội với người chơi khác cần máy chủ.</p></div>`);
      body.querySelector('#g-join').onclick = () => { sy.joinGuild(); this.openGuild(g); };
    } else {
      const body = this.openPanel('Bang hội', `<div class="guild">
        <div class="g-info"><span class="han huge">${GUILD.han}</span><div><b>${GUILD.name}</b><small>Chức vị: ${sy.guildRank()} · Cống hiến: ${sy.s.contrib}</small></div></div>
        <div class="g-donate"><span>Quyên góp bạc cho bang:</span>${[50, 100, 300].map((n) => `<button class="ghost" data-dn="${n}">${icon('star')} ${n}</button>`).join('')}</div>
        <h4>Bang phúc</h4>
        <div class="tasks">${GUILD.buffs.map((b) => { const own = sy.buff(b.id); return `<div class="task ${own ? 'ok' : ''}">${icon('shield')}<div><b>${b.name}</b> <small>${b.desc}</small></div><button class="primary sm" data-bf="${b.id}" ${own || sy.s.contrib < b.cost ? 'disabled' : ''}>${own ? 'Đã kích hoạt' : `${b.cost} cống hiến`}</button></div>`; }).join('')}</div></div>`);
      body.querySelectorAll('[data-dn]').forEach((b) => (b.onclick = () => { if (sy.donate(Number(b.dataset.dn))) g.audio.coin(); this.openGuild(g); }));
      body.querySelectorAll('[data-bf]').forEach((b) => (b.onclick = () => { if (sy.buyBuff(b.dataset.bf)) g.audio.levelUp(); this.openGuild(g); }));
    }
    this.relock(g);
  },

  // ───────────── KẾT DUYÊN ─────────────
  openBond(g) {
    const sy = g.sys, a = sy.s.affinity.maiden || 0;
    const met = g.unlockedChapter >= 2;
    const body = this.openPanel('Kết duyên', `<div class="bond">
      <div class="bond-l"><img src="${g.portraits.maiden || ''}" /><b>Lâm Uyển Nhi</b> <span class="han">林婉兒</span>
        <div class="heart-bar"><div style="width:${a}%"></div></div><small>Hảo cảm ${a}/100 ${sy.s.married ? '· Đã kết duyên' : ''}</small></div>
      <div class="bond-r">${!met ? '<p class="muted">Hãy gặp Lâm Uyển Nhi ở Chương Nhị trước.</p>' : `
        <p class="muted">Tặng quà để tăng hảo cảm. Đạt 100 có thể ngỏ lời kết duyên (chơi đơn với NPC).</p>
        <div class="gifts">${['herb', 'potion', 'qipill'].map((id) => `<button class="ghost gift-btn" data-gift="${id}" ${(g.rpg.bag[id] || 0) <= 0 ? 'disabled' : ''}>${itemIcon(id, ITEMS[id].icon)} Tặng ${ITEMS[id].name} (${g.rpg.bag[id] || 0})</button>`).join('')}</div>
        <button class="primary" id="b-wed" ${a < 100 || sy.s.married ? 'disabled' : ''}>${sy.s.married ? 'Phu thê đồng tâm' : 'Ngỏ lời kết duyên'}</button>`}</div></div>`);
    body.querySelectorAll('[data-gift]').forEach((b) => (b.onclick = () => { const n = sy.gift('maiden', b.dataset.gift); if (n) { g.toast(`Hảo cảm với Uyển Nhi +${n}`); g.audio.chime(); } this.openBond(g); }));
    body.querySelector('#b-wed')?.addEventListener('click', () => {
      sy.s.married = true;
      this.closePanel();
      g.dialog([['maiden', 'Thiếu hiệp... người thật lòng sao?'], ['hero', 'Gió trên hồ Bích Thủy làm chứng.'], ['maiden', '(mỉm cười, đỏ mặt) Vậy từ nay, giang hồ xa xôi, chúng ta cùng đi.'], { run: (gg) => { gg.rpg.giveEquip('charm'); gg.toast('<span class="han">結緣</span> Kết duyên cùng <b>Lâm Uyển Nhi</b>', 5); gg.audio.levelUp(); } }]);
    });
    this.relock(g);
  },

  // ───────────── LUYỆN ĐAN & CHỢ ─────────────
  openCraft(g, tab = 'craft') {
    const sy = g.sys, r = g.rpg;
    let html = '';
    if (tab === 'craft') {
      html = `<div class="shop">${RECIPES.map((c) => { const ok = r.gold >= c.gold && Object.entries(c.need).every(([k, n]) => (r.bag[k] || 0) >= n); return `<div class="ware"><div class="ic">${itemIcon(c.id, ITEMS[c.id].icon)}</div><div class="wi"><b>${c.name}</b><small>Cần: ${Object.entries(c.need).map(([k, n]) => `${ITEMS[k].name} ×${n} (có ${r.bag[k] || 0})`).join(', ')} · ${c.gold} lượng</small></div><div></div><button class="primary sm" data-cr="${c.id}" ${ok ? '' : 'disabled'}>${c.id === 'potion' || c.id === 'qipill' ? 'Luyện' : 'Nấu'}</button></div>`; }).join('')}</div>`;
    } else {
      const goods = ['potion', 'qipill', 'herb', 'bounty', 'steel_sword', 'leather', 'charm'];
      html = `<p class="muted">Chợ Thanh Phong: giá thay đổi mỗi ngày. (Đấu giá giữa người chơi cần máy chủ.)</p><div class="shop">${goods.map((id) => { const p = sy.marketPrice(id), it = ITEMS[id], owned = it.type === 'equip' && r.owned.has(id); return `<div class="ware"><div class="ic">${itemIcon(id, it.icon)}</div><div class="wi"><b>${it.name}</b> <span class="han">${it.han}</span><small>${it.desc}</small></div><div class="wp">${icon('coins')}${p}</div><button class="primary sm" data-mk="${id}" data-p="${p}" ${owned || r.gold < p ? 'disabled' : ''}>${owned ? 'Đã có' : 'Mua'}</button></div>`; }).join('')}</div>`;
    }
    const body = this.openPanel('Sản xuất & chợ', `<div class="with-side">${sideTabs([['craft', 'Luyện đan · Nấu ăn', 'cauldron'], ['market', 'Chợ', 'scales']], tab)}<div class="side-body"><div class="subtabs"><span class="gold">${icon('coins')} ${r.gold} lượng</span></div>${html}</div></div>`);
    this.bindSide(body, (t) => this.openCraft(g, t));
    body.querySelectorAll('[data-cr]').forEach((b) => (b.onclick = () => { if (sy.craft(b.dataset.cr)) { g.audio.chime(); g.toast(`Luyện thành <b>${ITEMS[b.dataset.cr].name}</b>`); } this.openCraft(g, tab); }));
    body.querySelectorAll('[data-mk]').forEach((b) => (b.onclick = () => { const id = b.dataset.mk, p = Number(b.dataset.p); if (r.gold >= p) { r.gold -= p; ITEMS[id].type === 'equip' ? r.owned.add(id) : r.add(id); g.audio.coin(); } this.openCraft(g, tab); }));
    this.relock(g);
  },

  // ───────────── THÚ CƯỠI & PET ─────────────
  openCompanions(g, tab = 'mount') {
    const sy = g.sys, r = g.rpg;
    let html = '';
    if (tab === 'mount') {
      html = `<div class="comp"><div class="comp-art">${icon('horse')}<span class="han huge">赤焰駒</span></div><div class="comp-info"><h3>Xích Diễm Câu</h3><p class="muted">Tuấn mã vó đỏ, chạy nhanh gấp đôi người thường. Phím <kbd>H</kbd> để lên/xuống ngựa.</p>
        <div class="stats4"><span>Tốc</span><div class="statbar"><div style="width:90%"></div></div><span>Bền</span><div class="statbar"><div style="width:60%"></div></div></div>
        ${sy.s.mountOwned ? `<button class="primary" id="m-ride">${sy.s.mount ? 'Xuống ngựa' : 'Cưỡi ngựa'}</button>` : `<button class="primary" id="m-buy" ${r.gold < 500 ? 'disabled' : ''}>Mua ngựa · 500 lượng</button>`}</div></div>`;
    } else {
      html = `<div class="comp"><div class="comp-art">${icon('dog')}<span class="han huge">小寶</span></div><div class="comp-info"><h3>Tiểu Bảo</h3><p class="muted">Chú cún nhỏ theo chân chủ nhân, tự nhặt đồ rơi từ xa và tăng 5% bạo kích.</p>
        ${sy.s.pet ? `<button class="primary" id="p-toggle">${sy.s.petOut === false ? 'Gọi ra' : 'Cho nghỉ'}</button>` : `<button class="primary" id="p-get" ${r.gold < 200 ? 'disabled' : ''}>Nhận nuôi · 200 lượng</button>`}</div></div>`;
    }
    const body = this.openPanel('Thú cưỡi & đồng hành', `<div class="with-side">${sideTabs([['mount', 'Thú cưỡi', 'horse'], ['pet', 'Đồng hành', 'dog']], tab)}<div class="side-body"><div class="subtabs"><span class="gold">${icon('coins')} ${r.gold} lượng</span></div>${html}</div></div>`);
    this.bindSide(body, (t) => this.openCompanions(g, t));
    body.querySelector('#m-buy')?.addEventListener('click', async () => { r.gold -= 500; sy.s.mountOwned = true; g.audio.levelUp(); this.openCompanions(g, 'mount'); });
    body.querySelector('#m-ride')?.addEventListener('click', () => { this.closePanel(); g.toggleMount(); });
    body.querySelector('#p-get')?.addEventListener('click', () => { r.gold -= 200; sy.s.pet = 'pug'; sy.s.petOut = true; g.spawnPet(); g.audio.levelUp(); this.openCompanions(g, 'pet'); });
    body.querySelector('#p-toggle')?.addEventListener('click', () => { sy.s.petOut = sy.s.petOut === false; g.spawnPet(); this.openCompanions(g, 'pet'); });
    this.relock(g);
  },

  // ───────────── THỜI TRANG ─────────────
  openFashion(g) {
    const r = g.rpg, h = g.profile.hero, owned = g.ownedFashion();
    const body = this.openPanel('Thời trang', `<div class="subtabs"><span class="gold">${icon('coins')} ${r.gold} lượng</span></div><div class="fashion-grid">${LOOK_OPTIONS.fashion.map((f) => { const has = !f.price || owned.includes(f.id); return `
      <button class="fcard ${h.fashion === f.id ? 'on' : ''}" data-f="${f.id}"><i class="swatch-big" style="background:${f.color || 'linear-gradient(135deg,#6b5a3a,#2d3b2a)'}"></i><b>${f.name}</b><small>${h.fashion === f.id ? 'Đang mặc' : has ? 'Mặc' : `${icon('star')} ${f.price}`}</small></button>`; }).join('')}</div>`);
    body.querySelectorAll('[data-f]').forEach((b) => (b.onclick = async () => {
      const f = LOOK_OPTIONS.fashion.find((x) => x.id === b.dataset.f);
      if (f.price && !owned.includes(f.id)) { if (r.gold < f.price) return; r.gold -= f.price; g.unlockFashion(f.id); }
      await g.setFashion(f.id);
      this.openFashion(g);
    }));
    this.relock(g);
  },

  // ───────────── BÁCH QUÁI PHỔ ─────────────
  openBestiary(g, sel = null) {
    const kills = g.sys.s.bestiary || {};
    const ids = Object.keys(MONSTERS);
    sel ??= ids[0];
    const m = MONSTERS[sel], st = monsterStats(m), zone = ZONES.find((z) => z.mobs.includes(sel) || z.elite === sel);
    const n = kills[sel] || 0, known = n > 0;
    const body = this.openPanel('Bách quái phổ', `<div class="bestiary">
      <div class="bq-grid">${ids.map((id) => { const mm = MONSTERS[id], k = kills[id] || 0; return `<button class="bq-cell ${id === sel ? 'on' : ''} ${k ? '' : 'unknown'} ${mm.elite ? 'elite' : ''}" data-m="${id}" title="${mm.name}"><img src="/assets/thumbs/mon_${id}.png" alt="" /><span class="lv">${mm.lv}</span></button>`; }).join('')}</div>
      <div class="bq-detail">
        <div class="bq-art"><img src="/assets/thumbs/mon_${sel}.png" alt="" class="${known ? '' : 'silhouette'}" /><span class="han huge">${m.han}</span></div>
        <h3>${known ? m.name : '???'} ${m.elite ? '<span class="elite-tag">Tinh anh</span>' : ''}</h3>
        <div class="bq-stats">
          <span>Cấp</span><b>${m.lv}</b><span>Khí huyết</span><b>${known ? st.hp : '?'}</b>
          <span>Công</span><b>${known ? st.dmg : '?'}</b><span>Kinh nghiệm</span><b>${known ? st.exp : '?'}</b>
          <span>Thuộc tính</span><b>${m.caster ? 'Pháp thuật' : 'Cận chiến'}</b><span>Đã hạ</span><b>${n}</b>
        </div>
        <p class="muted">${zone ? `${icon('map')} Xuất hiện tại <b>${zone.name}</b> <span class="han">${zone.han}</span>` : 'Xuất hiện ở phó bản và sự kiện.'}</p>
        <p class="muted sm">Hạ quái để mở khoá thông tin. Đã ghi chép ${Object.keys(kills).length}/${ids.length} loại.</p>
      </div></div>`);
    body.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => this.openBestiary(g, b.dataset.m)));
    this.relock(g);
  },

  // ───────────── KỲ NGỘ ─────────────
  openEncounter(g, e) {
    g.input.unlock();
    const body = this.openPanel('Kỳ ngộ', `<div class="encounter"><span class="han huge">奇遇</span><h3>${e.title}</h3><p>${e.text}</p><div class="rws big">${rewardIcons(e.reward)}</div>
      <div class="acts"><button class="primary sm" id="en-ok">Nhận lấy</button><button class="ghost" id="en-no">Rời đi</button></div></div>`);
    body.querySelector('#en-ok').onclick = () => { const r = g.sys.give(e.reward); g.toast('Kỳ ngộ: ' + r, 4); g.audio.levelUp(); this.closePanel(); };
    body.querySelector('#en-no').onclick = () => this.closePanel();
    this.relock(g);
  },
});

export { CHAPTERS };
