import { LOOKS } from './game.js';

/**
 * Giang hồ trực tuyến: kênh thế giới, Luận Kiếm Đài (đấu với bản chụp nhân vật của người chơi khác), chợ giao dịch.
 * Máy chủ: server/worker.js (Cloudflare). Chưa cấu hình địa chỉ thì mọi tính năng báo "máy chủ chưa mở".
 */
// VITE_ONLINE_URL: bản trên máy chủ riêng dùng '/online' (cùng tên miền với game)
export const ONLINE_URL = import.meta.env.VITE_ONLINE_URL || 'https://hiep-khach-online.vankhanh-le.workers.dev';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CLS_FOE = { kiem: ['mguard', 'sword'], thuong: ['boss', 'saber'], cung: ['bandit2', 'machete'], phap: ['situ', 'staff'], dao: ['hanxue', 'dagger'] };

export class Online {
  constructor(g) {
    this.g = g;
    this.since = 0;
    this.pollT = 2;
    this.ok = null;
    this.users = 0;
    let id = null;
    try { id = localStorage.getItem('hk_pid'); if (!id) { id = crypto.randomUUID(); localStorage.setItem('hk_pid', id); } } catch { id = crypto.randomUUID(); }
    this.pid = id;
  }
  get base() { try { return localStorage.getItem('hk_online') || ONLINE_URL; } catch { return ONLINE_URL; } }

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
    if (!this.base || (this.pollT -= dt) > 0) return;
    this.pollT = 6;
    this.call('/state?since=' + this.since).then((d) => {
      this.ok = true;
      this.users = d.online;
      for (const m of d.chat) {
        this.since = Math.max(this.since, m.n);
        if (this.firstDone) this.g.mhud?.log('world', m.extra === 'arena' ? `<b class="cy">${esc(m.text)}</b>` : `<b>${esc(m.name)}</b>: ${esc(m.text)}`);
      }
      this.firstDone = true;
    }).catch(() => { this.ok = false; this.pollT = 30; });
  }

  say(text) { return this.call('/chat', { text }); }

  /** Đấu với bản chụp của người chơi khác ngay tại chỗ. */
  async duel(o) {
    const g = this.g, p = g.player, s = o.snap;
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
      const r = await this.call('/arena/result', { opp: f.o.pid, win });
      g.toast(`${win ? '<b>THẮNG</b>' : '<b>THUA</b>'} · Điểm luận kiếm ${r.delta >= 0 ? '+' : ''}${r.delta} → <b>${r.rating}</b>`, 4);
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
