/**
 * Nhịp kết nối lại WebSocket của kênh trực tuyến (tách riêng để kiểm thử bằng node, không phụ thuộc trình duyệt).
 * - Chờ tăng dần 1, 2, 4… giây (tối đa 60) có nhiễu.
 * - Số lần thử chỉ về 0 khi socket đã sống liên tục STABLE giây: máy chủ nhận rồi đóng ngay không gây vòng lặp 1 giây.
 * - Socket rớt: hỏi định kỳ /state sau 1–6 giây ngẫu nhiên (máy chủ khởi động lại không bị mọi người hỏi cùng lúc).
 */
export const WS_MAX_WAIT = 60, WS_STABLE = 30;

export class WsRetry {
  constructor(rnd = Math.random) {
    this.rnd = rnd;
    this.tries = 0; // số lần kết nối lại liên tiếp
    this.up = 0; // socket đã sống (đã chào xong) bao lâu, giây
  }
  /** Gọi mỗi khung khi socket đang sống. */
  live(dt) {
    this.up += dt;
    if (this.up >= WS_STABLE) this.tries = 0;
  }
  /** Socket rớt hoặc mở thất bại: trả về số giây chờ trước lần thử sau. */
  drop() {
    this.up = 0;
    const wait = Math.min(WS_MAX_WAIT, 2 ** this.tries);
    this.tries = Math.min(this.tries + 1, 10);
    return wait * (0.5 + this.rnd() * 0.5);
  }
  /** Người chơi quay lại trang: thử lại ngay từ đầu. */
  reset() { this.tries = 0; this.up = 0; }
  /** Hạn hỏi định kỳ sau khi socket rớt (không kéo dài hạn đang có). */
  pollAfterDrop(pollT) { return Math.min(pollT, 1 + this.rnd() * 5); }
}
