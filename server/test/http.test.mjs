// Các đường dẫn HTTP cũ (chuyển từ msi/online/host.test.mjs): kênh thế giới, Luận Kiếm Đài, chợ, dữ liệu còn sau khởi động
// lại, bảo mật (không lộ pid, làm sạch món/tin), dòng thiếu mã công khai, dữ liệu nhập vào được làm sạch, giới hạn theo IP,
// cơ sở dữ liệu mất kết nối (/healthz 503, yêu cầu 500, tự hồi phục), các yêu cầu đồng thời chạy lần lượt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { after } from 'node:test';
import { start, freshDb, sql, pgProxy, sleep, closeAll } from '../testing.mjs';
import { createSchema } from '../db.mjs';
import { importData } from '../import.mjs';

after(closeAll);
import { oidOf } from '../world.mjs';

const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222';

test('oid giống hệt worker.js (băm SHA-256 của crypto.subtle)', async () => {
  for (const pid of [A, B, 'cccccccc-3333']) {
    const d = new Uint8Array(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('hk-oid:' + pid)));
    assert.equal(oidOf(pid), [...d.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join(''));
  }
});

test('chat, arena, market, persistence', async () => {
  const pg = await freshDb();
  let h = await start({ pg });
  const opt = await h.raw('/state', { method: 'OPTIONS' });
  assert.equal(opt.headers.get('access-control-allow-origin'), '*');
  assert.equal((await h.raw('/healthz')).status, 200);
  const c = await h.post('/chat', { pid: A, name: 'Alpha', text: 'xin chào <b>' });
  assert.equal(c.s, 200); assert.equal(c.cors, '*');
  const st = await h.get(`/state?since=0&pid=${A}`);
  assert.equal(st.s, 200);
  assert.ok(JSON.stringify(st.d).includes('xin chào b'), JSON.stringify(st.d));
  assert.deepEqual(Object.keys(st.d.chat[0]).sort(), ['extra', 'n', 'name', 't', 'text']);
  for (const [pid, name] of [[A, 'Alpha'], [B, 'Beta']]) {
    const r = await h.post('/arena/submit', { pid, name, cls: 'kiem', level: 10, power: 500, snap: { hp: 100, atk: 10 } });
    assert.equal(r.s, 200, JSON.stringify(r.d));
  }
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: { slot: 'weapon', name: 'Kiếm', rarity: 2, lv: 10, stats: { atk: 30 }, han: '劍' }, price: 1000 })).s, 200);
  const m = await h.get(`/market?pid=${B}`);
  assert.equal(m.d.list.length, 1); assert.equal(m.d.list[0].mine, false); assert.equal(m.d.list[0].pid, undefined);
  assert.equal((await h.post('/market/buy', { pid: A, name: 'Alpha', lid: m.d.list[0].lid })).s, 400, 'cannot buy own');
  const buy = await h.post('/market/buy', { pid: B, name: 'Beta', lid: m.d.list[0].lid });
  assert.equal(buy.s, 200); assert.equal(buy.d.item.name, 'Kiếm');
  const claim = await h.post('/market/claim', { pid: A });
  assert.equal(claim.d.gold, 950); assert.equal(claim.d.sold[0].buyer, 'Beta');
  const nf = await h.get(`/nope?pid=${A}`); assert.equal(nf.s, 404);
  await h.close();
  h = await start({ pg });
  const again = await h.get(`/state?since=0&pid=${B}`);
  assert.ok(JSON.stringify(again.d).includes('Alpha'), 'chat survives restart');
  assert.equal((await h.q('SELECT COUNT(*) n FROM arena'))[0].n, 2);
  await h.close();
});

