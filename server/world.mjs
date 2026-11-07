/**
 * Logic máy chủ trực tuyến của Thiên Kiếm Giang Hồ trên Node + PostgreSQL, chuyển từ server/worker.js
 * (Cloudflare Worker + Durable Object) và giữ nguyên hành vi, bảng dữ liệu, hình dạng phản hồi của mọi đường dẫn.
 * - Kênh thế giới: 100 tin gần nhất.
 * - Luận Kiếm Đài (PvP bất đồng bộ): bản chụp nhân vật, điểm Elo.
 * - Chợ giao dịch: rao bán trang bị, bạc chờ người bán nhận.
 * Mỗi yêu cầu chạy trọn trong một giao dịch, các yêu cầu chạy lần lượt trên một kết nối (db.mjs), giống Durable Object.
 * Sự kiện cho kênh thời gian thực: onChat(m) khi có tin mới, onSold(pid) khi món của người bán được mua.
 */
import { createHash } from 'node:crypto';

/**
 * Cắt chuỗi còn n đơn vị UTF-16 mà vẫn hợp lệ: cắt trúng giữa một cặp thay thế (emoji…) thì bỏ nửa đầu còn sót, nửa lẻ
 * khác (nếu có) thành U+FFFD. Không làm vậy thì PostgreSQL lưu U+FFFD, tin đẩy qua WS khác tin đã lưu và --verify báo sai.
 * Máy chủ và công cụ nhập cùng dùng hàm này nên làm sạch giống hệt nhau.
 */
