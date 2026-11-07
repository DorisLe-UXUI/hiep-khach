// Kênh thời gian thực /ws: chào, đẩy tin, tin Luận Kiếm, báo đã bán, kiểm tra Origin, giới hạn khung/tần suất/kết nối,
// hạn chào, ping, không lộ pid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { after } from 'node:test';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { start, connect, frames, sleep, closeAll } from '../testing.mjs';
import { DEFAULTS } from '../server.mjs';

after(closeAll);

const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';
const ALL_PIDS = [A, B, C];

/** Máy khách WS thô: bắt tay, gửi được khung văn bản (có mặt nạ) nhưng KHÔNG BAO GIỜ đọc gì từ socket. */
function rawClient(h, ip) {
  const sock = net.connect(h.port, '127.0.0.1');
  sock.on('error', () => {});
  sock.pause(); // không đọc: dữ liệu máy chủ gửi dồn lại trong bộ đệm
  sock.write(`GET /ws HTTP/1.1\r\nHost: 127.0.0.1:${h.port}\r\nOrigin: ${h.url}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n`
    + `Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString('base64')}\r\ncf-connecting-ip: ${ip}\r\n\r\n`);
  const send = (m) => {
    const p = Buffer.from(JSON.stringify(m)), mask = randomBytes(4);
    assert.ok(p.length < 126);
    const f = Buffer.alloc(6 + p.length);
    f[0] = 0x81; f[1] = 0x80 | p.length; mask.copy(f, 2);
    for (let i = 0; i < p.length; i++) f[6 + i] = p[i] ^ mask[i & 3];
    if (!sock.destroyed) sock.write(f);
  };
  return { sock, send };
}
/** Socket phía máy chủ của người chơi pid còn mở không. */
const serverHas = (h, pid) => [...h.wss.clients].some((w) => w.hk?.pid === pid && w.readyState === 1);
/** Mã đóng phía máy chủ của socket người chơi pid. */
const closeCode = (h, pid) => new Promise((res) => [...h.wss.clients].find((w) => w.hk?.pid === pid).once('close', res));
const until = async (cond, ms = 5000, what = 'điều kiện') => {
  const end = Date.now() + ms;
  while (!cond()) { if (Date.now() > end) throw new Error('quá hạn chờ ' + what); await sleep(20); }
};

test('hello: trả tin bỏ lỡ + số online; pid sai hoặc chưa chào thì bị ngắt', async () => {
  const h = await start({ helloMs: 300 });
  await h.post('/chat', { pid: B, name: 'Beta', text: 'trước' });
  await h.post('/chat', { pid: C, name: 'Gamma', text: 'sau' });
  const a = connect(h);
  const st = await a.hello(A, 0);
  assert.deepEqual(st.chat.map((m) => m.text), ['trước', 'sau']);
  assert.deepEqual(Object.keys(st.chat[0]).sort(), ['extra', 'n', 'name', 't', 'text']);
  assert.equal(st.online, 3); // B, C qua HTTP + A qua WS
  // since: chỉ những tin sau mốc
  const a2 = connect(h);
  const st2 = await a2.hello(A, st.chat[0].n);
  assert.deepEqual(st2.chat.map((m) => m.text), ['sau']);
  a.send({ t: 'ping' });
  assert.equal((await a.next((m) => m.t === 'pong')).t, 'pong');
  // pid không hợp lệ
  const bad = connect(h); await bad.opened; bad.send({ t: 'hello', pid: 'x' });
  assert.equal((await bad.closed).code, 4001);
  // gửi tin trước khi chào
  const early = connect(h); await early.opened; early.send({ t: 'chat', text: 'hi' });
  assert.equal((await early.closed).code, 4001);
  // không chào trong hạn
  const mute = connect(h); await mute.opened;
  assert.equal((await mute.closed).code, 4001);
  // kiểu tin lạ / JSON hỏng
  const odd = connect(h); await odd.hello(C); odd.send({ t: 'nope' });
  assert.equal((await odd.closed).code, 4002);
  const junk = connect(h); await junk.hello(C); junk.send('{oops');
  assert.equal((await junk.closed).code, 1007);
  a.ws.close(); a2.ws.close();
  await h.close();
});

