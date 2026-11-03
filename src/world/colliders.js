/**
 * Va chạm 2D trên mặt phẳng XZ + sàn nâng (bậc thềm, sàn gỗ).
 * - circle: {x, z, r, top}
 * - box:    {x, z, hw, hd, rot, top}  (hộp xoay quanh trục Y)
 * - floor:  {x, z, hw, hd, rot, y}    (mặt sàn có thể đứng lên)
 * top = độ cao đỉnh; nhân vật ở cao hơn top thì đi qua được.
 * Lưới đều CELL m (Map theo khoá ô) để mỗi truy vấn chỉ xét vật gần; kết quả giống hệt duyệt toàn bộ.
 */
const CELL = 8, PAD = 0.01;
// vị trí được phép trôi khỏi điểm truy vấn trong một lần resolve; quá thì quay về duyệt toàn bộ
const SLACK = 2, BSLACK = 0.5; // BSLACK: cho điểm mẫu của blocked() (r = 0.01), quá thì gọi resolve() đầy đủ
// khoá số nguyên nhỏ (Smi) cho Map nhanh; trùng khoá ở xa chỉ thêm ứng viên thừa, không sai kết quả
const key = (ix, iz) => ((ix & 4095) << 12) | (iz & 4095);
const cell = (v) => Math.floor(v / CELL);

// đẩy pos ra khỏi một vòng tròn / hộp (giữ nguyên công thức gốc)
function pushCircle(pos, r, c) {
  const dx = pos.x - c.x, dz = pos.z - c.z, rr = r + c.r;
  const d2 = dx * dx + dz * dz;
  if (d2 < rr * rr && d2 > 1e-8) {
    const d = Math.sqrt(d2), k = (rr - d) / d;
    pos.x += dx * k; pos.z += dz * k;
  }
}
function pushBox(pos, r, b) {
  const dx = pos.x - b.x, dz = pos.z - b.z;
  // sang hệ toạ độ của hộp
  const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
  const cx = Math.max(-b.hw, Math.min(b.hw, lx)), cz = Math.max(-b.hd, Math.min(b.hd, lz));
  let ox = lx - cx, oz = lz - cz;
  const d2 = ox * ox + oz * oz;
  let px, pz;
  if (d2 > 1e-8) {
    if (d2 >= r * r) return;
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
// tâm (x, z) cách đoạn A→A+v không quá rad + 0.01 (+ dư sai số)
function nearSeg(x, z, rad, ax, az, vx, vz, vv) {
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / vv)), dx = x - ax - vx * t, dz = z - az - vz * t;
  return dx * dx + dz * dz <= (rad + 0.0101) ** 2;
}
// hộp xoay -> AABB (nới PAD cho sai số làm tròn)
const boxExt = (hw, hd, c, s) => [Math.abs(c) * hw + Math.abs(s) * hd + PAD, Math.abs(s) * hw + Math.abs(c) * hd + PAD];

export class Colliders {
  constructor() {
    this.circles = [];
    this.boxes = [];
    this.floors = [];
    this._cg = new Map(); this._bg = new Map(); this._fg = new Map(); // ô -> danh sách chỉ số (tăng dần)
    this._stamp = 0; // dấu truy vấn để khử trùng khi vật nằm nhiều ô
    this._ci = []; this._bi = []; // danh sách ứng viên tái sử dụng
    this._p = { x: 0, z: 0 };
    this._ri = []; this._rj = []; this._fc = []; this._fb = []; // riêng cho blocked() (resolve() dự phòng dùng _ci/_bi)
  }

  _ins(grid, i, x0, z0, x1, z1) {
    for (let ix = cell(x0), ex = cell(x1); ix <= ex; ix++) for (let iz = cell(z0), ez = cell(z1); iz <= ez; iz++) {
      const k = key(ix, iz);
      let a = grid.get(k);
      if (!a) grid.set(k, (a = []));
      a.push(i);
    }
  }

  circle(x, z, r, top = 1e9) {
    this._ins(this._cg, this.circles.length, x - r - PAD, z - r - PAD, x + r + PAD, z + r + PAD);
    this.circles.push({ x, z, r, top, q: 0 });
  }
  box(x, z, hw, hd, rot = 0, top = 1e9) {
    const c = Math.cos(rot), s = Math.sin(rot), [ex, ez] = boxExt(hw, hd, c, s);
    this._ins(this._bg, this.boxes.length, x - ex, z - ez, x + ex, z + ez);
    this.boxes.push({ x, z, hw, hd, rot, top, c, s, q: 0 });
  }
  floor(x, z, hw, hd, rot, y) {
    const c = Math.cos(rot), s = Math.sin(rot), [ex, ez] = boxExt(hw, hd, c, s);
    this._ins(this._fg, this.floors.length, x - ex, z - ez, x + ex, z + ez);
    this.floors.push({ x, z, hw, hd, rot, y, c, s });
  }

  /** Gom chỉ số vật trong các ô phủ [x0,x1]×[z0,z1] (bỏ vật thấp hơn feetY), sắp tăng dần như thứ tự gốc. */
  _gather(grid, list, x0, z0, x1, z1, feetY, out) {
    out.length = 0;
    const st = ++this._stamp;
    for (let ix = cell(x0), ex = cell(x1); ix <= ex; ix++) for (let iz = cell(z0), ez = cell(z1); iz <= ez; iz++) {
      const a = grid.get(key(ix, iz));
      if (!a) continue;
      for (let j = 0; j < a.length; j++) {
        const i = a[j], o = list[i];
        if (o.q === st) continue;
        o.q = st;
        if (feetY > o.top) continue;
        // chèn giữ thứ tự tăng (danh sách gần như đã sắp)
        let n = out.length;
        while (n > 0 && out[n - 1] > i) { out[n] = out[n - 1]; n--; }
        out[n] = i;
      }
    }
    return out.length;
  }

