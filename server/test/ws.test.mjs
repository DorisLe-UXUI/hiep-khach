// Kênh thời gian thực /ws: chào, đẩy tin, tin Luận Kiếm, báo đã bán, kiểm tra Origin, giới hạn khung/tần suất/kết nối,
// hạn chào, ping, không lộ pid.
import test from 'node:test';
import assert from 'node:assert/strict';
import { after } from 'node:test';
import { start, connect, frames, sleep, tmpDb, closeAll } from '../testing.mjs';

after(closeAll);

const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';
const ALL_PIDS = [A, B, C];

test('hello: trả tin bỏ lỡ + số online; pid sai hoặc chưa chào thì bị ngắt', async () => {
  const h = await start({ dbPath: tmpDb(), helloMs: 300 });
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
  const h = await start({ dbPath: tmpDb() });
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
  h.db.prepare("INSERT OR REPLACE INTO ipr (ip,k,w,n) VALUES ('198.51.100.9','chat',?,60)").run(Math.floor(Date.now() / 60000));
  const d = connect(h, { ip: '198.51.100.9' }); await d.hello('dddddddd-4444');
  d.send({ t: 'chat', text: 'bị chặn', r: 1 });
  assert.equal((await d.next((m) => m.t === 'ack')).error, 'slow');
  a.ws.close(); b.ws.close(); d.ws.close();
  await h.close();
});

test('tin Luận Kiếm được đẩy với extra=arena', async () => {
  const h = await start({ dbPath: tmpDb() });
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
  const h = await start({ dbPath: tmpDb() });
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
  h.db.prepare('DELETE FROM rate').run(); // qua giãn cách rao bán
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: { slot: 'ring', name: 'Nhẫn 2' }, price: 100 })).s, 200);
  const lid2 = (await h.get(`/market?pid=${A}`)).d.list[0].lid;
  assert.equal((await h.post('/market/cancel', { pid: A, lid: lid2 })).s, 200);
  await sleep(200);
  assert.equal(s1.msgs.filter((m) => m.t === 'sold').length, 1);
  for (const c of [s1, s2, buyer, other]) c.ws.close();
  await h.close();
});

test('Origin: mặc định chỉ cùng máy; ALLOWED_ORIGINS thì phải khớp đúng', async () => {
  const h = await start({ dbPath: tmpDb() });
  await connect(h).opened; // Origin = http://127.0.0.1:<port>, khớp Host
  await assert.rejects(connect(h, { origin: 'https://evil.example' }).opened, { status: 403 });
  await assert.rejects(connect(h, { origin: '' }).opened, { status: 403 });
  await assert.rejects(connect(h, { origin: 'null' }).opened, { status: 403 });
  await h.close();
  const h2 = await start({ dbPath: tmpDb(), allowedOrigins: ['https://game.example'] });
  await connect(h2, { origin: 'https://game.example' }).opened;
  await assert.rejects(connect(h2).opened, { status: 403 }); // cùng máy nhưng không trong danh sách
  await assert.rejects(connect(h2, { origin: 'https://game.example.evil' }).opened, { status: 403 });
  // đường dẫn khác /ws
  const ws = await import('ws');
  await assert.rejects(new Promise((res, rej) => { const s = new ws.default(`ws://127.0.0.1:${h2.port}/other`, { origin: 'https://game.example' }); s.on('open', res); s.on('unexpected-response', (_q, r) => rej(Object.assign(new Error(), { status: r.statusCode }))); }), { status: 404 });
  await h2.close();
});

test('khung quá lớn và gửi dồn dập bị ngắt', async () => {
  const h = await start({ dbPath: tmpDb(), wsRate: 10, wsRateWindow: 10000 });
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

test('giới hạn kết nối mỗi IP (IPv6 gộp /64) và tổng số', async () => {
  const h = await start({ dbPath: tmpDb(), wsPerIp: 3, wsMax: 8 });
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
  const h = await start({ dbPath: tmpDb(), pingMs: 100, onlineMs: 60 });
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

test('dừng êm: socket nhận mã 1001', async () => {
  const h = await start({ dbPath: tmpDb() });
  const a = connect(h); await a.hello(A);
  await h.close();
  assert.equal((await a.closed).code, 1001);
});

test('không khung WS nào chứa pid', () => {
  assert.ok(frames.length > 20, 'đã ghi nhận khung: ' + frames.length);
  for (const f of frames) for (const pid of [...ALL_PIDS, 'dddddddd-4444']) assert.ok(!f.includes(pid), 'lộ pid: ' + f);
  for (const f of frames) assert.ok(!/"pid"/.test(f), 'có trường pid: ' + f);
});
