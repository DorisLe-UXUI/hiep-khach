import { UI } from './ui.js';
import { icon, itemIcon } from './icons.js';
import { ITEMS } from '../game/rpg.js';
import { RECRUITS, MASTER_TASKS, HOUSE_LEVELS } from '../game/social.js';
import { CHAPTERS } from '../story/chapters.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cost = (need, g) => Object.entries(need).map(([k, n]) => {
  const have = k === 'gold' ? g.rpg.gold : g.rpg.bag[k] || 0;
  return `<span class="need ${have >= n ? 'ok' : 'no'}">${k === 'gold' ? itemIcon('gold') : itemIcon(k, ITEMS[k]?.icon)}<b>${have}/${n}</b></span>`;
}).join('') || '<span class="muted">Không cần</span>';
const reward = (r) => Object.entries(r).map(([k, v]) => `<span class="rw" title="${k}">${k === 'gold' ? itemIcon('gold') : k === 'points' ? icon('book') : k === 'exp' ? icon('qi') : itemIcon(k, ITEMS[k]?.icon)}<small>${v}</small></span>`).join('');

Object.assign(UI.prototype, {
  // ───────────── TRUNG TÂM CHỨC NĂNG ─────────────
  openHub(g) {
    const F = [
      ['Nhân vật', [['bag', 'Túi đồ', 'I', () => this.openBag(g)], ['meditation', 'Võ học', 'K', () => this.openSkills(g)], ['robe', 'Thời trang', 'U', () => this.openFashion(g)], ['horse', 'Ngự thú', 'B', () => this.openCompanions(g)], ['crown', 'Trang bị & danh hiệu', '', () => this.openGear(g)], ['anvil', 'Cường hoá', '', () => this.openEnhance(g, g.rpg.equip.weapon)]]],
      ['Giang hồ', [['quill', 'Nhiệm vụ', 'J', () => this.openQuests(g)], ['map', 'Bản đồ', 'M', () => this.openMap(g)], ['dragon', 'Bách quái phổ', 'L', () => this.openBestiary(g)], ['scroll', 'Nhật ký', '', () => this.openJournal(CHAPTERS, g.chapterIdx, g.flags)]]],
      ['Hoạt động', [['calendar', 'Phó bản & boss', 'N', () => this.openEvents(g)], ['swords', 'Chiến trường', '', () => this.openBattlefield(g)], ['duel', 'Luận Kiếm Đài', '', () => this.openEvents(g, 'pvp')], ['present', 'Phúc lợi', 'O', () => this.openWelfare(g)], ['podium', 'Xếp hạng', 'P', () => this.openRanking(g)]]],
      ['Xã hội', [['team', 'Tổ đội', '', () => this.openParty(g)], ['pagoda', 'Bang hội', 'G', () => this.openGuild(g)], ['wizard', 'Sư đồ', '', () => this.openMaster(g)], ['rings', 'Kết duyên', '', () => this.openBond(g)], ['baby', 'Gia đình', '', () => this.openFamily(g)]]],
      ['Sinh hoạt', [['rod', 'Sinh hoạt', '', () => this.openLife(g)], ['cauldron', 'Luyện đan & nấu ăn', 'T', () => this.openCraft(g)], ['scales', 'Chợ', '', () => this.openCraft(g, 'market')], ['gavel', 'Đấu giá', '', () => this.openAuction(g)], ['home', 'Gia viên', '', () => this.openHouse(g)]]],
    ];
    const body = this.openPanel('Chức năng', F.map(([t, list]) => `<h4 class="sub-h">${t}</h4><div class="hub">${list.map(([ic, n, k], i) => `<button class="hub-i" data-h="${t}|${i}"><span class="mi-ic">${icon(ic)}</span><span>${n}</span>${k ? `<kbd>${k}</kbd>` : ''}</button>`).join('')}</div>`).join(''));
    body.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => { const [t, i] = b.dataset.h.split('|'); F.find((x) => x[0] === t)[1][Number(i)][3](); }));
    this.relock(g);
  },

  // ───────────── TỔ ĐỘI ─────────────
  openParty(g) {
    const party = g.social.party();
    const body = this.openPanel('Tổ đội', `
      <div class="party-head">${icon('team')}<div><b>Tổ đội của ${esc(g.profile.name)}</b><small>Tối đa 3 đồng đội. Đồng đội tự đi theo và cùng chiến đấu, mạnh lên theo cấp của ngươi.</small></div></div>
      <div class="party-slots">
        <div class="pslot me"><img src="${g.portraits.hero}" /><b>${esc(g.profile.name)}</b><small>Đội trưởng</small></div>
        ${[0, 1, 2].map((i) => { const r = RECRUITS.find((x) => x.id === party[i]); const a = g.allies.find((x) => x.name === r?.name);
          return r ? `<div class="pslot"><span class="han">${r.han}</span><b>${r.name}</b><small>${r.cls}</small><div class="mini-hp"><div style="width:${a ? (a.hp / a.maxHp) * 100 : 100}%"></div></div><button class="ghost" data-dis="${r.id}">Cho rời đội</button></div>`
            : '<div class="pslot empty">+<small>Trống</small></div>'; }).join('')}
      </div>
      <h4 class="sub-h">Võ quán: cao thủ có thể chiêu mộ</h4>
      <div class="shop">${RECRUITS.map((r) => { const inP = party.includes(r.id); return `
        <div class="ware"><div class="ic"><span class="han" style="font-size:24px">${r.han}</span></div>
        <div class="wi"><b>${r.name}</b> · ${r.cls}<small>Khí huyết ${r.hp} · Công ${r.atk} · ${r.ranged ? 'Tầm xa' : 'Cận chiến'}</small></div>
        <div class="wp">${icon('coins')}${r.price}</div>
        <button class="primary sm" data-rec="${r.id}" ${inP || party.length >= 3 || g.rpg.gold < r.price ? 'disabled' : ''}>${inP ? 'Trong đội' : 'Chiêu mộ'}</button></div>`; }).join('')}</div>`);
    body.querySelectorAll('[data-rec]').forEach((b) => (b.onclick = async () => { b.disabled = true; await g.social.recruit(b.dataset.rec); this.openParty(g); }));
    body.querySelectorAll('[data-dis]').forEach((b) => (b.onclick = async () => { await g.social.dismiss(b.dataset.dis); this.openParty(g); }));
    this.relock(g);
  },

  // ───────────── SƯ ĐỒ ─────────────
  openMaster(g) {
    const so = g.social, m = g.sys.s.master;
    let html;
    if (!m) {
      html = `<div class="master-intro"><img src="${g.portraits.mentor || ''}" /><div><span class="han huge">師徒</span><h3>Huyền Cơ Tử</h3><p class="muted">Ẩn sĩ đã quy ẩn mấy chục năm. Bái làm sư phụ để nhận nhiệm vụ sư môn, mỗi nhiệm vụ hoàn thành được truyền thụ võ học (điểm võ học) và bảo vật.</p><button class="primary" id="ms-go">Quỳ xuống bái sư</button></div></div>`;
    } else {
      const t = so.masterTask();
      html = `<div class="master-intro"><img src="${g.portraits.mentor || ''}" /><div><h3>Sư phụ: Huyền Cơ Tử</h3><small class="muted">Đã hoàn thành ${m.done.length}/${MASTER_TASKS.length} nhiệm vụ sư môn</small>
        <div class="tasks" style="margin-top:12px">${MASTER_TASKS.map((x) => { const done = m.done.includes(x.id), cur = t?.id === x.id, prog = cur ? so.masterProgress(x) : done ? x.goal : 0;
          return `<div class="task ${done ? 'ok' : ''}">${icon(done ? 'check' : cur ? 'scroll' : 'lock')}<div><b>${x.text}</b> <small>(${prog}/${x.goal})</small><div class="tbar"><div style="width:${(prog / x.goal) * 100}%"></div></div></div><div class="rws">${reward(x.reward)}</div></div>`; }).join('')}</div>
        ${t ? `<button class="primary" id="ms-sub" ${so.masterProgress(t) < t.goal ? 'disabled' : ''}>Báo cáo sư phụ</button>` : '<p class="cg">Đã xuất sư · Chân truyền đệ tử</p>'}</div></div>`;
    }
    const body = this.openPanel('Sư đồ', html);
    body.querySelector('#ms-go')?.addEventListener('click', () => { so.apprentice(); g.audio.levelUp(); this.openMaster(g); });
    body.querySelector('#ms-sub')?.addEventListener('click', () => { const r = so.submitMasterTask(); if (r) g.toast('Sư phụ ban thưởng: ' + r, 3); this.openMaster(g); });
    this.relock(g);
  },

  // ───────────── CHIẾN TRƯỜNG ─────────────
  openBattlefield(g) {
    const wins = g.sys.s.stats.battleWins || 0;
    const body = this.openPanel('Chiến trường', `<div class="battle">
      <div class="vs"><div class="side ally"><span class="han">清風</span><b>Thanh Phong</b><small>Ngươi + 4 đệ tử + tổ đội</small></div><div class="vs-mid">VS</div><div class="side foe"><span class="han">血影</span><b>Huyết Ảnh Môn</b><small>3 đợt sát thủ, binh xương, tướng quân</small></div></div>
      <p class="muted">Bản chơi đơn: phe địch và đồng minh đều do máy điều khiển. (Chiến trường liên server cần máy chủ.) Đã thắng: <b>${wins}</b> trận.</p>
      <div class="rws big">${reward({ gold: 300, bounty: 4, points: 1 })}</div>
      <button class="primary" id="bt-go">Xuất chiến</button></div>`);
    body.querySelector('#bt-go').onclick = () => { this.closePanel(); g.startBattlefield(); };
    this.relock(g);
  },

  // ───────────── SINH HOẠT ─────────────
  openLife(g) {
    const n = g.sys.s.stats.life || 0;
    const items = ['fish', 'goldfish', 'ore', 'jade_ore', 'wood'];
    const body = this.openPanel('Sinh hoạt', `<div class="life">
      <div class="life-cards">
        <div class="lc">${icon('rod')}<b>Câu cá</b><small>Bến câu có phao đỏ quanh hồ Bích Thủy. Bấm E thả câu, khi cá cắn câu bấm E thật nhanh.</small></div>
        <div class="lc">${icon('mining')}<b>Khai khoáng</b><small>Mỏ có tinh thể xanh ở Hàn Băng Cốc, Thung lũng Yêu Ma. Ngọc thạch ở Hỏa Diệm Sơn.</small></div>
        <div class="lc">${icon('axe')}<b>Đốn gỗ</b><small>Thân cây khô trong Rừng Nấm và Đồi Gió.</small></div>
        <div class="lc">${icon('meal')}<b>Nấu ăn</b><small>Cá + gỗ = Cá nướng (hồi khí huyết, nội lực). Gặp Tô Linh hoặc bảng Sản xuất.</small></div>
      </div>
      <h4 class="sub-h">Kho nguyên liệu · đã khai thác ${n} lần</h4>
      <div class="grid">${items.map((id) => `<div class="cell thumb" title="${ITEMS[id].name}">${itemIcon(id, ITEMS[id].icon)}<span class="n">${g.rpg.bag[id] || 0}</span></div>`).join('')}</div></div>`);
    this.relock(g);
    return body;
  },

  // ───────────── KẾT DUYÊN & CON CÁI ─────────────
  openFamily(g) {
    const s = g.sys.s, c = s.child;
    let html = `<div class="family"><div class="fam-row">`;
    html += `<div class="fam-card"><span class="han">結緣</span><b>Kết duyên</b><small>${s.married ? 'Đã kết duyên cùng Lâm Uyển Nhi' : `Hảo cảm với Uyển Nhi: ${s.affinity.maiden || 0}/100`}</small><button class="ghost" id="fm-bond">Mở bảng kết duyên</button></div>`;
    if (!s.married) html += `<div class="fam-card locked">${icon('lock')}<b>Con cái</b><small>Cần kết duyên trước.</small></div>`;
    else if (!c) html += `<div class="fam-card"><span class="han">育兒</span><b>Nhận nuôi hài tử</b><input id="fm-name" placeholder="Tên hài tử" maxlength="10" value="Tiểu Bảo" /><button class="primary sm" id="fm-adopt">Đón con về</button></div>`;
    else html += `<div class="fam-card child"><span class="han">${esc(c.name)}</span><b>${esc(c.name)} · Cấp ${c.lv}</b>
        <div class="statgrid"><span>Thân thiết</span><b>${c.bond}/100</b><span>Kinh nghiệm</span><b>${c.exp}/${c.lv * 60}</b></div>
        <div class="acts"><button class="ghost" data-care="feed">${itemIcon('fish', 'fish')} Cho ăn (1 cá)</button><button class="ghost" data-care="study">${icon('book')} Học chữ (30 lượng)</button><button class="ghost" data-care="play">${icon('heart')} Chơi đùa</button></div>
        <small class="muted">Hài tử đi theo và giúp đánh quái, càng lớn càng mạnh.</small></div>`;
    html += '</div></div>';
    const body = this.openPanel('Gia đình', html);
    body.querySelector('#fm-bond')?.addEventListener('click', () => this.openBond(g));
    body.querySelector('#fm-adopt')?.addEventListener('click', () => { g.social.adoptChild($('fm-name').value.trim()); g.audio.levelUp(); this.openFamily(g); });
    body.querySelectorAll('[data-care]').forEach((b) => (b.onclick = () => { if (g.social.careChild(b.dataset.care)) { g.audio.chime(); g.spawnChild(); } this.openFamily(g); }));
    this.relock(g);
  },

  // ───────────── GIA VIÊN ─────────────
  openHouse(g) {
    const lv = g.social.houseLv(), cur = HOUSE_LEVELS[lv - 1], next = HOUSE_LEVELS[lv];
    const body = this.openPanel('Gia viên', `<div class="house">
      <div class="house-lvls">${HOUSE_LEVELS.map((h) => `<div class="hl ${h.lv <= lv ? 'on' : ''}"><span class="han">${h.han}</span><small>${h.name}</small></div>`).join('<i></i>')}</div>
      <div class="house-cur"><span class="han huge">${cur.han}</span><div><h3>${cur.name} · Cấp ${lv}</h3><p class="muted">${cur.buff}</p></div></div>
      ${next ? `<h4 class="sub-h">Nâng lên ${next.name} <span class="han">${next.han}</span></h4><p class="muted">${next.buff}</p><div class="needs">${cost(next.need, g)}</div><button class="primary" id="hs-up">Xây dựng</button>` : '<p class="cg">Gia viên đã đạt cấp cao nhất.</p>'}
      <div class="acts" style="margin-top:12px"><button class="ghost" id="hs-rest">${icon('home')} Nghỉ ngơi (hồi đầy)</button><button class="ghost" id="hs-go">${icon('dash')} Về gia viên</button></div></div>`);
    body.querySelector('#hs-up')?.addEventListener('click', () => { if (g.social.upgradeHouse()) g.toast(`Gia viên lên <b>${HOUSE_LEVELS[g.social.houseLv() - 1].name}</b>!`, 3); this.openHouse(g); });
    body.querySelector('#hs-rest').onclick = () => { g.player.hp = g.player.maxHp; g.player.mp = g.player.maxMp; g.toast('Nghỉ ngơi ở gia viên, tinh thần sảng khoái.', 2); };
    body.querySelector('#hs-go').onclick = () => { this.closePanel(); g.auto.goTo(g.spots.home.x, g.spots.home.z, 'Gia viên'); };
    this.relock(g);
  },

  // ───────────── ĐẤU GIÁ ─────────────
  openAuction(g) {
    const a = g.social.openAuction();
    const render = () => {
      const left = Math.max(0, Math.ceil((a.end - Date.now()) / 1000));
      return `<div class="auction"><div class="au-head">${icon('gavel')}<b>Phiên đấu giá Thanh Phong</b><span class="au-time">${icon('hourglass')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span></div>
        <p class="muted sm">Người mua khác (do máy) cũng đang trả giá. Hết giờ, ai trả cao nhất sẽ thắng. (Đấu giá giữa người chơi cần máy chủ.)</p>
        <div class="shop">${a.lots.map((l, i) => { const it = ITEMS[l.id]; return `<div class="ware ${l.mine ? 'mine' : ''}"><div class="ic">${itemIcon(l.id, it.icon)}</div>
          <div class="wi"><b>${it.name}${l.n > 1 ? ` ×${l.n}` : ''}</b><small>Giá hiện tại: <b>${l.bid}</b> · ${l.mine ? '<span class="cg">Ngươi đang dẫn đầu</span>' : `Người trả: ${esc(l.by)}`}</small></div>
          <div class="wp">${icon('coins')}${Math.ceil(l.bid * 1.12) + 2}</div><button class="primary sm" data-bid="${i}" ${l.closed || l.mine || g.rpg.gold < Math.ceil(l.bid * 1.12) + 2 ? 'disabled' : ''}>Trả giá</button></div>`; }).join('')}</div></div>`;
    };
    const body = this.openPanel('Đấu giá', render());
    const bind = () => body.querySelectorAll('[data-bid]').forEach((b) => (b.onclick = () => { g.social.bid(Number(b.dataset.bid)); body.innerHTML = render(); bind(); }));
    bind();
    clearInterval(this.auTimer);
    this.auTimer = setInterval(() => { if ($('panel').classList.contains('hidden') || $('panel-title').textContent !== 'Đấu giá') return clearInterval(this.auTimer); g.social.tickAuction(1); body.innerHTML = render(); bind(); }, 1000);
    this.relock(g);
  },
});
