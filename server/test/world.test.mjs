// world.mjs: giao dịch tx() trên PostgreSQL (mất kết nối, lỗi giữa chừng, sự kiện sau COMMIT) và tiền tố IPv6.
import test from 'node:test';
import assert from 'node:assert/strict';
import { World, ipKey, ipPrefix, normIp, clip } from '../world.mjs';
import { openStore } from '../server.mjs';
import { freshDb, sql } from '../testing.mjs';

const A = 'aaaaaaaa-1111';
const post = (world, text, pid = A) => world.handle('POST', '/chat', new URLSearchParams(), { pid, name: 'A', text }, '1.2.3.4');

test('tx: mất kết nối giữa chừng => 500, pending về null, kết nối lại và chạy tiếp', async () => {
  const cfg = await freshDb();
  const store = openStore(cfg, { retryMs: 50, log: () => {} });
  const chats = [];
  const world = new World(store, { onChat: (m) => chats.push(m.text) });
  const q = await sql(cfg);
  try {
    assert.equal((await post(world, 'một'))[0], 200);
    // cắt kết nối của máy chủ từ phía PostgreSQL ngay giữa giao dịch (như cơ sở dữ liệu khởi động lại)
    const pid = (await store.run((c) => c.query('SELECT pg_backend_pid() p'), { tx: false })).rows[0].p;
    await assert.rejects(world.tx(async () => {
      await world.addChat(Date.now(), A, 'A', 'hai', '');
      await q('SELECT pg_terminate_backend($1)', pid);
      await world.addChat(Date.now(), A, 'A', 'hai b', '');
    }));
    assert.equal(world.pending, null, 'pending phải được dọn');
    assert.equal(world.c, null);
    // sự kiện ngoài giao dịch phát ngay, không bị giữ lại trong danh sách cũ
    let fired = false; world.emit(() => { fired = true; });
    assert.ok(fired);
    await new Promise((r) => setTimeout(r, 80)); // qua retryMs
    assert.equal((await post(world, 'ba', 'cccccccc-3333'))[0], 200);
    assert.deepEqual(chats, ['một', 'ba'], 'tin của giao dịch hỏng không được phát');
    assert.deepEqual((await q('SELECT text FROM chat ORDER BY n')).map((r) => r.text), ['một', 'ba']);
  } finally { await store.close(); await q.end(); }
});

test('tx: lỗi sau khi đã ghi => ROLLBACK, không phát sự kiện, không còn giao dịch mở', async () => {
  const cfg = await freshDb();
  const store = openStore(cfg, { log: () => {} });
  const chats = [];
  const world = new World(store, { onChat: (m) => chats.push(m.text) });
  try {
    await assert.rejects(world.tx(async () => { await world.addChat(1, A, 'A', 'mất', ''); throw new Error('hỏng'); }), /hỏng/);
    assert.deepEqual(chats, []);
    assert.equal(world.pending, null);
    const out = await world.tx(async () => { await world.addChat(2, A, 'A', 'còn', ''); return (await world.all('SELECT text FROM chat')).map((r) => r.text); });
    assert.deepEqual(out, ['còn']);
    assert.deepEqual(chats, ['còn']);
    // kết nối không còn giao dịch nào mở
    const st = await store.run((c) => c.query('SELECT now() = statement_timestamp() AS idle'), { tx: false });
    assert.equal(st.rows[0].idle, true);
  } finally { await store.close(); }
});

test('clip: bỏ ký tự NUL (PostgreSQL không nhận) cùng < >', () => {
  assert.equal(clip('a\0<b>c', 10), 'abc');
});

test('ipPrefix: /48 và /64, ipKey giữ nguyên dạng cũ', () => {
  assert.equal(ipPrefix('2001:DB8:5:1::9', 48), '2001:db8:5::/48');
  assert.equal(ipPrefix('2001:db8:5:1::9', 64), '2001:db8:5:1::/64');
  assert.equal(ipPrefix('2001:db8::1', 48), '2001:db8:0::/48');
  assert.equal(ipKey('2001:db8:1:2:3:4:5:6'), '2001:db8:1:2::/64');
  assert.equal(ipKey('203.0.113.5'), '203.0.113.5');
  assert.equal(ipKey(''), '');
  // đuôi IPv4 dạng chấm là hai nhóm; zone bị bỏ
  assert.equal(ipPrefix('2001::5:6:7:8:1.2.3.4', 64), '2001:0:5:6::/64');
  assert.equal(ipPrefix('::ffff:1.2.3.4', 64), '0:0:0:0::/64');
  assert.equal(ipPrefix('64:ff9b::1.2.3.4', 48), '64:ff9b:0::/48');
  assert.equal(ipPrefix('FE80::1%eth0', 64), 'fe80:0:0:0::/64');
});

test('normIp: IPv4 viết dạng IPv6 / có số 0 đầu về một dạng; IPv6 thật giữ nguyên', () => {
  for (const ip of ['203.0.113.7', '::ffff:203.0.113.7', '::FFFF:cb00:7107', '0:0:0:0:0:ffff:cb00:7107', '::ffff:203.0.113.7%eth0', '203.000.113.007']) assert.equal(normIp(ip), '203.0.113.7', ip);
  assert.equal(normIp('2001:DB8::1%eth0'), '2001:db8::1');
  assert.equal(normIp('::1'), '::1');
  assert.equal(normIp(''), '');
  assert.equal(ipKey('::ffff:cb00:7107'), '203.0.113.7');
  assert.equal(ipKey('2001:db8:5:1::9'), '2001:db8:5:1::/64');
});
