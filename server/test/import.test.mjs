// import.mjs: nhập dữ liệu xuất từ Durable Object vào PostgreSQL rỗng, làm sạch từng dòng, đếm dòng bị bỏ theo lý do,
// đặt lại bộ đếm n/lid, --verify so lại từng dòng.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { importData, verifyData, prepare } from '../import.mjs';
import { oidOf } from '../world.mjs';
import { start, freshDb, sql, closeAll } from '../testing.mjs';

after(closeAll);
const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';
const dir = path.dirname(fileURLToPath(import.meta.url));
const run = promisify(execFile);
const exportData = () => ({
  chat: [
    { n: 5, t: 1000, pid: A, name: 'Alpha<script>', text: 'xin chào <b>', extra: '' },
    { n: 6, t: 1001, pid: 'system', name: 'Luận Kiếm', text: 'Alpha đánh bại Beta trên Luận Kiếm Đài!', extra: 'arena' },
    { n: 7, t: 1002, pid: B, name: 'Beta', text: 'giả hệ thống', extra: 'arena' }, // cờ bị bỏ
    { n: 8, t: 1003, pid: 'không hợp lệ!', name: 'X', text: 'hỏng' }, // bỏ: pid sai
    { n: 9, t: 1004, pid: B, name: 'Beta', text: '   ' }, // bỏ: rỗng
    { n: 'x', t: 1, pid: B, text: 'hỏng' }, // bỏ: n sai
    null, // bỏ
  ],
  arena: [
    { pid: A, oid: 'gia-mao', name: 'Alpha', cls: 'kiem', level: 10, power: 500, rating: 1016, wins: 1, losses: 0, snap: '{"hp":100,"atk":10,"def":5,"evil":"<x>"}', t: Date.now() },
    { pid: B, name: 'Beta<>', cls: 'thuong', level: 9, power: 400, rating: 984, wins: 0, losses: 1, snap: { hp: 90, atk: 9, title: '<img>' }, t: Date.now() },
    { pid: C, name: 'Hỏng', snap: '{không phải json', t: 1 }, // bỏ
    { pid: 'x', name: 'Ngắn', snap: '{}', t: 1 }, // bỏ: pid sai
    { pid: A, name: 'Trùng', snap: '{}', t: 1 }, // bỏ: trùng khoá
  ],
  market: [
    { lid: 3, pid: A, name: 'Alpha', item: JSON.stringify({ slot: 'ring', name: '<img src=x onerror=alert(1)>', lv: '<svg>', thumb: 'https://evil.example/x', stats: { atk: 5, '<x>': 1 } }), price: 50, t: 1 },
    { lid: 4, pid: A, name: 'Alpha', item: { slot: 'weapon', name: 'Kiếm', stats: { atk: 30 } }, price: 99999999, t: 2 }, // object cũng nhận, giá bị kẹp
    { lid: 5, pid: A, name: 'Alpha', item: JSON.stringify({ name: 'không có ô' }), price: 1, t: 3 }, // bỏ
    { lid: 6, pid: A, name: 'Alpha', item: 'không phải json', price: 1, t: 3 }, // bỏ
  ],
  wallet: [
    { pid: B, gold: 950, sold: JSON.stringify([{ name: '<img src=x>', price: 1000, buyer: 'Z"' }]) },
    { pid: C, gold: -5, sold: 'hỏng' }, // vàng kẹp về 0, sold rỗng
    { pid: 'x', gold: 1, sold: '[]' }, // bỏ
  ],
});

