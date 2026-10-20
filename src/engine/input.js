/** Bàn phím + chuột (pointer lock). pressed() = vừa bấm trong frame này. */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.justDown = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      if (!this.down.has(e.code)) this.justDown.add(e.code);
      this.down.add(e.code);
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (e) => {
      const code = 'Mouse' + e.button;
      this.justDown.add(code);
      this.down.add(code);
    });
    addEventListener('mouseup', (e) => this.down.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  lock() { if (!this.locked) this.canvas.requestPointerLock?.()?.catch?.(() => {}); }
  unlock() { if (this.locked) document.exitPointerLock(); }
  held(code) { return this.down.has(code); }
  pressed(code) { return this.justDown.has(code); }

  endFrame() {
    this.justDown.clear();
    this.mouseDX = this.mouseDY = 0;
    this.wheel = 0;
  }
}