test('đẩy tin: chat qua WS và qua HTTP tới mọi người, cùng giới hạn như POST /chat', async () => {
  const h = await start();
  const a = connect(h), b = connect(h);
  await a.hello(A); await b.hello(B);
  a.send({ t: 'chat', text: 'chào <b>mọi người</b>', name: 'Alpha<', r: 7 });
  assert.deepEqual(await a.next((m) => m.t === 'ack'), { t: 'ack', r: 7, ok: true });
  const got = await b.next((m) => m.t === 'chat');
  assert.equal(got.m.text, 'chào bmọi người/b'); assert.equal(got.m.name, 'Alpha'); assert.equal(got.m.extra, '');
  assert.ok(got.m.n > 0);
  await a.next((m) => m.t === 'chat'); // người gửi cũng nhận
  // quá nhanh: cùng luật 2 giây như HTTP
  a.send({ t: 'chat', text: 'lần hai', r: 8 });
  assert.deepEqual(await a.next((m) => m.t === 'ack'), { t: 'ack', r: 8, error: 'slow' });
  a.send({ t: 'chat', text: '   ', r: 9 });
  assert.equal((await a.next((m) => m.t === 'ack')).error, 'empty');
  a.send({ t: 'chat', text: { x: 1 } });
  assert.equal((await a.next((m) => m.t === 'ack')).error, 'empty');
  // người chơi không gắn được cờ hệ thống
  b.send({ t: 'chat', text: 'giả thắng', extra: 'arena' });
  assert.equal((await a.next((m) => m.t === 'chat' && m.m.text === 'giả thắng')).m.extra, '');
  // tin gửi qua HTTP cũng được đẩy
  await h.post('/chat', { pid: C, name: 'Gamma', text: 'từ http' });
  assert.equal((await a.next((m) => m.t === 'chat' && m.m.text === 'từ http')).m.name, 'Gamma');
  await b.next((m) => m.t === 'chat' && m.m.text === 'từ http');
  // giới hạn theo IP của chat cũng áp cho WS: 60 tin/phút mỗi IP
  await h.q("INSERT INTO ipr (ip,k,w,n) VALUES ('198.51.100.9','chat',$1,60) ON CONFLICT (ip,k) DO UPDATE SET w=EXCLUDED.w, n=EXCLUDED.n", Math.floor(Date.now() / 60000));
  const d = connect(h, { ip: '198.51.100.9' }); await d.hello('dddddddd-4444');
  d.send({ t: 'chat', text: 'bị chặn', r: 1 });
  assert.equal((await d.next((m) => m.t === 'ack')).error, 'slow');
  a.ws.close(); b.ws.close(); d.ws.close();
  await h.close();
});

test('chào rồi gửi tin ngay: trạng thái đầu tới trước, rồi ack, không nhận tin đẩy trước trạng thái đầu', async () => {
  const h = await start();
  const a = connect(h); await a.opened;
  a.send({ t: 'hello', pid: A, since: 0 });
  a.send({ t: 'chat', text: 'ngay', r: 1 });
  await a.next((m) => m.t === 'ack');
  const types = a.msgs.map((m) => m.t);
  assert.equal(types[0], 'state', JSON.stringify(a.msgs));
  assert.ok(types.indexOf('ack') > 0);
  await a.next((m) => m.t === 'chat' && m.m.text === 'ngay');
  a.ws.close();
  await h.close();
});

test('tin Luận Kiếm được đẩy với extra=arena', async () => {
  const h = await start();
  const w = connect(h); await w.hello(C);
  for (const [pid, name] of [[A, 'Alpha'], [B, 'Beta']]) await h.post('/arena/submit', { pid, name, cls: 'kiem', level: 10, power: 500, snap: { hp: 100, atk: 10 } });
  const beta = (await h.get(`/arena/opponents?pid=${A}`)).d.list.find((o) => o.name === 'Beta');
  assert.equal((await h.post('/arena/result', { pid: A, opp: beta.oid, win: true })).s, 200);
  const m = await w.next((x) => x.t === 'chat');
  assert.equal(m.m.extra, 'arena'); assert.equal(m.m.name, 'Luận Kiếm'); assert.match(m.m.text, /Alpha đánh bại Beta/);
  w.ws.close();
  await h.close();
});