  /** Chạy tuần tự trên ứng viên (đã lọc độ cao); trả false nếu pos trôi xa hơn sl so với (qx, qz). */
  _run(pos, r, qx, qz, ci, bi, sl) {
    const C = this.circles, B = this.boxes, s2 = sl * sl;
    for (let j = 0; j < ci.length; j++) {
      const ox = pos.x, oz = pos.z;
      pushCircle(pos, r, C[ci[j]]);
      if ((pos.x !== ox || pos.z !== oz) && (pos.x - qx) ** 2 + (pos.z - qz) ** 2 > s2) return false;
    }
    for (let j = 0; j < bi.length; j++) {
      const ox = pos.x, oz = pos.z;
      pushBox(pos, r, B[bi[j]]);
      if ((pos.x !== ox || pos.z !== oz) && (pos.x - qx) ** 2 + (pos.z - qz) ** 2 > s2) return false;
    }
    return true;
  }

  _brute(pos, r, feetY) {
    for (const c of this.circles) if (!(feetY > c.top)) pushCircle(pos, r, c);
    for (const b of this.boxes) if (!(feetY > b.top)) pushBox(pos, r, b);
  }

  /** Độ cao sàn cao nhất mà chân (feetY) có thể bước lên tại (x, z). */
  floorAt(x, z, feetY, step = 0.6) {
    let best = -1e9;
    const a = this._fg.get(key(cell(x), cell(z)));
    if (!a) return best;
    for (let j = 0; j < a.length; j++) {
      const f = this.floors[a[j]];
      const dx = x - f.x, dz = z - f.z;
      const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
      if (Math.abs(lx) <= f.hw && Math.abs(lz) <= f.hd && f.y <= feetY + step && f.y > best) best = f.y;
    }
    return best;
  }

  /** Đẩy vòng tròn (pos.x, pos.z, r) ra khỏi vật cản. Sửa pos tại chỗ. */
  resolve(pos, r, feetY) {
    const qx = pos.x, qz = pos.z, R = r + SLACK;
    this._gather(this._cg, this.circles, qx - R, qz - R, qx + R, qz + R, feetY, this._ci);
    this._gather(this._bg, this.boxes, qx - R, qz - R, qx + R, qz + R, feetY, this._bi);
    if (this._run(pos, r, qx, qz, this._ci, this._bi, SLACK)) return;
    pos.x = qx; pos.z = qz;
    this._brute(pos, r, feetY);
  }

  /** Tia 2D có bị chặn không (dùng cho camera/AI nhìn thấy). */
  blocked(ax, az, bx, bz, y) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    if (steps < 2) return false;
    // gom ứng viên một lần cho cả đoạn
    const R = 0.01 + BSLACK;
    const x0 = Math.min(ax, bx) - R, x1 = Math.max(ax, bx) + R, z0 = Math.min(az, bz) - R, z1 = Math.max(az, bz) + R;
    const ci = this._ri, bi = this._rj, C = this.circles, B = this.boxes, fc = this._fc, fb = this._fb;
    this._gather(this._cg, C, x0, z0, x1, z1, y, ci); this._gather(this._bg, B, x0, z0, x1, z1, y, bi);
    // chỉ giữ vật có thể chạm đoạn thẳng (khoảng cách tâm → đoạn ≤ bán kính bao + 0.01)
    const vx = bx - ax, vz = bz - az, vv = vx * vx + vz * vz;
    fc.length = 0; fb.length = 0;
    for (let j = 0; j < ci.length; j++) { const c = C[ci[j]]; if (nearSeg(c.x, c.z, c.r, ax, az, vx, vz, vv)) fc.push(c); }
    for (let j = 0; j < bi.length; j++) { const o = B[bi[j]]; if (nearSeg(o.x, o.z, Math.hypot(o.hw, o.hd), ax, az, vx, vz, vv)) fb.push(o); }
    if (!fc.length && !fb.length) return false;
    const p = this._p;
    for (let i = 1; i < steps; i++) {
      const ox = ax + ((bx - ax) * i) / steps, oz = az + ((bz - az) * i) / steps;
      // lọc nhanh: không vật nào chạm điểm mẫu thì resolve() không đổi gì (cùng điều kiện với pushCircle/pushBox)
      let hit = false;
      for (let j = 0; j < fc.length && !hit; j++) {
        const c = fc[j];
        const dx = ox - c.x, dz = oz - c.z, rr = 0.01 + c.r, d2 = dx * dx + dz * dz;
        hit = d2 < rr * rr && d2 > 1e-8;
      }
      for (let j = 0; j < fb.length && !hit; j++) {
        const o = fb[j];
        const dx = ox - o.x, dz = oz - o.z, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        const ex = lx - Math.max(-o.hw, Math.min(o.hw, lx)), ez = lz - Math.max(-o.hd, Math.min(o.hd, lz)), d2 = ex * ex + ez * ez;
        hit = !(d2 > 1e-8 && d2 >= 0.01 * 0.01);
      }
      if (!hit) continue;
      p.x = ox; p.z = oz;
      if (!this._run(p, 0.01, ox, oz, ci, bi, BSLACK)) { p.x = ox; p.z = oz; this.resolve(p, 0.01, y); }
      if (p.x !== ox || p.z !== oz) return true;
    }
    return false;
  }
}
