// Bớt tải trước cơ sở dữ liệu (chat WS giãn cách theo socket, xô thẻ HTTP theo IP, giới hạn việc chờ mỗi IP, hàng đợi đầy
// 503 'busy' có nhật ký giới hạn, bỏ yêu cầu đã ngắt, /state từ bộ nhớ, /healthz không bị dồn), Unicode khi cắt chuỗi,
// prune thất bại thì thử lại, nhật ký COMMIT không rõ kết quả.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { start, connect, sql, freshDb, sleep, closeAll } from '../testing.mjs';
import { clip, txt } from '../world.mjs';
import { importData, verifyData } from '../import.mjs';

after(closeAll);
const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';
const until = async (cond, ms = 5000, what = 'điều kiện') => {
  const end = Date.now() + ms;
  while (!cond()) { if (Date.now() > end) throw new Error('quá hạn chờ ' + what); await sleep(5); }
};
/** Đếm số việc đưa vào hàng đợi cơ sở dữ liệu. */
const countRuns = (h) => {
  const run = h.db.run.bind(h.db), c = { n: 0 };
  h.db.run = (fn, o) => { c.n++; return run(fn, o); };
  c.restore = () => { h.db.run = run; };
  return c;
};
/** Bắt console.error trong lúc chạy fn. */
const capture = async (fn) => {
  const lines = [], errs = console.error;
  console.error = (...a) => lines.push(a.join(' '));
  try { await fn(lines); } finally { console.error = errs; }
  return lines;
};

test('chat WS: gửi lại trong 2 giây bị từ chối "slow" ngay trên socket, không chạm cơ sở dữ liệu', async () => {
  const h = await start();
  const a = connect(h); await a.hello(A);
  a.send({ t: 'chat', text: 'một', r: 1 });
  assert.deepEqual(await a.next((m) => m.t === 'ack'), { t: 'ack', r: 1, ok: true });
  await h.world.pruning;
  const runs = countRuns(h);
  for (let r = 2; r < 7; r++) {
    a.send({ t: 'chat', text: 'dồn ' + r, r });
    assert.deepEqual(await a.next((m) => m.t === 'ack'), { t: 'ack', r, error: 'slow' });
  }
  a.send({ t: 'chat', text: '   ', r: 9 }); // tin rỗng vẫn báo 'empty', cũng không chạm cơ sở dữ liệu
  assert.equal((await a.next((m) => m.t === 'ack')).error, 'empty');
  assert.equal(runs.n, 0, 'không việc nào vào hàng đợi');
  runs.restore();
  assert.equal((await h.q('SELECT COUNT(*) c FROM chat'))[0].c, 1);
  a.ws.close();
  await h.close();
});

test('HTTP: xô thẻ theo IP (IPv6 gộp /64) trả 429 "slow" trước cơ sở dữ liệu; IP khác không ảnh hưởng', async () => {
  const h = await start({ httpBurst: 5, httpRate: 1 });
  assert.equal((await h.get(`/market?pid=${A}`)).s, 200);
  await h.world.pruning;
  const runs = countRuns(h);
  const ip = '203.0.113.50';
  for (let i = 0; i < 5; i++) assert.equal((await h.get(`/market?pid=${A}`, ip)).s, 200, 'trong xô: ' + i);
  const before = runs.n;
  assert.deepEqual((await h.get(`/market?pid=${A}`, ip)).d, { error: 'slow' });
  assert.equal((await h.get('/state', ip)).s, 429, '/state cũng tính');
  assert.equal((await h.post('/chat', { pid: A, text: 'x' }, ip)).s, 429);
  assert.equal(runs.n, before, 'yêu cầu bị từ chối không vào hàng đợi');
  assert.equal((await h.get(`/market?pid=${A}`, '203.0.113.51')).s, 200, 'IP khác');
  // IPv6: cùng /64 chung một xô
  for (let i = 0; i < 5; i++) assert.equal((await h.get('/state', `2001:db8:7:7::${i + 1}`)).s, 200);
  assert.equal((await h.get('/state', '2001:db8:7:7:abcd::1')).s, 429);
  await sleep(1100); // nạp lại một thẻ
  assert.equal((await h.get(`/market?pid=${A}`, ip)).s, 200);
  runs.restore();
  await h.close();
});