test('sold chỉ gửi tới các socket của người bán', async () => {
  const h = await start();
  const s1 = connect(h), s2 = connect(h), buyer = connect(h), other = connect(h);
  await s1.hello(A); await s2.hello(A); await buyer.hello(B); await other.hello(C);
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: { slot: 'ring', name: 'Nhẫn' }, price: 100 })).s, 200);
  const lid = (await h.get(`/market?pid=${B}`)).d.list[0].lid;
  assert.equal((await h.post('/market/buy', { pid: B, name: 'Beta', lid })).s, 200);
  assert.deepEqual(await s1.next((m) => m.t === 'sold'), { t: 'sold' });
  assert.deepEqual(await s2.next((m) => m.t === 'sold'), { t: 'sold' });
  await sleep(200);
  assert.ok(!buyer.msgs.some((m) => m.t === 'sold')); assert.ok(!other.msgs.some((m) => m.t === 'sold'));
  // huỷ rao thì không báo bán
  await h.q('DELETE FROM rate'); // qua giãn cách rao bán
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: { slot: 'ring', name: 'Nhẫn 2' }, price: 100 })).s, 200);
  const lid2 = (await h.get(`/market?pid=${A}`)).d.list[0].lid;
  assert.equal((await h.post('/market/cancel', { pid: A, lid: lid2 })).s, 200);
  await sleep(200);
  assert.equal(s1.msgs.filter((m) => m.t === 'sold').length, 1);
  for (const c of [s1, s2, buyer, other]) c.ws.close();
  await h.close();
});

test('Origin: mặc định chỉ cùng máy; ALLOWED_ORIGINS thì phải khớp đúng', async () => {
  const h = await start();
  await connect(h).opened; // Origin = http://127.0.0.1:<port>, khớp Host
  await assert.rejects(connect(h, { origin: 'https://evil.example' }).opened, { status: 403 });
  await assert.rejects(connect(h, { origin: '' }).opened, { status: 403 });
  await assert.rejects(connect(h, { origin: 'null' }).opened, { status: 403 });
  await h.close();
  const h2 = await start({ allowedOrigins: ['https://game.example'] });
  await connect(h2, { origin: 'https://game.example' }).opened;
  await assert.rejects(connect(h2).opened, { status: 403 }); // cùng máy nhưng không trong danh sách
  await assert.rejects(connect(h2, { origin: 'https://game.example.evil' }).opened, { status: 403 });
  // đường dẫn khác /ws
  const ws = await import('ws');
  await assert.rejects(new Promise((res, rej) => { const s = new ws.default(`ws://127.0.0.1:${h2.port}/other`, { origin: 'https://game.example' }); s.on('open', res); s.on('unexpected-response', (_q, r) => rej(Object.assign(new Error(), { status: r.statusCode }))); }), { status: 404 });
  await h2.close();
});

test('khung quá lớn và gửi dồn dập bị ngắt', async () => {
  const h = await start({ wsRate: 10, wsRateWindow: 10000 });
  const big = connect(h); await big.hello(A);
  big.send(JSON.stringify({ t: 'chat', text: 'x'.repeat(5000) }));
  assert.equal((await big.closed).code, 1009);
  const flood = connect(h); await flood.hello(B);
  for (let i = 0; i < 15; i++) flood.send({ t: 'ping' });
  assert.equal((await flood.closed).code, 4008);
  const bin = connect(h); await bin.hello(C); bin.ws.send(Buffer.from([1, 2, 3]));
  assert.equal((await bin.closed).code, 1003);
  await h.close();
});

test('giới hạn kết nối: mặc định IPv4 64, IPv6 /64 20 và /48 60, tổng 3000', () => {
  assert.equal(DEFAULTS.wsPerIp, 64); assert.equal(DEFAULTS.wsPer64, 20); assert.equal(DEFAULTS.wsPer48, 60); assert.equal(DEFAULTS.wsMax, 3000);
  assert.equal(DEFAULTS.wsMaxBuf, 64 * 1024);
});