test('importData: đếm theo lý do, làm sạch, điền oid, dùng được ngay qua HTTP', async () => {
  const pg = await freshDb();
  const q = await sql(pg);
  const data = exportData();
  const counts = await importData(q.client, data);
  assert.deepEqual(counts, {
    chat: { in: 7, imported: 3, skipped: 4, reasons: { pid: 1, empty: 1, n: 1, row: 1 } },
    arena: { in: 5, imported: 2, skipped: 3, reasons: { snap: 1, pid: 1, duplicate: 1 } },
    market: { in: 4, imported: 2, skipped: 2, reasons: { item: 2 } },
    wallet: { in: 3, imported: 2, skipped: 1, reasons: { pid: 1 } },
  });
  const chat = await q('SELECT * FROM chat ORDER BY n');
  assert.deepEqual(chat.map((r) => [r.n, r.extra]), [[5, ''], [6, 'arena'], [7, '']]);
  assert.equal(chat[0].name, 'Alphascript'); assert.equal(chat[0].text, 'xin chào b');
  const arena = await q('SELECT * FROM arena ORDER BY pid');
  assert.equal(arena[0].oid, oidOf(A)); assert.equal(arena[1].oid, oidOf(B));
  assert.deepEqual(JSON.parse(arena[0].snap), { hp: 100, atk: 10, def: 0.7, crit: 0, adv: 0, faction: '', title: '', weapon: '' });
  assert.equal(JSON.parse(arena[1].snap).title, 'img'); assert.equal(arena[1].name, 'Beta');
  const market = await q('SELECT * FROM market ORDER BY lid');
  assert.deepEqual(market.map((r) => r.lid), [3, 4]);
  const it = JSON.parse(market[0].item);
  assert.equal(it.thumb, undefined); assert.equal(it.lv, 1); assert.ok(!/[<>]/.test(market[0].item)); assert.deepEqual(Object.keys(it.stats), ['atk']);
  assert.equal(market[1].price, 9999999);
  const wallets = Object.fromEntries((await q('SELECT * FROM wallet')).map((w) => [w.pid, w]));
  assert.equal(wallets[B].gold, 950); assert.ok(!/[<>"]/.test(JSON.parse(wallets[B].sold)[0].name + JSON.parse(wallets[B].sold)[0].buyer));
  assert.equal(wallets[C].gold, 0); assert.equal(wallets[C].sold, '[]');
  const v = await verifyData(q.client, data);
  assert.equal(v.ok, true, JSON.stringify(v));
  // cơ sở dữ liệu đã có dữ liệu: từ chối, không ghi gì thêm
  await assert.rejects(importData(q.client, exportData()), /không rỗng/);
  assert.equal((await q('SELECT COUNT(*) c FROM chat'))[0].c, 3);
  await q.end();
  // máy chủ mở được cơ sở dữ liệu vừa nhập, tin mới và món mới tiếp nối số thứ tự cũ
  const h = await start({ pg });
  const opp = await h.get(`/arena/opponents?pid=${A}`);
  assert.equal(opp.d.list[0].oid, oidOf(B)); assert.equal(opp.d.me, 1016);
  assert.equal((await h.post('/chat', { pid: C, name: 'Gamma', text: 'mới' })).s, 200);
  assert.equal((await h.get('/state?since=7')).d.chat[0].n, 8);
  assert.equal((await h.post('/market/claim', { pid: B })).d.gold, 950);
  assert.equal((await h.post('/market/list', { pid: C, name: 'Gamma', item: { slot: 'ring', name: 'Nhẫn' }, price: 1 })).s, 200);
  assert.deepEqual((await h.q('SELECT lid FROM market ORDER BY lid')).map((r) => r.lid), [3, 4, 5]);
  await h.close();
});

test('importData: lỗi định dạng thì không ghi gì (một giao dịch)', async () => {
  const pg = await freshDb();
  const q = await sql(pg);
  await assert.rejects(importData(q.client, { chat: [], arena: 'x' }), /arena/);
  await assert.rejects(importData(q.client, []), /object/);
  // lỗi giữa giao dịch (sau khi đã chèn vài dòng): ROLLBACK hết
  await q('CREATE TABLE IF NOT EXISTS wallet (pid TEXT PRIMARY KEY, gold BIGINT, sold TEXT)');
  await q('ALTER TABLE wallet ADD CONSTRAINT nho CHECK (gold < 100)');
  await assert.rejects(importData(q.client, exportData()), /nho/);
  for (const t of ['chat', 'arena', 'market', 'wallet']) assert.equal((await q(`SELECT COUNT(*) c FROM ${t}`))[0].c, 0, t);
  await q.end();
});

/** Dữ liệu xuất giống thật: tiếng Việt/Hán/emoji, t > 2^31, hơn 200 tin (bị cắt), tin hệ thống Luận Kiếm, món chợ, ví có danh sách đã bán. */
const realistic = () => {
  const T = 1762500000000; // ms, lớn hơn 2^31 nhiều
  const pid = (i) => `${String(i).padStart(8, '0')}-${'abcd'.repeat(2)}-player`;
  const chat = [];
  for (let n = 3; n <= 260; n++) {
    chat.push(n % 7 === 0
      ? { n, t: T + n * 1000, pid: 'system', name: 'Luận Kiếm', text: `Kiếm Khách ${n} đánh bại Đao Vương trên Luận Kiếm Đài!`, extra: 'arena' }
      : { n, t: T + n * 1000, pid: pid(n % 13), name: n % 2 ? 'Tiêu Dao 劍聖' : 'Mộ Dung 🗡️', text: `Chào giang hồ #${n} — 你好 ✨`, extra: '' });
  }
  // mọi người đều đã từng đấu (wins ≥ 1): máy chủ không dọn họ khi chạy trên dữ liệu này
  const arena = Array.from({ length: 13 }, (_, i) => ({
    pid: pid(i), name: ['Lệnh Hồ', 'Đông Phương', '王重陽', 'Ngọc 🌸'][i % 4] + i, cls: ['kiem', 'thuong', 'dao'][i % 3], level: 10 + i, power: 1000 * i,
    rating: 900 + i * 17, wins: i * 3 + 1, losses: i, t: T + i, oid: i === 2 ? oidOf(pid(2)) : undefined,
    snap: JSON.stringify({ hp: 1000 + i, atk: 50 + i, def: 0.25, crit: 0.1, adv: i, faction: 'Võ Đang', title: 'Kiếm Tiên', weapon: 'Thanh Phong Kiếm' }),
  }));
  const market = Array.from({ length: 9 }, (_, i) => ({
    lid: 40 + i * 3, pid: pid(i), name: 'Người bán ' + i, price: 100 * (i + 1), t: T + 5000 + i,
    item: JSON.stringify({ slot: ['weapon', 'ring', 'armor'][i % 3], base: 'Huyền Thiết', name: 'Huyền Thiết Kiếm 玄鐵劍 ' + i, rarity: i % 5, lv: 10 + i, stats: { atk: 30 + i, crit: 0.05 }, enh: i, han: '劍', gems: ['gem_ruby_1'], thumb: 'assets/icons/sword.png' }),
  }));
  const wallet = Array.from({ length: 5 }, (_, i) => ({
    pid: pid(i), gold: 95 * (i + 1) * 1000,
    sold: JSON.stringify(Array.from({ length: i * 6 }, (_, j) => ({ name: 'Ngọc Bội ' + j, price: 1000 + j, buyer: 'Khách 客 ' + j }))),
  }));
  return { chat, arena, market, wallet };
};

test('nhập + --verify trên dữ liệu giống thật: khớp từng dòng; sửa một dòng thì verify chỉ ra (không lộ pid)', async () => {
  const pg = await freshDb();
  const q = await sql(pg);
  const data = realistic();
  const counts = await importData(q.client, data);
  assert.deepEqual(counts.chat, { in: 258, imported: 200, skipped: 58, reasons: { trimmed: 58 } });
  assert.equal(counts.arena.imported, 13); assert.equal(counts.market.imported, 9); assert.equal(counts.wallet.imported, 5);
  const v = await verifyData(q.client, data);
  assert.equal(v.ok, true, JSON.stringify(v));
  // giá trị giữ nguyên: n, t lớn, chữ unicode, danh sách đã bán (tối đa 20 phần tử cuối)
  const [c] = await q('SELECT * FROM chat WHERE n=$1', 257);
  assert.deepEqual(c, { n: 257, t: 1762500257000, pid: data.chat.find((r) => r.n === 257).pid, name: 'Tiêu Dao 劍聖', text: 'Chào giang hồ #257 — 你好 ✨', extra: '' });
  assert.equal((await q("SELECT COUNT(*) c FROM chat WHERE extra='arena' AND pid='system'"))[0].c, data.chat.filter((r) => r.extra === 'arena' && r.n > 60).length);
  const w4 = (await q('SELECT sold FROM wallet WHERE pid=$1', data.wallet[4].pid))[0];
  assert.equal(JSON.parse(w4.sold).length, 20); assert.equal(JSON.parse(w4.sold)[19].buyer, 'Khách 客 23');
  // bộ đếm: tin mới n = lớn nhất + 1, món mới lid = lớn nhất + 1
  const h = await start({ pg });
  await h.post('/chat', { pid: data.arena[0].pid, name: 'Mới', text: 'tin mới' });
  assert.deepEqual((await h.get('/state?since=260')).d.chat.map((m) => m.n), [261]);
  assert.equal((await h.post('/market/list', { pid: 'zzzzzzzz-9999', name: 'Z', item: { slot: 'ring', name: 'Nhẫn' }, price: 1 })).s, 200);
  assert.equal((await h.q('SELECT MAX(lid) m FROM market'))[0].m, 40 + 8 * 3 + 1);
  await h.close();
  // sửa tay một dòng / thêm một dòng / xoá một dòng: verify báo sai lệch và chỉ dòng bằng n, lid hoặc oid
  const fresh = await verifyData(q.client, data);
  assert.equal(fresh.ok, false); // đã có tin/món mới
  // tin 261 mới thêm, máy chủ cắt tin 61 (chỉ giữ 200 số cuối)
  assert.deepEqual(fresh.tables.chat, { expected: 200, found: 200, missing: 1, extra: 1, differ: 0, first: 'n=61' });
  await q('DELETE FROM chat WHERE n=261'); await q('DELETE FROM market WHERE lid=65');
  await q('UPDATE arena SET rating=rating+1 WHERE pid=$1', data.arena[5].pid);
  await q('DELETE FROM wallet WHERE pid=$1', data.wallet[1].pid);
  const bad = await verifyData(q.client, data);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.tables.arena, { expected: 13, found: 13, missing: 0, extra: 0, differ: 1, first: 'oid=' + oidOf(data.arena[5].pid) });
  assert.deepEqual(bad.tables.wallet, { expected: 5, found: 4, missing: 1, extra: 0, differ: 0, first: 'oid=' + oidOf(data.wallet[1].pid) });
  assert.deepEqual(bad.tables.chat, { expected: 200, found: 199, missing: 1, extra: 0, differ: 0, first: 'n=61' });
  assert.deepEqual(bad.tables.market, { expected: 9, found: 9, missing: 0, extra: 0, differ: 0 }); // lid 65 là món mới đã xoá
  assert.ok(!JSON.stringify(bad).includes('player'), 'không lộ pid');
  await q.end();
});

test('bộ đếm SQLite trong bản xuất (seq): mã món đã bán trước khi xuất không bị dùng lại', async () => {
  const pg = await freshDb();
  const q = await sql(pg);
  const data = { ...realistic(), seq: [{ name: 'market', seq: 500 }, { name: 'chat', seq: 100 }, { name: 'x', seq: 'bad' }] };
  await importData(q.client, data);
  const h = await start({ pg });
  assert.equal((await h.post('/market/list', { pid: 'zzzzzzzz-9999', name: 'Z', item: { slot: 'ring', name: 'Nhẫn' }, price: 1 })).s, 200);
  assert.equal((await h.q('SELECT MAX(lid) m FROM market'))[0].m, 501, 'lid tiếp sau bộ đếm cũ (500), không phải 65');
  await h.post('/chat', { pid: data.arena[0].pid, name: 'Mới', text: 'tin mới' });
  assert.deepEqual((await h.get('/state?since=260')).d.chat.map((m) => m.n), [261], 'chat: lớn nhất + 1 khi lớn hơn bộ đếm');
  await h.close();
  await q.end();
});

test('prepare: trùng khoá giữ dòng đầu, số quá lớn bị bỏ, oid trong tệp không được tin', () => {
  const { rows, counts } = prepare({
    chat: [{ n: 1, t: 1, pid: A, text: 'a' }, { n: 1, t: 2, pid: B, text: 'b' }, { n: 1e300, t: 1, pid: A, text: 'x' }, { n: 2, t: 1e300, pid: A, text: 'x' }],
    arena: [{ pid: A, oid: 'gia-mao', snap: '{}', t: 1 }],
  });
  assert.deepEqual(rows.chat.map((r) => r.text), ['a']);
  assert.deepEqual(counts.chat.reasons, { duplicate: 1, n: 1, t: 1 });
  assert.equal(rows.arena[0].oid, oidOf(A));
});

test('import.mjs dòng lệnh: in số đếm (không pid), --verify, mã lỗi khi db không rỗng, thiếu cờ thì không chạm db', async () => {
  const pg = await freshDb();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hk-import-')), 'export.json');
  fs.writeFileSync(file, JSON.stringify(realistic()));
  const env = { ...process.env, PGDATABASE: pg.database };
  const cli = (...args) => run(process.execPath, [path.join(dir, '..', 'import.mjs'), ...args], { env, encoding: 'utf8' });
  const tables = async () => { const q = await sql(pg); try { return (await q("SELECT COUNT(*) c FROM pg_tables WHERE schemaname='public'"))[0].c; } finally { await q.end(); } };
  // thiếu cờ xác nhận đã dừng máy chủ: in cảnh báo, mã 2, không chạm vào cơ sở dữ liệu
  await assert.rejects(cli(file), (e) => e.code === 2 && /dừng máy chủ/.test(e.stderr) && /--i-stopped-the-server/.test(e.stderr));
  await assert.rejects(cli('--i-stopped-the-server', file, 'thừa'), (e) => e.code === 2);
  await assert.rejects(cli('--i-stopped-the-server', '--lạ', file), (e) => e.code === 2);
  assert.equal(await tables(), 0, 'không tạo bảng khi thiếu cờ');
  // PGPASSWORD trong môi trường không được dùng (chỉ tệp)
  await assert.rejects(run(process.execPath, [path.join(dir, '..', 'import.mjs'), '--i-stopped-the-server', file], { env: { ...env, PGPASSWORD_FILE: '/khong/co', PGPASSWORD: 'x' }, encoding: 'utf8' }),
    (e) => e.code === 1 && /PGPASSWORD_FILE=\/khong\/co/.test(e.stderr));
  const { stdout } = await cli('--i-stopped-the-server', '--verify', file);
  const [json, verify] = [stdout.slice(0, stdout.lastIndexOf('}') + 1), stdout.slice(stdout.lastIndexOf('}') + 1).trim()];
  const out = JSON.parse(json);
  assert.equal(out.arena.imported, 13); assert.equal(out.chat.reasons.trimmed, 58); assert.equal(out.db, `${pg.user}@${pg.host}:${pg.port}/${pg.database}`);
  assert.equal(verify, 'verify: ok');
  assert.ok(!stdout.includes('-player'), 'không in pid');
  await assert.rejects(cli('--i-stopped-the-server', file), (e) => e.code === 1 && /không rỗng/.test(e.stderr));
  // cờ đặt sau tên tệp cũng nhận
  await assert.rejects(cli(file, '--i-stopped-the-server'), (e) => e.code === 1 && /không rỗng/.test(e.stderr));
});
