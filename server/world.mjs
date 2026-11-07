/**
 * Logic máy chủ trực tuyến của Thiên Kiếm Giang Hồ trên Node (node:sqlite), chuyển từ server/worker.js
 * (Cloudflare Worker + Durable Object) và giữ nguyên hành vi, bảng dữ liệu, hình dạng phản hồi của mọi đường dẫn.
 * - Kênh thế giới: 100 tin gần nhất.
 * - Luận Kiếm Đài (PvP bất đồng bộ): bản chụp nhân vật, điểm Elo.
 * - Chợ giao dịch: rao bán trang bị, bạc chờ người bán nhận.
 * Mọi thao tác chạy đồng bộ (SQLite đồng bộ, Node đơn luồng) nên mỗi yêu cầu là trọn vẹn, giống Durable Object.
 * Sự kiện cho kênh thời gian thực: onChat(m) khi có tin mới, onSold(pid) khi món của người bán được mua.
 */
import { createHash } from 'node:crypto';

export const clip = (s, n) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
/** IPv6: một người thường có cả khối /64 => gộp theo /64 để giới hạn theo IP có tác dụng. */
export const ipKey = (ip) => { ip = normIp(ip); return ip.includes(':') ? ipPrefix(ip, 64) : ip; };
/** Tám nhóm hex của một địa chỉ IPv6 (bỏ zone %eth0; đuôi IPv4 dạng chấm đổi thành hai nhóm). */
const v6groups = (ip) => {
  ip = ip.toLowerCase().split('%')[0].replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/, (_, a, b, c, d) => ((a << 8) | b).toString(16) + ':' + ((c << 8) | d).toString(16));
  const [head, tail = ''] = ip.split('::');
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 8).map((x) => parseInt(x, 16) || 0);
};
/**
 * Chuẩn hoá địa chỉ để đếm giới hạn: IPv4 viết dạng IPv6 (::ffff:1.2.3.4, ::ffff:102:304, 0:0:0:0:0:ffff:…) về
 * IPv4 dạng chấm; IPv4 bỏ số 0 đứng đầu (001.002.003.004 = 1.2.3.4). Không như vậy thì một IPv4 có nhiều cách viết
 * và vượt được giới hạn theo IP.
 */
