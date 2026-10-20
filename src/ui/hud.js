import * as THREE from 'three';
import { WORLD_SIZE, PLACES } from '../world/layout.js';
import { icon } from './icons.js';
import { realmOf } from '../game/rpg.js';

const $ = (id) => document.getElementById(id);

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
    const top = [
      ['welfare', 'Phúc lợi', 'present', 'O', () => g.ui.openWelfare(g)],
      ['events', 'Hoạt động', 'calendar', 'N', () => g.ui.openEvents(g)],
      ['rank', 'Xếp hạng', 'podium', 'P', () => g.ui.openRanking(g)],
      ['guild', 'Bang hội', 'pagoda', 'G', () => g.ui.openGuild(g)],
      ['fashion', 'Thời trang', 'robe', 'U', () => g.ui.openFashion(g)],
      ['bond', 'Kết duyên', 'rings', 'Y', () => g.ui.openBond(g)],
    ];
    const rail = [
      ['bag', 'Túi đồ', 'bag', 'I', () => g.ui.openBag(g)],
      ['skill', 'Võ học', 'meditation', 'K', () => g.ui.openSkills(g)],
      ['quest', 'Nhiệm vụ', 'quill', 'J', () => g.ui.openQuests(g)],
      ['map', 'Bản đồ', 'map', 'M', () => g.ui.openMap(g)],
      ['craft', 'Sản xuất', 'cauldron', 'T', () => g.ui.openCraft(g)],
      ['mount', 'Thú cưỡi', 'horse', 'B', () => g.ui.openCompanions(g)],
    ];
    const btn = ([id, n, ic, key]) => `<button class="mi" data-mi="${id}" title="${n} (${key})"><span class="mi-ic">${icon(ic)}</span><span class="mi-n">${n}</span><i class="badge"></i></button>`;
    $('topbar').innerHTML = top.map(btn).join('');
    $('rail').innerHTML = rail.map(btn).join('');
    for (const [id, , , , fn] of [...top, ...rail]) {
      document.querySelector(`[data-mi="${id}"]`).onclick = () => { g.input.unlock(); g.cursorMode = false; fn(); };
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
    $('toasts').appendChild(el);
    this.toasts.push({ el, t });
    while (this.toasts.length > 3) { this.toasts.shift().el.remove(); }
  }

  tip(text, t = 6) {
    const el = $('tip');
    el.innerHTML = text.replace(/([A-Z][a-z]*|Space|Chuột trái|Chuột phải|Ctrl|Shift|W A S D)(?=\s*[:·]|\s+(?:để|2 lần))/g, '<b>$1</b>');
    el.classList.remove('hidden');
    this.tipT = t;
  }

  bark(name, portrait, text, t = 4) {
    $('bark-name').textContent = name;
    $('bark-text').textContent = this.game.ui.nh(text);
    $('bark-img').src = portrait || '';
    $('bark').classList.remove('hidden');
    this.barkT = t;
  }

  prompt(text) {
    if (!text) $('prompt').classList.add('hidden');
    else { $('prompt-text').textContent = text; $('prompt').classList.remove('hidden'); }
  }

  objective(chapter, text) {
    $('obj-chapter').innerHTML = chapter;
    const el = $('obj-text');
    if (el.textContent !== text) {
      el.textContent = text;
      el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    }
  }

  damage(pos, n, kind = '') {
    if (!this.game.settings.dmgNumbers && kind !== 'heal') return;
    const d = document.createElement('div');
    d.className = 'dmg ' + kind;
    d.textContent = kind === 'heal' ? '+' + n : n;
    $('dmg-layer').appendChild(d);
    this.nums.push({ el: d, pos: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 40 });
  }

  flashSlot(id) {
    const el = $('slot-' + id);
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  project(v) {
    const p = v.clone().project(this.game.camera);
    return { x: ((p.x + 1) / 2) * innerWidth, y: ((1 - p.y) / 2) * innerHeight, behind: p.z > 1 };
  }

  update(dt) {
    const g = this.game, p = g.player;
    $('hp').style.width = (p.hp / p.maxHp) * 100 + '%';
    $('mp').style.width = (p.mp / p.maxMp) * 100 + '%';
    $('st').style.width = (p.st / p.maxSt) * 100 + '%';
    $('hp-t').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    $('mp-t').textContent = `${Math.floor(p.mp)} / ${p.maxMp}`;
    $('vignette').style.opacity = p.hp / p.maxHp < 0.3 ? 0.4 + Math.sin(performance.now() / 220) * 0.2 : Math.max(0, p.hurtFlash || 0);
    if (p.hurtFlash) p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2);

    this.badgeT = (this.badgeT || 0) - dt;
    if (this.badgeT <= 0) { this.badgeT = 0.5; this.updateBadges(); }
    document.body.classList.toggle('cursor-free', !g.input.locked);

    // kỹ năng + hồi chiêu
    const cds = { dash: [p.cooldowns.dash, 2.5], cast: [p.cooldowns.cast, 0.8], potion: [p.cooldowns.potion || 0, 6] };
    for (const s of SLOTS) {
      const el = $('slot-' + s.id);
      const cd = cds[s.id];
      el.querySelector('.cd').style.transform = `scaleY(${cd ? Math.min(1, cd[0] / cd[1]) : 0})`;
      el.classList.toggle('nomp', !!s.mp && p.mp < s.mp);
      el.classList.toggle('locked', !!s.lock && !g.unlocks[s.lock]);
    }
    $('potion-cnt').textContent = g.potions;
    $('slot-potion').classList.toggle('locked', g.potions <= 0);

    // boss
    const boss = g.enemies.find((e) => e.boss && !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 50);
    $('boss').classList.toggle('hidden', !boss);
    if (boss) {
      const w = (boss.hp / boss.maxHp) * 100;
      $('boss-name').textContent = boss.name;
      $('boss-hp').style.width = w + '%';
      $('boss-lag').style.width = w + '%';
    }

    // thông báo
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t -= dt;
      if (t.t < 0.6) t.el.classList.add('out');
      if (t.t <= 0) { t.el.remove(); this.toasts.splice(i, 1); }
    }
    if (this.tipT > 0 && (this.tipT -= dt) <= 0) $('tip').classList.add('hidden');
    if (this.barkT > 0 && (this.barkT -= dt) <= 0) $('bark').classList.add('hidden');

    // điểm đánh dấu nhiệm vụ trên màn hình
    const mk = g.markerPos();
    const mEl = $('marker');
    if (mk && !g.dialogOpen) {
      const y = g.terrain.heightAt(mk.x, mk.z) + 2.6;
      const w = new THREE.Vector3(mk.x, y, mk.z);
      const d = Math.hypot(mk.x - p.pos.x, mk.z - p.pos.z);
      let s = this.project(w);
      const m = 48;
      if (s.behind) { s.x = innerWidth - s.x; s.y = innerHeight - m; }
      s.x = Math.min(innerWidth - m, Math.max(m, s.x));
      s.y = Math.min(innerHeight - m, Math.max(m + 20, s.y));
      mEl.style.display = 'flex';
      mEl.style.left = s.x + 'px';
      mEl.style.top = s.y + 'px';
      $('marker-dist').textContent = Math.round(d) + 'm';
      $('obj-dist').textContent = `Cách ${Math.round(d)} trượng`;
      mEl.style.opacity = d < 6 ? 0.25 : 1;
    } else { mEl.style.display = 'none'; $('obj-dist').textContent = ''; }

    // bảng tên: người chơi (danh hiệu), NPC (chức danh), kẻ địch (cấp + máu)
    const seen = new Set();
    const ROLES = { guard: 'Gác cổng', keeper: 'Chưởng quỹ', maiden: 'Lâm gia', captive: 'Bị bắt' };
    const tag = (key, pos, h, cls, html, hpK) => {
      const s2 = this.project(pos.clone().setY(pos.y + h));
      if (s2.behind) return;
      let el = this.plates.get(key);
      if (!el) { el = document.createElement('div'); el.className = 'plate tag ' + cls; $('plates').appendChild(el); this.plates.set(key, el); }
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      seen.add(key);
      el.style.left = s2.x + 'px';
      el.style.top = s2.y + 'px';
      if (hpK !== undefined) el.querySelector('.tr div').style.width = hpK * 100 + '%';
    };
    if (document.body.classList.contains('mmo') && !g.dialogOpen) {
      tag(p, p.pos, 2.35, 'me', `<div class="title">${realmOf(g.rpg.level)}</div><div class="nm">${g.profile.name}</div>`);
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
      tag(e, e.pos, 2.25, 'foe', `<div class="nm"><span class="lvl">Lv.${Math.max(1, Math.round(e.exp / 12))}</span>${e.name}</div><div class="tr"><div></div></div>`, e.hp / e.maxHp);
    }
    for (const [k, el] of this.plates) if (!seen.has(k)) { el.remove(); this.plates.delete(k); }

    // số sát thương
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += dt;
      if (n.t > 1.0) { n.el.remove(); this.nums.splice(i, 1); continue; }
      const s = this.project(n.pos.clone().add(new THREE.Vector3(0, n.t * 1.3, 0)));
      if (s.behind) { n.el.style.display = 'none'; continue; }
      n.el.style.display = '';
      n.el.style.left = s.x + n.dx * n.t + 'px';
      n.el.style.top = s.y + 'px';
      n.el.style.opacity = String(1 - Math.max(0, n.t - 0.6) / 0.4);
    }
    this.drawMinimap();
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
    for (const e of this.game.enemies) if (!e.dead) dot(e.pos.x, e.pos.z, e.boss ? '#ff2a2a' : '#b8332b', e.boss ? 5 : 3);
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
    const n = $('compass-n');
    const a = rot + Math.PI; // hướng -z trên bản đồ
    n.style.left = 110 + Math.sin(-a) * 96 + 'px';
    n.style.top = 100 - Math.cos(-a) * 96 - 8 + 'px';
  }
}
