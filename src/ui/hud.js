import { TITLES } from '../game/titles.js';
import * as THREE from 'three';
import { WORLD_SIZE, PLACES } from '../world/layout.js';
import { ZONES } from '../game/bestiary.js';
import { icon, uiImg } from './icons.js';
import { realmOf } from '../game/rpg.js';
const escName = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const $ = (id) => document.getElementById(id);
const _proj = new THREE.Vector3(), _tmp = new THREE.Vector3();

const SLOTS = [
  { id: 'atk', key: 'LMB', ic: 'sword' },
  { id: 'block', key: 'RMB', ic: 'shield' },
  { id: 'dash', key: 'Q', ic: 'dash', mp: 15 },
  { id: 'cast', key: 'F', ic: 'palm', mp: 20 },
  { id: 'jump', key: '␣', ic: 'cloud', mp: 8 },
  { id: 'roll', key: 'Ctrl', ic: 'roll' },
  { id: 'water', key: 'Shift', ic: 'wave', lock: 'waterRun' },
  { id: 'potion', key: 'R', ic: 'potion' },
];

export class HUD {
  constructor(game) {
    this.game = game;
    this.nums = [];
    this.toasts = [];
    this.tipT = 0;
    this.barkT = 0;
    this.mini = $('minimap').getContext('2d');
    this.plates = new Map();
    this.bossLagW = 100;
    $('skills').innerHTML = SLOTS.map((s) => `<div class="slot" id="slot-${s.id}"><span class="key">${s.key}</span>${icon(s.ic)}<div class="cd"></div>${s.id === 'potion' ? '<span class="cnt" id="potion-cnt"></span>' : ''}</div>`).join('');
    // cache node + trạng thái để chỉ ghi DOM khi có thay đổi
    this.el = {
      hp: $('hp'), mp: $('mp'), st: $('st'), hpT: $('hp-t'), mpT: $('mp-t'), vignette: $('vignette'),
      boss: $('boss'), bossName: $('boss-name'), bossHp: $('boss-hp'), bossLag: $('boss-lag'),
      marker: $('marker'), markerDist: $('marker-dist'), objDist: $('obj-dist'),
      objChapter: $('obj-chapter'), objText: $('obj-text'), potionCnt: $('potion-cnt'), slotPotion: $('slot-potion'),
      plates: $('plates'), tip: $('tip'), bark: $('bark'), compass: $('compass-n'),
    };
    this.slots = SLOTS.map((s) => { const el = $('slot-' + s.id); return { s, el, cd: el.querySelector('.cd') }; });
    this.buildMinimap();
    this.buildMenus();
  }

  /** Đổi icon đòn thường theo môn phái. */
  setClass(cls) {
    const ic = { kiem: 'sword', thuong: 'spear', cung: 'bow', phap: 'fist', dao: 'shuriken' }[cls] || 'sword';
    const el = $('slot-atk');
    el.querySelector('.ico')?.remove();
    el.insertAdjacentHTML('beforeend', icon(ic));
  }

