import { LOOKS } from './game.js';
import { STORE_PREFIX } from '../settings.js';
import { WsRetry } from './ws_retry.js';

/**
 * Giang hồ trực tuyến: kênh thế giới, Luận Kiếm Đài (đấu với bản chụp nhân vật của người chơi khác), chợ giao dịch.
 * Máy chủ: server/server.mjs (máy chủ riêng, cùng tên miền) hoặc server/worker.js (Cloudflare, bản cũ).
 * Chưa cấu hình địa chỉ thì mọi tính năng báo "máy chủ chưa mở".
 * Máy chủ riêng (base là đường dẫn tương đối như '/online'): kênh thời gian thực WebSocket base + '/ws'
 * (tin thế giới, số người online, báo món chợ đã bán); socket đóng thì quay về hỏi định kỳ /state mỗi 6 giây
 * (lần đầu sau 1–6 giây ngẫu nhiên).
 */
// VITE_ONLINE_URL: bản trên máy chủ riêng dùng '/online' (cùng tên miền với game)
export const ONLINE_URL = import.meta.env.VITE_ONLINE_URL || 'https://hiep-khach-online.vankhanh-le.workers.dev';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// kết nối lại: xem ws_retry.js; ẩn trang quá 60 giây thì tạm ngắt
const HIDDEN_PAUSE = 60000;
const CLS_FOE = { kiem: ['mguard', 'sword'], thuong: ['boss', 'saber'], cung: ['bandit2', 'machete'], phap: ['situ', 'staff'], dao: ['hanxue', 'dagger'] };

