/**
 * Va chạm 2D trên mặt phẳng XZ + sàn nâng (bậc thềm, sàn gỗ).
 * - circle: {x, z, r, top}
 * - box:    {x, z, hw, hd, rot, top}  (hộp xoay quanh trục Y)
 * - floor:  {x, z, hw, hd, rot, y}    (mặt sàn có thể đứng lên)
 * top = độ cao đỉnh; nhân vật ở cao hơn top thì đi qua được.
 */
export class Colliders {
  constructor() {
    this.circles = [];
    this.boxes = [];
    this.floors = [];
  }

  circle(x, z, r, top = 1e9) { this.circles.push({ x, z, r, top }); }
  box(x, z, hw, hd, rot = 0, top = 1e9) { this.boxes.push({ x, z, hw, hd, rot, top, c: Math.cos(rot), s: Math.sin(rot) }); }
  floor(x, z, hw, hd, rot, y) { this.floors.push({ x, z, hw, hd, rot, y, c: Math.cos(rot), s: Math.sin(rot) }); }

  /** Độ cao sàn cao nhất mà chân (feetY) có thể bước lên tại (x, z). */
  floorAt(x, z, feetY, step = 0.6) {
    let best = -1e9;
    for (const f of this.floors) {
      const dx = x - f.x, dz = z - f.z;
      const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
      if (Math.abs(lx) <= f.hw && Math.abs(lz) <= f.hd && f.y <= feetY + step && f.y > best) best = f.y;
    }
    return best;
  }

  /** Đẩy vòng tròn (pos.x, pos.z, r) ra khỏi vật cản. Sửa pos tại chỗ. */
  resolve(pos, r, feetY) {
    for (const c of this.circles) {
      if (feetY > c.top) continue;
      const dx = pos.x - c.x, dz = pos.z - c.z, rr = r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-8) {
        const d = Math.sqrt(d2), k = (rr - d) / d;
        pos.x += dx * k; pos.z += dz * k;
      }
    }
    for (const b of this.boxes) {
      if (feetY > b.top) continue;
      const dx = pos.x - b.x, dz = pos.z - b.z;
      // sang hệ toạ độ của hộp
      const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      const cx = Math.max(-b.hw, Math.min(b.hw, lx)), cz = Math.max(-b.hd, Math.min(b.hd, lz));
      let ox = lx - cx, oz = lz - cz;
      const d2 = ox * ox + oz * oz;
      let px, pz;
      if (d2 > 1e-8) {
        if (d2 >= r * r) continue;
        const d = Math.sqrt(d2), k = (r - d) / d;
        px = ox * k; pz = oz * k;
      } else {
        // tâm nằm trong hộp: đẩy ra cạnh gần nhất
        const ex = b.hw - Math.abs(lx), ez = b.hd - Math.abs(lz);
        if (ex < ez) { px = Math.sign(lx || 1) * (ex + r); pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * (ez + r); }
      }
      // về hệ thế giới
      pos.x += px * b.c + pz * b.s;
      pos.z += -px * b.s + pz * b.c;
    }
  }

  /** Tia 2D có bị chặn không (dùng cho camera/AI nhìn thấy). */
  blocked(ax, az, bx, bz, y) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    const p = { x: 0, z: 0 };
    for (let i = 1; i < steps; i++) {
      p.x = ax + ((bx - ax) * i) / steps; p.z = az + ((bz - az) * i) / steps;
      const ox = p.x, oz = p.z;
      this.resolve(p, 0.01, y);
      if (p.x !== ox || p.z !== oz) return true;
    }
    return false;
  }
}
