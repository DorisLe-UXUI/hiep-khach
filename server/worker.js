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
const okId = (s) => typeof s === 'string' && /^[a-z0-9-]{8,40}$/i.test(s);

export class World {
  constructor(state) {
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS chat (n INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, pid TEXT, name TEXT, text TEXT, extra TEXT);
      CREATE TABLE IF NOT EXISTS arena (pid TEXT PRIMARY KEY, name TEXT, cls TEXT, level INTEGER, power INTEGER, rating INTEGER, wins INTEGER, losses INTEGER, snap TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS market (lid INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, name TEXT, item TEXT, price INTEGER, t INTEGER);
      CREATE TABLE IF NOT EXISTS wallet (pid TEXT PRIMARY KEY, gold INTEGER, sold TEXT);
      CREATE TABLE IF NOT EXISTS rate (pid TEXT, k TEXT, t INTEGER, PRIMARY KEY (pid, k));`);
    this.online = new Map();
  }
  /** Chặn gửi quá nhanh: mỗi loại thao tác cách nhau ms. */
  slow(pid, k, ms) {
    const now = Date.now(), r = this.sql.exec('SELECT t FROM rate WHERE pid=? AND k=?', pid, k).toArray()[0];
    if (r && now - r.t < ms) return true;
    this.sql.exec('INSERT OR REPLACE INTO rate (pid,k,t) VALUES (?,?,?)', pid, k, now);
    return false;
  }
  async fetch(req) {
    const url = new URL(req.url), p = url.pathname;
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const pid = body.pid || url.searchParams.get('pid');
    if (pid && okId(pid)) this.online.set(pid, Date.now());
    const now = Date.now();
    for (const [k, t] of this.online) if (now - t > 60000) this.online.delete(k);
    try {
      if (p === '/state') {
        const since = Number(url.searchParams.get('since') || 0);
        const chat = this.sql.exec('SELECT n,t,name,text,extra FROM chat WHERE n>? ORDER BY n DESC LIMIT 50', since).toArray().reverse();
        return json({ chat, online: this.online.size });
      }
      if (!okId(pid)) return json({ error: 'pid' }, 400);
      if (p === '/chat') {
        const text = clip(body.text, 140).trim();
        if (!text) return json({ error: 'empty' }, 400);
        if (this.slow(pid, 'chat', 2000)) return json({ error: 'slow' }, 429);
        this.sql.exec('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)', now, pid, clip(body.name, 16), text, clip(body.extra, 40));
        this.sql.exec('DELETE FROM chat WHERE n <= (SELECT MAX(n) FROM chat) - 200');
        return json({ ok: true });
      }
      if (p === '/arena/submit') {
        const s = body.snap || {};
        const snap = JSON.stringify({ hp: +s.hp | 0, atk: +s.atk | 0, def: Math.min(0.7, +s.def || 0), crit: Math.min(0.8, +s.crit || 0), adv: +s.adv | 0, faction: clip(s.faction, 8), title: clip(s.title, 20), weapon: clip(s.weapon, 30) });
        if (snap.length > 600) return json({ error: 'big' }, 400);
        const old = this.sql.exec('SELECT rating,wins,losses FROM arena WHERE pid=?', pid).toArray()[0];
        this.sql.exec('INSERT OR REPLACE INTO arena (pid,name,cls,level,power,rating,wins,losses,snap,t) VALUES (?,?,?,?,?,?,?,?,?,?)',
          pid, clip(body.name, 16), clip(body.cls, 10), +body.level | 0, +body.power | 0, old?.rating ?? 1000, old?.wins ?? 0, old?.losses ?? 0, snap, now);
        return json({ ok: true, rating: old?.rating ?? 1000 });
      }
      if (p === '/arena/opponents') {
        const me = this.sql.exec('SELECT rating FROM arena WHERE pid=?', pid).toArray()[0];
        const r = me?.rating ?? 1000;
        const list = this.sql.exec('SELECT pid,name,cls,level,power,rating,wins,losses,snap FROM arena WHERE pid<>? ORDER BY ABS(rating-?) LIMIT 8', pid, r).toArray();
        const top = this.sql.exec('SELECT name,cls,level,power,rating,wins,losses FROM arena ORDER BY rating DESC LIMIT 20').toArray();
        return json({ me: me ? r : null, list: list.map((o) => ({ ...o, snap: JSON.parse(o.snap) })), top });
      }
      if (p === '/arena/result') {
        if (this.slow(pid, 'duel', 15000)) return json({ error: 'slow' }, 429);
        const a = this.sql.exec('SELECT rating,name FROM arena WHERE pid=?', pid).toArray()[0], b = this.sql.exec('SELECT rating,name FROM arena WHERE pid=?', String(body.opp)).toArray()[0];
        if (!a || !b) return json({ error: 'none' }, 404);
        const ea = 1 / (1 + 10 ** ((b.rating - a.rating) / 400)), sa = body.win ? 1 : 0, k = 32;
        const da = Math.round(k * (sa - ea));
        this.sql.exec('UPDATE arena SET rating=rating+?, wins=wins+?, losses=losses+? WHERE pid=?', da, sa, 1 - sa, pid);
        this.sql.exec('UPDATE arena SET rating=rating-? WHERE pid=?', Math.round(da / 2), String(body.opp));
        if (body.win) this.sql.exec('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)', now, 'system', 'Luận Kiếm', `${a.name} đánh bại ${b.name} trên Luận Kiếm Đài!`, 'arena');
        return json({ ok: true, delta: da, rating: a.rating + da });
      }
      if (p === '/market') {
        const list = this.sql.exec('SELECT lid,pid,name,item,price,t FROM market ORDER BY lid DESC LIMIT 120').toArray();
        const w = this.sql.exec('SELECT gold,sold FROM wallet WHERE pid=?', pid).toArray()[0];
        return json({ list: list.map((o) => ({ ...o, item: JSON.parse(o.item), mine: o.pid === pid, pid: undefined })), owed: w?.gold || 0, sold: w ? JSON.parse(w.sold || '[]') : [] });
      }
      if (p === '/market/list') {
        const item = JSON.stringify(body.item || {}), price = Math.max(1, Math.min(9999999, +body.price | 0));
        if (item.length > 800) return json({ error: 'big' }, 400);
        if (this.slow(pid, 'list', 3000)) return json({ error: 'slow' }, 429);
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
          const sold = JSON.parse(w?.sold || '[]'); sold.push({ name: JSON.parse(row.item).name, price: row.price, buyer: clip(body.name, 16) });
          this.sql.exec('INSERT OR REPLACE INTO wallet (pid,gold,sold) VALUES (?,?,?)', row.pid, (w?.gold || 0) + Math.floor(row.price * 0.95), JSON.stringify(sold.slice(-20)));
        }
        return json({ ok: true, item: JSON.parse(row.item), price: row.price });
      }
      if (p === '/market/claim') {
        const w = this.sql.exec('SELECT gold,sold FROM wallet WHERE pid=?', pid).toArray()[0];
        this.sql.exec('DELETE FROM wallet WHERE pid=?', pid);
        return json({ gold: w?.gold || 0, sold: JSON.parse(w?.sold || '[]') });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 500);
    }
  }
}