export class Online {
  constructor(g) {
    this.g = g;
    this.since = 0;
    this.pollT = 2;
    this.ok = null;
    this.users = 0;
    let id = null;
    // bản dev dùng khoá riêng (cùng tên miền với bản chính trên GitHub Pages): không dùng chung mã người chơi
    const key = STORE_PREFIX + 'hk_pid';
    try { id = localStorage.getItem(key); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); } } catch { id = crypto.randomUUID(); }
    this.pid = id;
    this.ws = null; // socket thời gian thực (đã chào xong thì this.live = true)
    this.live = false;
    this.retry = new WsRetry();
    this.wsT = 0; // còn bao lâu (giây) mới thử kết nối lại
    this.paused = false;
    this.acks = new Map();
    this.ackN = 0;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        clearTimeout(this.hideT);
        if (document.hidden) {
          this.hideT = setTimeout(() => { this.paused = true; this.closeWs(); }, HIDDEN_PAUSE);
        } else if (this.paused) { this.paused = false; this.retry.reset(); this.wsT = 0; this.pollT = Math.min(this.pollT, 0.5); }
      });
    }
  }
  /** Địa chỉ WebSocket: chỉ khi máy chủ là đường dẫn cùng tên miền (máy chủ Cloudflare cũ không có /ws). */
  get wsUrl() {
    const b = this.base;
    if (!b || !b.startsWith('/') || b.startsWith('//') || typeof WebSocket === 'undefined') return null;
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + b.replace(/\/$/, '') + '/ws';
  }

  /** Mở socket và chào (pid gửi trong tin đầu, không nằm trên URL). */
  openWs() {
    const url = this.wsUrl;
    if (!url || this.ws || this.paused) return;
    let ws;
    try { ws = new WebSocket(url); } catch { this.retryWs(); return; }
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', pid: this.pid, since: this.since }));
    this.wsIdle = 0;
    ws.onmessage = (e) => { this.wsIdle = 0; let m; try { m = JSON.parse(e.data); } catch { return; } this.onWs(m); };
    // đóng/lỗi/quá hạn kết nối đều dọn như nhau (có trình duyệt chỉ báo error mà không báo close khi bị từ chối)
    const drop = () => {
      clearTimeout(connT);
      if (this.ws !== ws) return;
      this.ws = null; this.live = false;
      for (const [, a] of this.acks) { clearTimeout(a.t); a.reject(Object.assign(new Error('closed'), { code: 'closed' })); }
      this.acks.clear();
      this.pollT = this.retry.pollAfterDrop(this.pollT); // quay về hỏi định kỳ sau 1–6 giây ngẫu nhiên
      this.retryWs();
      try { ws.close(); } catch { /* đã đóng */ }
    };
    const connT = setTimeout(() => { if (!this.live) drop(); }, 15000);
    this.connT = connT; // xoá khi máy chủ chào lại (onWs 'state')
    ws.onclose = drop;
    ws.onerror = drop;
    this.dropWs = drop;
  }
  retryWs() { this.wsT = this.retry.drop(); }
  closeWs() { if (this.ws) this.dropWs?.(); }
  onWs(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'state') {
      clearTimeout(this.connT); this.live = true; this.ok = true; // số lần thử chỉ về 0 khi socket sống đủ lâu (update)
      this.users = +m.online | 0;
      this.addChat(Array.isArray(m.chat) ? m.chat : []);
    } else if (m.t === 'chat' && m.m) this.addChat([m.m]);
    else if (m.t === 'online') this.users = +m.n | 0;
    else if (m.t === 'ack') {
      const a = this.acks.get(m.r);
      if (!a) return;
      this.acks.delete(m.r); clearTimeout(a.t);
      if (m.ok) a.resolve({ ok: true }); else a.reject(Object.assign(new Error(m.error || 'error'), { code: m.error }));
    } else if (m.t === 'sold') this.claimSold();
  }
  /** Tin thế giới mới (từ /state hoặc socket): bỏ tin đã có, lần đầu chỉ lấy mốc chứ không in lại tin cũ. */
  addChat(list) {
    for (const m of list) {
      if (!m || !(+m.n > this.since)) continue;
      this.since = +m.n;
      if (this.firstDone) this.g.mhud?.log('world', m.extra === 'arena' ? `<b class="cy">${esc(m.text)}</b>` : `<b>${esc(m.name)}</b>: ${esc(m.text)}`);
    }
    this.firstDone = true;
  }
  /** Món rao ở chợ vừa có người mua: nhận bạc ngay. */
  async claimSold() {
    if (this.claiming) return;
    this.claiming = true;
    try {
      const c = await this.call('/market/claim');
      const gold = +c.gold | 0, sold = Array.isArray(c.sold) ? c.sold : [];
      if (gold > 0) {
        this.g.rpg.addGold(gold);
        this.g.toast(`Bán được ${sold.map((x) => `<b>${esc(x?.name)}</b>`).join(', ')} · nhận <b>${gold}</b> lượng (đã trừ 5% thuế chợ)`, 5);
      }
    } catch { /* lần mở Chợ sau sẽ nhận */ }
    this.claiming = false;
  }
  // đổi máy chủ qua localStorage chỉ cho bản dev (bản chính: trang khác cùng tên miền không chuyển hướng được mã người chơi)
  get base() { try { return ((import.meta.env.DEV || import.meta.env.VITE_DEV_BUILD) && localStorage.getItem('hk_online')) || ONLINE_URL; } catch { return ONLINE_URL; } }

  async call(path, body) {
    if (!this.base) throw Object.assign(new Error('offline'), { code: 'offline' });
    const url = this.base + path + (body ? '' : (path.includes('?') ? '&' : '?') + 'pid=' + this.pid);
    const r = await fetch(url, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pid: this.pid, name: this.g.profile.name, ...body }) } : {});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || r.status), { code: d.error });
    return d;
  }

  /** Bản chụp nhân vật để người khác đấu cùng. */
  snapshot() {
    const g = this.g, r = g.rpg, p = g.player;
    return {
      name: g.profile.name, cls: g.profile.hero?.cls || 'kiem', level: r.level, power: g.sys.power(),
      snap: { hp: p.maxHp, atk: r.atk(), def: r.def(), crit: r.crit(), adv: g.path?.adv() || 0, faction: g.path?.s.faction || '', title: g.path?.advName()[0] || '', weapon: r.gear?.weapon?.name || '' },
    };
  }

  update(dt) {
    this.tick(dt);
    if (!this.base || this.paused) return;
    if (!this.ws && this.wsUrl && (this.wsT -= dt) <= 0) this.openWs();
    if (this.live) {
      this.retry.live(dt);
      // socket im lặng quá lâu (mạng rớt mà không báo đóng): hỏi thử, vẫn im thì bỏ và kết nối lại
      this.wsIdle += dt;
      if (this.wsIdle > 30 && !this.wsPinged) { this.wsPinged = true; try { this.ws.send('{"t":"ping"}'); } catch { /* đang đóng */ } }
      if (this.wsIdle <= 30) this.wsPinged = false;
      if (this.wsIdle > 45) this.closeWs();
    }
    if (this.live || (this.pollT -= dt) > 0) return; // socket đang chạy thì không cần hỏi định kỳ
    this.pollT = 6;
    this.call('/state?since=' + this.since).then((d) => {
      this.ok = true;
      this.users = +d.online | 0;
      this.addChat(Array.isArray(d.chat) ? d.chat : []);
    }).catch(() => { this.ok = false; this.pollT = 30; });
  }

  say(text) {
    const ws = this.ws;
    if (!this.live || !ws || ws.readyState !== 1) return this.call('/chat', { text });
    const r = (this.ackN = (this.ackN + 1) % 1e6);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.acks.delete(r); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); }, 8000);
      this.acks.set(r, { resolve, reject, t });
      ws.send(JSON.stringify({ t: 'chat', text: String(text ?? '').slice(0, 1000), name: String(this.g.profile.name ?? '').slice(0, 64), r }));
    });
  }

  /** Đấu với bản chụp của người chơi khác ngay tại chỗ. */
  async duel(o) {
    // dữ liệu của người chơi khác: bỏ ký tự HTML (tên này đi vào bảng tên, thông báo...) và ép kiểu số
    const txt = (v, n) => String(v ?? '').replace(/[<>&"'`\\]/g, '').slice(0, n), num = (v) => (Number.isFinite(+v) ? +v : 0);
    o = { ...o, name: txt(o.name, 16), cls: txt(o.cls, 10), level: num(o.level) | 0 };
    const s = { ...o.snap, title: txt(o.snap?.title, 20), hp: num(o.snap?.hp), atk: num(o.snap?.atk), crit: num(o.snap?.crit) };
    const g = this.g, p = g.player;
    if (this.fight) return;
    const [look, weapon] = CLS_FOE[o.cls] || CLS_FOE.kiem;
    const a = p.yaw, x = p.pos.x + Math.sin(a) * 7, z = p.pos.z + Math.cos(a) * 7;
    g.vfx.banner('論劍', `${g.profile.name}  ⚔  ${o.name}`, '#ffd86a');
    g.audio.skill('charge');
    const e = await g.spawn('duelist', x, z, {
      look: LOOKS[look], weapon, group: 'pvp', boss: true, aggro: 80,
      name: `${o.name} · ${s.title || o.cls} Lv.${o.level}`,
      hp: Math.max(300, Math.round(s.hp * 1.6)), dmg: Math.max(12, Math.round(s.atk * 0.22 * (1 + s.crit * 0.8))), speed: 6.4, caster: o.cls === 'phap' || o.cls === 'cung',
    });
    this.fight = { e, o, t: 120 };
    p.hp = p.maxHp; p.mp = p.maxMp;
    g.toast(`Luận Kiếm Đài: đánh bại <b>${esc(o.name)}</b> trong 2 phút`, 3);
  }

  async endDuel(win) {
    const f = this.fight;
    if (!f) return;
    this.fight = null;
    const g = this.g;
    if (!f.e.dead) { f.e.dead = true; g.scene.remove(f.e.root); }
    try {
      const r = await this.call('/arena/result', { opp: f.o.oid ?? f.o.pid, win }); // oid: máy chủ mới không gửi pid người khác
      g.toast(`${win ? '<b>THẮNG</b>' : '<b>THUA</b>'} · Điểm luận kiếm ${r.delta >= 0 ? '+' : ''}${+r.delta | 0} → <b>${+r.rating | 0}</b>`, 4);
    } catch (e) { g.toast(e.code === 'slow' ? 'Đấu quá nhanh, kết quả không được tính' : 'Không gửi được kết quả', 2); }
    if (win) { g.rpg.addGold(100 + f.o.level * 10); g.vfx.banner('勝', 'Luận kiếm thắng lợi', '#ffd86a'); g.audio.skill('ult', 0.6); }
    else if (g.player.dead) setTimeout(() => g.player.revive(g.player.pos.x, g.player.pos.z, g.player.yaw), 1500);
  }

  tick(dt) {
    const f = this.fight;
    if (!f) return;
    f.t -= dt;
    if (f.e.dead) this.endDuel(true);
    else if (this.g.player.dead || f.t <= 0) this.endDuel(false);
  }
}
