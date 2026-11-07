// world.mjs: giao dịch tx() và tiền tố IPv6.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { World, ipKey, ipPrefix, normIp } from '../world.mjs';
import { tmpDb } from '../testing.mjs';

test('tx: BEGIN thất bại (cơ sở dữ liệu bận) vẫn trả pending về null, sự kiện sau đó phát ngay', () => {
  const dbPath = tmpDb();
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=0;');
  const chats = [];
  const world = new World(db, { onChat: (m) => chats.push(m.text) });
  const other = new DatabaseSync(dbPath);
  other.exec('BEGIN IMMEDIATE'); // tiến trình khác giữ khoá ghi
  let ran = false;
  assert.throws(() => world.tx(() => { ran = true; }), /locked|busy/i);
  assert.equal(ran, false);
  assert.equal(world.pending, null, 'pending phải được dọn');
  // POST lỗi gọn gàng (500), không kẹt trạng thái
  assert.equal(world.handle('POST', '/chat', new URLSearchParams(), { pid: 'aaaaaaaa-1111', name: 'A', text: 'bận' }, '1.2.3.4')[0], 500);
  assert.equal(world.pending, null);
  other.exec('ROLLBACK'); other.close();
  // sự kiện ngoài giao dịch phát ngay, không bị giữ lại trong danh sách cũ
  let fired = false; world.emit(() => { fired = true; });
  assert.ok(fired);
  // giao dịch kế tiếp chạy bình thường và phát sự kiện sau khi ghi
  assert.equal(world.handle('POST', '/chat', new URLSearchParams(), { pid: 'aaaaaaaa-1111', name: 'A', text: 'được' }, '1.2.3.4')[0], 200);
  assert.deepEqual(chats, ['được']);
  // không có giao dịch nào còn mở (BEGIN thất bại không ROLLBACK nhầm)
  db.exec('BEGIN'); db.exec('ROLLBACK'); // BEGIN lồng sẽ ném lỗi nếu còn giao dịch mở
  db.close();
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
