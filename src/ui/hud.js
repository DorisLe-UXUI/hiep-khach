import * as THREE from 'three';
import { WORLD_SIZE, PLACES } from '../world/layout.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = $('hud');
    this.dmgLayer = $('dmg-layer');
    this.nums = [];
    this.toastT = 0;
    this.mini = $('minimap').getContext('2d');
    // nền bản đồ nhỏ: vẽ sẵn từ độ cao + splat
    const t = game.terrain, R = 512;
    const c = document.createElement('canvas');
    c.width = c.height = R;
    const g = c.getContext('2d');
    const img = g.createImageData(R, R);
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const x = (i / R - 0.5) * WORLD_SIZE, z = (j / R - 0.5) * WORLD_SIZE;
      const h = t.heightAt(x, z), sp = t.splatAt(x, z);
      let col = h < -0.6 ? [40, 70, 80] : [70 + h * 1.2, 92 + h * 0.6, 52 + h * 1.0];
      if (h > 30) col = [110 + h * 0.4, 108 + h * 0.4, 100 + h * 0.4];
      if (sp.path > 0.3 || sp.paved > 0.3) col = [168, 148, 110];
      const o = (j * R + i) * 4;
      img.data.set([col[0], col[1], col[2], 255], o);
    }
    g.putImageData(img, 0, 0);
    this.miniBg = c;
  }

  show() { this.el.classList.remove('hidden'); }

  toast(text, t = 3) {
    const el = $('toast');
    el.innerHTML = text;
    el.classList.add('show');
    this.toastT = t;
  }

  prompt(text) {
    const el = $('prompt');
    if (!text) el.classList.add('hidden');
    else { el.textContent = text; el.classList.remove('hidden'); }
  }

  dialog(name, text) {
    const el = $('dialog');
    if (!name) { el.classList.add('hidden'); return; }
    $('dialog-name').textContent = name;
    $('dialog-text').textContent = text;
    el.classList.remove('hidden');
  }

  journal(open, html) {
    const el = $('journal');
    el.classList.toggle('hidden', !open);
    if (open) el.innerHTML = '<h2>Nhật ký giang hồ</h2>' + html;
  }

  damage(pos, n, kind = '') {
    const d = document.createElement('div');
    d.className = 'dmg ' + kind;
    d.textContent = n;
    this.dmgLayer.appendChild(d);
    this.nums.push({ el: d, pos: pos.clone(), t: 0, dx: (Math.random() - 0.5) * 30 });
  }

  update(dt) {
    const g = this.game, p = g.player;
    $('hp').style.width = (p.hp / p.maxHp) * 100 + '%';
    $('mp').style.width = (p.mp / p.maxMp) * 100 + '%';
    $('st').style.width = (p.st / p.maxSt) * 100 + '%';

    const boss = g.enemies.find((e) => e.boss && !e.dead && e.alerted && e.pos.distanceTo(p.pos) < 40);
    $('boss').classList.toggle('hidden', !boss);
    if (boss) { $('boss-name').textContent = boss.name; $('boss-hp').style.width = (boss.hp / boss.maxHp) * 100 + '%'; }

    const tr = g.quests.tracker();
    $('tracker').innerHTML = tr.map((q) => `<div class="q"><div class="qt">${q.title}</div>${q.lines.map((l) => `<div class="${q.ready ? 'done' : ''}">· ${l}</div>`).join('')}</div>`).join('');

    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) $('toast').classList.remove('show'); }

    // số sát thương bay lên
    const cam = g.camera, w = innerWidth, h = innerHeight, v = new THREE.Vector3();
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.t += dt;
      if (n.t > 1.0) { n.el.remove(); this.nums.splice(i, 1); continue; }
      v.copy(n.pos).add(new THREE.Vector3(0, n.t * 1.2, 0)).project(cam);
      if (v.z > 1) { n.el.style.display = 'none'; continue; }
      n.el.style.display = '';
      n.el.style.left = ((v.x + 1) / 2) * w + n.dx * n.t + 'px';
      n.el.style.top = ((1 - v.y) / 2) * h + 'px';
      n.el.style.opacity = String(1 - Math.max(0, n.t - 0.6) / 0.4);
    }
    this.drawMinimap();
  }

  drawMinimap() {
    const g = this.mini, p = this.game.player, S = 180, span = 140; // mét hiển thị
    const k = S / span;
    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
    // bản đồ xoay theo camera cho dễ định hướng
    g.translate(S / 2, S / 2);
    g.rotate(this.game.camRig.yaw - Math.PI);
    const bgK = this.miniBg.width / WORLD_SIZE;
    g.drawImage(this.miniBg, (p.pos.x + WORLD_SIZE / 2) * bgK - span / 2 * bgK, (p.pos.z + WORLD_SIZE / 2) * bgK - span / 2 * bgK, span * bgK, span * bgK, -S / 2, -S / 2, S, S);
    const dot = (x, z, color, r = 3) => {
      g.fillStyle = color;
      g.beginPath(); g.arc((x - p.pos.x) * k, (z - p.pos.z) * k, r, 0, Math.PI * 2); g.fill();
    };
    for (const e of this.game.enemies) if (!e.dead) dot(e.pos.x, e.pos.z, e.boss ? '#ff3030' : '#d24a3c', e.boss ? 4.5 : 3);
    for (const n of this.game.npcs) dot(n.pos.x, n.pos.z, '#f2dc8a', 3);
    // mục tiêu nhiệm vụ (kể cả khi ở ngoài khung: ghim ở mép)
    for (const m of this.game.questMarkers()) {
      let dx = (m.x - p.pos.x) * k, dz = (m.z - p.pos.z) * k;
      const d = Math.hypot(dx, dz), lim = S / 2 - 8;
      if (d > lim) { dx *= lim / d; dz *= lim / d; }
      g.fillStyle = '#ffd34a'; g.strokeStyle = '#000';
      g.beginPath(); g.moveTo(dx, dz - 7); g.lineTo(dx + 5, dz); g.lineTo(dx, dz + 7); g.lineTo(dx - 5, dz); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
    // mũi tên người chơi ở giữa
    g.save();
    g.translate(S / 2, S / 2);
    g.rotate(-(p.yaw - this.game.camRig.yaw) + Math.PI);
    g.fillStyle = '#fff'; g.strokeStyle = '#000';
    g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(0, 3); g.lineTo(-5, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
}

export { PLACES };
