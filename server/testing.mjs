// Tiện ích chung cho các bài kiểm tra (test/*.test.mjs): dựng máy chủ thật trên cổng ngẫu nhiên, gọi HTTP và WS.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { createServer } from './server.mjs';

export const tmpDb = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hk-online-')), 'w.sqlite');

const open = new Set();
/** Dọn mọi máy chủ còn mở (kể cả khi bài kiểm tra hỏng giữa chừng). */
export const closeAll = () => Promise.all([...open].map((h) => h.close()));

export async function start(opt = {}) {
  const h = createServer(opt);
  open.add(h);
  const close = h.close;
  h.close = () => { open.delete(h); return close(); };
  await new Promise((r) => h.server.listen(0, '127.0.0.1', r));
  h.port = h.server.address().port;
  h.url = `http://127.0.0.1:${h.port}`;
  const req = (p, init = {}, ip) => fetch(h.url + p, { ...init, headers: { ...(init.headers || {}), ...(ip ? { 'cf-connecting-ip': ip } : {}) } })
    .then(async (r) => ({ s: r.status, d: await r.json().catch(() => null), cors: r.headers.get('access-control-allow-origin') }));
  h.get = (p, ip) => req(p, {}, ip);
  h.post = (p, body, ip) => req(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }, ip);
  h.raw = (p, init) => fetch(h.url + p, init);
  return h;
}

/** Mọi khung WS mà máy khách nhận được (để kiểm tra không lộ pid). */
export const frames = [];

/** Kết nối WS; trả về {ws, next(pred), msgs, closed}. */
export function connect(h, { origin = h.url, ip, headers = {}, ...opts } = {}) {
  const ws = new WebSocket(`ws://127.0.0.1:${h.port}/ws`, { origin, headers: { ...(ip ? { 'cf-connecting-ip': ip } : {}), ...headers }, ...opts });
  const msgs = [], waiters = [], seen = new WeakSet();
  const c = { ws, msgs };
  c.closed = new Promise((resolve) => ws.on('close', (code, reason) => resolve({ code, reason: String(reason) })));
  c.opened = new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('unexpected-response', (_q, res) => reject(Object.assign(new Error('http ' + res.statusCode), { status: res.statusCode })));
    ws.on('error', reject);
  });
  c.opened.catch(() => {});
  ws.on('message', (data) => {
    const s = String(data); frames.push(s);
    const m = JSON.parse(s); msgs.push(m);
    for (const w of [...waiters]) if (w.pred(m)) { waiters.splice(waiters.indexOf(w), 1); clearTimeout(w.t); w.resolve(m); break; }
  });
  c.next = (pred = () => true, ms = 2000) => {
    const hit = msgs.find((m) => pred(m) && !seen.has(m));
    if (hit) { seen.add(hit); return Promise.resolve(hit); }
    return new Promise((resolve, reject) => {
      const w = { pred, resolve: (m) => { seen.add(m); resolve(m); } };
      w.t = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); reject(new Error('timeout waiting for message; got ' + JSON.stringify(msgs))); }, ms);
      waiters.push(w);
    });
  };
  c.send = (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m));
  /** Kết nối + chào, chờ trạng thái đầu. */
  c.hello = async (pid, since = 0) => { await c.opened; c.send({ t: 'hello', pid, since }); return c.next((m) => m.t === 'state'); };
  return c;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