test('hàng đợi: giới hạn việc chờ mỗi IP, đầy thì 503 "busy" ngay (nhật ký có giới hạn), /state và /healthz không bị dồn, yêu cầu đã ngắt không chạy', async () => {
  const h = await start({ httpPerIp: 3, dbMax: 7 });
  assert.equal((await h.post('/chat', { pid: A, name: 'A', text: 'trước' })).s, 200);
  await h.world.pruning;
  let open; const gate = new Promise((r) => { open = r; });
  const blocker = h.db.run(() => gate, { tx: false }); // chặn hàng đợi
  const X = '198.51.100.70', Y = '198.51.100.71';
  const xs = [1, 2, 3].map(() => h.post('/market/claim', { pid: B }, X));
  await until(() => h.db.size === 4, 3000, 'xếp hàng');
  const t0 = Date.now();
  assert.deepEqual((await h.post('/market/claim', { pid: B }, X)).d, { error: 'slow' }, 'quá số việc chờ của một IP');
  // yêu cầu của Y: một cái máy khách bỏ giữa chừng, không được chạy khi tới lượt
  const ac = new AbortController();
  const aborted = h.raw('/chat', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': Y }, body: JSON.stringify({ pid: C, name: 'C', text: 'đã ngắt' }), signal: ac.signal }).catch((e) => e.name);
  const ys = [h.post('/market/claim', { pid: B }, Y)];
  await until(() => h.db.size === 6, 3000, 'xếp hàng Y');
  ys.push(h.post('/market/claim', { pid: B }, Y));
  await until(() => h.db.size === 7, 3000, 'đầy');
  const lines = await capture(async () => {
    for (let i = 0; i < 3; i++) assert.deepEqual(await h.post('/chat', { pid: A, text: 'đầy ' + i }, `198.51.100.${80 + i}`), { s: 503, d: { error: 'busy' }, cors: '*' });
    // /healthz: có việc chạy xong trong 10 giây qua => khoẻ ngay, không xếp sau hàng đợi
    const hz = await h.raw('/healthz');
    assert.equal(hz.status, 200);
    // /state: từ bộ nhớ
    const st = await h.get('/state?since=0');
    assert.equal(st.s, 200); assert.deepEqual(st.d.chat.map((m) => m.text), ['trước']);
  });
  assert.ok(Date.now() - t0 < 1500, 'trả lời ngay khi hàng đợi bị chặn');
  assert.equal(lines.filter((l) => l.includes('hàng đợi đầy')).length, 1, 'nhật ký tối đa một dòng mỗi 10 giây: ' + JSON.stringify(lines));
  ac.abort();
  assert.equal(await aborted, 'AbortError');
  await sleep(100); // máy chủ thấy kết nối đóng
  open(); await blocker;
  for (const r of [...await Promise.all(xs), ...await Promise.all(ys)]) assert.equal(r.s, 200);
  assert.deepEqual((await h.q('SELECT text FROM chat ORDER BY n')).map((r) => r.text), ['trước'], 'việc của máy khách đã ngắt không chạy');
  // xong thì số việc chờ của X về 0
  for (let i = 0; i < 3; i++) assert.equal((await h.post('/market/claim', { pid: B }, X)).s, 200);
  assert.equal(h.db.size, 0);
  await h.close();
});

test('/healthz: lâu không có việc nào chạy xong thì mới ping thật', async () => {
  const h = await start();
  assert.equal((await h.raw('/healthz')).status, 200);
  const runs = countRuns(h);
  assert.equal((await h.raw('/healthz')).status, 200);
  assert.equal(runs.n, 0, 'vừa có việc xong: không ping');
  h.db.okAt = Date.now() - 11000;
  assert.equal((await h.raw('/healthz')).status, 200);
  assert.equal(runs.n, 1, 'quá 10 giây: ping');
  runs.restore();
  await h.close();
});

test('prune lỗi thì yêu cầu sau dọn lại (không bỏ dọn một giờ)', async () => {
  const h = await start();
  await h.q('CREATE TABLE IF NOT EXISTS rate (pid TEXT, k TEXT, t BIGINT, PRIMARY KEY (pid, k))');
  await h.q("INSERT INTO rate (pid,k,t) VALUES ('cũ','chat',1)");
  const prune = h.world.prune.bind(h.world);
  let calls = 0;
  h.world.prune = async (now) => { if (++calls === 1) throw new Error('prune hỏng'); return prune(now); };
  const lines = await capture(async () => {
    assert.equal((await h.get(`/market?pid=${A}`)).s, 200, 'yêu cầu không bị kéo theo lỗi dọn');
    await h.world.pruning;
  });
  assert.ok(lines.some((l) => l.includes('online: prune') && l.includes('prune hỏng')), JSON.stringify(lines));
  assert.equal(h.world.pruned, 0);
  assert.equal((await h.q('SELECT COUNT(*) c FROM rate WHERE pid=$1', 'cũ'))[0].c, 1);
  assert.equal((await h.get(`/market?pid=${A}`)).s, 200);
  await h.world.pruning;
  assert.equal(calls, 2);
  assert.ok(h.world.pruned > 0);
  assert.equal((await h.q('SELECT COUNT(*) c FROM rate WHERE pid=$1', 'cũ'))[0].c, 0, 'đã dọn');
  // đã dọn thành công: trong một giờ không dọn lại
  assert.equal((await h.get(`/market?pid=${A}`)).s, 200);
  await h.world.pruning;
  assert.equal(calls, 2);
  await h.close();
});

test('COMMIT quá hạn (không rõ kết quả) ở /market/buy và /market/claim: một dòng nhật ký có đường dẫn + lid, không có pid', async () => {
  const h = await start();
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: { slot: 'ring', name: 'Nhẫn' }, price: 100 })).s, 200);
  const lid = (await h.get(`/market?pid=${B}`)).d.list[0].lid;
  // COMMIT chạy thật rồi máy khách báo quá hạn (như mạng treo đúng lúc trả lời COMMIT)
  const arm = () => {
    const c = h.db.client, q = c.query.bind(c);
    c.query = async (...a) => { if (a[0] === 'COMMIT') { c.query = q; await q(...a); throw new Error('Query read timeout'); } return q(...a); };
  };
  const lines = await capture(async () => {
    arm();
    assert.deepEqual((await h.post('/market/buy', { pid: B, name: 'Beta', lid })).d, { error: 'server' });
    assert.equal((await h.get(`/market?pid=${B}`)).s, 200); // kết nối mới
    arm();
    assert.deepEqual((await h.post('/market/claim', { pid: A })).d, { error: 'server' });
  });
  const unknown = lines.filter((l) => l.includes('COMMIT quá hạn'));
  assert.deepEqual(unknown, [`online: COMMIT quá hạn, không rõ đã ghi chưa: /market/buy lid=${lid}`, 'online: COMMIT quá hạn, không rõ đã ghi chưa: /market/claim']);
  for (const l of lines) for (const pid of [A, B]) assert.ok(!l.includes(pid), 'lộ pid trong nhật ký: ' + l);
  await h.close();
});