  buildMenus() {
    const g = this.game;
    // hàng chính: chức năng hay dùng; hàng phụ gom trong nút "Thêm" để HUD không rối
    const rail = [
      ['bag', 'Túi đồ', 'bag', 'I', () => g.ui.openBag(g)],
      ['gear', 'Trang bị', 'crown', '', () => g.ui.openGear(g)],
      ['skill', 'Võ học', 'meditation', 'K', () => g.ui.openSkills(g)],
      ['quest', 'Nhiệm vụ', 'quill', 'J', () => g.ui.openQuests(g)],
      ['map', 'Bản đồ', 'map', 'M', () => g.ui.openMap(g)],
      ['hub', 'Chức năng', 'gear', 'Y', () => g.ui.openHub(g)],
    ];
    const top = [
      ['bounty', 'Giang Hồ Lệnh', 'swords', 'J', () => g.ui.openQuests(g, 'bounty')],
      ['path', 'Đạo lộ', 'crown', 'U', () => g.ui.openPath(g)],
      ['meridian', 'Kinh mạch', 'qi', '', () => g.ui.openMeridian(g)],
      ['welfare', 'Phúc lợi', 'present', 'O', () => g.ui.openWelfare(g)],
      ['events', 'Hoạt động', 'calendar', 'N', () => g.ui.openEvents(g)],
      ['rank', 'Xếp hạng', 'podium', 'P', () => g.ui.openRanking(g)],
      ['guild', 'Bang hội', 'pagoda', 'G', () => g.ui.openGuild(g)],
      ['team', 'Tổ đội', 'team', '', () => g.ui.openParty(g)],
      ['craft', 'Sản xuất', 'cauldron', 'T', () => g.ui.openCraft(g)],
      ['mount', 'Ngự thú', 'horse', 'B', () => g.ui.openCompanions(g)],
      ['bestiary', 'Bách quái', 'dragon', 'L', () => g.ui.openBestiary(g)],
      ['life', 'Sinh hoạt', 'rod', '', () => g.ui.openLife(g)],
    ];
    const UI3D = { bag: 'bag', gear: 'gear', skill: 'skill', quest: 'quest', map: 'map', hub: 'settings', meridian: 'meridian', welfare: 'gift', events: 'event', rank: 'rank', guild: 'guild', team: 'team', craft: 'craft', mount: 'mount', bestiary: 'bestiary', life: 'life' };
    const btn = ([id, n, ic, key]) => `<button class="mi ${UI3D[id] ? 'img' : ''}" data-mi="${id}" title="${n} (${key})"><span class="mi-ic">${UI3D[id] ? uiImg(UI3D[id]) : icon(ic)}</span><span class="mi-n">${n}</span><i class="badge"></i></button>`;
    $('topbar').innerHTML = top.map(btn).join('');
    $('rail').innerHTML = rail.map(btn).join('') + `<button class="mi more img" data-mi="more" title="Thêm chức năng"><span class="mi-ic">${uiImg('more')}</span><span class="mi-n">Thêm</span><i class="badge"></i></button>`;
    document.querySelector('[data-mi="more"]').onclick = () => document.body.classList.toggle('menus-open');
    for (const [id, , , , fn] of [...top, ...rail]) {
      document.querySelector(`[data-mi="${id}"]`).onclick = () => { g.input.unlock(); g.cursorMode = false; document.body.classList.remove('menus-open'); fn(); };
    }
  }

  updateBadges() {
    const g = this.game, sy = g.sys;
    const set = (id, on) => document.querySelector(`[data-mi="${id}"] .badge`)?.classList.toggle('on', !!on);
    set('welfare', sy.canSignIn());
    set('quest', [20, 40, 60, 80, 100].some((n, i) => sy.s.activity >= n && !sy.s.claimedChests.includes(i)));
    set('skill', g.rpg.points > 0);
    set('events', Object.keys(sy.s.dungeonRuns).length === 0);
    set('guild', !sy.s.guild);
    set('more', ['welfare', 'events', 'guild'].some((id) => document.querySelector(`[data-mi="${id}"] .badge.on`)));
    set('gear', g.rpg.gearBag.some((it) => !g.rpg.gear[it.slot] || it.rarity > g.rpg.gear[it.slot].rarity));
  }

