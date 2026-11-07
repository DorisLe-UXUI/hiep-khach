/**
 * Nhập một lần dữ liệu xuất từ Durable Object vào cơ sở dữ liệu MỚI (rỗng).
 *   node import.mjs --i-stopped-the-server <export.json> [đường dẫn db]   (mặc định DB_PATH hoặc /data/world.sqlite)
 * PHẢI dừng máy chủ (container) trước: không phát hiện được tiến trình khác đang mở cùng tệp, nên bắt buộc có cờ xác nhận.
 * export.json: {arena:[...], chat:[...], market:[...], wallet:[...]}, mỗi dòng là SELECT * của bảng tương ứng.
 * Mọi dòng được kiểm tra/làm sạch theo đúng luật của máy chủ; dòng hỏng bị bỏ và được đếm. Tất cả trong một giao dịch.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { World, clip, okId, int, safeItem, cleanSold, cleanSnap } from './world.mjs';
import { openDb } from './server.mjs';

const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v));
const PRICE = 9999999;
const TABLES = ['chat', 'arena', 'market', 'wallet'];

/** Nhập dữ liệu (object đã đọc) vào db. Trả về {table: {ok, skipped}}. Ném lỗi nếu db không rỗng. */
export function importData(db, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('export phải là object {arena, chat, market, wallet}');
  const world = new World(db); // tạo bảng, chỉ mục, cột oid
  for (const t of TABLES) if (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c) throw new Error(`cơ sở dữ liệu không rỗng (bảng ${t})`);
  const counts = Object.fromEntries(TABLES.map((t) => [t, { ok: 0, skipped: 0 }]));
  const rows = (t) => { const r = data[t] ?? []; if (!Array.isArray(r)) throw new Error(`${t} phải là mảng`); return r; };
  const ins = {
    chat: db.prepare('INSERT INTO chat (n,t,pid,name,text,extra) VALUES (?,?,?,?,?,?)'),
    arena: db.prepare('INSERT INTO arena (pid,oid,name,cls,level,power,rating,wins,losses,snap,t) VALUES (?,NULL,?,?,?,?,?,?,?,?,?)'),
    market: db.prepare('INSERT INTO market (lid,pid,name,item,price,t) VALUES (?,?,?,?,?,?)'),
    wallet: db.prepare('INSERT INTO wallet (pid,gold,sold) VALUES (?,?,?)'),
  };
  // mỗi bảng: hàm trả về tham số chèn, hoặc null nếu dòng hỏng
  const clean = {
    chat(r) {
      if (!num(r.n) || +r.n < 1 || !num(r.t)) return null;
      const sys = r.pid === 'system';
      if (!sys && !okId(r.pid)) return null;
      const text = clip(r.text, 140).trim();
      if (!text) return null;
      // chỉ tin hệ thống mới được gắn cờ (như máy chủ đặt)
      return [Math.trunc(+r.n), Math.trunc(+r.t), r.pid, clip(r.name, 16), text, sys && r.extra === 'arena' ? 'arena' : ''];
    },
    arena(r) {
      if (!okId(r.pid) || !num(r.t)) return null;
      let snap; try { snap = typeof r.snap === 'string' ? JSON.parse(r.snap) : r.snap; } catch { return null; }
      if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return null;
      const s = cleanSnap(snap);
      if (s.length > 600) return null;
      return [r.pid, clip(r.name, 16), clip(r.cls, 10), +r.level | 0, +r.power | 0, num(r.rating) ? int(r.rating, -1e6, 1e6) : 1000, int(r.wins, 0, 1e9), int(r.losses, 0, 1e9), s, Math.trunc(+r.t)];
    },
    market(r) {
      if (!num(r.lid) || +r.lid < 1 || !okId(r.pid)) return null;
      const it = typeof r.item === 'string' ? safeItem(r.item) : safeItem(JSON.stringify(r.item ?? null));
      if (!it) return null;
      const item = JSON.stringify(it);
      if (item.length > 800) return null;
      return [Math.trunc(+r.lid), r.pid, clip(r.name, 16), item, Math.max(1, Math.min(PRICE, +r.price | 0)), num(r.t) ? Math.trunc(+r.t) : 0];
    },
    wallet(r) {
      if (!okId(r.pid)) return null;
      let sold = []; try { sold = typeof r.sold === 'string' ? JSON.parse(r.sold || '[]') : r.sold ?? []; } catch { sold = []; }
      return [r.pid, int(r.gold, 0, Number.MAX_SAFE_INTEGER), JSON.stringify(cleanSold(sold).slice(-20))];
    },
  };
  // kiểm tra định dạng trước khi mở giao dịch
  const input = Object.fromEntries(TABLES.map((t) => [t, rows(t)]));
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const t of TABLES) {
      for (const r of input[t]) {
        const a = r && typeof r === 'object' && !Array.isArray(r) ? clean[t](r) : null;
        if (!a) { counts[t].skipped++; continue; }
        try { ins[t].run(...a); counts[t].ok++; } catch { counts[t].skipped++; } // trùng khoá chính
      }
    }
    // giữ 200 tin gần nhất như máy chủ
    db.exec('DELETE FROM chat WHERE n <= (SELECT MAX(n) FROM chat) - 200');
    world.fillOids();
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  counts.chat.kept = db.prepare('SELECT COUNT(*) c FROM chat').get().c;
  return counts;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const FLAG = '--i-stopped-the-server';
  const argv = process.argv.slice(2);
  const [file, dbArg] = argv.filter((a) => a !== FLAG);
  if (!file || !argv.includes(FLAG)) {
    console.error([
      'dùng: node import.mjs --i-stopped-the-server <export.json> [db]',
      'CẢNH BÁO: dừng máy chủ trực tuyến (container) trước khi nhập. Nhập trong lúc máy chủ đang mở cùng tệp cơ sở dữ liệu',
      'có thể ghi đè hoặc trộn lẫn dữ liệu. Chỉ nhập vào cơ sở dữ liệu rỗng; cờ --i-stopped-the-server xác nhận đã dừng máy chủ.',
    ].join('\n'));
    process.exit(2);
  }
  const dbPath = dbArg || process.env.DB_PATH || '/data/world.sqlite';
  const db = openDb(dbPath);
  try {
    const counts = importData(db, JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(JSON.stringify({ db: dbPath, ...counts }, null, 2));
  } catch (e) {
    console.error('nhập thất bại:', e.message);
    process.exitCode = 1;
  } finally { db.close(); }
}
