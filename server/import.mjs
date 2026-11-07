/**
 * Nhập một lần dữ liệu xuất từ Durable Object vào cơ sở dữ liệu PostgreSQL MỚI (rỗng).
 *   node import.mjs --i-stopped-the-server [--verify] <export.json>
 * Kết nối lấy từ PGHOST, PGPORT, PGDATABASE, PGUSER và tệp mật khẩu PGPASSWORD_FILE (như máy chủ).
 * PHẢI dừng máy chủ (container) trước, nên bắt buộc có cờ xác nhận. Trong giao dịch nhập các bảng bị khoá độc quyền.
 * export.json: {arena:[...], chat:[...], market:[...], wallet:[...]}, mỗi dòng là SELECT * của bảng tương ứng.
 * Mọi dòng được kiểm tra/làm sạch theo đúng luật của máy chủ (cùng luật dọn dữ liệu cũ của bản SQLite); dòng hỏng bị
 * bỏ và được đếm theo lý do. Tất cả trong một giao dịch; xong thì đặt lại bộ đếm n/lid = lớn nhất + 1.
 * --verify: nhập xong đọc lại mọi bảng và so từng dòng với dữ liệu xuất (sau cùng bước làm sạch).
 * Chỉ in số đếm, không bao giờ in mã người chơi (pid); dòng sai lệch được chỉ bằng n, lid hoặc mã công khai oid.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { clip, okId, int, oidOf, safeItem, cleanSold, cleanSnap } from './world.mjs';
import { createSchema, connectClient, pgConfig, describe } from './db.mjs';

const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));
/** Số nguyên (bỏ phần lẻ) vừa BIGINT và vừa số JS an toàn; không thì null. */
const whole = (v) => { const x = Math.trunc(Number(v)); return Number.isSafeInteger(x) ? x : null; };
const PRICE = 9999999;
export const IMPORT_TABLES = ['chat', 'arena', 'market', 'wallet'];
// cột và khoá chính của từng bảng (tên bảng/cột chỉ từ hằng này)
const COLS = {
  chat: ['n', 't', 'pid', 'name', 'text', 'extra'],
  arena: ['pid', 'oid', 'name', 'cls', 'level', 'power', 'rating', 'wins', 'losses', 'snap', 't'],
  market: ['lid', 'pid', 'name', 'item', 'price', 't'],
  wallet: ['pid', 'gold', 'sold'],
};
const KEY = { chat: 'n', arena: 'pid', market: 'lid', wallet: 'pid' };
const INSERT = Object.fromEntries(IMPORT_TABLES.map((t) => [t, `INSERT INTO ${t} (${COLS[t].join(',')}) VALUES (${COLS[t].map((_, i) => '$' + (i + 1)).join(',')})`]));
const SELECT = Object.fromEntries(IMPORT_TABLES.map((t) => [t, `SELECT ${COLS[t].join(',')} FROM ${t} ORDER BY ${KEY[t]}`]));
/** Chỉ dòng để in: n/lid giữ nguyên, pid thì đổi thành mã công khai (không lộ mã người chơi). */
const label = (t, r) => (KEY[t] === 'pid' ? 'oid=' + oidOf(String(r.pid)) : `${KEY[t]}=${r[KEY[t]]}`);

