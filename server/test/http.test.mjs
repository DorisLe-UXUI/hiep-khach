// Các đường dẫn HTTP cũ (chuyển từ msi/online/host.test.mjs): kênh thế giới, Luận Kiếm Đài, chợ, dữ liệu còn sau khởi động
// lại, bảo mật (không lộ pid, làm sạch món/tin), nâng cấp cơ sở dữ liệu cũ, giới hạn theo IP.
import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { after } from 'node:test';
import { start, tmpDb, closeAll } from '../testing.mjs';

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
  const dbPath = tmpDb();
  let h = await start({ dbPath });
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
  h = await start({ dbPath });
  const again = await h.get(`/state?since=0&pid=${B}`);
  assert.ok(JSON.stringify(again.d).includes('Alpha'), 'chat survives restart');
  assert.equal(h.db.prepare('SELECT COUNT(*) n FROM arena').get().n, 2);
  await h.close();
});

test('security: no player ids leak, duel by public id, items and chat sanitised, old database migrates', async () => {
  const db2 = tmpDb();
  // a database created by the previous server version (arena table without the oid column)
  const old = new DatabaseSync(db2);
  old.exec('CREATE TABLE arena (pid TEXT PRIMARY KEY, name TEXT, cls TEXT, level INTEGER, power INTEGER, rating INTEGER, wins INTEGER, losses INTEGER, snap TEXT, t INTEGER)');
  old.prepare('INSERT INTO arena VALUES (?,?,?,?,?,?,?,?,?,?)').run('cccccccc-3333', 'Gamma', 'kiem', 9, 400, 1000, 0, 0, '{"hp":90,"atk":9}', Date.now());
  old.close();
  const h = await start({ dbPath: db2 });
  for (const [pid, name] of [[A, 'Alpha'], [B, 'Beta']]) assert.equal((await h.post('/arena/submit', { pid, name, cls: 'kiem', level: 10, power: 500, snap: { hp: 100, atk: 10 } })).s, 200);
  const opp = await h.get(`/arena/opponents?pid=${A}`);
  const raw = JSON.stringify(opp.d);
  for (const id of [A, B, 'cccccccc-3333']) assert.ok(!raw.includes(id), 'player id leaked: ' + id);
  // a raw player id is not accepted as an opponent
  assert.equal((await h.post('/arena/result', { pid: B, opp: 'cccccccc-3333', win: true })).s, 404);
  h.db.prepare('DELETE FROM rate').run();
  assert.equal(opp.d.list.length, 2);
  assert.ok(opp.d.list.every((o) => /^[0-9a-f]{16}$/.test(o.oid)), raw);
  const gamma = opp.d.list.find((o) => o.name === 'Gamma');
  assert.ok(gamma, 'old row got a public id');
  // duel result by public id works; an unknown public id is refused; fighting yourself is refused
  const res = await h.post('/arena/result', { pid: A, opp: gamma.oid, win: true });
  assert.equal(res.s, 200, JSON.stringify(res.d));
  assert.equal((await h.post('/arena/result', { pid: B, opp: '0000000000000000', win: true })).s, 404);
  const self = (await h.get(`/arena/opponents?pid=${B}`)).d.list.find((o) => o.name === 'Alpha');
  h.db.prepare('DELETE FROM rate').run(); // past the duel spacing
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

test('hardening: stored payloads cleaned on upgrade, per-IP limits, rating griefing cap, old clients, bad bodies', async () => {
  const db3 = tmpDb();
  const old = new DatabaseSync(db3);
  old.exec(`CREATE TABLE chat (n INTEGER PRIMARY KEY AUTOINCREMENT, t INTEGER, pid TEXT, name TEXT, text TEXT, extra TEXT);
    CREATE TABLE arena (pid TEXT PRIMARY KEY, name TEXT, cls TEXT, level INTEGER, power INTEGER, rating INTEGER, wins INTEGER, losses INTEGER, snap TEXT, t INTEGER);
    CREATE TABLE market (lid INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT, name TEXT, item TEXT, price INTEGER, t INTEGER);
    CREATE TABLE wallet (pid TEXT PRIMARY KEY, gold INTEGER, sold TEXT);`);
  old.prepare('INSERT INTO market (pid,name,item,price,t) VALUES (?,?,?,?,?)').run(A, 'Alpha', JSON.stringify({ slot: 'ring', name: 'x', lv: '<svg onload=alert(1)>' }), 5, 1);
  old.prepare('INSERT INTO market (pid,name,item,price,t) VALUES (?,?,?,?,?)').run(A, 'Alpha', JSON.stringify({ name: '<img src=x onerror=alert(1)>' }), 5, 1);
  old.prepare('INSERT INTO wallet VALUES (?,?,?)').run(B, 10, JSON.stringify([{ name: '<img src=x onerror=alert(1)>', price: 10, buyer: 'Z' }]));
  old.prepare('INSERT INTO chat (t,pid,name,text,extra) VALUES (?,?,?,?,?)').run(1, A, 'Alpha', 'fake', 'arena');
  old.close();
  const h = await start({ dbPath: db3 });
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
  const rating = () => h.db.prepare('SELECT rating FROM arena WHERE pid=?').get(id(1)).rating;
  const after1 = rating(); assert.ok(after1 < 1000);
  h.db.prepare("DELETE FROM rate WHERE k='duel'").run(); // skip the per-IP duel spacing for the test
  // old client: reads o.pid from the opponent list (now the public id) and sends it back as opp
  assert.equal(victim.pid, victim.oid);
  const r2 = await ipPost('/arena/result', { pid: id(2), opp: victim.pid, win: true });
  assert.equal(r2.s, 200, JSON.stringify(r2.d));
  assert.equal(rating(), after1, 'second hit from the same IP within 10 min does not lower the victim again');
  // IPv6: addresses in the same /64 share one bucket
  const codes = [];
  for (let i = 0; i < 31; i++) codes.push((await ipPost('/market/list', { pid: id(300 + i), name: 'S', item: { slot: 'ring', name: 'r' }, price: 1 }, `2001:db8:a:b:${i.toString(16)}::1`)).s);
  assert.equal(codes.filter((c) => c === 200).length, 30); assert.equal(codes[30], 429, 'one /64 is one IP');
  await h.close();
});

test('HTTP: thân quá lớn bị từ chối 413, chat giới hạn tần suất theo người, đếm online theo mã khác nhau', async () => {
  const h = await start({ dbPath: tmpDb(), maxBody: 1024 });
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
