/**
 * Bàn phím + chuột + cảm ứng. pressed() = vừa bấm trong frame này.
 * Chế độ MMO (noLock): kéo chuột trái/phải hoặc vuốt trên màn hình để xoay góc nhìn;
 * bấm nhanh (không kéo) bằng chuột trái = đánh. Hai ngón chụm = phóng to/thu nhỏ.
 */
const DRAG_PX = 6;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.justDown = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.virtualMove = null; // joystick ảo {x, y, sprint}
    this.autoMove = null;    // hướng do Auto điều khiển (toạ độ thế giới)
    this.noLock = false;     // chế độ MMO: không khoá chuột
    this.drag = null;        // { id, x, y, moved, button }
    this.pinch = null;

    addEventListener('keydown', (e) => {
      if (e.target?.tagName === 'INPUT') return;
      if (e.code === 'Tab' || e.code === 'AltLeft' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.down.has(e.code)) this.justDown.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => { this.down.clear(); this.drag = null; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const touches = new Map();
    canvas.addEventListener('pointerdown', (e) => {
      if (this.locked) {
        const code = 'Mouse' + e.button;
        this.justDown.add(code);
        this.down.add(code);
        return;
      }
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        this.drag = null;
        return;
      }
      canvas.setPointerCapture?.(e.pointerId);
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, button: e.button };
      this.down.add('Mouse' + e.button);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.locked) return;
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.wheel += (this.pinch - d) * 0.03;
        this.pinch = d;
        return;
      }
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      d.x = e.clientX; d.y = e.clientY;
      d.moved += Math.abs(dx) + Math.abs(dy);
      if (d.moved > DRAG_PX) { this.mouseDX += dx; this.mouseDY += dy; }
    });
    const end = (e) => {
      touches.delete(e.pointerId);
      if (touches.size < 2) this.pinch = null;
      if (this.locked) { this.down.delete('Mouse' + e.button); return; }
      const d = this.drag;
      if (!d || d.id !== e.pointerId) return;
      // bấm nhanh không kéo = một cú click (đánh)
      if (d.moved <= DRAG_PX && d.button === 0) this.justDown.add('Mouse0');
      this.down.delete('Mouse' + d.button);
      this.drag = null;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    addEventListener('mouseup', (e) => { if (this.locked) this.down.delete('Mouse' + e.button); });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.wheel += Math.sign(e.deltaY); }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  /** Đang kéo xoay camera. */
  get dragging() { return !!this.drag && this.drag.moved > DRAG_PX; }

  lock() { if (!this.locked && !this.noLock) this.canvas.requestPointerLock?.()?.catch?.(() => {}); }
  unlock() { if (this.locked) document.exitPointerLock(); }
  held(code) {
    // chế độ MMO: giữ chuột để kéo camera, không tính là giữ nút đánh/đỡ
    if (this.noLock && (code === 'Mouse0' || code === 'Mouse2')) return false;
    return this.down.has(code);
  }
  pressed(code) { return this.justDown.has(code); }

  endFrame() {
    this.justDown.clear();
    this.mouseDX = this.mouseDY = 0;
    this.wheel = 0;
  }
}