// mỗi bảng: trả về dòng đã làm sạch (object theo COLS), hoặc chuỗi lý do bỏ
const CLEAN = {
  chat(r) {
    if (!num(r.n) || +r.n < 1) return 'n';
    const n = whole(r.n), t = num(r.t) ? whole(r.t) : null;
    if (n === null) return 'n';
    if (t === null) return 't';
    const sys = r.pid === 'system';
    if (!sys && !okId(r.pid)) return 'pid';
    const text = clip(r.text, 140).trim();
    if (!text) return 'empty';
    // chỉ tin hệ thống mới được gắn cờ (như máy chủ đặt)
    return { n, t, pid: r.pid, name: clip(r.name, 16), text, extra: sys && r.extra === 'arena' ? 'arena' : '' };
  },
  arena(r) {
    if (!okId(r.pid)) return 'pid';
    const t = num(r.t) ? whole(r.t) : null;
    if (t === null) return 't';
    let snap; try { snap = typeof r.snap === 'string' ? JSON.parse(r.snap) : r.snap; } catch { return 'snap'; }
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return 'snap';
    const s = cleanSnap(snap);
    if (s.length > 600) return 'big';
    // oid luôn tính lại từ pid (cùng công thức worker.js), không tin giá trị trong tệp
    return { pid: r.pid, oid: oidOf(r.pid), name: clip(r.name, 16), cls: clip(r.cls, 10), level: +r.level | 0, power: +r.power | 0,
      rating: num(r.rating) ? int(r.rating, -1e6, 1e6) : 1000, wins: int(r.wins, 0, 1e9), losses: int(r.losses, 0, 1e9), snap: s, t };
  },
  market(r) {
    if (!num(r.lid) || +r.lid < 1 || whole(r.lid) === null) return 'lid';
    if (!okId(r.pid)) return 'pid';
    const it = typeof r.item === 'string' ? safeItem(r.item) : safeItem(JSON.stringify(r.item ?? null));
    if (!it) return 'item';
    const item = JSON.stringify(it);
    if (item.length > 800) return 'big';
    const t = num(r.t) ? whole(r.t) : 0;
    if (t === null) return 't';
    return { lid: whole(r.lid), pid: r.pid, name: clip(r.name, 16), item, price: Math.max(1, Math.min(PRICE, +r.price | 0)), t };
  },
  wallet(r) {
    if (!okId(r.pid)) return 'pid';
    let sold = []; try { sold = typeof r.sold === 'string' ? JSON.parse(r.sold || '[]') : r.sold ?? []; } catch { sold = []; }
    return { pid: r.pid, gold: int(r.gold, 0, Number.MAX_SAFE_INTEGER), sold: JSON.stringify(cleanSold(sold).slice(-20)) };
  },
};

/**
 * Làm sạch dữ liệu xuất (không chạm cơ sở dữ liệu). Ném lỗi nếu sai định dạng.
 * Trả về {rows: {bảng: [dòng]}, counts: {bảng: {in, imported, skipped, reasons}}}.
 * Trùng khoá chính: giữ dòng đầu. Kênh thế giới: chỉ giữ 200 số thứ tự cuối như máy chủ (n > lớn nhất - 200).
 */
export function prepare(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('export phải là object {arena, chat, market, wallet}');
  const input = {};
  for (const t of IMPORT_TABLES) { const r = data[t] ?? []; if (!Array.isArray(r)) throw new Error(`${t} phải là mảng`); input[t] = r; }
  const rows = {}, counts = {};
  for (const t of IMPORT_TABLES) {
    const c = (counts[t] = { in: input[t].length, imported: 0, skipped: 0, reasons: {} });
    const skip = (why) => { c.skipped++; c.reasons[why] = (c.reasons[why] || 0) + 1; };
    const seen = new Set(), out = [];
    for (const r of input[t]) {
      const x = r && typeof r === 'object' && !Array.isArray(r) ? CLEAN[t](r) : 'row';
      if (typeof x === 'string') { skip(x); continue; }
      if (seen.has(x[KEY[t]])) { skip('duplicate'); continue; }
      seen.add(x[KEY[t]]); out.push(x);
    }
    rows[t] = out;
  }
  if (rows.chat.length) {
    const max = rows.chat.reduce((m, r) => Math.max(m, r.n), 0); // không dùng ...spread: mảng rất dài vượt giới hạn tham số
    const keep = rows.chat.filter((r) => r.n > max - 200), trimmed = rows.chat.length - keep.length;
    if (trimmed) { counts.chat.skipped += trimmed; counts.chat.reasons.trimmed = trimmed; }
    rows.chat = keep;
  }
  for (const t of IMPORT_TABLES) counts[t].imported = rows[t].length;
  return { rows, counts };
}