test('giới hạn kết nối mỗi khối IPv6 /48 (đổi /64 không vượt được)', async () => {
  const h = await start({ wsPer64: 2, wsPer48: 3, wsPerIp: 50 });
  const cs = [];
  for (const ip of ['2001:db8:5:1::1', '2001:db8:5:1::2', '2001:db8:5:2::1']) { const c = connect(h, { ip }); await c.opened; cs.push(c); }
  await assert.rejects(connect(h, { ip: '2001:db8:5:1::3' }).opened, { status: 429 }, 'đầy /64');
  await assert.rejects(connect(h, { ip: '2001:db8:5:3::1' }).opened, { status: 429 }, 'đầy /48 dù /64 mới');
  await connect(h, { ip: '2001:db8:6:1::1' }).opened; // /48 khác
  // IPv4 dùng giới hạn riêng (cao hơn, cho NAT nhà mạng)
  for (let i = 0; i < 6; i++) await connect(h, { ip: i % 2 ? '::FFFF:203.0.113.7' : '203.0.113.7' }).opened; // dạng ::ffff: cũng là IPv4
  // đóng một kết nối trong /48 thì có chỗ cho /64 khác
  cs[0].ws.close(); await cs[0].closed; await sleep(50);
  await connect(h, { ip: '2001:db8:5:3::1' }).opened;
  await h.close();
});

test('mọi cách viết của cùng một IPv4 chung một giới hạn', async () => {
  const h = await start({ wsPerIp: 1, wsPer64: 50, wsPer48: 50 });
  await connect(h, { ip: '203.0.113.7' }).opened;
  for (const ip of ['::ffff:cb00:7107', '0:0:0:0:0:ffff:cb00:7107', '::FFFF:203.0.113.7%eth0', '203.0.113.007']) {
    await assert.rejects(connect(h, { ip }).opened, { status: 429 }, ip);
  }
  await connect(h, { ip: '203.0.113.8' }).opened; // IPv4 khác vẫn vào được
  await h.close();
});

test('giới hạn kết nối mỗi IP (IPv6 gộp /64) và tổng số', async () => {
  const h = await start({ wsPerIp: 3, wsPer64: 3, wsMax: 8 });
  const ip4 = [];
  for (let i = 0; i < 3; i++) { const c = connect(h, { ip: '203.0.113.5' }); await c.opened; ip4.push(c); }
  await assert.rejects(connect(h, { ip: '203.0.113.5' }).opened, { status: 429 });
  const v6 = [];
  for (let i = 0; i < 3; i++) { const c = connect(h, { ip: `2001:db8:1:2::${i + 1}` }); await c.opened; v6.push(c); }
  await assert.rejects(connect(h, { ip: '2001:db8:1:2:ffff::9' }).opened, { status: 429 }, 'cùng /64');
  // đóng một kết nối thì có chỗ lại
  ip4[0].ws.close(); await ip4[0].closed; await sleep(50);
  const again = connect(h, { ip: '203.0.113.5' }); await again.opened;
  // tổng: 3 + 3 + đã có 'again' thay chỗ => 6; thêm 2 IP khác => 8; cái thứ 9 bị từ chối
  await connect(h, { ip: '198.51.100.1' }).opened; await connect(h, { ip: '198.51.100.2' }).opened;
  await assert.rejects(connect(h, { ip: '198.51.100.3' }).opened, { status: 503 });
  await h.close();
});

test('ping: socket không đáp bị ngắt; người còn kết nối vẫn được tính online; số online được đẩy khi đổi', async () => {
  const h = await start({ pingMs: 100, onlineMs: 60 });
  const live = connect(h); await live.hello(A);
  const dead = connect(h, { autoPong: false }); await dead.hello(B);
  const code = (await dead.closed).code;
  assert.equal(code, 1006, 'bị ngắt thẳng (terminate)');
  assert.equal(live.ws.readyState, 1, 'socket còn đáp ping vẫn mở');
  const late = connect(h); await late.hello(C);
  const n = await live.next((m) => m.t === 'online' && m.n === 3, 2000);
  assert.equal(n.n, 3);
  // không gửi lại nếu không đổi
  await sleep(300);
  const after = live.msgs.filter((m) => m.t === 'online').length;
  await sleep(300);
  assert.equal(live.msgs.filter((m) => m.t === 'online').length, after);
  live.ws.close(); late.ws.close();
  await h.close();
});

