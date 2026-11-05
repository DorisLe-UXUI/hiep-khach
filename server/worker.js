/**
 * Máy chủ trực tuyến của Thiên Kiếm Giang Hồ (Cloudflare Worker + một Durable Object).
 * - Kênh thế giới: 100 tin gần nhất.
 * - Luận Kiếm Đài (PvP bất đồng bộ): người chơi gửi bản chụp nhân vật, đấu với bản chụp của người khác, tính điểm Elo.
 * - Chợ giao dịch: rao bán trang bị, người khác mua bằng bạc; bạc chờ người bán nhận.
 * Game chạy hoàn toàn ở trình duyệt nên máy chủ tin dữ liệu người chơi gửi lên (chỉ giới hạn kích thước, độ dài, tần suất cơ bản).
 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const id = env.WORLD.idFromName('world');
    return env.WORLD.get(id).fetch(req);
  },
};

const clip = (s, n) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
/** IPv6: một người thường có cả khối /64 => gộp theo /64 để giới hạn theo IP có tác dụng. */
const ipKey = (ip) => {
  if (!ip || !ip.includes(':')) return ip || '';
  let [head, tail = ''] = ip.toLowerCase().split('::');
  const h = head ? head.split(':') : [], t = tail ? tail.split(':') : [];
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return full.slice(0, 4).map((x) => (parseInt(x, 16) || 0).toString(16)).join(':') + '::/64';
};
const okId = (s) => typeof s === 'string' && /^[a-z0-9-]{8,40}$/i.test(s);
// Mã người chơi (pid) là bí mật duy nhất chứng minh "đây là tôi" (nhận bạc bán chợ, gỡ món, bảng Luận Kiếm), nên không
// bao giờ gửi pid của người khác ra ngoài. Người khác chỉ thấy mã công khai oid = băm một chiều của pid.
const oidOf = async (pid) => {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('hk-oid:' + pid)));
  return [...d.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
// Trang bị rao bán: chỉ nhận đúng định dạng món của game (trước đây lưu nguyên JSON người gửi => chèn được HTML/script)
const SLOTS = ['weapon', 'helm', 'armor', 'belt', 'boots', 'ring', 'trinket'], STATS = ['atk', 'hp', 'mp', 'def', 'crit', 'spd'];
const txt = (v, n) => String(v ?? '').replace(/[<>&"'`\\]/g, '').slice(0, n);
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.trunc(Number(v)) || 0));
const PATH = /^(?!.*\.\.)(?!.*\/\/)[\w:./-]{1,100}$/;
function cleanItem(r) {
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
const safeItem = (j) => { try { return cleanItem(JSON.parse(j)); } catch { return null; } };

export class World {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chat (n INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, pid TEXT, name TEXT, text TEXT, extra TEXT);
      CREATE TABLE IF NOT EXISTS arena (pid TEXT PRIMARY KEY, name TEXT, cls TEXT, level INTEGER, power INTEGER, rating INTEGER, wins INTEGER, losses INTEGER, snap TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS market (lid INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, name TEXT, item TEXT, price INTEGER, t INTEGER);
      CREATE TABLE IF NOT EXISTS wallet (pid TEXT PRIMARY KEY, gold INTEGER, sold TEXT);
      CREATE TABLE IF NOT EXISTS rate (pid TEXT, k TEXT, t INTEGER, PRIMARY KEY (pid, k));`);
    // cột mã công khai cho bảng Luận Kiếm (dữ liệu cũ được điền ở yêu cầu đầu tiên)
    if (!this.sql.exec('PRAGMA table_info(arena)').toArray().some((c) => c.name === 'oid')) {
      // một lần, cùng lúc thêm cột: làm sạch dữ liệu do máy chủ cũ lưu nguyên (món chợ, tên trong danh sách đã bán,
      // tin nhắn tự gắn cờ hệ thống) để không còn gửi lại nội dung độc cho người chơi dùng bản game cũ
      for (const r of this.sql.exec('SELECT lid,item FROM market').toArray()) {
        let c = null; try { c = cleanItem(JSON.parse(r.item)); } catch { /* hỏng */ }
        if (c) this.sql.exec('UPDATE market SET item=?, name=? WHERE lid=?', JSON.stringify(c), clip(this.sql.exec('SELECT name FROM market WHERE lid=?', r.lid).toArray()[0]?.name, 16), r.lid);
        else this.sql.exec('DELETE FROM market WHERE lid=?', r.lid);
      }
      for (const w of this.sql.exec('SELECT pid,sold FROM wallet').toArray()) {
        let sold = []; try { sold = JSON.parse(w.sold || '[]'); } catch { /* hỏng */ }
        sold = (Array.isArray(sold) ? sold : []).map((x) => ({ name: txt(x?.name, 40), price: int(x?.price, 0, 9999999), buyer: txt(x?.buyer, 16) }));
        this.sql.exec('UPDATE wallet SET sold=? WHERE pid=?', JSON.stringify(sold), w.pid);
      }
      this.sql.exec("UPDATE chat SET extra='' WHERE pid<>'system'");
      // thêm cột SAU CÙNG: nếu bị ngắt giữa chừng thì lần khởi động sau dọn lại (dọn lại nhiều lần vẫn an toàn)
      this.sql.exec('ALTER TABLE arena ADD COLUMN oid TEXT');
    }
    this.sql.exec(`CREATE INDEX IF NOT EXISTS arena_oid ON arena (oid);
      CREATE INDEX IF NOT EXISTS arena_rating ON arena (rating);`);
    this.online = new Map();
  }
  /** Chặn gửi quá nhanh: mỗi loại thao tác cách nhau ms. */
  slow(pid, k, ms) {
    const now = Date.now(), r = this.sql.exec('SELECT t FROM rate WHERE pid=? AND k=?', pid, k).toArray()[0];
    if (r && now - r.t < ms) return true;
    this.sql.exec('INSERT OR REPLACE INTO rate (pid,k,t) VALUES (?,?,?)', pid, k, now);
    return false;
  }
  /** Giới hạn theo địa chỉ IP (mã người chơi tự đặt được nên giới hạn theo mã không chặn được kẻ phá).
   *  Rộng tay: nhà mạng di động ở Việt Nam để nhiều người chung một IP. */
  slowIp(ip, k, ms) { return !!ip && this.slow('ip:' + ip, k, ms); }
  fillOids() {
    // một lần cho mọi yêu cầu cùng lúc
    return (this.oidsP ??= (async () => {
      for (const r of this.sql.exec('SELECT pid FROM arena WHERE oid IS NULL').toArray()) this.sql.exec('UPDATE arena SET oid=? WHERE pid=?', await oidOf(r.pid), r.pid);
    })().catch((e) => { this.oidsP = null; throw e; }));
  }
  /** Dọn dữ liệu cũ (tối đa mỗi giờ một lần): bản ghi giới hạn tần suất > 1 ngày, người Luận Kiếm chưa từng đấu và vắng > 60 ngày. */
  prune(now) {
    if (now - (this.pruned || 0) < 3600000) return;
    this.pruned = now;
    this.sql.exec('DELETE FROM rate WHERE t < ?', now - 86400000);
    this.sql.exec('DELETE FROM arena WHERE t < ? AND wins + losses = 0', now - 60 * 86400000); // chưa từng đấu
  }
  async fetch(req) {
    const url = new URL(req.url), p = url.pathname;
    let body = req.method === 'POST' ? await req.json().catch(() => null) : null;
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
    const pid = body.pid || url.searchParams.get('pid');
    // IP thật: Cloudflare luôn ghi đè CF-Connecting-IP (máy chủ riêng nhận qua đường hầm Cloudflare nên cũng có)
    const ip = ipKey(req.headers.get('cf-connecting-ip') || '');
    const now = Date.now();
    // đếm người đang online: giới hạn kích thước (mã tự đặt được => không để bảng phình vô hạn)
    if (pid && okId(pid) && (this.online.has(pid) || this.online.size < 5000)) this.online.set(pid, now);
    if (now - (this.onlineSweep || 0) > 10000) { this.onlineSweep = now; for (const [k, t] of this.online) if (now - t > 60000) this.online.delete(k); }
    try {
      this.prune(now);
      if (p === '/state') {
        const since = Number(url.searchParams.get('since') || 0);
        const chat = this.sql.exec('SELECT n,t,name,text,extra FROM chat WHERE n>? ORDER BY n DESC LIMIT 50', since).toArray().reverse();
        return json({ chat, online: this.online.size });
      }
      if (!okId(pid)) return json({ error: 'pid' }, 400);
      if (p === '/chat') {
        const text = clip(body.text, 140).trim();
        if (!text) return json({ error: 'empty' }, 400);
        if (this.slow(pid, 'chat', 2000) || this.slowIp(ip, 'chat', 700)) return json({ error: 'slow' }, 429);
        // extra chỉ do máy chủ đặt (vd. 'arena' cho tin Luận Kiếm): người chơi không giả được tin hệ thống
        this.sql.exec('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)', now, pid, clip(body.name, 16), text, '');
        this.sql.exec('DELETE FROM chat WHERE n <= (SELECT MAX(n) FROM chat) - 200');
        return json({ ok: true });
      }
      if (p === '/arena/submit') {
        if (this.slowIp(ip, 'submit', 2000)) return json({ error: 'slow' }, 429);
        const oid = await oidOf(pid); // tính trước khi đọc/ghi: không có await giữa đọc điểm cũ và ghi lại
        const s = body.snap && typeof body.snap === 'object' ? body.snap : {};
        const snap = JSON.stringify({ hp: +s.hp | 0, atk: +s.atk | 0, def: Math.min(0.7, +s.def || 0), crit: Math.min(0.8, +s.crit || 0), adv: +s.adv | 0, faction: clip(s.faction, 8), title: clip(s.title, 20), weapon: clip(s.weapon, 30) });
        if (snap.length > 600) return json({ error: 'big' }, 400);
        const old = this.sql.exec('SELECT rating,wins,losses FROM arena WHERE pid=?', pid).toArray()[0];
        this.sql.exec('INSERT OR REPLACE INTO arena (pid,oid,name,cls,level,power,rating,wins,losses,snap,t) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          pid, oid, clip(body.name, 16), clip(body.cls, 10), +body.level | 0, +body.power | 0, old?.rating ?? 1000, old?.wins ?? 0, old?.losses ?? 0, snap, now);
        return json({ ok: true, rating: old?.rating ?? 1000 });
      }
      if (p === '/arena/opponents') {
        if (this.slowIp(ip, 'opp', 500)) return json({ error: 'slow' }, 429);
        await this.fillOids();
        const me = this.sql.exec('SELECT rating FROM arena WHERE pid=?', pid).toArray()[0];
        const r = me?.rating ?? 1000;
        const list = this.sql.exec('SELECT oid,name,cls,level,power,rating,wins,losses,snap FROM arena WHERE pid<>? ORDER BY ABS(rating-?) LIMIT 8', pid, r).toArray();
        const top = this.sql.exec('SELECT name,cls,level,power,rating,wins,losses FROM arena ORDER BY rating DESC LIMIT 20').toArray();
        // 'pid' = mã công khai: bản game cũ đọc o.pid để gửi kết quả đấu (không phải mã người chơi thật)
        return json({ me: me ? r : null, list: list.map((o) => ({ ...o, pid: o.oid, snap: JSON.parse(o.snap) })), top });
      }
      if (p === '/arena/result') {
        if (this.slow(pid, 'duel', 15000)) return json({ error: 'slow' }, 429);
        if (this.slowIp(ip, 'duel', 5000)) return json({ error: 'slow' }, 429);
        await this.fillOids();
        const opp = String(body.opp ?? '');
        const a = this.sql.exec('SELECT rating,name,t FROM arena WHERE pid=?', pid).toArray()[0];
        const b = this.sql.exec('SELECT pid,rating,name FROM arena WHERE oid=?', opp).toArray()[0];
        if (!a || !b || b.pid === pid) return json({ error: 'none' }, 404);
        // cùng một IP chỉ làm một người tụt điểm mỗi 10 phút (chặn tạo mã mới liên tục để dìm điểm người khác)
        const hurt = !this.slowIp(ip, 'hit:' + b.pid, 600000);
        const ea = 1 / (1 + 10 ** ((b.rating - a.rating) / 400)), sa = body.win ? 1 : 0, k = 32;
        const da = Math.round(k * (sa - ea));
        this.sql.exec('UPDATE arena SET rating=rating+?, wins=wins+?, losses=losses+? WHERE pid=?', da, sa, 1 - sa, pid);
        if (hurt) this.sql.exec('UPDATE arena SET rating=rating-? WHERE pid=?', Math.round(da / 2), b.pid);
        if (body.win && hurt) this.sql.exec('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)', now, 'system', 'Luận Kiếm', `${a.name} đánh bại ${b.name} trên Luận Kiếm Đài!`, 'arena');
        return json({ ok: true, delta: da, rating: a.rating + da });
      }
      if (p === '/market') {
        const list = this.sql.exec('SELECT lid,pid,name,item,price,t FROM market ORDER BY lid DESC LIMIT 120').toArray();
        const w = this.sql.exec('SELECT gold,sold FROM wallet WHERE pid=?', pid).toArray()[0];
        return json({ list: list.map((o) => ({ ...o, name: clip(o.name, 16), item: safeItem(o.item), mine: o.pid === pid, pid: undefined })).filter((o) => o.item), owed: w?.gold || 0, sold: w ? JSON.parse(w.sold || '[]') : [] });
      }
      if (p === '/market/list') {
        const clean = cleanItem(body.item);
        if (!clean) return json({ error: 'item' }, 400);
        const item = JSON.stringify(clean), price = Math.max(1, Math.min(9999999, +body.price | 0));
        if (item.length > 800) return json({ error: 'big' }, 400);
        if (this.slow(pid, 'list', 3000) || this.slowIp(ip, 'list', 1000)) return json({ error: 'slow' }, 429);
        if (this.sql.exec('SELECT COUNT(*) c FROM market WHERE pid=?', pid).toArray()[0].c >= 10) return json({ error: 'limit' }, 400);
        this.sql.exec('INSERT INTO market (pid,name,item,price,t) VALUES (?,?,?,?,?)', pid, clip(body.name, 16), item, price, now);
        return json({ ok: true });
      }
      if (p === '/market/buy' || p === '/market/cancel') {
        const row = this.sql.exec('SELECT * FROM market WHERE lid=?', +body.lid | 0).toArray()[0];
        if (!row) return json({ error: 'gone' }, 404);
        if (p === '/market/cancel' && row.pid !== pid) return json({ error: 'owner' }, 403);
        if (p === '/market/buy' && row.pid === pid) return json({ error: 'self' }, 400);
        this.sql.exec('DELETE FROM market WHERE lid=?', row.lid);
        if (p === '/market/buy') {
          const w = this.sql.exec('SELECT gold,sold FROM wallet WHERE pid=?', row.pid).toArray()[0];
          const sold = JSON.parse(w?.sold || '[]'); sold.push({ name: txt(safeItem(row.item)?.name, 40), price: row.price, buyer: clip(body.name, 16) });
          this.sql.exec('INSERT OR REPLACE INTO wallet (pid,gold,sold) VALUES (?,?,?)', row.pid, (w?.gold || 0) + Math.floor(row.price * 0.95), JSON.stringify(sold.slice(-20)));
        }
        return json({ ok: true, item: safeItem(row.item), price: row.price });
      }
      if (p === '/market/claim') {
        const w = this.sql.exec('SELECT gold,sold FROM wallet WHERE pid=?', pid).toArray()[0];
        this.sql.exec('DELETE FROM wallet WHERE pid=?', pid);
        return json({ gold: w?.gold || 0, sold: JSON.parse(w?.sold || '[]') });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      console.error('online:', p, e); // chi tiết chỉ ghi nhật ký máy chủ, không gửi cho người chơi
      return json({ error: 'server' }, 500);
    }
  }
}