test('Unicode: cắt trúng giữa emoji không để lại nửa cặp thay thế; tin đẩy WS == /state == cơ sở dữ liệu; nhập + verify khớp', async () => {
  const name = 'x'.repeat(15) + '😀', text = 'y'.repeat(139) + '😀 thừa';
  assert.equal(clip(name, 16), 'x'.repeat(15));
  assert.equal(clip(text, 140), 'y'.repeat(139));
  assert.equal(txt('z'.repeat(39) + '🗡️', 40), 'z'.repeat(39));
  assert.equal(clip('a\uDC00b\uD800c', 10), 'a�b�c', 'nửa lẻ ở giữa cũng hợp lệ hoá');
  assert.equal(clip('ab😀', 4), 'ab😀', 'cặp nguyên vẹn giữ nguyên');
  const h = await start();
  const a = connect(h); await a.hello(A);
  a.send({ t: 'chat', name, text, r: 1 });
  assert.equal((await a.next((m) => m.t === 'ack')).ok, true);
  const pushed = (await a.next((m) => m.t === 'chat')).m;
  const state = (await h.get('/state?since=0')).d.chat.at(-1);
  const [row] = await h.q('SELECT n,t,name,text,extra FROM chat ORDER BY n DESC LIMIT 1');
  assert.deepEqual(pushed, state);
  assert.deepEqual(pushed, row);
  assert.equal(row.name, 'x'.repeat(15)); assert.ok(row.text.isWellFormed());
  // khởi động lại (tải lại bản trong bộ nhớ từ cơ sở dữ liệu): /state vẫn y hệt
  const pg = h.pg;
  a.ws.close(); await h.close();
  const h2 = await start({ pg });
  assert.deepEqual((await h2.get('/state?since=0')).d.chat.at(-1), pushed);
  await h2.close();
  // nhập dữ liệu cũ có tên/tin/món cắt trúng emoji: --verify khớp
  const pg2 = await freshDb();
  const q = await sql(pg2);
  const data = {
    chat: [{ n: 1, t: 1, pid: A, name, text, extra: '' }],
    arena: [{ pid: A, name, cls: 'k'.repeat(9) + '😀', snap: { title: 't'.repeat(19) + '😀' }, t: Date.now() }],
    market: [{ lid: 1, pid: A, name, item: { slot: 'ring', name: 'n'.repeat(39) + '😀' }, price: 1, t: 1 }],
    wallet: [{ pid: B, gold: 1, sold: [{ name: 's'.repeat(39) + '😀', price: 1, buyer: name }] }],
  };
  await importData(q.client, data);
  const v = await verifyData(q.client, data);
  assert.equal(v.ok, true, JSON.stringify(v.tables));
  assert.equal((await q('SELECT name FROM chat'))[0].name, 'x'.repeat(15));
  await q.end();
});
