/**
 * Máy chủ trực tuyến tự chạy (Node + PostgreSQL + ws), thay cho Cloudflare Worker.
 * - HTTP: đúng các đường dẫn cũ của worker.js (/state, /chat, /arena/*, /market*), cùng hình dạng phản hồi.
 * - /healthz: kiểm tra sống; 503 khi cơ sở dữ liệu không trả lời (healthcheck của Docker thấy được).
 * - /ws: kênh thời gian thực. Trình duyệt gửi {t:'hello', pid, since} trước tiên (pid không bao giờ nằm trên URL),
 *   máy chủ trả {t:'state', chat, online}; sau đó đẩy {t:'chat', m}, {t:'online', n}, {t:'sold'} (chỉ cho người bán).
 *   Trình duyệt gửi được {t:'chat', text, name?, r?} (trả {t:'ack', r, ok|error}) và {t:'ping'} (trả {t:'pong'}).
 * Đứng sau Caddy: Caddy ghi đè Cf-Connecting-Ip bằng IP thật, chặn POST khác nguồn, giới hạn thân 16 KB.
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { World, ipPrefix, normIp, okId, logErr } from './world.mjs';
import { Store, createSchema, pgConfig, describe } from './db.mjs';

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const JSON_HEAD = { 'content-type': 'application/json; charset=utf-8', ...CORS };

export const DEFAULTS = {
  maxBody: 64 * 1024, // thân yêu cầu HTTP
  wsMaxMsg: 4096, // một khung WS
  wsPerIp: 64, // số kết nối mỗi IPv4 (NAT nhà mạng: nhiều người chung một IP)
  wsPer64: 20, // số kết nối mỗi khối IPv6 /64 (một thuê bao)
  wsPer48: 60, // số kết nối mỗi khối IPv6 /48 (đổi địa chỉ trong /48 không vượt được giới hạn)
  wsMax: 3000, // tổng số kết nối
  wsMaxBuf: 64 * 1024, // dữ liệu chờ gửi tối đa của một socket; quá thì ngắt (máy khách không đọc)
  wsRate: 20, // số khung tối đa trong mỗi cửa sổ
  wsRateWindow: 10000,
  helloMs: 10000, // phải chào trong thời gian này
  pingMs: 25000, // máy chủ ping, ai không đáp ở lượt sau bị ngắt
  onlineMs: 5000, // đẩy số người online tối đa mỗi 5 giây (chỉ khi đổi)
  dbRetryMs: 1000, // kết nối cơ sở dữ liệu thất bại: trong khoảng này mọi yêu cầu trả 500 ngay, sau đó thử lại
};

/** Mở kho dữ liệu: mỗi kết nối mới tạo bảng (nếu chưa có) và điền mã công khai còn thiếu. */
export const openStore = (cfg, opt = {}) => new Store(cfg, { ...opt, setup: async (c) => { await createSchema(c); await World.fillOids(c); } });

/** IP thật: Caddy luôn ghi đè Cf-Connecting-Ip; không có (gọi thẳng) thì dùng địa chỉ kết nối. */
const realIp = (req) => {
  const h = req.headers['cf-connecting-ip'];
  return normIp((typeof h === 'string' && h.trim()) || req.socket.remoteAddress || ''); // mọi cách viết của một IPv4 về một dạng
};

/** Kiểm tra Origin khi nâng cấp WS: có danh sách thì phải khớp đúng; không có thì chỉ nhận cùng máy (Origin khớp Host). */
export function originOk(req, allowed) {
  const o = req.headers.origin;
  if (typeof o !== 'string' || !o) return false;
  if (allowed.length) return allowed.includes(o);
  try { return new URL(o).host === String(req.headers.host || '').toLowerCase(); } catch { return false; }
}