/** Nhập dữ liệu (object đã đọc) qua kết nối c (pg.Client). Trả về số đếm từng bảng. Ném lỗi nếu cơ sở dữ liệu không rỗng. */
export async function importData(c, data) {
  const { rows, counts } = prepare(data); // kiểm tra định dạng trước khi mở giao dịch
  await createSchema(c);
  await c.query('BEGIN');
  try {
    // khoá độc quyền: nếu máy chủ lỡ còn chạy thì nó phải chờ/báo lỗi chứ không ghi xen vào
    await c.query('LOCK TABLE chat, arena, market, wallet IN ACCESS EXCLUSIVE MODE');
    for (const t of IMPORT_TABLES) {
      if ((await c.query(`SELECT COUNT(*) c FROM ${t}`)).rows[0].c) throw new Error(`cơ sở dữ liệu không rỗng (bảng ${t})`);
    }
    for (const t of IMPORT_TABLES) for (const r of rows[t]) await c.query(INSERT[t], COLS[t].map((k) => r[k]));
    // n/lid đã chỉ định tay: bộ đếm tự tăng tiếp nối từ lớn nhất + 1 (bảng rỗng thì từ 1)
    await c.query("SELECT setval(pg_get_serial_sequence('chat', 'n'), COALESCE(MAX(n), 0) + 1, false) FROM chat");
    await c.query("SELECT setval(pg_get_serial_sequence('market', 'lid'), COALESCE(MAX(lid), 0) + 1, false) FROM market");
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  return counts;
}

/**
 * Đọc lại các bảng và so từng dòng với dữ liệu xuất đã làm sạch.
 * Trả về {ok, tables: {bảng: {expected, found, missing, extra, differ, first?}}}; first chỉ là n/lid/oid.
 */
export async function verifyData(c, data) {
  const { rows } = prepare(data);
  const tables = {};
  let ok = true;
  for (const t of IMPORT_TABLES) {
    const got = new Map((await c.query(SELECT[t])).rows.map((r) => [r[KEY[t]], r]));
    const v = (tables[t] = { expected: rows[t].length, found: got.size, missing: 0, extra: 0, differ: 0 });
    const bad = (r) => { ok = false; v.first ??= label(t, r); };
    for (const r of rows[t]) {
      const g = got.get(r[KEY[t]]);
      if (!g) { v.missing++; bad(r); continue; }
      got.delete(r[KEY[t]]);
      if (COLS[t].some((k) => g[k] !== r[k])) { v.differ++; bad(r); }
    }
    for (const g of got.values()) { v.extra++; bad(g); }
  }
  return { ok, tables };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const FLAG = '--i-stopped-the-server', VERIFY = '--verify';
  const argv = process.argv.slice(2);
  const files = argv.filter((a) => !a.startsWith('--'));
  const unknown = argv.filter((a) => a.startsWith('--') && a !== FLAG && a !== VERIFY);
  if (files.length !== 1 || unknown.length || !argv.includes(FLAG)) {
    console.error([
      'dùng: node import.mjs --i-stopped-the-server [--verify] <export.json>',
      '  kết nối: PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD_FILE (mặc định /run/secrets/pg_password)',
      'CẢNH BÁO: dừng máy chủ trực tuyến (container) trước khi nhập. Nhập trong lúc máy chủ đang chạy có thể làm',
      'yêu cầu của người chơi lỗi hoặc trộn lẫn dữ liệu. Chỉ nhập vào cơ sở dữ liệu rỗng; cờ --i-stopped-the-server',
      'xác nhận đã dừng máy chủ.',
    ].join('\n'));
    process.exit(2);
  }
  let c;
  try {
    const data = JSON.parse(fs.readFileSync(files[0], 'utf8'));
    const cfg = pgConfig();
    c = await connectClient(cfg);
    const counts = await importData(c, data);
    console.log(JSON.stringify({ db: describe(cfg), ...counts }, null, 2));
    if (argv.includes(VERIFY)) {
      const v = await verifyData(c, data);
      if (v.ok) console.log('verify: ok');
      else { console.log('verify: SAI LỆCH\n' + JSON.stringify(v.tables, null, 2)); process.exitCode = 1; }
    }
  } catch (e) {
    console.error('nhập thất bại:', e.message);
    process.exitCode = 1;
  } finally { await c?.end().catch(() => {}); }
}