export const cut = (s, n) => s.slice(0, n).replace(/[\uD800-\uDBFF]$/, '').toWellFormed();
// bỏ cả ký tự NUL: cột TEXT của PostgreSQL không nhận \0 (SQLite thì nhận), giữ lại thì yêu cầu lỗi 500
export const clip = (s, n) => cut(String(s ?? '').replace(/[<>\0]/g, ''), n);
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
export const txt = (v, n) => cut(String(v ?? '').replace(/[<>&"'`\\]/g, ''), n);
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

const ONLINE_MAX = 5000, ONLINE_TTL = 60000;
/** Ghi lỗi gọn: chỉ mã và thông điệp (lỗi pg còn có detail chứa giá trị dữ liệu, không ghi ra nhật ký). */
export const logErr = (where, e) => console.error(where, e?.code ? `[${e.code}]` : '', e?.message ?? String(e));
/** Mã công khai hợp lệ (do oidOf tạo). Chuỗi khác không thể khớp, khỏi hỏi cơ sở dữ liệu. */
const okOid = (s) => /^[0-9a-f]{16}$/.test(s);

export class World {
  /** store: Store của db.mjs (một kết nối, hàng đợi lần lượt). */
  constructor(store, { onChat = () => {}, onSold = () => {} } = {}) {
    this.db = store;
    this.onChat = onChat;
    this.onSold = onSold;
    this.c = null; // kết nối của giao dịch đang chạy (chỉ một giao dịch tại một thời điểm)
    this.pending = null;
    this.online = new Map();
    // 50 tin gần nhất (cũ trước) để GET /state không chạm cơ sở dữ liệu; tải lại mỗi khi có kết nối mới
    // (khởi động, sau mất kết nối), thêm tin sau mỗi COMMIT. null = chưa tải được.
    this.recent = null;
    this.warm = null;
    this.pruned = 0;
    this.pruning = null;
    store.onConnect?.push((c) => this.loadChat(c));
  }
  async all(q, ...a) { return (await this.c.query(q, a)).rows; }
  async one(q, ...a) { return (await this.c.query(q, a)).rows[0]; }
  run(q, ...a) { return this.c.query(q, a); }

  /** Chặn gửi quá nhanh: mỗi loại thao tác cách nhau ms. */
  async slow(pid, k, ms) {
    const now = Date.now(), r = await this.one('SELECT t FROM rate WHERE pid=$1 AND k=$2', pid, k);
    if (r && now - r.t < ms) return true;
    await this.run('INSERT INTO rate (pid,k,t) VALUES ($1,$2,$3) ON CONFLICT (pid,k) DO UPDATE SET t=EXCLUDED.t', pid, k, now);
    return false;
  }
  /** Giới hạn theo địa chỉ IP: tối đa n lần mỗi phút (đếm theo phút vì nhà mạng di động để nhiều người chung một IP). */
  async ipLimit(ip, k, n) {
    if (!ip) return false;
    const now = Date.now(), w = Math.floor(now / 60000), r = await this.one('SELECT w,n FROM ipr WHERE ip=$1 AND k=$2', ip, k);
    const used = r && r.w === w ? r.n : 0;
    if (used >= n) return true;
    await this.run('INSERT INTO ipr (ip,k,w,n) VALUES ($1,$2,$3,$4) ON CONFLICT (ip,k) DO UPDATE SET w=EXCLUDED.w, n=EXCLUDED.n', ip, k, w, used + 1);
    return false;
  }
  /** Giãn cách theo IP cho một việc cụ thể (vd. cùng một IP dìm điểm cùng một người). */
  async slowIp(ip, k, ms) { return !!ip && this.slow('ip:' + ip, k, ms); }
  /** Điền mã công khai cho dòng thiếu (dòng ghi tay / dữ liệu cũ); chạy mỗi khi có kết nối mới. */
  static async fillOids(c) {
    for (const r of (await c.query('SELECT pid FROM arena WHERE oid IS NULL')).rows) await c.query('UPDATE arena SET oid=$1 WHERE pid=$2', [oidOf(r.pid), r.pid]);
  }
  /**
   * Dọn dữ liệu cũ (tối đa mỗi giờ một lần), là một việc riêng trong hàng đợi, xếp trước yêu cầu đã gọi nó.
   * Chỉ đánh dấu đã dọn khi giao dịch dọn đã COMMIT: lỗi thì yêu cầu sau thử lại (không bỏ dọn cả giờ).
   */
  maybePrune(now = Date.now()) {
    if (this.pruning || now - this.pruned < 3600000) return;
    this.pruning = this.tx(() => this.prune(Date.now()))
      // lỗi: thử lại sau 60 giây (không phải ngay yêu cầu sau), để lỗi lặp lại không chiếm hàng đợi liên tục
      .then(() => { this.pruned = now; }, (e) => { this.pruned = now - 3600000 + 60000; if (!e?.busy) logErr('online: prune', e); })
      .finally(() => { this.pruning = null; });
  }
  /** Giới hạn tần suất > 1 ngày, người Luận Kiếm chưa từng đấu và vắng > 60 ngày. */
  async prune(now) {
    await this.run('DELETE FROM rate WHERE t < $1', now - 86400000);
    await this.run('DELETE FROM ipr WHERE w < $1', Math.floor(now / 60000) - 2);
    await this.run('DELETE FROM arena WHERE t < $1 AND wins + losses = 0', now - 60 * 86400000); // chưa từng đấu
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

  /** Tin gần nhất sau mốc since (tối đa 50, cũ trước). Không có pid. since so sánh dạng số thực (như SQLite). */
  async chatSince(since) {
    return (await this.all('SELECT n,t,name,text,extra FROM chat WHERE n > $1::float8 ORDER BY n DESC LIMIT 50', Number(since) || 0)).reverse();
  }
  /** Tải 50 tin gần nhất vào bộ nhớ (chạy khi có kết nối mới, ngoài giao dịch, trước mọi việc khác). */
  async loadChat(c) {
    const { rows } = await c.query('SELECT n,t,name,text,extra FROM chat ORDER BY n DESC LIMIT 50');
    this.recent = rows.reverse();
  }
  /** Thêm tin đã COMMIT vào bản trong bộ nhớ (bỏ qua nếu bản vừa tải lại đã có). */
  remember(m) {
    if (!this.recent) return;
    if (this.recent.length && this.recent[this.recent.length - 1].n >= m.n) return;
    this.recent.push(m);
    if (this.recent.length > 50) this.recent.splice(0, this.recent.length - 50);
  }
  /**
   * GET /state từ bộ nhớ, giống hệt truy vấn chatSince: 50 tin có n lớn nhất trong số n > since đều nằm trong 50 tin
   * mới nhất. Chưa tải được (chưa từng kết nối) thì chờ một lần kết nối dùng chung; vẫn không được thì lỗi.
   */
  async state(since) {
    if (!this.recent) await (this.warm ??= this.db.run(async () => {}, { tx: false }).catch(() => {}).finally(() => { this.warm = null; }));
    if (!this.recent) throw new Error('online: chưa tải được kênh thế giới');
    const s = Number(since) || 0;
    return [200, { chat: this.recent.filter((m) => m.n > s).slice(-50), online: this.online.size }];
  }
  async addChat(now, pid, name, text, extra) {
    const { rows } = await this.run('INSERT INTO chat (t,pid,name,text,extra) VALUES ($1,$2,$3,$4,$5) RETURNING n', now, pid, name, text, extra);
    await this.run('DELETE FROM chat WHERE n <= (SELECT MAX(n) FROM chat) - 200');
    const m = { n: rows[0].n, t: now, name, text, extra };
    this.emit(() => { this.remember(m); this.onChat(m); });
    return m;
  }
  /** Sự kiện chỉ phát sau khi giao dịch đã ghi xong (lỗi giữa chừng => huỷ cả sự kiện). */
  emit(fn) { if (this.pending) this.pending.push(fn); else this.fire([fn]); }
  fire(list) { for (const fn of list) { try { fn(); } catch (e) { console.error('online: event', e); } } }
  /**
   * Chạy fn trong một giao dịch qua hàng đợi: mỗi yêu cầu ghi trọn vẹn hoặc không ghi gì, các yêu cầu chạy lần lượt.
   * Sự kiện chỉ phát khi COMMIT đã thành công.
   */
  async tx(fn, opt) {
    let ev;
    const out = await this.db.run(async (c) => {
      this.c = c; this.pending = [];
      try { const r = await fn(); ev = this.pending; return r; } finally { this.c = null; this.pending = null; }
    }, opt);
    this.fire(ev);
    return out;
  }
  /** Trạng thái đầu cho WS (tin bỏ lỡ). */
  hello(since) { return this.tx(() => this.chatSince(since)); }
  /** Gửi tin kênh thế giới qua WS (cùng kiểm tra và giới hạn với POST /chat). */
  async chatWs(pid, name, text, ip) {
    if (!okId(pid)) return [400, { error: 'pid' }];
    this.seen(pid);
    this.maybePrune();
    try { return await this.tx(() => this.chat(pid, name, text, ipKey(ip || ''), Date.now())); } catch (e) {
      if (e?.busy) return [503, { error: 'busy' }];
      if (e?.unknownCommit) console.error('online: COMMIT quá hạn, không rõ đã ghi chưa: ws chat');
      else logErr('online: ws chat', e);
      return [500, { error: 'server' }];
    }
  }
  async chat(pid, name, text, ip, now) {
    text = clip(text, 140).trim();
    if (!text) return [400, { error: 'empty' }];
    if ((await this.slow(pid, 'chat', 2000)) || (await this.ipLimit(ip, 'chat', 60))) return [429, { error: 'slow' }];
    // extra chỉ do máy chủ đặt (vd. 'arena' cho tin Luận Kiếm): người chơi không giả được tin hệ thống
    await this.addChat(now, pid, clip(name, 16), text, '');
    return [200, { ok: true }];
  }

  /**
   * Xử lý một yêu cầu HTTP. path: đường dẫn (không tiền tố), query: URLSearchParams, body: object (POST) hoặc null,
   * ip: địa chỉ thật (chưa gộp). gone(): máy khách đã ngắt thì tới lượt không chạy nữa.
   * Trả về lời hứa [status, dữ liệu JSON]. GET /state không chạm cơ sở dữ liệu (đọc bản trong bộ nhớ).
   */
  async handle(method, path, query, body, rawIp, { gone } = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
    const p = path, pid = body.pid || query.get('pid');
    const ip = ipKey(rawIp || '');
    this.seen(pid);
    this.sweepOnline();
    try {
      if (p === '/state') return await this.state(query.get('since') || 0);
      this.maybePrune();
      // thời điểm lấy khi tới lượt (các yêu cầu chạy lần lượt nên mốc thời gian tăng dần)
      return await this.tx(() => this.route(p, pid, query, body, ip, Date.now()), { skip: gone });
    } catch (e) {
      if (e?.busy) return [503, { error: 'busy' }]; // hàng đợi đầy (Store đã ghi nhật ký, có giới hạn)
      if (e?.skipped) return [499, { error: 'gone' }]; // máy khách đã ngắt, không ai nhận
      if (e?.unknownCommit) {
        // COMMIT quá hạn: không biết món đã bán/bạc đã nhận hay chưa. Chỉ ghi đường dẫn và mã món, không bao giờ ghi pid.
        const lid = p === '/market/buy' || p === '/market/cancel' ? ' lid=' + (+body.lid | 0) : '';
        console.error(`online: COMMIT quá hạn, không rõ đã ghi chưa: ${p}${lid}`);
      } else logErr('online: ' + p, e); // chỉ ghi nhật ký máy chủ, không gửi cho người chơi
      return [500, { error: 'server' }];
    }
  }
  async route(p, pid, query, body, ip, now) {
    if (!okId(pid)) return [400, { error: 'pid' }];
    if (p === '/chat') return this.chat(pid, body.name, body.text, ip, now);
    if (p === '/arena/submit') {
      if (await this.ipLimit(ip, 'submit', 60)) return [429, { error: 'slow' }];
      const snap = cleanSnap(body.snap);
      if (snap.length > 600) return [400, { error: 'big' }];
      const old = await this.one('SELECT rating,wins,losses FROM arena WHERE pid=$1', pid);
      // INSERT OR REPLACE của SQLite: ghi đè cả dòng
      await this.run(`INSERT INTO arena (pid,oid,name,cls,level,power,rating,wins,losses,snap,t) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (pid) DO UPDATE SET oid=EXCLUDED.oid, name=EXCLUDED.name, cls=EXCLUDED.cls, level=EXCLUDED.level, power=EXCLUDED.power,
        rating=EXCLUDED.rating, wins=EXCLUDED.wins, losses=EXCLUDED.losses, snap=EXCLUDED.snap, t=EXCLUDED.t`,
      pid, oidOf(pid), clip(body.name, 16), clip(body.cls, 10), +body.level | 0, +body.power | 0, old?.rating ?? 1000, old?.wins ?? 0, old?.losses ?? 0, snap, now);
      return [200, { ok: true, rating: old?.rating ?? 1000 }];
    }
    if (p === '/arena/opponents') {
      if (await this.ipLimit(ip, 'opp', 120)) return [429, { error: 'slow' }];
      const me = await this.one('SELECT rating FROM arena WHERE pid=$1', pid);
      const r = me?.rating ?? 1000;
      const list = await this.all('SELECT oid,name,cls,level,power,rating,wins,losses,snap FROM arena WHERE pid<>$1 ORDER BY ABS(rating-$2) LIMIT 8', pid, r);
      const top = await this.all('SELECT name,cls,level,power,rating,wins,losses FROM arena ORDER BY rating DESC LIMIT 20');
      // 'pid' = mã công khai: bản game cũ đọc o.pid để gửi kết quả đấu (không phải mã người chơi thật)
      return [200, { me: me ? r : null, list: list.map((o) => ({ ...o, pid: o.oid, snap: JSON.parse(o.snap) })), top }];
    }
    if (p === '/arena/result') {
      if (await this.slow(pid, 'duel', 15000)) return [429, { error: 'slow' }];
      if (await this.ipLimit(ip, 'duel', 30)) return [429, { error: 'slow' }];
      const opp = String(body.opp ?? '');
      const a = await this.one('SELECT rating,name,t FROM arena WHERE pid=$1', pid);
      const b = okOid(opp) ? await this.one('SELECT pid,rating,name FROM arena WHERE oid=$1', opp) : undefined;
      if (!a || !b || b.pid === pid) return [404, { error: 'none' }];
      // cùng một IP chỉ làm một người tụt điểm mỗi 10 phút (chặn tạo mã mới liên tục để dìm điểm người khác)
      const hurt = !(await this.slowIp(ip, 'hit:' + b.pid, 600000));
      const ea = 1 / (1 + 10 ** ((b.rating - a.rating) / 400)), sa = body.win ? 1 : 0, k = 32;
      const da = Math.round(k * (sa - ea));
      await this.run('UPDATE arena SET rating=rating+$1, wins=wins+$2, losses=losses+$3 WHERE pid=$4', da, sa, 1 - sa, pid);
      if (hurt) await this.run('UPDATE arena SET rating=rating-$1 WHERE pid=$2', Math.round(da / 2), b.pid);
      if (body.win && hurt) await this.addChat(now, 'system', 'Luận Kiếm', `${a.name} đánh bại ${b.name} trên Luận Kiếm Đài!`, 'arena');
      return [200, { ok: true, delta: da, rating: a.rating + da }];
    }
    if (p === '/market') {
      const list = await this.all('SELECT lid,pid,name,item,price,t FROM market ORDER BY lid DESC LIMIT 120');
      const w = await this.one('SELECT gold,sold FROM wallet WHERE pid=$1', pid);
      return [200, { list: list.map((o) => ({ ...o, name: clip(o.name, 16), item: safeItem(o.item), mine: o.pid === pid, pid: undefined })).filter((o) => o.item), owed: w?.gold || 0, sold: w ? JSON.parse(w.sold || '[]') : [] }];
    }
    if (p === '/market/list') {
      const clean = cleanItem(body.item);
      if (!clean) return [400, { error: 'item' }];
      const item = JSON.stringify(clean), price = Math.max(1, Math.min(9999999, +body.price | 0));
      if (item.length > 800) return [400, { error: 'big' }];
      if ((await this.slow(pid, 'list', 3000)) || (await this.ipLimit(ip, 'list', 30))) return [429, { error: 'slow' }];
      if ((await this.one('SELECT COUNT(*) c FROM market WHERE pid=$1', pid)).c >= 10) return [400, { error: 'limit' }];
      await this.run('INSERT INTO market (pid,name,item,price,t) VALUES ($1,$2,$3,$4,$5)', pid, clip(body.name, 16), item, price, now);
      return [200, { ok: true }];
    }
    if (p === '/market/buy' || p === '/market/cancel') {
      const row = await this.one('SELECT * FROM market WHERE lid=$1', +body.lid | 0);
      if (!row) return [404, { error: 'gone' }];
      if (p === '/market/cancel' && row.pid !== pid) return [403, { error: 'owner' }];
      if (p === '/market/buy' && row.pid === pid) return [400, { error: 'self' }];
      await this.run('DELETE FROM market WHERE lid=$1', row.lid);
      if (p === '/market/buy') {
        const w = await this.one('SELECT gold,sold FROM wallet WHERE pid=$1', row.pid);
        const sold = JSON.parse(w?.sold || '[]'); sold.push({ name: txt(safeItem(row.item)?.name, 40), price: row.price, buyer: clip(body.name, 16) });
        await this.run('INSERT INTO wallet (pid,gold,sold) VALUES ($1,$2,$3) ON CONFLICT (pid) DO UPDATE SET gold=EXCLUDED.gold, sold=EXCLUDED.sold',
          row.pid, (w?.gold || 0) + Math.floor(row.price * 0.95), JSON.stringify(sold.slice(-20)));
        const seller = row.pid;
        this.emit(() => this.onSold(seller));
      }
      return [200, { ok: true, item: safeItem(row.item), price: row.price }];
    }
    if (p === '/market/claim') {
      const w = await this.one('SELECT gold,sold FROM wallet WHERE pid=$1', pid);
      await this.run('DELETE FROM wallet WHERE pid=$1', pid);
      return [200, { gold: w?.gold || 0, sold: JSON.parse(w?.sold || '[]') }];
    }
    return [404, { error: 'not found' }];
  }
}
