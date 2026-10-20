import { icon, itemIcon } from './icons.js';
import { realmOf } from '../game/rpg.js';

const $ = (id) => document.getElementById(id);

/**
 * HUD kiểu game nhập vai di động: joystick ảo, nút đánh + vòng chiêu, thuốc nhanh, Auto,
 * khung avatar, bảng nhiệm vụ bên trái, khung chat nhiều kênh. Dùng được cả cảm ứng và chuột.
 */
export class MobileHUD {
  constructor(game) {
    this.g = game;
    this.chat = [];
    this.chatTab = 'all';
    const root = document.createElement('div');
    root.id = 'mhud';
    root.innerHTML = `
      <div id="m-avatar">
        <div class="m-face"><img id="m-face-img" alt="" /><span class="m-lv" id="m-lv">1</span></div>
        <div class="m-info">
          <div class="m-name"><span id="m-name"></span><span class="m-vip">VIP</span></div>
          <div class="m-bar hp"><div id="m-hp"></div><span id="m-hp-t"></span></div>
          <div class="m-bar mp"><div id="m-mp"></div><span id="m-mp-t"></span></div>
          <div class="m-power">Lực chiến <b id="m-power">0</b></div>
          <div class="m-exp"><div id="m-exp"></div></div>
        </div>
      </div>
      <div id="m-target" class="hidden">
        <div class="mt-face"><img id="mt-img" alt="" /><span id="mt-lv"></span></div>
        <div class="mt-info"><div class="mt-name" id="mt-name"></div><div class="mt-bar"><div id="mt-hp"></div><span id="mt-hp-t"></span></div></div>
        <div class="mt-pct" id="mt-pct"></div>
      </div>
      <div id="m-quest">
        <div class="mq-tabs"><button class="on">Nhiệm Vụ</button><button>Tổ Đội</button></div>
        <div id="mq-body"></div>
      </div>
      <div id="m-joy"><div class="joy-ring"></div><div class="joy-knob"></div></div>
      <div id="m-actions">
        <button class="m-atk" data-act="atk"><span class="ico-wrap"></span></button>
        <button class="m-sk s1" data-act="q"><span class="ico-wrap"></span><i class="cd"></i><em class="nm"></em></button>
        <button class="m-sk s2" data-act="f"><span class="ico-wrap"></span><i class="cd"></i><em class="nm"></em></button>
        <button class="m-sk s3" data-act="roll"><span class="ico-wrap">${icon('roll')}</span><i class="cd"></i></button>
        <button class="m-sk s4" data-act="jump"><span class="ico-wrap">${icon('cloud')}</span><i class="cd"></i></button>
        <button class="m-sk s5" data-act="block"><span class="ico-wrap">${icon('shield')}</span></button>
        <button class="m-sk s6" data-act="u1"><span class="ico-wrap"></span><i class="cd"></i><em class="nm"></em><span class="lock">${icon('lock')}<b></b></span></button>
        <button class="m-sk s7" data-act="u2"><span class="ico-wrap"></span><i class="cd"></i><em class="nm"></em><span class="lock">${icon('lock')}<b></b></span></button>
        <button class="m-auto" data-act="auto"><span>Auto</span></button>
      </div>
      <div id="m-quick">
        <button data-act="mount" title="Thú cưỡi (H)">${icon('horse')}</button>
        <button data-act="pet" title="Đồng hành">${icon('dog')}</button>
        <button data-act="potion" class="pot" title="Kim sang dược (R)">${itemIcon('potion', 'potion')}<b id="mq-pot">0</b></button>
        <button data-act="qipill" class="pot" title="Hồi khí đan">${itemIcon('qipill', 'flask')}<b id="mq-qi">0</b></button>
      </div>
      <div id="m-chat">
        <div class="mc-tabs">${[['all', 'Tất cả'], ['area', 'Khu vực'], ['team', 'Tổ Đội'], ['guild', 'Bang Hội']].map(([k, n]) => `<button data-ch="${k}" class="${k === 'all' ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div id="mc-log"></div>
      </div>
      <div id="m-status"><span id="m-clock"></span> · EXP nhân vật <b id="m-exp-t">0%</b></div>
      <div id="m-ann"></div>
      <div id="m-camhint">🖱 Kéo chuột / vuốt màn hình để xoay & nghiêng góc nhìn · Cuộn hoặc chụm 2 ngón để phóng to · Phím ← → ↑ ↓</div>`;
    document.getElementById('hud').appendChild(root);

    // nút
    root.querySelectorAll('[data-act]').forEach((b) => {
      const act = b.dataset.act;
      const down = (e) => { e.preventDefault(); e.stopPropagation(); this.press(act, true); b.classList.add('down'); };
      const up = (e) => { e?.preventDefault?.(); this.press(act, false); b.classList.remove('down'); };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', () => { if (b.classList.contains('down')) up(); });
    });
    root.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => {
      this.chatTab = b.dataset.ch;
      root.querySelectorAll('[data-ch]').forEach((x) => x.classList.toggle('on', x === b));
      this.renderChat();
    }));
    $('m-quest').onclick = () => { if (!this.g.dialogOpen) this.g.ui.openQuests(this.g); };
    this.bindJoystick();
  }

  setClass(cls, def) {
    const atk = { kiem: 'sword', thuong: 'spear', cung: 'bow', phap: 'fist', dao: 'shuriken' }[cls] || 'sword';
    const qi = { dash: 'dash', nova: 'sparkles', volley: 'bow', heal: 'heart', orb: 'palm', bigorb: 'palm', backflip: 'roll' };
    const set = (sel, ic, name) => {
      const b = document.querySelector(sel);
      b.querySelector('.ico-wrap').innerHTML = icon(ic);
      const nm = b.querySelector('.nm');
      if (nm) nm.textContent = name || '';
    };
    set('.m-atk', atk);
    set('.m-sk.s1', qi[def.q.kind] || 'dash', def.q.name);
    set('.m-sk.s2', qi[def.f.kind] || 'palm', def.f.name);
    const uic = { wave: 'shuriken', volley7: 'bow', ult: 'sparkles' };
    set('.m-sk.s6', uic[def.u1.kind] || 'sparkles', def.u1.name);
    set('.m-sk.s7', 'dragon', def.u2.name);
    this.def = def;
  }

  press(act, down) {
    const g = this.g, inp = g.input;
    const key = { atk: 'Mouse0', q: 'KeyQ', f: 'KeyF', u1: 'Digit1', u2: 'Digit2', roll: 'ControlLeft', jump: 'Space', block: 'Block', potion: 'KeyR' }[act];
    if (key) {
      if (down) { inp.justDown.add(key); inp.down.add(key); } else inp.down.delete(key);
      if (down && act !== 'block') g.auto?.pause(1.5);
      return;
    }
    if (!down) return;
    if (act === 'auto') { g.auto.toggle(); return; }
    if (act === 'mount') g.toggleMount();
    if (act === 'pet') { if (g.sys.s.pet) { g.sys.s.petOut = g.sys.s.petOut === false; g.spawnPet(); } else g.ui.openCompanions(g, 'pet'); }
    if (act === 'qipill') g.rpg.use('qipill');
  }

  bindJoystick() {
    const el = $('m-joy'), knob = el.querySelector('.joy-knob');
    let id = null, cx = 0, cy = 0;
    const R = 52;
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.g.input.virtualMove = { x: dx / R, y: -dy / R, sprint: d > R * 0.95 };
      this.g.auto?.pause(1);
    };
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      el.classList.remove('active');
      this.g.input.virtualMove = null;
    };
    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      el.setPointerCapture(id);
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      el.classList.add('active');
      move(e);
    });
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /** Thêm dòng chat. channel: system | area | team | guild | world */
  log(channel, html) {
    this.chat.push({ channel, html, t: Date.now() });
    if (this.chat.length > 60) this.chat.shift();
    this.renderChat();
  }

  renderChat() {
    const tag = { system: ['Hệ Thống', 'sys'], area: ['Khu Vực', 'area'], team: ['Tổ Đội', 'team'], guild: ['Bang Hội', 'guild'], world: ['Giang Hồ', 'world'] };
    const list = this.chat.filter((m) => this.chatTab === 'all' || m.channel === this.chatTab || (this.chatTab === 'area' && m.channel === 'world'));
    $('mc-log').innerHTML = list.slice(-5).map((m) => `<div><span class="ctag ${tag[m.channel][1]}">[${tag[m.channel][0]}]</span> ${m.html}</div>`).join('');
  }

  /** Thông báo chạy chữ trên đầu màn hình. */
  announce(html) {
    const el = $('m-ann');
    el.innerHTML = `<span>${html}</span>`;
    el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
  }

  update() {
    const g = this.g, p = g.player, r = g.rpg;
    $('m-face-img').src = g.portraits.hero || '';
    $('m-lv').textContent = r.level;
    $('m-name').textContent = g.profile.name;
    $('m-hp').style.width = (p.hp / p.maxHp) * 100 + '%';
    $('m-mp').style.width = (p.mp / p.maxMp) * 100 + '%';
    $('m-hp-t').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    $('m-mp-t').textContent = `${Math.floor(p.mp)}/${p.maxMp}`;
    $('m-power').textContent = g.sys.power().toLocaleString('vi-VN');
    const need = Math.round(70 * Math.pow(r.level, 1.55));
    $('m-exp').style.width = (r.exp / need) * 100 + '%';
    $('m-exp-t').textContent = ((r.exp / need) * 100).toFixed(2) + '%';
    $('mq-pot').textContent = r.bag.potion || 0;
    $('mq-qi').textContent = r.bag.qipill || 0;
    const now = new Date();
    $('m-clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // hồi chiêu dạng quét tròn
    const cd = (sel, v, max, mp) => {
      const b = document.querySelector(sel);
      const k = max ? Math.min(1, v / max) : 0;
      b.querySelector('.cd').style.background = k > 0 ? `conic-gradient(rgba(0,0,0,.72) ${k * 360}deg, transparent 0)` : 'none';
      b.classList.toggle('nomp', mp !== undefined && p.mp < mp);
    };
    cd('.m-sk.s1', p.cooldowns.dash, p.cls.q.cd, p.cls.q.mp);
    cd('.m-sk.s2', p.cooldowns.cast, p.cls.f.cd, p.cls.f.mp);
    cd('.m-sk.s6', p.cooldowns.u1, p.cls.u1.cd, p.cls.u1.mp);
    cd('.m-sk.s7', p.cooldowns.u2, p.cls.u2.cd, p.cls.u2.mp);
    for (const [sel, sk] of [['.m-sk.s6', p.cls.u1], ['.m-sk.s7', p.cls.u2]]) {
      const b = document.querySelector(sel), locked = r.level < sk.lv;
      b.classList.toggle('locked', locked);
      b.querySelector('.lock b').textContent = locked ? `Cấp ${sk.lv}` : '';
    }
    // khung mục tiêu
    const tg = g.currentTarget();
    $('m-target').classList.toggle('hidden', !tg);
    if (tg) {
      const pct = Math.max(0, tg.hp / tg.maxHp);
      $('mt-img').src = tg.monster ? `/assets/thumbs/mon_${tg.tag}.png` : (g.portraits[tg.tag] || g.portraits.doba || '');
      $('mt-lv').textContent = 'C.' + (tg.lv || Math.max(1, Math.round(tg.exp / 12)));
      $('mt-name').innerHTML = `${tg.name}${tg.monster?.elite || tg.boss ? ' <span class="elite-tag">Tinh anh</span>' : ''}`;
      $('mt-hp').style.width = pct * 100 + '%';
      $('mt-hp-t').textContent = `${Math.ceil(tg.hp)} / ${tg.maxHp}`;
      $('mt-pct').textContent = Math.round(pct * 100) + '%';
    }
    cd('.m-sk.s3', 0, 0);
    cd('.m-sk.s4', 0, 0, 8);
    document.querySelector('.m-auto').classList.toggle('on', !!g.auto?.on);

    // bảng nhiệm vụ
    const st = g.step, a = g.activity, ch = g.chapter;
    const main = a ? `<div class="mq-item act"><b>[Hoạt động] ${a.title}</b><span>${a.waves.length > 1 ? `Đợt ${a.wave + 1}/${a.waves.length}` : 'Đánh bại đối thủ'}</span></div>` : '';
    const daily = g.sys.s.daily, kills = daily.kill || 0;
    const zn = g.spawner.zoneAt(g.player.pos.x, g.player.pos.z);
    $('mq-body').innerHTML = main + `
      <div class="mq-item main">${icon('scroll')}<div><b>[Chính] ${ch.subtitle}</b><span>${st ? g.ui.nh(st.objective(g)) : 'Đã hoàn thành'}</span></div></div>
      <div class="mq-item">${icon('skull')}<div><b>[Ngày] Diệt trừ ác đồ</b><span>(${kills}/20)</span></div></div>
      <div class="mq-item">${icon('herb')}<div><b>[Ngày] Hái Linh chi thảo</b><span>(${daily.herb || 0}/5)</span></div></div>
      ${zn ? `<div class="mq-item zone">${icon('dragon')}<div><b>[Khu vực] ${zn.name}</b><span>Đang săn quái · Bách quái phổ (L)</span></div></div>` : ''}`;
  }
}