test('máy khách không đọc: dữ liệu chờ gửi vượt 64 KB thì bị ngắt, người đọc bình thường không sao', async () => {
  // ping thưa, không giới hạn tần suất: chỉ giới hạn bộ đệm mới ngắt được
  const h = await start({ pingMs: 60000, wsRate: 1e6 });
  const D = 'dddddddd-4444';
  const live = connect(h); await live.hello(A);
  const r = rawClient(h, '198.51.100.20');
  r.sock.once('connect', () => r.send({ t: 'hello', pid: D, since: 0 }));
  await until(() => serverHas(h, D), 3000, 'chào');
  const code = closeCode(h, D);
  const pinger = setInterval(() => r.send({ t: 'ping' }), 200);
  try {
    let n = 0, max = 0;
    const text = 'x'.repeat(130);
    // phát tin thế giới theo từng đợt nhỏ (người đọc bình thường kịp đọc giữa các đợt); gọi thẳng đường phát tin
    // (onChat, như sau COMMIT của addChat) để không phải ghi hàng chục nghìn dòng vào cơ sở dữ liệu
    while (serverHas(h, D) && n < 200000) {
      for (let i = 0; i < 100; i++, n++) h.world.onChat({ n: n + 1, t: Date.now(), name: 'Beta', text: text + n, extra: '' });
      for (const w of h.wss.clients) if (w.hk?.pid === D) max = Math.max(max, w.bufferedAmount);
      await sleep(2);
    }
    assert.ok(!serverHas(h, D), `máy khách không đọc vẫn mở sau ${n} tin`);
    assert.equal(await code, 1006, 'bị ngắt thẳng (terminate)');
    assert.ok(max <= 64 * 1024 + 1024, 'bộ đệm không vượt giới hạn quá một tin: ' + max);
    // người đọc bình thường vẫn mở và nhận đủ tin cuối
    await live.next((m) => m.t === 'chat' && m.m.text === text + (n - 1), 5000);
    assert.equal(live.ws.readyState, 1);
  } finally { clearInterval(pinger); r.sock.destroy(); }
  live.ws.close();
  await h.close();
});

test('sống chỉ tính theo pong: gửi tin ping đều nhưng không đáp ping giao thức thì vẫn bị ngắt', async () => {
  const h = await start({ pingMs: 400, wsRate: 1e6 });
  const D = 'dddddddd-5555';
  const live = connect(h); await live.hello(A);
  const r = rawClient(h, '198.51.100.21');
  r.sock.once('connect', () => r.send({ t: 'hello', pid: D, since: 0 }));
  await until(() => serverHas(h, D), 3000, 'chào');
  const code = closeCode(h, D);
  const pinger = setInterval(() => r.send({ t: 'ping' }), 30);
  try {
    await until(() => !serverHas(h, D), 3000, 'ngắt socket không đáp pong');
    assert.equal(await code, 1006, 'bị ngắt thẳng (terminate)');
  } finally { clearInterval(pinger); r.sock.destroy(); }
  assert.equal(live.ws.readyState, 1, 'socket đáp pong vẫn mở');
  live.ws.close();
  await h.close();
});

test('dừng êm: socket nhận mã 1001', async () => {
  const h = await start();
  const a = connect(h); await a.hello(A);
  await h.close();
  assert.equal((await a.closed).code, 1001);
});

test('không khung WS nào chứa pid', () => {
  assert.ok(frames.length > 20, 'đã ghi nhận khung: ' + frames.length);
  for (const f of frames) for (const pid of [...ALL_PIDS, 'dddddddd-4444']) assert.ok(!f.includes(pid), 'lộ pid: ' + f);
  for (const f of frames) assert.ok(!/"pid"/.test(f), 'có trường pid: ' + f);
});
