// Nhịp kết nối lại WebSocket phía trình duyệt (src/game/ws_retry.js). Chạy: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { WsRetry, WS_STABLE, WS_MAX_WAIT } from '../src/game/ws_retry.js';

test('máy chủ nhận rồi đóng ngay: thời gian chờ tăng dần, không lặp mỗi 1 giây', () => {
  const r = new WsRetry(() => 1); // không nhiễu: chờ đúng 2^n
  const waits = [];
  for (let i = 0; i < 8; i++) { r.live(0.2); waits.push(r.drop()); } // chào xong rồi bị đóng sau 0,2 giây
  assert.deepEqual(waits, [1, 2, 4, 8, 16, 32, 60, 60]);
  for (let i = 0; i < 20; i++) r.drop();
  assert.equal(r.drop(), WS_MAX_WAIT);
});

test('socket sống đủ 30 giây thì lần rớt sau thử lại sớm', () => {
  const r = new WsRetry(() => 1);
  for (let i = 0; i < 5; i++) r.drop();
  for (let t = 0; t < WS_STABLE - 1; t++) r.live(1);
  assert.equal(r.tries, 5, 'chưa đủ 30 giây: giữ nguyên');
  r.live(1);
  assert.equal(r.tries, 0);
  assert.equal(r.drop(), 1);
  // thời gian sống tính lại từ đầu sau mỗi lần rớt
  r.live(20); assert.equal(r.drop(), 2);
  r.live(20); assert.equal(r.drop(), 4);
});

test('nhiễu: chờ trong [50%, 100%]; reset (quay lại trang) thử lại từ đầu', () => {
  const r = new WsRetry(() => 0);
  r.drop(); r.drop();
  assert.equal(r.drop(), 2); // 4 * 0,5
  r.reset();
  assert.equal(r.tries, 0);
});

test('socket rớt: hỏi định kỳ sau 1–6 giây ngẫu nhiên, không kéo dài hạn đang có', () => {
  assert.equal(new WsRetry(() => 0).pollAfterDrop(6), 1);
  assert.equal(new WsRetry(() => 0.999999).pollAfterDrop(30).toFixed(3), '6.000');
  assert.equal(new WsRetry(() => 0.5).pollAfterDrop(2), 2);
  const r = new WsRetry();
  const xs = Array.from({ length: 2000 }, () => r.pollAfterDrop(100));
  assert.ok(xs.every((x) => x >= 1 && x < 6));
  assert.ok(Math.max(...xs) - Math.min(...xs) > 4, 'phân tán đủ rộng');
});