  buildMinimap() {
    const t = this.game.terrain, R = 512;
    const c = document.createElement('canvas');
    c.width = c.height = R;
    const g = c.getContext('2d');
    const img = g.createImageData(R, R);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const x = (i / R - 0.5) * WORLD_SIZE, z = (j / R - 0.5) * WORLD_SIZE;
      const h = t.heightAt(x, z), sp = t.splatAt(x, z);
      // phong cách giấy dó + mực
      let col = [196 - h * 0.5, 184 - h * 0.6, 150 - h * 0.6];
      if (h < -0.6 && Math.hypot(x - PLACES.lake.x, (z - PLACES.lake.z) * 1.25) < PLACES.lake.r * 1.4) col = [104, 128, 128];
      if (h > 25) { const k = Math.min(1, (h - 25) / 60); col = col.map((v) => v * (1 - k * 0.45)); }
      if (sp.forest > 0.3) col = col.map((v) => v * 0.9);
      if (sp.path > 0.3 || sp.paved > 0.3) col = [128, 96, 64];
      img.data.set([col[0], col[1], col[2], 255], (j * R + i) * 4);
    }
    g.putImageData(img, 0, 0);
    this.miniBg = c;
  }

  show(v = true) { $('hud').classList.toggle('hidden', !v); }

  toast(html, t = 3.5) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = this.game.ui.nh(html);
    this.game.mhud?.placeTopBand();
    $('toasts').appendChild(el);
    this.toasts.push({ el, t });
    // màn MMO: thông báo nằm ở dải trên cùng nên chỉ giữ 2 dòng mới nhất
    const max = document.body.classList.contains('mmo') ? 2 : 3;
    while (this.toasts.length > max) { this.toasts.shift().el.remove(); }
  }

  tip(text, t = 6) {
    const el = $('tip');
    el.innerHTML = text.replace(/([A-Z][a-z]*|Space|Chuột trái|Chuột phải|Ctrl|Shift|W A S D)(?=\s*[:·]|\s+(?:để|2 lần))/g, '<b>$1</b>');
    el.classList.remove('hidden');
    this.tipT = t;
  }

  bark(name, portrait, text, t = 4) {
    $('bark-name').textContent = name;
    $('bark-text').textContent = this.game.ui.nh(this.game.ui.tr?.(text) ?? text);
    this.game.ui.speak?.(text);
    $('bark-img').src = portrait || '';
    $('bark').classList.remove('hidden');
    this.barkT = t;
  }

  prompt(text) {
    if (!text) $('prompt').classList.add('hidden');
    else { $('prompt-text').textContent = text; $('prompt').classList.remove('hidden'); }
  }

  hint(html) {
    this.hintHtml = html;
    if (this._hint === html) return;
    this._hint = html;
    const el = $('obj-hint');
    el.innerHTML = html;
    el.style.display = html ? '' : 'none';
  }

  /** Quên các giá trị đã ghi (đổi ngôn ngữ: chữ dữ liệu không dịch ngược được nên phải ghi lại từ đầu). */
  invalidate() {
    for (const k of Object.keys(this)) if (k[0] === '_' && (this[k] === null || typeof this[k] !== 'object')) this[k] = undefined;
    for (const el of this.plates?.values?.() || []) el._html = undefined;
  }

  objective(chapter, text) {
    if (chapter !== this._chapter) { this.el.objChapter.innerHTML = chapter; this._chapter = chapter; }
    const el = this.el.objText;
    // so với chuỗi đã ghi (không so DOM): khi đổi ngôn ngữ, MutationObserver dịch lại nên DOM luôn khác → nhấp nháy mỗi khung
    if (text !== this._objText) {
      this._objText = text;
      el.textContent = text;
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    }
  }

  damage(pos, n, kind = '') {
    if (!this.game.settings.dmgNumbers && kind !== 'heal') return;
    // tối đa 40 số cùng lúc (tuyệt kỹ mưa đòn trúng hàng chục lần): tái dùng số cũ nhất; phần tử DOM lấy từ kho
    const old = this.nums.length >= 40 ? this.nums.shift() : null;
    const d = old?.el || this.numPool?.pop() || document.createElement('div');
    d.className = 'dmg ' + kind;
    d.textContent = kind === 'heal' ? '+' + n : n;
    d.style.opacity = ''; d.style.display = ''; // phần tử tái dùng có thể đang bị ẩn (số cũ ở sau lưng máy quay)
    if (!d.parentNode) $('dmg-layer').appendChild(d);
    this.nums.push({ el: d, pos: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 40, hidden: false });
  }

  flashSlot(id) {
    const el = $('slot-' + id);
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  project(v) {
    const p = _proj.copy(v).project(this.game.camera);
    return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight, behind: p.z > 1 };
  }

  update(dt) {
    const g = this.game, p = g.player, el = this.el;
    // chỉ ghi thanh máu/nội lực khi giá trị (làm tròn 0.5%) đổi
    const hpW = Math.round((p.hp / p.maxHp) * 200) / 2;
    if (hpW !== this._hpW) { el.hp.style.width = hpW + '%'; this._hpW = hpW; }
    const mpW = Math.round((p.mp / p.maxMp) * 200) / 2;
    if (mpW !== this._mpW) { el.mp.style.width = mpW + '%'; this._mpW = mpW; }
    const stW = Math.round((p.st / p.maxSt) * 200) / 2;
    if (stW !== this._stW) { el.st.style.width = stW + '%'; this._stW = stW; }
    const hpT = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    if (hpT !== this._hpT) { el.hpT.textContent = hpT; this._hpT = hpT; }
    const mpT = `${Math.floor(p.mp)} / ${p.maxMp}`;
    if (mpT !== this._mpT) { el.mpT.textContent = mpT; this._mpT = mpT; }
    const vig = p.hp / p.maxHp < 0.3 ? 0.4 + Math.sin(performance.now() / 220) * 0.2 : Math.max(0, p.hurtFlash || 0);
    if (vig !== this._vig) { el.vignette.style.opacity = vig; this._vig = vig; }
    if (p.hurtFlash) p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2);

    this.badgeT = (this.badgeT || 0) - dt;
    if (this.badgeT <= 0) { this.badgeT = 0.5; this.updateBadges(); }
    document.body.classList.toggle('cursor-free', !g.input.locked);

    // kỹ năng + hồi chiêu
    const cds = { dash: [p.cooldowns.dash, 2.5], cast: [p.cooldowns.cast, 0.8], potion: [p.cooldowns.potion || 0, 6] };
    for (const it of this.slots) {
      const s = it.s, cd = cds[s.id];
      const sy = cd ? Math.min(1, cd[0] / cd[1]) : 0;
      if (sy !== it.sy) { it.cd.style.transform = `scaleY(${sy})`; it.sy = sy; }
      const nomp = !!s.mp && p.mp < s.mp;
      if (nomp !== it.nomp) { it.el.classList.toggle('nomp', nomp); it.nomp = nomp; }
      const locked = !!s.lock && !g.unlocks[s.lock];
      if (locked !== it.locked) { it.el.classList.toggle('locked', locked); it.locked = locked; }
    }
    if (g.potions !== this._potions) {
      this._potions = g.potions;
      el.potionCnt.textContent = g.potions;
      el.slotPotion.classList.toggle('locked', g.potions <= 0);
    }

    // boss
    const boss = g.enemies.find((e) => e.boss && !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 50);
    if (!!boss !== this._bossShown) { el.boss.classList.toggle('hidden', !boss); this._bossShown = !!boss; }
    if (boss) {
      if (boss.name !== this._bossName) { el.bossName.textContent = boss.name; this._bossName = boss.name; }
      const w = Math.round((boss.hp / boss.maxHp) * 200) / 2;
      if (w !== this._bossW) { el.bossHp.style.width = w + '%'; el.bossLag.style.width = w + '%'; this._bossW = w; }
    }

    // thông báo
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t -= dt;
      if (t.t < 0.6) t.el.classList.add('out');
      if (t.t <= 0) { t.el.remove(); this.toasts.splice(i, 1); }
    }
    if (this.tipT > 0 && (this.tipT -= dt) <= 0) el.tip.classList.add('hidden');
    if (this.barkT > 0 && (this.barkT -= dt) <= 0) el.bark.classList.add('hidden');

    // điểm đánh dấu nhiệm vụ trên màn hình
    const mk = g.markerPos();
    const mEl = el.marker;
    if (mk && !g.dialogOpen) {
      const y = g.terrain.heightAt(mk.x, mk.z) + 2.6;
      const d = Math.hypot(mk.x - p.pos.x, mk.z - p.pos.z);
      let s = this.project(_tmp.set(mk.x, y, mk.z));
      // giữ dấu chỉ đường trong vùng giữa màn, không đè lên khung nhân vật, menu, minimap, nút kỹ năng
      const mx = Math.min(250, innerWidth * 0.3), top = 175, bot = 170;
      if (s.behind) { s.x = innerWidth - s.x; s.y = innerHeight - bot; }
      const rx = s.x, ry = s.y, behind = s.behind;
      s.x = Math.min(innerWidth - mx, Math.max(mx, s.x));
      s.y = Math.min(innerHeight - bot, Math.max(top, s.y));
      // mục tiêu ngoài màn hình: mũi tên chỉ hướng phải quay về
      const arr = $('marker-arr'), off = behind || rx !== s.x || ry !== s.y;
      if (off !== this._arrOn) { arr.style.display = off ? 'block' : 'none'; this._arrOn = off; }
      if (off) arr.style.transform = `rotate(${behind ? Math.PI / 2 : Math.atan2(ry - innerHeight / 2, rx - innerWidth / 2)}rad)`;
      if (this._markerOn !== true) { mEl.style.display = 'flex'; this._markerOn = true; }
      mEl.style.left = s.x + 'px';
      mEl.style.top = s.y + 'px';
      const dist = Math.round(d) + 'm';
      if (dist !== this._markerDist) { el.markerDist.textContent = dist; this._markerDist = dist; }
      const obj = `Cách ${Math.round(d)} trượng`;
      if (obj !== this._objDist) { el.objDist.textContent = obj; this._objDist = obj; }
      const op = d < 6 ? 0.25 : 1;
      if (op !== this._markerOp) { mEl.style.opacity = op; this._markerOp = op; }
    } else {
      if (this._markerOn !== false) { mEl.style.display = 'none'; this._markerOn = false; }
      if (this._objDist !== '') { el.objDist.textContent = ''; this._objDist = ''; }
    }

    // bảng tên: người chơi (danh hiệu), NPC (chức danh), kẻ địch (cấp + máu)
    const seen = (this._seen ||= new Set());
    seen.clear();
    const ROLES = { guard: 'Gác cổng', keeper: 'Chưởng quỹ', maiden: 'Lâm gia', captive: 'Bị bắt' };
    const tag = (key, pos, h, cls, html, hpK) => {
      const s2 = this.project(_tmp.copy(pos).setY(pos.y + h));
      if (s2.behind) return;
      let el = this.plates.get(key);
      if (!el) { el = document.createElement('div'); el.className = 'plate tag ' + cls; this.el.plates.appendChild(el); this.plates.set(key, el); }
      if (el._html !== html) { el.innerHTML = html; el._html = html; el._bar = el.querySelector('.tr div'); el._hpK = undefined; }
      seen.add(key);
      el.style.left = s2.x + 'px';
      el.style.top = s2.y + 'px';
      if (hpK !== undefined && el._bar && hpK !== el._hpK) { el._bar.style.width = hpK * 100 + '%'; el._hpK = hpK; }
    };
    if (document.body.classList.contains('mmo') && !g.dialogOpen) {
      const tt = TITLES.find((t) => t.id === g.rpg.title);
      tag(p, p.pos, 2.35, 'me', `${tt ? `<div class="ptitle" style="--tc:${tt.color}">${tt.name}</div>` : ''}<div class="title">${realmOf(g.rpg.level)}</div><div class="nm">${g.profile.name}</div>`);
      for (const n of g.npcs) {
        if (!n.root.visible || n.pos.distanceTo(p.pos) > 30) continue;
        const role = ROLES[n.id] || ROLES[n.speaker] || 'Thôn dân';
        tag(n, n.pos, 2.3, 'npc', `<div class="role">&lt;${role}&gt;</div><div class="nm">${n.name}</div>`);
      }
    }
    for (const e of g.enemies) {
      if (e.dead || e.boss || !e.root.visible) continue;
      const d = e.pos.distanceTo(p.pos);
      if (d > 32) continue;
      const lv = e.lv || Math.max(1, Math.round(e.exp / 12));
      const h = e.monster ? e.monster.h + 0.45 : 2.25;
      tag(e, e.pos, h, 'foe' + (e.monster?.elite || e.elite ? ' elite' : ''), `<div class="nm"><span class="lvl">Lv.${lv}</span>${escName(e.name)}${e.monster?.elite || e.elite ? ' <span class="elite-tag">Tinh anh</span>' : ''}</div><div class="tr"><div></div></div>`, e.hp / e.maxHp);
    }
    for (const [k, el] of this.plates) if (!seen.has(k)) { el.remove(); this.plates.delete(k); }

    // số sát thương
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += dt;
      if (n.t > 1.0) { n.el.remove(); (this.numPool ||= []).push(n.el); this.nums.splice(i, 1); continue; }
      const s = this.project(_tmp.copy(n.pos).setY(n.pos.y + n.t * 1.3));
      if (s.behind !== n.hidden) { n.hidden = s.behind; n.el.style.display = s.behind ? 'none' : ''; }
      if (s.behind) continue;
      // transform thay cho left/top: chỉ ghép lớp trên GPU, không tính lại bố cục trang mỗi khung hình
      n.el.style.transform = `translate3d(${(s.x + n.dx * n.t).toFixed(1)}px,${s.y.toFixed(1)}px,0) translate(-50%,-50%)`;
      if (n.t > 0.6) n.el.style.opacity = String(1 - (n.t - 0.6) / 0.4);
    }
    this.miniT = (this.miniT || 0) - dt;
    if (this.miniT <= 0) { this.miniT = 0.1; this.drawMinimap(); }
  }

  drawMinimap() {
    const g = this.mini, p = this.game.player, S = 200, span = 150;
    const k = S / span;
    const rot = this.game.camRig.yaw - Math.PI;
    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
    g.translate(S / 2, S / 2);
    g.rotate(rot);
    const bgK = this.miniBg.width / WORLD_SIZE;
    g.drawImage(this.miniBg, (p.pos.x + WORLD_SIZE / 2 - span / 2) * bgK, (p.pos.z + WORLD_SIZE / 2 - span / 2) * bgK, span * bgK, span * bgK, -S / 2, -S / 2, S, S);
    const dot = (x, z, color, r = 3) => {
      g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,.6)';
      g.beginPath(); g.arc((x - p.pos.x) * k, (z - p.pos.z) * k, r, 0, Math.PI * 2); g.fill(); g.stroke();
    };
    // khu săn quái: vòng tròn đỏ nhạt
    for (const z of ZONES) {
      g.strokeStyle = 'rgba(180,50,40,.55)'; g.fillStyle = 'rgba(180,50,40,.12)'; g.lineWidth = 1.5; g.setLineDash([4, 3]);
      g.beginPath(); g.arc((z.x - p.pos.x) * k, (z.z - p.pos.z) * k, z.r * k, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
    }
    for (const e of this.game.enemies) if (!e.dead) dot(e.pos.x, e.pos.z, e.boss || e.monster?.elite || e.elite ? '#ff2a2a' : '#b8332b', e.boss || e.monster?.elite || e.elite ? 5 : 2.5);
    for (const n of this.game.npcs) if (n.root.visible) dot(n.pos.x, n.pos.z, '#2f6f5a', 3.2);
    const m = this.game.markerPos();
    if (m) {
      let dx = (m.x - p.pos.x) * k, dz = (m.z - p.pos.z) * k;
      const d = Math.hypot(dx, dz), lim = S / 2 - 10;
      if (d > lim) { dx *= lim / d; dz *= lim / d; }
      g.save(); g.translate(dx, dz); g.rotate(-rot);
      g.fillStyle = '#d6b062'; g.strokeStyle = '#3a2410'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 0); g.lineTo(0, 8); g.lineTo(-6, 0); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    g.restore();
    // viền mực
    g.strokeStyle = 'rgba(40,28,18,.6)'; g.lineWidth = 6;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); g.stroke();
    // người chơi
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(-(p.yaw - this.game.camRig.yaw) + Math.PI);
    g.fillStyle = '#b32a26'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // chữ Bắc xoay theo camera
    const n = this.el.compass;
    const a = rot + Math.PI; // hướng -z trên bản đồ
    n.style.left = 110 + Math.sin(-a) * 96 + 'px';
    n.style.top = 100 - Math.cos(-a) * 96 - 8 + 'px';
  }
}
