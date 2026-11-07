// Tiện ích chung cho các bài kiểm tra (test/*.test.mjs): dựng máy chủ thật trên cổng ngẫu nhiên, gọi HTTP và WS.
// Cần PostgreSQL thật (test/run.sh dựng một container tạm): PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSWORD_FILE.
// Mỗi bài kiểm tra dùng một cơ sở dữ liệu mới, rỗng (CREATE DATABASE hk_t_<ngẫu nhiên>).
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import WebSocket from 'ws';
import { createServer } from './server.mjs';
import { connectClient, readPassword } from './db.mjs';

/** Cấu hình tới cơ sở dữ liệu quản trị (biến môi trường của run.sh). */
export const baseCfg = () => ({
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  database: process.env.PGDATABASE || 'postgres',
  password: () => readPassword(process.env.PGPASSWORD_FILE || '/run/secrets/pg_password'),
});

/** Tạo một cơ sở dữ liệu rỗng mới; trả về cấu hình kết nối tới nó. Tên chỉ gồm chữ hex ngẫu nhiên. */
export async function freshDb() {
  const database = 'hk_t_' + randomBytes(6).toString('hex');
  const admin = await connectClient(baseCfg());
  try { await admin.query(`CREATE DATABASE ${database}`); } finally { await admin.end(); }
  return { ...baseCfg(), database };
}

const clients = new Set();
/** Kết nối phụ để bài kiểm tra đọc/sửa thẳng cơ sở dữ liệu: q(sql, ...tham số) => rows. */
export async function sql(cfg) {
  const c = await connectClient(cfg);
  const q = async (text, ...a) => (await c.query(text, a)).rows;
  clients.add(c);
  q.end = () => { clients.delete(c); return c.end().catch(() => {}); };
  q.client = c;
  return q;
}

/**
 * Proxy TCP giữa máy chủ và PostgreSQL để giả lập mất cơ sở dữ liệu: cut() cắt mọi kết nối và từ chối kết nối mới,
 * restore() cho kết nối lại.
 */
export async function pgProxy(cfg) {
  const socks = new Set();
  let down = false;
  const srv = net.createServer((s) => {
    if (down) return s.destroy();
    const u = net.connect(cfg.port, cfg.host);
    socks.add(s); socks.add(u);
    const kill = () => { s.destroy(); u.destroy(); socks.delete(s); socks.delete(u); };
    s.on('error', kill); u.on('error', kill); s.on('close', kill); u.on('close', kill);
    s.pipe(u); u.pipe(s);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return {
    cfg: { ...cfg, host: '127.0.0.1', port: srv.address().port },
    cut() { down = true; for (const s of socks) s.destroy(); socks.clear(); },
    restore() { down = false; },
    close() { this.cut(); return new Promise((r) => srv.close(r)); },
  };
}

const open = new Set();
/** Dọn mọi máy chủ và kết nối phụ còn mở (kể cả khi bài kiểm tra hỏng giữa chừng, nếu không tiến trình không thoát). */
export const closeAll = () => Promise.all([...[...open].map((h) => h.close()), ...[...clients].map((c) => c.end().catch(() => {}))]);

/** opt.pg: cấu hình cơ sở dữ liệu (mặc định một cơ sở dữ liệu mới). h.q(sql, ...): truy vấn thẳng cơ sở dữ liệu đó. */
export async function start(opt = {}) {
  if (!opt.pg && !opt.db) opt = { ...opt, pg: await freshDb() };
  const h = createServer(opt);
  open.add(h);
  h.pg = opt.pg;
  let q = null;
  h.q = async (text, ...a) => { q ??= await sql(opt.pg); return q(text, ...a); };
  const close = h.close;
  h.close = async () => { open.delete(h); await close(); await q?.end(); };
  await new Promise((r) => h.server.listen(0, '127.0.0.1', r));
  h.port = h.server.address().port;
  h.url = `http://127.0.0.1:${h.port}`;
  const req = (p, init = {}, ip) => fetch(h.url + p, { ...init, headers: { ...(init.headers || {}), ...(ip ? { 'cf-connecting-ip': ip } : {}) } })
    .then(async (r) => ({ s: r.status, d: await r.json().catch(() => null), cors: r.headers.get('access-control-allow-origin') }));
  h.get = (p, ip) => req(p, {}, ip);
  h.post = (p, body, ip) => req(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }, ip);
  h.raw = (p, init) => fetch(h.url + p, init);
  return h;
}

/** Mọi khung WS mà máy khách nhận được (để kiểm tra không lộ pid). */
export const frames = [];

/** Kết nối WS; trả về {ws, next(pred), msgs, closed}. */
export function connect(h, { origin = h.url, ip, headers = {}, ...opts } = {}) {
  const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws`, { origin, headers: { ...(ip ? { 'cf-connecting-ip': ip } : {}), ...headers }, ...opts });
  const msgs = [], waiters = [], seen = new WeakSet();
  const c = { ws, msgs };
  c.closed = new Promise((resolve) => ws.on('close', (code, reason) => resolve({ code, reason: String(reason) })));
  c.opened = new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('unexpected-response', (_q, res) => reject(Object.assign(new Error('http ' + res.statusCode), { status: res.statusCode })));
    ws.on('error', reject);
  });
  c.opened.catch(() => {});
  ws.on('message', (data) => {
    const s = String(data); frames.push(s);
    const m = JSON.parse(s); msgs.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); clearTimeout(w.t); w.resolve(m); break; }
  });
  c.next = (pred = () => true, ms = 2000) => {
    const hit = msgs.find((m) => pred(m) && !seen.has(m));
    if (hit) { seen.add(hit); return Promise.resolve(hit); }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve: (m) => { seen.add(m); resolve(m); } };
      w.t = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('timeout waiting for message; got ' + JSON.stringify(msgs))); }, ms);
      waiters.push(w);
    });
  };
  c.send = (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m));
  /** Kết nối + chào, chờ trạng thái đầu. */
  c.hello = async (pid, since = 0) => { await c.opened; c.send({ t: 'hello', pid, since }); return c.next((m) => m.t === 'state'); };
  return c;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