/** pg: cấu hình kết nối (mặc định pgConfig() từ biến môi trường); db: Store có sẵn (bài kiểm tra). */
export function createServer({ pg = null, db = null, allowedOrigins = [], ...opt } = {}) {
  const o = { ...DEFAULTS, ...opt };
  db ??= openStore(pg ?? pgConfig(), { retryMs: o.dbRetryMs });
  const byPid = new Map(); // pid -> Set<ws> (để báo đã bán)
  const perIp = new Map(); // IPv4 hoặc tiền tố IPv6 (/64, /48) -> số kết nối
  let total = 0; // tổng số kết nối (kể cả đang nâng cấp)
  // mọi lần gửi đều qua đây: máy khách chậm/không đọc làm dữ liệu dồn lại thì ngắt thay vì đệm mãi
  const put = (ws, s) => {
    if (ws.readyState !== 1) return;
    // tính cả tin sắp gửi: không cho vượt rồi nằm lì tới lượt ping sau
    if (ws.bufferedAmount + Buffer.byteLength(s) > o.wsMaxBuf) return ws.terminate();
    ws.send(s);
  };
  // chỉ gửi cho socket đã nhận trạng thái đầu (tin đến trước đó đã nằm trong trạng thái đầu)
  const sendAll = (msg) => { const s = JSON.stringify(msg); for (const ws of wss.clients) if (ws.hk?.ready) put(ws, s); };
  const world = new World(db, {
    onChat: (m) => sendAll({ t: 'chat', m }),
    // socket chưa nhận trạng thái đầu: giữ lại báo bán, gửi ngay sau 'state' (trạng thái đầu luôn là tin đầu tiên)
    onSold: (pid) => { for (const ws of byPid.get(pid) || []) { if (ws.hk.ready) put(ws, '{"t":"sold"}'); else ws.hk.sold = true; } },
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: o.wsMaxMsg, perMessageDeflate: false, clientTracking: true });

  // ---- HTTP ----
  const send = (res, status, data) => {
    if (res.headersSent || res.destroyed) return;
    res.writeHead(status, data === null ? CORS : JSON_HEAD);
    res.end(data === null ? undefined : JSON.stringify(data));
  };
  let health = null;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://online.local');
    if (url.pathname === '/healthz') {
      req.resume();
      // các lần kiểm tra cùng lúc dùng chung một truy vấn: /healthz dồn dập chỉ chiếm một chỗ trong hàng đợi
      health ??= db.ping().finally(() => { health = null; });
      return health.then((ok) => {
        if (res.headersSent || res.destroyed) return;
        res.writeHead(ok ? 200 : 503, { 'content-type': 'text/plain' }); res.end(ok ? 'ok' : 'db');
      });
    }
    if (req.method === 'OPTIONS') return send(res, 200, null);
    const finish = async (raw) => {
      let body = null;
      if (req.method === 'POST') { try { body = JSON.parse(raw); } catch { body = null; } }
      const [s, d] = await world.handle(req.method, url.pathname, url.searchParams, body, realIp(req));
      send(res, s, d);
    };
    if (req.method === 'GET' || req.method === 'HEAD') { req.resume(); return finish(''); }
    if (+req.headers['content-length'] > o.maxBody) { res.setHeader('connection', 'close'); send(res, 413, { error: 'too large' }); return req.destroy(); }
    const chunks = []; let size = 0, over = false;
    req.on('data', (c) => {
      if (over) return;
      size += c.length;
      if (size > o.maxBody) { over = true; res.setHeader('connection', 'close'); send(res, 413, { error: 'too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => { if (!over) finish(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', () => {});
  });
  server.requestTimeout = 15000;
  // Caddy giữ kết nối tới máy chủ 4 giây; Node phải giữ lâu hơn, nếu không POST có thể trúng kết nối vừa đóng (502)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  // ---- WebSocket ----
  // từ chối nâng cấp: trả mã HTTP rồi huỷ hẳn socket (chỉ end() thì có trình duyệt chờ mãi ở CONNECTING)
  const reject = (socket, code, text) => {
    if (!socket.writable) return socket.destroy();
    socket.once('finish', () => socket.destroy());
    socket.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${text.length}\r\n\r\n${text}`);
  };
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    const path = (req.url || '').split('?')[0];
    if (path !== '/ws') return reject(socket, 404, 'Not Found');
    if (!originOk(req, allowedOrigins)) return reject(socket, 403, 'Forbidden');
    const raw = realIp(req);
    // IPv4: theo đúng IP; IPv6: theo cả /64 và /48
    const caps = raw.includes(':') ? [[ipPrefix(raw, 64), o.wsPer64], [ipPrefix(raw, 48), o.wsPer48]] : [[raw, o.wsPerIp]];
    if (total >= o.wsMax) return reject(socket, 503, 'Service Unavailable');
    if (caps.some(([k, max]) => (perIp.get(k) || 0) >= max)) return reject(socket, 429, 'Too Many Requests');
    total++; for (const [k] of caps) perIp.set(k, (perIp.get(k) || 0) + 1); // giữ chỗ ngay để nhiều yêu cầu cùng lúc không vượt giới hạn
    let counted = true;
    const release = () => {
      if (!counted) return; counted = false; total--;
      for (const [k] of caps) { const n = (perIp.get(k) || 1) - 1; if (n > 0) perIp.set(k, n); else perIp.delete(k); }
    };
    socket.once('close', release);
    wss.handleUpgrade(req, socket, head, (ws) => { ws.once('close', release); onConn(ws, raw); });
  });

  function onConn(ws, rawIp) {
    const hk = (ws.hk = { pid: null, ready: false, alive: true, n: 0, w: Date.now() });
    const helloT = setTimeout(() => { if (!hk.pid) ws.close(4001, 'hello'); }, o.helloMs);
    const out = (m) => put(ws, JSON.stringify(m));
    // sống = có đáp ping của giao thức; tin nhắn đến không tính (gửi được mà không đọc thì vẫn là chết)
    ws.on('pong', () => { hk.alive = true; });
    ws.on('error', () => {});
    ws.on('close', () => {
      clearTimeout(helloT);
      const set = hk.pid && byPid.get(hk.pid);
      if (set) { set.delete(ws); if (!set.size) byPid.delete(hk.pid); }
    });
    ws.on('message', (data, isBinary) => {
      // giới hạn tần suất theo kết nối: quá nhiều khung trong một cửa sổ => ngắt
      const now = Date.now();
      if (now - hk.w > o.wsRateWindow) { hk.w = now; hk.n = 0; }
      if (++hk.n > o.wsRate) return ws.close(4008, 'rate');
      if (isBinary) return ws.close(1003, 'binary');
      let m; try { m = JSON.parse(data.toString('utf8')); } catch { return ws.close(1007, 'json'); }
      if (!m || typeof m !== 'object' || Array.isArray(m)) return ws.close(1007, 'json');
      if (!hk.pid) {
        if (m.t !== 'hello' || !okId(m.pid)) return ws.close(4001, 'hello');
        hk.pid = m.pid;
        clearTimeout(helloT);
        let set = byPid.get(hk.pid); if (!set) byPid.set(hk.pid, (set = new Set()));
        set.add(ws);
        world.seen(hk.pid);
        // đọc qua hàng đợi; tin gửi sau lời chào xếp hàng phía sau nên luôn trả lời sau trạng thái đầu
        world.hello(m.since).then((chat) => {
          out({ t: 'state', chat, online: world.onlineCount() });
          hk.ready = true;
          if (hk.sold) { hk.sold = false; out({ t: 'sold' }); }
        }, (e) => { logErr('online: ws hello', e); ws.close(1011, 'server'); }); // máy khách tự kết nối lại
        return;
      }
      world.seen(hk.pid);
      if (m.t === 'ping') return out({ t: 'pong' });
      if (m.t === 'chat') {
        const r = Number.isInteger(m.r) && m.r >= 0 && m.r < 1e9 ? m.r : undefined;
        if (typeof m.text !== 'string' || (m.name != null && typeof m.name !== 'string')) return out({ t: 'ack', r, error: 'empty' });
        world.chatWs(hk.pid, m.name, m.text, rawIp).then(([s, d]) => out(s === 200 ? { t: 'ack', r, ok: true } : { t: 'ack', r, error: d.error }));
        return;
      }
      if (m.t === 'hello') return; // chào lại: bỏ qua
      ws.close(4002, 'type');
    });
  }

  // ping định kỳ, ngắt kết nối chết; người còn kết nối vẫn được tính là online
  const pingT = setInterval(() => {
    for (const ws of wss.clients) {
      const hk = ws.hk; if (!hk) continue;
      if (!hk.alive) { ws.terminate(); continue; }
      hk.alive = false;
      if (hk.pid) world.seen(hk.pid);
      try { ws.ping(); } catch { /* đang đóng */ }
    }
  }, o.pingMs);
  let lastOnline = -1;
  const onlineT = setInterval(() => {
    const n = world.onlineCount();
    if (n !== lastOnline) { lastOnline = n; sendAll({ t: 'online', n }); }
  }, o.onlineMs);
  pingT.unref(); onlineT.unref();

  let closing = null;
  /** Dừng êm: báo các socket, đóng HTTP, đóng cơ sở dữ liệu. */
  const close = () => (closing ??= new Promise((resolve) => {
    clearInterval(pingT); clearInterval(onlineT);
    for (const ws of wss.clients) ws.close(1001, 'restart');
    const force = setTimeout(() => { for (const ws of wss.clients) ws.terminate(); server.closeAllConnections(); }, 5000);
    force.unref();
    // HTTP đóng xong (mọi yêu cầu đã trả lời) mới đóng cơ sở dữ liệu; db.close() chờ hàng đợi chạy hết
    server.close(() => { clearTimeout(force); wss.close(); db.close().catch(() => {}).then(resolve); });
    server.closeIdleConnections();
  }));
  return { server, wss, world, db, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const PORT = Number(process.env.PORT || 8787);
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  let pg;
  try { pg = pgConfig(); } catch (e) { console.error('online:', e.message); process.exit(1); }
  if (process.env.PGPASSWORD) console.error('online: bỏ qua biến PGPASSWORD, mật khẩu chỉ đọc từ PGPASSWORD_FILE');
  const h = createServer({ pg, allowedOrigins });
  h.server.listen(PORT, '0.0.0.0', () => console.log(`online: :${PORT} db=${describe(pg)} origins=${allowedOrigins.join(',') || '(cùng máy)'}`));
  // kết nối sớm để nhật ký báo ngay nếu cơ sở dữ liệu chưa sẵn sàng (máy chủ vẫn chạy, /healthz trả 503 tới khi kết nối được)
  h.db.ping().then((ok) => console.log(ok ? 'online: cơ sở dữ liệu sẵn sàng' : 'online: chưa kết nối được cơ sở dữ liệu, sẽ thử lại'));
  const stop = () => { console.log('online: dừng'); h.close().then(() => process.exit(0)); setTimeout(() => process.exit(0), 10000).unref(); };
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
}