export const normIp = (ip) => {
  ip = String(ip || '').trim();
  if (!ip) return '';
  if (!ip.includes(':')) return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip.split('.').map((x) => +x).join('.') : ip;
  const g = v6groups(ip);
  if (g.length === 8 && g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return [g[6] >> 8, g[6] & 255, g[7] >> 8, g[7] & 255].join('.');
  return ip.toLowerCase().split('%')[0];
};
/** Tiền tố IPv6 dài bits (bội của 16), dạng 'a:b:c::/48'. */
export const ipPrefix = (ip, bits) => v6groups(ip).slice(0, bits / 16).map((x) => x.toString(16)).join(':') + '::/' + bits;
export const okId = (s) => typeof s === 'string' && /^[a-z0-9-]{8,40}$/i.test(s);
// Mã người chơi (pid) là bí mật duy nhất chứng minh "đây là tôi" (nhận bạc bán chợ, gỡ món, bảng Luận Kiếm), nên không
// bao giờ gửi pid của người khác ra ngoài. Người khác chỉ thấy mã công khai oid = băm một chiều của pid
// (cùng công thức với worker.js: 8 byte đầu SHA-256 của 'hk-oid:' + pid, dạng hex).
export const oidOf = (pid) => createHash('sha256').update('hk-oid:' + pid).digest('hex').slice(0, 16);
// Trang bị rao bán: chỉ nhận đúng định dạng món của game
const SLOTS = ['weapon', 'helm', 'armor', 'belt', 'boots', 'ring', 'trinket'], STATS = ['atk', 'hp', 'mp', 'def', 'crit', 'spd'];
export const txt = (v, n) => String(v ?? '').replace(/[<>&"'`\\]/g, '').slice(0, n);
export const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.trunc(Number(v)) || 0));
const PATH = /^(?!.*\.\.)(?!.*\/\/)[\w:./-]{1,100}$/;
export function cleanItem(r) {
  if (!r || typeof r !== 'object' || !SLOTS.includes(r.slot)) return null;
  const stats = {};
  for (const k of Object.keys(r.stats || {})) { if (!STATS.includes(k)) continue; const v = Number(r.stats[k]); if (Number.isFinite(v) && v > 0) stats[k] = k === 'def' || k === 'crit' || k === 'spd' ? +Math.min(v, 10).toFixed(4) : Math.min(Math.round(v), 1e7); }
  const it = { slot: r.slot, base: txt(r.base || r.name, 40), name: txt(r.name, 40), rarity: int(r.rarity, 0, 4), lv: int(r.lv, 1, 999), stats, enh: int(r.enh, 0, 99), han: txt(r.han, 4) };
  if (typeof r.thumb === 'string' && PATH.test(r.thumb)) it.thumb = r.thumb;
  if (typeof r.model === 'string' && PATH.test(r.model)) it.model = r.model;
  if (typeof r.elem === 'string' && /^\w{1,16}$/.test(r.elem)) it.elem = r.elem;
  if (r.divine === true) it.divine = true;
  if (Array.isArray(r.gems)) it.gems = r.gems.filter((g) => typeof g === 'string' && /^gem_\w{1,12}_\d$/.test(g)).slice(0, 6);
  return it;
}
export const safeItem = (j) => { try { return cleanItem(JSON.parse(j)); } catch { return null; } };
/** Danh sách đã bán trong ví: chỉ giữ tên/giá/người mua đã làm sạch. */
export const cleanSold = (sold) => (Array.isArray(sold) ? sold : []).map((x) => ({ name: txt(x?.name, 40), price: int(x?.price, 0, 9999999), buyer: txt(x?.buyer, 16) }));
/** Bản chụp Luận Kiếm: đúng các trường game dùng, ép kiểu và giới hạn. */
export const cleanSnap = (s) => {
  s = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  return JSON.stringify({ hp: +s.hp | 0, atk: +s.atk | 0, def: Math.min(0.7, +s.def || 0), crit: Math.min(0.8, +s.crit || 0), adv: +s.adv | 0, faction: clip(s.faction, 8), title: clip(s.title, 20), weapon: clip(s.weapon, 30) });
};

const SCHEMA = `CREATE TABLE IF NOT EXISTS chat (n INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, pid TEXT, name TEXT, text TEXT, extra TEXT);
  CREATE TABLE IF NOT EXISTS arena (pid TEXT PRIMARY KEY, name TEXT, cls TEXT, level INTEGER, power INTEGER, rating INTEGER, wins INTEGER, losses INTEGER, snap TEXT, t INTEGER);
  CREATE TABLE IF NOT EXISTS market (lid INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, name TEXT, item TEXT, price INTEGER, t INTEGER);
  CREATE TABLE IF NOT EXISTS wallet (pid TEXT PRIMARY KEY, gold INTEGER, sold TEXT);
  CREATE TABLE IF NOT EXISTS rate (pid TEXT, k TEXT, t INTEGER, PRIMARY KEY (pid, k));
  CREATE TABLE IF NOT EXISTS ipr (ip TEXT, k TEXT, w INTEGER, n INTEGER, PRIMARY KEY (ip, k));`;
const ONLINE_MAX = 5000, ONLINE_TTL = 60000;

export class World {
  /** db: DatabaseSync đã mở. */
  constructor(db, { onChat = () => {}, onSold = () => {} } = {}) {
    this.db = db;
    this.onChat = onChat;
    this.onSold = onSold;
    this.st = new Map();
    db.exec(SCHEMA);
    // cột mã công khai cho bảng Luận Kiếm (dữ liệu cũ được điền ở lần khởi động)
    if (!this.all('PRAGMA table_info(arena)').some((c) => c.name === 'oid')) {
      // một lần, cùng lúc thêm cột: làm sạch dữ liệu do máy chủ cũ lưu nguyên (món chợ, tên trong danh sách đã bán,
      // tin nhắn tự gắn cờ hệ thống) để không còn gửi lại nội dung độc cho người chơi dùng bản game cũ
      for (const r of this.all('SELECT lid,item,name FROM market')) {
        const c = safeItem(r.item);
        if (c) this.run('UPDATE market SET item=?, name=? WHERE lid=?', JSON.stringify(c), clip(r.name, 16), r.lid);
        else this.run('DELETE FROM market WHERE lid=?', r.lid);
      }
      for (const w of this.all('SELECT pid,sold FROM wallet')) {
        let sold = []; try { sold = JSON.parse(w.sold || '[]'); } catch { /* hỏng */ }
        this.run('UPDATE wallet SET sold=? WHERE pid=?', JSON.stringify(cleanSold(sold)), w.pid);
      }
      this.run("UPDATE chat SET extra='' WHERE pid<>'system'");
      // thêm cột SAU CÙNG: nếu bị ngắt giữa chừng thì lần khởi động sau dọn lại (dọn lại nhiều lần vẫn an toàn)
      this.run('ALTER TABLE arena ADD COLUMN oid TEXT');
    }
    db.exec(`CREATE INDEX IF NOT EXISTS arena_oid ON arena (oid);
      CREATE INDEX IF NOT EXISTS arena_rating ON arena (rating);`);
    this.fillOids();
    this.online = new Map();
  }
  stmt(q) { let s = this.st.get(q); if (!s) this.st.set(q, (s = this.db.prepare(q))); return s; }
  all(q, ...a) { return this.stmt(q).all(...a); }
  one(q, ...a) { return this.stmt(q).get(...a); }
  run(q, ...a) { return this.stmt(q).run(...a); }

  /** Chặn gửi quá nhanh: mỗi loại thao tác cách nhau ms. */
  slow(pid, k, ms) {
    const now = Date.now(), r = this.one('SELECT t FROM rate WHERE pid=? AND k=?', pid, k);
    if (r && now - r.t < ms) return true;
    this.run('INSERT OR REPLACE INTO rate (pid,k,t) VALUES (?,?,?)', pid, k, now);
    return false;
  }
  /** Giới hạn theo địa chỉ IP: tối đa n lần mỗi phút (đếm theo phút vì nhà mạng di động để nhiều người chung một IP). */
  ipLimit(ip, k, n) {
    if (!ip) return false;
    const now = Date.now(), w = Math.floor(now / 60000), r = this.one('SELECT w,n FROM ipr WHERE ip=? AND k=?', ip, k);
    const used = r && r.w === w ? r.n : 0;
    if (used >= n) return true;
    this.run('INSERT OR REPLACE INTO ipr (ip,k,w,n) VALUES (?,?,?,?)', ip, k, w, used + 1);
    return false;
  }
  /** Giãn cách theo IP cho một việc cụ thể (vd. cùng một IP dìm điểm cùng một người). */
  slowIp(ip, k, ms) { return !!ip && this.slow('ip:' + ip, k, ms); }
  /** Điền mã công khai cho dòng cũ / dòng nhập vào (băm đồng bộ nên không cần chờ). */
  fillOids() {
    for (const r of this.all('SELECT pid FROM arena WHERE oid IS NULL')) this.run('UPDATE arena SET oid=? WHERE pid=?', oidOf(r.pid), r.pid);
  }
  /** Dọn dữ liệu cũ (tối đa mỗi giờ một lần): giới hạn tần suất > 1 ngày, người Luận Kiếm chưa từng đấu và vắng > 60 ngày. */
  prune(now) {
    if (now - (this.pruned || 0) < 3600000) return;
    this.pruned = now;
    this.run('DELETE FROM rate WHERE t < ?', now - 86400000);
    this.run('DELETE FROM ipr WHERE w < ?', Math.floor(now / 60000) - 2);
    this.run('DELETE FROM arena WHERE t < ? AND wins + losses = 0', now - 60 * 86400000); // chưa từng đấu
  }

  /** Ghi nhận một người đang online (qua HTTP hoặc WS); giới hạn kích thước vì mã tự đặt được. */
  seen(pid, now = Date.now()) {
    if (okId(pid) && (this.online.has(pid) || this.online.size < ONLINE_MAX)) this.online.set(pid, now);
  }
  sweepOnline(now = Date.now(), force = false) {
    if (!force && now - (this.onlineSweep || 0) <= 10000) return;
    this.onlineSweep = now;
    for (const [k, t] of this.online) if (now - t > ONLINE_TTL) this.online.delete(k);
  }
  /** Số người khác nhau thấy trong 60 giây qua. */
  onlineCount(now = Date.now()) { this.sweepOnline(now, true); return this.online.size; }

  /** Tin gần nhất sau mốc since (tối đa 50, cũ trước). Không có pid. */
  chatSince(since) {
    return this.all('SELECT n,t,name,text,extra FROM chat WHERE n>? ORDER BY n DESC LIMIT 50', Number(since) || 0).reverse().map((r) => ({ ...r }));
  }
  addChat(now, pid, name, text, extra) {
    const { lastInsertRowid } = this.run('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)', now, pid, name, text, extra);
    this.run('DELETE FROM chat WHERE n <= (SELECT MAX(n) FROM chat) - 200');
    const m = { n: Number(lastInsertRowid), t: now, name, text, extra };
    this.emit(() => this.onChat(m));
    return m;
  }
  /** Sự kiện chỉ phát sau khi giao dịch đã ghi xong (lỗi giữa chừng => huỷ cả sự kiện). */
  emit(fn) { if (this.pending) this.pending.push(fn); else this.fire([fn]); }
  fire(list) { for (const fn of list) { try { fn(); } catch (e) { console.error('online: event', e); } } }
  /** Chạy fn trong một giao dịch: mỗi yêu cầu ghi trọn vẹn hoặc không ghi gì. */
  tx(fn) {
    this.pending = [];
    let out, ev;
    try {
      // BEGIN nằm trong try: mở giao dịch thất bại (bận, lỗi đĩa) vẫn trả pending về null
      this.db.exec('BEGIN IMMEDIATE');
      try { out = fn(); this.db.exec('COMMIT'); ev = this.pending; } catch (e) { try { this.db.exec('ROLLBACK'); } catch { /* đã huỷ */ } throw e; }
    } finally { this.pending = null; }
    this.fire(ev);
    return out;
  }
  /** Gửi tin kênh thế giới qua WS (cùng kiểm tra và giới hạn với POST /chat). */
  chatWs(pid, name, text, ip) {
    if (!okId(pid)) return [400, { error: 'pid' }];
    this.seen(pid);
    try { return this.tx(() => this.chat(pid, name, text, ipKey(ip || ''))); } catch (e) { console.error('online: ws chat', e); return [500, { error: 'server' }]; }
  }
  chat(pid, name, text, ip, now = Date.now()) {
    text = clip(text, 140).trim();
    if (!text) return [400, { error: 'empty' }];
    if (this.slow(pid, 'chat', 2000) || this.ipLimit(ip, 'chat', 60)) return [429, { error: 'slow' }];
    // extra chỉ do máy chủ đặt (vd. 'arena' cho tin Luận Kiếm): người chơi không giả được tin hệ thống
    this.addChat(now, pid, clip(name, 16), text, '');
    return [200, { ok: true }];
  }

  /**
   * Xử lý một yêu cầu HTTP. path: đường dẫn (không tiền tố), query: URLSearchParams, body: object (POST) hoặc null,
   * ip: địa chỉ thật (chưa gộp). Trả về [status, dữ liệu JSON].
   */
  handle(method, path, query, body, rawIp) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
    const p = path, pid = body.pid || query.get('pid');
    const ip = ipKey(rawIp || '');
    const now = Date.now();
    this.seen(pid, now);
    this.sweepOnline(now);
    try {
      return this.tx(() => this.route(p, pid, query, body, ip, now));
    } catch (e) {
      console.error('online:', p, e); // chi tiết chỉ ghi nhật ký máy chủ, không gửi cho người chơi
      return [500, { error: 'server' }];
    }
  }
  route(p, pid, query, body, ip, now) {
    this.prune(now);
    if (p === '/state') {
      return [200, { chat: this.chatSince(query.get('since') || 0), online: this.online.size }];
    }
    if (!okId(pid)) return [400, { error: 'pid' }];
    if (p === '/chat') return this.chat(pid, body.name, body.text, ip, now);
    if (p === '/arena/submit') {
      if (this.ipLimit(ip, 'submit', 60)) return [429, { error: 'slow' }];
      const snap = cleanSnap(body.snap);
      if (snap.length > 600) return [400, { error: 'big' }];
      const old = this.one('SELECT rating,wins,losses FROM arena WHERE pid=?', pid);
      this.run('INSERT OR REPLACE INTO arena (pid,oid,name,cls,level,power,rating,wins,losses,snap,t) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        pid, oidOf(pid), clip(body.name, 16), clip(body.cls, 10), +body.level | 0, +body.power | 0, old?.rating ?? 1000, old?.wins ?? 0, old?.losses ?? 0, snap, now);
      return [200, { ok: true, rating: old?.rating ?? 1000 }];
    }
    if (p === '/arena/opponents') {
      if (this.ipLimit(ip, 'opp', 120)) return [429, { error: 'slow' }];
      const me = this.one('SELECT rating FROM arena WHERE pid=?', pid);
      const r = me?.rating ?? 1000;
      const list = this.all('SELECT oid,name,cls,level,power,rating,wins,losses,snap FROM arena WHERE pid<>? ORDER BY ABS(rating-?) LIMIT 8', pid, r);
      const top = this.all('SELECT name,cls,level,power,rating,wins,losses FROM arena ORDER BY rating DESC LIMIT 20').map((o) => ({ ...o }));
      // 'pid' = mã công khai: bản game cũ đọc o.pid để gửi kết quả đấu (không phải mã người chơi thật)
      return [200, { me: me ? r : null, list: list.map((o) => ({ ...o, pid: o.oid, snap: JSON.parse(o.snap) })), top }];
    }
    if (p === '/arena/result') {
      if (this.slow(pid, 'duel', 15000)) return [429, { error: 'slow' }];
      if (this.ipLimit(ip, 'duel', 30)) return [429, { error: 'slow' }];
      const opp = String(body.opp ?? '');
      const a = this.one('SELECT rating,name,t FROM arena WHERE pid=?', pid);
      const b = this.one('SELECT pid,rating,name FROM arena WHERE oid=?', opp);
      if (!a || !b || b.pid === pid) return [404, { error: 'none' }];
      // cùng một IP chỉ làm một người tụt điểm mỗi 10 phút (chặn tạo mã mới liên tục để dìm điểm người khác)
      const hurt = !this.slowIp(ip, 'hit:' + b.pid, 600000);
      const ea = 1 / (1 + 10 ** ((b.rating - a.rating) / 400)), sa = body.win ? 1 : 0, k = 32;
      const da = Math.round(k * (sa - ea));
      this.run('UPDATE arena SET rating=rating+?, wins=wins+?, losses=losses+? WHERE pid=?', da, sa, 1 - sa, pid);
      if (hurt) this.run('UPDATE arena SET rating=rating-? WHERE pid=?', Math.round(da / 2), b.pid);
      if (body.win && hurt) this.addChat(now, 'system', 'Luận Kiếm', `${a.name} đánh bại ${b.name} trên Luận Kiếm Đài!`, 'arena');
      return [200, { ok: true, delta: da, rating: a.rating + da }];
    }
    if (p === '/market') {
      const list = this.all('SELECT lid,pid,name,item,price,t FROM market ORDER BY lid DESC LIMIT 120');
      const w = this.one('SELECT gold,sold FROM wallet WHERE pid=?', pid);
      return [200, { list: list.map((o) => ({ ...o, name: clip(o.name, 16), item: safeItem(o.item), mine: o.pid === pid, pid: undefined })).filter((o) => o.item), owed: w?.gold || 0, sold: w ? JSON.parse(w.sold || '[]') : [] }];
    }
    if (p === '/market/list') {
      const clean = cleanItem(body.item);
      if (!clean) return [400, { error: 'item' }];
      const item = JSON.stringify(clean), price = Math.max(1, Math.min(9999999, +body.price | 0));
      if (item.length > 800) return [400, { error: 'big' }];
      if (this.slow(pid, 'list', 3000) || this.ipLimit(ip, 'list', 30)) return [429, { error: 'slow' }];
      if (this.one('SELECT COUNT(*) c FROM market WHERE pid=?', pid).c >= 10) return [400, { error: 'limit' }];
      this.run('INSERT INTO market (pid,name,item,price,t) VALUES (?,?,?,?,?)', pid, clip(body.name, 16), item, price, now);
      return [200, { ok: true }];
    }
    if (p === '/market/buy' || p === '/market/cancel') {
      const row = this.one('SELECT * FROM market WHERE lid=?', +body.lid | 0);
      if (!row) return [404, { error: 'gone' }];
      if (p === '/market/cancel' && row.pid !== pid) return [403, { error: 'owner' }];
      if (p === '/market/buy' && row.pid === pid) return [400, { error: 'self' }];
      this.run('DELETE FROM market WHERE lid=?', row.lid);
      if (p === '/market/buy') {
        const w = this.one('SELECT gold,sold FROM wallet WHERE pid=?', row.pid);
        const sold = JSON.parse(w?.sold || '[]'); sold.push({ name: txt(safeItem(row.item)?.name, 40), price: row.price, buyer: clip(body.name, 16) });
        this.run('INSERT OR REPLACE INTO wallet (pid,gold,sold) VALUES (?,?,?)', row.pid, (w?.gold || 0) + Math.floor(row.price * 0.95), JSON.stringify(sold.slice(-20)));
        const seller = row.pid;
        this.emit(() => this.onSold(seller));
      }
      return [200, { ok: true, item: safeItem(row.item), price: row.price }];
    }
    if (p === '/market/claim') {
      const w = this.one('SELECT gold,sold FROM wallet WHERE pid=?', pid);
      this.run('DELETE FROM wallet WHERE pid=?', pid);
      return [200, { gold: w?.gold || 0, sold: JSON.parse(w?.sold || '[]') }];
    }
    return [404, { error: 'not found' }];
  }
}
