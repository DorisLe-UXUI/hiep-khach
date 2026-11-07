// import.mjs: nhập dữ liệu xuất từ Durable Object vào cơ sở dữ liệu rỗng, làm sạch từng dòng, đếm dòng bị bỏ.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { importData } from '../import.mjs';
import { oidOf } from '../world.mjs';
import { start, tmpDb, closeAll } from '../testing.mjs';

after(closeAll);
const A = 'aaaaaaaa-1111', B = 'bbbbbbbb-2222', C = 'cccccccc-3333';
const dir = path.dirname(fileURLToPath(import.meta.url));

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

test('importData: đếm, làm sạch, điền oid, dùng được ngay qua HTTP', async () => {
  const dbPath = tmpDb();
  const db = new DatabaseSync(dbPath);
  const counts = importData(db, exportData());
  assert.deepEqual(counts, {
    chat: { ok: 3, skipped: 4, kept: 3 }, arena: { ok: 2, skipped: 3 }, market: { ok: 2, skipped: 2 }, wallet: { ok: 2, skipped: 1 },
  });
  const chat = db.prepare('SELECT * FROM chat ORDER BY n').all();
  assert.deepEqual(chat.map((r) => [r.n, r.extra]), [[5, ''], [6, 'arena'], [7, '']]);
  assert.equal(chat[0].name, 'Alphascript'); assert.equal(chat[0].text, 'xin chào b');
  const arena = db.prepare('SELECT * FROM arena ORDER BY pid').all();
  assert.equal(arena[0].oid, oidOf(A)); assert.equal(arena[1].oid, oidOf(B));
  assert.deepEqual(JSON.parse(arena[0].snap), { hp: 100, atk: 10, def: 0.7, crit: 0, adv: 0, faction: '', title: '', weapon: '' });
  assert.equal(JSON.parse(arena[1].snap).title, 'img'); assert.equal(arena[1].name, 'Beta');
  const market = db.prepare('SELECT * FROM market ORDER BY lid').all();
  assert.deepEqual(market.map((r) => r.lid), [3, 4]);
  const it = JSON.parse(market[0].item);
  assert.equal(it.thumb, undefined); assert.equal(it.lv, 1); assert.ok(!/[<>]/.test(market[0].item)); assert.deepEqual(Object.keys(it.stats), ['atk']);
  assert.equal(market[1].price, 9999999);
  const wallets = Object.fromEntries(db.prepare('SELECT * FROM wallet').all().map((w) => [w.pid, w]));
  assert.equal(wallets[B].gold, 950); assert.ok(!/[<>"]/.test(JSON.parse(wallets[B].sold)[0].name + JSON.parse(wallets[B].sold)[0].buyer));
  assert.equal(wallets[C].gold, 0); assert.equal(wallets[C].sold, '[]');
  // cơ sở dữ liệu đã có dữ liệu: từ chối, không ghi gì thêm
  assert.throws(() => importData(db, exportData()), /không rỗng/);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM chat').get().c, 3);
  db.close();
  // máy chủ mở được cơ sở dữ liệu vừa nhập, tin mới tiếp nối số thứ tự cũ
  const h = await start({ dbPath });
  const opp = await h.get(`/arena/opponents?pid=${A}`);
  assert.equal(opp.d.list[0].oid, oidOf(B)); assert.equal(opp.d.me, 1016);
  assert.equal((await h.post('/chat', { pid: C, name: 'Gamma', text: 'mới' })).s, 200);
  assert.equal((await h.get('/state?since=7')).d.chat[0].n, 8);
  assert.equal((await h.post('/market/claim', { pid: B })).d.gold, 950);
  await h.close();
});

test('importData: lỗi định dạng thì không ghi gì (một giao dịch)', () => {
  const db = new DatabaseSync(':memory:');
  assert.throws(() => importData(db, { chat: [], arena: 'x' }), /arena/);
  assert.throws(() => importData(db, []), /object/);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM chat').get().c, 0);
  db.close();
});

test('import.mjs dòng lệnh: in số đếm, mã lỗi khi db không rỗng', () => {
  const dbPath = tmpDb();
  const file = path.join(path.dirname(dbPath), 'export.json');
  fs.writeFileSync(file, JSON.stringify(exportData()));
  const run = () => execFileSync(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(dir, '..', 'import.mjs'), file, dbPath], { encoding: 'utf8', stdio: 'pipe' });
  const out = JSON.parse(run());
  assert.equal(out.arena.ok, 2); assert.equal(out.chat.skipped, 4); assert.equal(out.db, dbPath);
  assert.throws(run, (e) => e.status === 1 && /không rỗng/.test(e.stderr));
});