test('security: no player ids leak, duel by public id, items and chat sanitised, row without public id gets one', async () => {
  const pg = await freshDb();
  // a row written without the public id (manual insert): filled in when the server connects
  const q = await sql(pg);
  await createSchema(q.client);
  await q('INSERT INTO arena (pid,name,cls,level,power,rating,wins,losses,snap,t) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', 'cccccccc-3333', 'Gamma', 'kiem', 9, 400, 1000, 0, 0, '{"hp":90,"atk":9}', Date.now());
  await q.end();
  const h = await start({ pg });
  for (const [pid, name] of [[A, 'Alpha'], [B, 'Beta']]) assert.equal((await h.post('/arena/submit', { pid, name, cls: 'kiem', level: 10, power: 500, snap: { hp: 100, atk: 10 } })).s, 200);
  const opp = await h.get(`/arena/opponents?pid=${A}`);
  const raw = JSON.stringify(opp.d);
  for (const id of [A, B, 'cccccccc-3333']) assert.ok(!raw.includes(id), 'player id leaked: ' + id);
  // a raw player id is not accepted as an opponent
  assert.equal((await h.post('/arena/result', { pid: B, opp: 'cccccccc-3333', win: true })).s, 404);
  await h.q('DELETE FROM rate');
  assert.equal(opp.d.list.length, 2);
  assert.ok(opp.d.list.every((o) => /^[0-9a-f]{16}$/.test(o.oid)), raw);
  const gamma = opp.d.list.find((o) => o.name === 'Gamma');
  assert.ok(gamma, 'old row got a public id');
  // duel result by public id works; an unknown public id is refused; fighting yourself is refused
  const res = await h.post('/arena/result', { pid: A, opp: gamma.oid, win: true });
  assert.equal(res.s, 200, JSON.stringify(res.d));
  assert.equal((await h.post('/arena/result', { pid: B, opp: '0000000000000000', win: true })).s, 404);
  const self = (await h.get(`/arena/opponents?pid=${B}`)).d.list.find((o) => o.name === 'Alpha');
  await h.q('DELETE FROM rate'); // past the duel spacing
  assert.equal((await h.post('/arena/result', { pid: A, opp: self.oid, win: true })).s, 404, 'cannot fight yourself');
  // market: hostile item cleaned, non-item refused
  const evil = { slot: 'ring', name: '<img src=x onerror=alert(1)>', lv: '<svg onload=alert(1)>', han: '"><b>', stats: { atk: 5, '<x>': 9 }, thumb: 'https://evil.example/x', extra: 'x' };
  assert.equal((await h.post('/market/list', { pid: A, name: 'Alpha', item: evil, price: 5 })).s, 200);
  assert.equal((await h.post('/market/list', { pid: B, name: 'Beta', item: { name: 'no slot' }, price: 5 })).s, 400);
  const m = await h.get(`/market?pid=${B}`);
  const it = m.d.list[0].item;
  assert.equal(it.lv, 1); assert.ok(Object.values(it).every((v) => typeof v !== 'string' || !/[<>"]/.test(v)), JSON.stringify(it));
  assert.equal(it.thumb, undefined); assert.equal(it.extra, undefined); assert.deepEqual(Object.keys(it.stats), ['atk']);
  // chat: a player cannot post a fake system (arena) announcement
  await h.post('/chat', { pid: B, name: 'Beta', text: 'fake win', extra: 'arena' });
  const st = await h.get(`/state?since=0&pid=${A}`);
  assert.equal(st.d.chat.find((c) => c.text === 'fake win').extra, '');
  assert.equal(st.d.chat.filter((c) => c.extra === 'arena').length, 1, 'only the real duel announcement');
  await h.close();
});

test('hardening: imported old payloads cleaned, per-IP limits, rating griefing cap, old clients, bad bodies', async () => {
  const pg = await freshDb();
  // hostile rows stored by the old server, brought over by import.mjs
  const q = await sql(pg);
  await importData(q.client, {
    market: [
      { lid: 1, pid: A, name: 'Alpha', item: JSON.stringify({ slot: 'ring', name: 'x', lv: '<svg onload=alert(1)>' }), price: 5, t: 1 },
      { lid: 2, pid: A, name: 'Alpha', item: JSON.stringify({ name: '<img src=x onerror=alert(1)>' }), price: 5, t: 1 },
    ],
    wallet: [{ pid: B, gold: 10, sold: JSON.stringify([{ name: '<img src=x onerror=alert(1)>', price: 10, buyer: 'Z' }]) }],
    chat: [{ n: 1, t: 1, pid: A, name: 'Alpha', text: 'fake', extra: 'arena' }],
  });
  await q.end();
  const h = await start({ pg });
  const m = await h.get(`/market?pid=${B}`);
  assert.equal(m.d.list.length, 1, 'non-item row removed'); assert.equal(m.d.list[0].item.lv, 1);
  assert.ok(!JSON.stringify(m.d.owed).includes('<'));
  const claim = await h.post('/market/claim', { pid: B });
  assert.ok(!/[<>]/.test(claim.d.sold[0].name), JSON.stringify(claim.d));
  assert.equal((await h.get(`/state?since=0&pid=${A}`)).d.chat[0].extra, '');
  // malformed bodies do not crash
  for (const b of ['null', '[]', '"x"', '{bad json']) assert.equal((await h.post('/chat', b)).s, 400, b);
  // per-IP limit applies even with fresh player ids
  const ipPost = (p, body, ip = '203.0.113.7') => h.post(p, body, ip);
  const id = (n) => `ffffffff-${String(n).padStart(4, '0')}`;
  assert.equal((await ipPost('/arena/submit', { pid: id(1), name: 'V', cls: 'kiem', snap: {} }, '198.51.100.1')).s, 200);
  assert.equal((await ipPost('/arena/submit', { pid: id(2), name: 'G1', cls: 'kiem', snap: {} })).s, 200);
  // many players behind one IP (mobile carrier NAT) are fine; a flood from one IP is not
  assert.equal((await ipPost('/arena/submit', { pid: id(3), name: 'G2', cls: 'kiem', snap: {} })).s, 200, 'second player on the same IP');
  let last = 0;
  for (let i = 0; i < 60; i++) last = (await ipPost('/arena/submit', { pid: id(100 + i), name: 'F', cls: 'kiem', snap: {} })).s;
  assert.equal(last, 429, 'more than 60 snapshots a minute from one IP');
  // griefing: the victim only loses rating once per IP per 10 minutes
  const victim = (await h.get(`/arena/opponents?pid=${id(2)}`)).d.list.find((o) => o.name === 'V');
  const r1 = await ipPost('/arena/result', { pid: id(2), opp: victim.oid, win: true });
  assert.equal(r1.s, 200, JSON.stringify(r1.d));
  const rating = async () => (await h.q('SELECT rating FROM arena WHERE pid=$1', id(1)))[0].rating;
  const after1 = await rating(); assert.ok(after1 < 1000);
  await h.q("DELETE FROM rate WHERE k='duel'"); // skip the per-IP duel spacing for the test
  // old client: reads o.pid from the opponent list (now the public id) and sends it back as opp
  assert.equal(victim.pid, victim.oid);
  const r2 = await ipPost('/arena/result', { pid: id(2), opp: victim.pid, win: true });
  assert.equal(r2.s, 200, JSON.stringify(r2.d));
  assert.equal(await rating(), after1, 'second hit from the same IP within 10 min does not lower the victim again');
  // IPv6: addresses in the same /64 share one bucket
  const codes = [];
  for (let i = 0; i < 31; i++) codes.push((await ipPost('/market/list', { pid: id(300 + i), name: 'S', item: { slot: 'ring', name: 'r' }, price: 1 }, `2001:db8:a:b:${i.toString(16)}::1`)).s);
  assert.equal(codes.filter((c) => c === 200).length, 30); assert.equal(codes[30], 429, 'one /64 is one IP');
  await h.close();
});

test('HTTP: thân quá lớn bị từ chối 413, chat giới hạn tần suất theo người, đếm online theo mã khác nhau', async () => {
  const h = await start({ maxBody: 1024 });
  assert.equal((await h.post('/chat', { pid: A, text: 'x'.repeat(2000) })).s, 413);
  assert.equal((await h.post('/chat', { pid: A, name: 'Alpha', text: 'một' })).s, 200);
  const slow = await h.post('/chat', { pid: A, name: 'Alpha', text: 'hai' });
  assert.equal(slow.s, 429); assert.equal(slow.d.error, 'slow');
  assert.equal((await h.post('/chat', { pid: B, text: '   ' })).d.error, 'empty');
  assert.equal((await h.get('/chat')).d.error, 'pid');
  await h.get(`/state?pid=${B}`); await h.get(`/state?pid=${B}`); await h.get('/state?pid=bad');
  assert.equal((await h.get('/state')).d.online, 2);
  await h.close();
});

test('PostgreSQL: since lạ/rất lớn, NUL trong tên/tin, opp không phải mã công khai không làm lỗi 500', async () => {
  const h = await start();
  for (const since of ['1.5', '1e300', '-1e300', 'Infinity', 'abc', '99999999999999999999']) assert.equal((await h.get(`/state?since=${since}`)).s, 200, since);
  assert.equal((await h.post('/chat', { pid: A, name: 'Al\u0000pha', text: 'x\u0000y' })).s, 200);
  assert.deepEqual((await h.get('/state?since=0')).d.chat.map((m) => [m.name, m.text]), [['Alpha', 'xy']]);
  assert.equal((await h.post('/arena/submit', { pid: A, name: 'A\u0000', cls: 'k\u0000', snap: { title: '\u0000' } })).s, 200);
  assert.equal((await h.post('/arena/result', { pid: A, opp: 'x\u0000', win: true })).s, 404);
  assert.equal((await h.post('/market/buy', { pid: A, name: 'A', lid: 1e20 })).s, 404);
  // số lớn đọc ra là số (BIGINT), không phải chuỗi
  const st = await h.get('/state?since=0');
  assert.equal(typeof st.d.chat[0].n, 'number'); assert.equal(typeof st.d.chat[0].t, 'number'); assert.ok(st.d.chat[0].t > 2 ** 31);
  await h.close();
});

test('cơ sở dữ liệu mất kết nối: /healthz 503, yêu cầu 500 server, WS chào bị đóng 1011; có lại thì tự hồi phục', async () => {
  const pg = await freshDb();
  const proxy = await pgProxy(pg);
  const errs = console.error; console.error = () => {}; // lỗi kết nối được ghi nhật ký có chủ đích
  try {
    const h = await start({ pg: proxy.cfg, dbRetryMs: 100 });
    assert.equal((await h.raw('/healthz')).status, 200);
    // nhiều lần kiểm tra cùng lúc dùng chung một truy vấn (không chiếm đầy hàng đợi)
    const runs = h.db.run.bind(h.db); let pings = 0;
    h.db.run = (fn, o) => { if (o?.tx === false) pings++; return runs(fn, o); };
    assert.ok((await Promise.all(Array.from({ length: 20 }, () => h.raw('/healthz')))).every((r) => r.status === 200));
    assert.ok(pings < 20, 'ping dùng chung: ' + pings);
    h.db.run = runs;
    assert.equal((await h.post('/chat', { pid: A, name: 'Alpha', text: 'trước' })).s, 200);
    proxy.cut();
    const hz = await h.raw('/healthz');
    assert.equal(hz.status, 503); assert.equal(await hz.text(), 'db');
    assert.deepEqual(await h.post('/chat', { pid: B, name: 'Beta', text: 'trong lúc mất' }), { s: 500, d: { error: 'server' }, cors: '*' });
    const st = await h.get(`/state?pid=${A}`);
    assert.equal(st.s, 500); assert.deepEqual(st.d, { error: 'server' });
    const { connect } = await import('../testing.mjs');
    const w = connect(h); await w.opened; w.send({ t: 'hello', pid: A, since: 0 });
    assert.equal((await w.closed).code, 1011);
    proxy.restore();
    await sleep(150); // qua dbRetryMs
    assert.equal((await h.raw('/healthz')).status, 200);
    assert.equal((await h.post('/chat', { pid: B, name: 'Beta', text: 'sau' })).s, 200);
    assert.deepEqual((await h.get('/state?since=0')).d.chat.map((m) => m.text), ['trước', 'sau']);
    await h.close();
  } finally { console.error = errs; await proxy.close(); }
});

test('yêu cầu đồng thời chạy lần lượt: không mất cập nhật điểm, một món chỉ bán được một lần', async () => {
  const h = await start();
  const N = 12, V = 'eeeeeeee-0000', id = (i) => `ffffffff-${String(i).padStart(4, '0')}`;
  assert.equal((await h.post('/arena/submit', { pid: V, name: 'V', cls: 'kiem', snap: {} }, '198.51.100.250')).s, 200);
  for (let i = 0; i < N; i++) assert.equal((await h.post('/arena/submit', { pid: id(i), name: 'P' + i, cls: 'kiem', snap: {} }, `198.51.100.${i}`)).s, 200);
  const vo = (await h.get(`/arena/opponents?pid=${id(0)}`)).d.list.find((o) => o.name === 'V').oid;
  // mỗi người một IP khác nhau: ai cũng làm V tụt điểm; Elo đọc điểm của V tại lượt mình
  const res = await Promise.all(Array.from({ length: N }, (_, i) => h.post('/arena/result', { pid: id(i), opp: vo, win: true }, `198.51.100.${i}`)));
  assert.ok(res.every((r) => r.s === 200), JSON.stringify(res));
  // tính tuần tự: mọi người đều 1000 điểm nên kết quả không phụ thuộc thứ tự
  let v = 1000, sum = 0;
  for (let i = 0; i < N; i++) { const da = Math.round(32 * (1 - 1 / (1 + 10 ** ((v - 1000) / 400)))); v -= Math.round(da / 2); sum += da; }
  const [row] = await h.q('SELECT rating FROM arena WHERE pid=$1', V);
  assert.equal(row.rating, v, 'điểm của V đúng như chạy tuần tự');
  assert.equal(res.reduce((s, r) => s + r.d.delta, 0), sum);
  assert.equal((await h.q('SELECT COUNT(*) c FROM chat WHERE extra=$1', 'arena'))[0].c, N);
  // mua cùng lúc một món: đúng một người mua được, người bán nhận bạc một lần
  assert.equal((await h.post('/market/list', { pid: V, name: 'V', item: { slot: 'ring', name: 'Nhẫn' }, price: 1000 })).s, 200);
  const lid = (await h.get(`/market?pid=${V}`)).d.list[0].lid;
  const buys = await Promise.all(Array.from({ length: N }, (_, i) => h.post('/market/buy', { pid: id(i), name: 'P' + i, lid })));
  assert.deepEqual(buys.map((b) => b.s).sort(), [200, ...Array(N - 1).fill(404)]);
  const claim = await h.post('/market/claim', { pid: V });
  assert.equal(claim.d.gold, 950); assert.equal(claim.d.sold.length, 1);
  await h.close();
});
