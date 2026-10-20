import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { pbr } from '../engine/assets.js';
import { PLACES, HOUSES } from './layout.js';

let M = null;
/** Vật liệu dùng chung, tạo khi cần (texture đã tải xong). */
function mats() {
  if (M) return M;
  M = {
    roof: pbr('grey_roof_tiles', [1, 1], { color: 0x8c8f94 }),
    roofDark: pbr('grey_roof_tiles', [1, 1], { color: 0x55585e }),
    thatch: pbr('thatch_roof_angled', [1, 1]),
    under: pbr('dark_wooden_planks', [1, 1], { side: THREE.BackSide, color: 0x6b4a33 }),
    lacquer: pbr('dark_wooden_planks', [0.5, 2], { color: 0xa0352a }),
    wood: pbr('weathered_brown_planks', [1, 1]),
    beam: pbr('japanese_cedar_planks', [2, 0.5], { color: 0x5c3a24 }),
    plaster: pbr('white_plaster_rough_01', [2, 1], { color: 0xece4d4 }),
    stone: pbr('japanese_stone_wall', [3, 1]),
    paving: pbr('stone_tiles', [4, 4]),
    floor: pbr('hinoki_planks', [3, 3]),
    log: pbr('weathered_brown_planks', [1, 3], { color: 0x8a7a68 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 0.95, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xc9a04a, roughness: 0.35, metalness: 0.8 }),
  };
  return M;
}

/** Cập nhật lại UV theo kích thước thật (m) để texture không bị kéo giãn. */
function boxUV(geo, scale = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay > 0.5) uv.setXY(i, x * scale, z * scale);
    else if (ax > 0.5) uv.setXY(i, z * scale, y * scale);
    else uv.setXY(i, x * scale, y * scale);
  }
  return geo;
}

function box(w, h, d, mat, x = 0, y = 0, z = 0, uvScale = 0.5) {
  const m = new THREE.Mesh(boxUV(new THREE.BoxGeometry(w, h, d), uvScale), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cyl(r, h, mat, x = 0, y = 0, z = 0, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/**
 * Mái hông (庑殿) cong lõm, vểnh 4 góc. a, b: nửa chiều dài/rộng (đã gồm phần mái đua), a >= b.
 * H: độ cao nóc, lift: độ vểnh góc. Trả về Group gồm mặt ngói, mặt gỗ dưới, nóc và 4 sống mái.
 */
export function hipRoof(a, b, H, lift = 0.8, roofMat) {
  const m = mats();
  if (b > a) { const g = hipRoof(b, a, H, lift, roofMat); g.rotation.y = Math.PI / 2; return g; }
  const height = (x, z) => {
    const ex = a - Math.abs(x), ez = b - Math.abs(z);
    const d = Math.max(0, Math.min(ex, ez));
    const u = d / b;
    const curve = H * (0.55 * u + 0.45 * u * u * u);
    const up = lift * Math.pow(1 - u, 2.2) * Math.exp(-Math.abs(ex - ez) / (b * 0.45));
    return curve + up;
  };
  const NS = 28, NT = 14;
  const faces = [];
  // face(s,t) -> [x, z]; trục u texture chạy dọc mái
  const defs = [
    (s, t) => [s * (a - t * b), b - t * b, s * (a - t * b), t],
    (s, t) => [s * (a - t * b), -(b - t * b), -s * (a - t * b), t],
    (s, t) => [a - t * b, s * (b - t * b), -s * (b - t * b), t],
    (s, t) => [-(a - t * b), s * (b - t * b), s * (b - t * b), t],
  ];
  for (const f of defs) {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NT; j++) {
      for (let i = 0; i <= NS; i++) {
        const s = (i / NS) * 2 - 1, t = j / NT;
        const [x, z, u] = f(s, t);
        pos.push(x, height(x, z), z);
        uv.push(u / 1.4, (t * b * 1.25) / 1.4);
      }
    }
    for (let j = 0; j < NT; j++) {
      for (let i = 0; i < NS; i++) {
        const k = j * (NS + 1) + i;
        idx.push(k, k + 1, k + NS + 1, k + 1, k + NS + 2, k + NS + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // bảo đảm pháp tuyến hướng lên
    if (g.attributes.normal.getY(Math.floor(g.attributes.normal.count / 2)) < 0) {
      g.setIndex(idx.map((_, i) => idx[i - (i % 3) + (2 - (i % 3))]));
      g.computeVertexNormals();
    }
    faces.push(g);
  }
  const geo = mergeGeometries(faces);
  const group = new THREE.Group();
  const top = new THREE.Mesh(geo, roofMat || m.roof);
  top.castShadow = top.receiveShadow = true;
  const under = new THREE.Mesh(geo, m.under);
  under.position.y = -0.12;
  under.receiveShadow = true;
  group.add(top, under);

  // Sống nóc
  const ridgeMat = m.roofDark;
  const rl = (a - b) * 2;
  if (rl > 0.1) {
    const ridge = box(rl + 0.6, 0.45, 0.38, ridgeMat, 0, H + 0.12, 0, 1);
    group.add(ridge);
    for (const sx of [-1, 1]) {
      // đầu nóc vểnh (đuôi cá chim)
      const orn = box(0.35, 0.9, 0.3, ridgeMat, sx * (rl / 2 + 0.3), H + 0.45, 0, 1);
      orn.rotation.z = -sx * 0.35;
      group.add(orn);
    }
  } else {
    const fin = cyl(0.12, 1.2, m.gold, 0, H - 0.1, 0, 10);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), m.gold);
    ball.position.set(0, H + 0.9, 0);
    group.add(fin, ball);
  }
  // 4 sống mái theo đường hông
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const t = 1 - i / 16;
        const x = sx * (a - t * b), z = sz * (b - t * b);
        pts.push(new THREE.Vector3(x, height(x * 0.999, z * 0.999) + 0.12, z));
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.13, 6), ridgeMat);
      tube.castShadow = true;
      group.add(tube);
    }
  }
  return group;
}

/** Ô cửa song gỗ (canvas texture có alpha). */
let latticeTex = null;
function lattice() {
  if (latticeTex) return latticeTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = '#4a2c1a';
  g.lineWidth = 7;
  g.strokeRect(3, 3, 122, 122);
  g.lineWidth = 4;
  for (let i = 1; i < 6; i++) {
    g.beginPath(); g.moveTo(0, i * 21.3); g.lineTo(128, i * 21.3); g.stroke();
    g.beginPath(); g.moveTo(i * 21.3, 0); g.lineTo(i * 21.3, 128); g.stroke();
  }
  latticeTex = new THREE.CanvasTexture(c);
  latticeTex.colorSpace = THREE.SRGBColorSpace;
  return latticeTex;
}

function windowPanel(w, h) {
  const mat = new THREE.MeshStandardMaterial({ map: lattice(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf2e6c8, roughness: 1, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0x2a1e0c });
  const g = new THREE.Group();
  const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.98), paper);
  p.position.z = -0.02;
  l.castShadow = true;
  g.add(l, p);
  return g;
}

/** Biển hiệu chữ Hán-Việt. */
export function signBoard(text, w = 3.2, h = 0.9, vertical = false) {
  const c = document.createElement('canvas');
  c.width = vertical ? 256 : 1024; c.height = vertical ? 1024 : 288;
  const g = c.getContext('2d');
  g.fillStyle = '#1d140e'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a04a'; g.lineWidth = 18; g.strokeRect(14, 14, c.width - 28, c.height - 28);
  g.fillStyle = '#e6c06a';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (vertical) {
    const chars = [...text];
    g.font = `${Math.min(190, 880 / chars.length)}px "Ma Shan Zheng", "Noto Serif", serif`;
    chars.forEach((ch, i) => g.fillText(ch, 128, 90 + (i + 0.5) * (850 / chars.length)));
  } else {
    const cjk = /[\u4e00-\u9fff]/.test(text);
    g.font = cjk ? `${Math.min(200, 860 / text.length)}px "Ma Shan Zheng", serif` : `bold ${Math.min(150, 1800 / text.length)}px "Noto Serif", serif`;
    g.fillText(text, 512, cjk ? 160 : 150);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), [mats().beam, mats().beam, mats().beam, mats().beam, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), mats().beam]);
  m.castShadow = true;
  return m;
}

/**
 * Nhà khung gỗ trên nền đá. Gốc toạ độ = giữa mặt sàn.
 * opts: w, d (kích thước sàn), h (cao cột), front: 'open' | 'door', roofH, platform
 */
function hall(opts, colliders, world) {
  const m = mats();
  const { w, d, h = 3.6, front = 'door', roofH = 2.6, lift = 0.7, roofMat, overhang = 1.4, walls = true } = opts;
  const g = new THREE.Group();
  const cols = Math.max(2, Math.round(w / 3.2));
  const rows = Math.max(2, Math.round(d / 3.2));
  // nền đá
  g.add(box(w + 1.6, 1.2, d + 1.6, m.stone, 0, -0.6, 0, 0.5));
  const fl = box(w + 1.4, 0.05, d + 1.4, m.floor, 0, 0.0, 0, 0.5);
  g.add(fl);
  // cột
  const colPos = [];
  for (let i = 0; i <= cols; i++) for (const sz of [-1, 1]) colPos.push([-w / 2 + (w * i) / cols, (sz * d) / 2]);
  for (let j = 1; j < rows; j++) for (const sx of [-1, 1]) colPos.push([(sx * w) / 2, -d / 2 + (d * j) / rows]);
  for (const [x, z] of colPos) {
    g.add(cyl(0.2, h, m.lacquer, x, 0, z));
    g.add(cyl(0.3, 0.25, m.stone, x, 0, z, 10));
  }
  // dầm trên
  for (const sz of [-1, 1]) g.add(box(w + 0.4, 0.45, 0.35, m.beam, 0, h, (sz * d) / 2));
  for (const sx of [-1, 1]) g.add(box(0.35, 0.45, d + 0.4, m.beam, (sx * w) / 2, h, 0));
  // tường
  if (walls) {
    const wallH = h - 0.25;
    const addWall = (len, x, z, rot, withDoor, withWindow) => {
      const seg = new THREE.Group();
      seg.position.set(x, 0, z);
      seg.rotation.y = rot;
      if (withDoor) {
        const dw = Math.min(2.2, len * 0.45), side = (len - dw) / 2;
        seg.add(box(side, wallH, 0.22, m.plaster, -(dw / 2 + side / 2), wallH / 2, 0));
        seg.add(box(side, wallH, 0.22, m.plaster, dw / 2 + side / 2, wallH / 2, 0));
        seg.add(box(dw, wallH - 2.6, 0.22, m.plaster, 0, 2.6 + (wallH - 2.6) / 2, 0));
        seg.add(box(dw + 0.3, 0.2, 0.3, m.beam, 0, 2.6, 0));
      } else {
        seg.add(box(len, wallH, 0.22, m.plaster, 0, wallH / 2, 0));
        if (withWindow) {
          for (const sx of [-1, 1]) {
            const win = windowPanel(1.3, 1.1);
            win.position.set(sx * len * 0.25, 2.0, 0.13);
            seg.add(win);
            const win2 = win.clone(); win2.position.z = -0.13; seg.add(win2);
          }
        }
      }
      seg.add(box(len, 0.35, 0.28, m.beam, 0, 0.18, 0));
      g.add(seg);
      return { len, withDoor };
    };
    // tường theo cạnh: trước (+z) / sau / trái / phải
    if (front === 'door') addWall(w, 0, d / 2, 0, true, false);
    addWall(w, 0, -d / 2, 0, false, true);
    addWall(d, -w / 2, 0, Math.PI / 2, false, true);
    addWall(d, w / 2, 0, Math.PI / 2, false, true);
  }
  // mái
  const roof = hipRoof(w / 2 + overhang, d / 2 + overhang, roofH, lift, roofMat);
  roof.position.y = h + 0.2;
  g.add(roof);

  // Đặt vào thế giới + va chạm
  const { x, z, rot = 0, terrain } = world;
  let base = -1e9;
  for (const [cx, cz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, 0]]) {
    const wx = x + cx * Math.cos(rot) + cz * Math.sin(rot), wz = z - cx * Math.sin(rot) + cz * Math.cos(rot);
    base = Math.max(base, terrain.heightAt(wx, wz));
  }
  const floorY = base + 0.45;
  g.position.set(x, floorY, z);
  g.rotation.y = rot;
  // nền đá kéo sâu xuống đất
  const footing = box(w + 1.6, 6, d + 1.6, m.stone, 0, -3.6, 0, 0.5);
  g.add(footing);
  colliders.floor(x, z, w / 2 + 0.8, d / 2 + 0.8, rot, floorY);
  const toW = (lx, lz) => [x + lx * Math.cos(rot) + lz * Math.sin(rot), z - lx * Math.sin(rot) + lz * Math.cos(rot)];
  for (const [cx, cz] of colPos) { const [wx, wz] = toW(cx, cz); colliders.circle(wx, wz, 0.25); }
  if (walls) {
    const t = 0.15;
    const wallBox = (lx, lz, hw, hd) => { const [wx, wz] = toW(lx, lz); colliders.box(wx, wz, hw, hd, rot); };
    wallBox(0, -d / 2, w / 2, t);
    wallBox(-w / 2, 0, t, d / 2);
    wallBox(w / 2, 0, t, d / 2);
    if (front === 'door') {
      const dw = Math.min(2.2, w * 0.45), side = (w - dw) / 2;
      wallBox(-(dw / 2 + side / 2), d / 2, side / 2, t);
      wallBox(dw / 2 + side / 2, d / 2, side / 2, t);
    }
  }
  return { group: g, floorY };
}

function paifang(text, colliders, terrain, x, z) {
  const m = mats();
  const g = new THREE.Group();
  const y = terrain.heightAt(x, z);
  g.position.set(x, y, z);
  const H = 6.2, span = 7.5;
  for (const sx of [-1, 1]) {
    g.add(cyl(0.32, H, m.lacquer, (sx * span) / 2, -0.5, 0));
    g.add(cyl(0.26, H * 0.7, m.lacquer, sx * (span / 2 + 2.6), -0.5, 0));
    g.add(box(1.0, 1.0, 1.0, m.stone, (sx * span) / 2, 0.0, 0));
    g.add(box(0.9, 0.9, 0.9, m.stone, sx * (span / 2 + 2.6), 0.0, 0));
    colliders.circle(x + (sx * span) / 2, z, 0.6);
    colliders.circle(x + sx * (span / 2 + 2.6), z, 0.55);
    const sideRoof = hipRoof(1.9, 0.9, 0.9, 0.45);
    sideRoof.position.set(sx * (span / 2 + 2.6), H * 0.7 - 0.2, 0);
    g.add(sideRoof);
    g.add(box(2.8, 0.35, 0.35, m.beam, sx * (span / 2 + 1.3), H * 0.62, 0));
  }
  g.add(box(span + 1.2, 0.55, 0.5, m.beam, 0, H - 0.6, 0));
  g.add(box(span + 0.8, 0.4, 0.45, m.lacquer, 0, H - 2.1, 0));
  const sign = signBoard(text, 3.6, 1.0);
  sign.position.set(0, H - 1.35, 0.3);
  g.add(sign);
  const back = sign.clone(); back.rotation.y = Math.PI; back.position.z = -0.3; g.add(back);
  const roof = hipRoof(span / 2 + 1.6, 1.3, 1.4, 0.8);
  roof.position.y = H - 0.2;
  g.add(roof);
  return g;
}

function pavilion(colliders, terrain) {
  const m = mats();
  const { x, z } = PLACES.pavilion;
  const g = new THREE.Group();
  const y = Math.max(terrain.heightAt(x, z), 0.6) + 0.6;
  g.position.set(x, y, z);
  const s = 5.2;
  g.add(box(s + 2.2, 7, s + 2.2, m.stone, 0, -3.5, 0, 0.5));
  g.add(box(s + 2, 0.06, s + 2, m.paving, 0, 0.02, 0, 0.5));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(cyl(0.2, 3.4, m.lacquer, (sx * s) / 2, 0, (sz * s) / 2));
    colliders.circle(x + (sx * s) / 2, z + (sz * s) / 2, 0.25);
  }
  // lan can thấp
  for (const [lx, lz, w, d] of [[0, -s / 2, s, 0.15], [-s / 2, 0, 0.15, s], [s / 2, 0, 0.15, s]]) {
    g.add(box(w || 0.15, 0.55, d || 0.15, m.lacquer, lx, 0.3, lz));
  }
  colliders.box(x, z - s / 2, s / 2, 0.15, 0, y + 0.55);
  colliders.box(x - s / 2, z, 0.15, s / 2, 0, y + 0.55);
  colliders.box(x + s / 2, z, 0.15, s / 2, 0, y + 0.55);
  g.add(box(s + 0.4, 0.35, 0.3, m.beam, 0, 3.4, -s / 2), box(s + 0.4, 0.35, 0.3, m.beam, 0, 3.4, s / 2));
  g.add(box(0.3, 0.35, s + 0.4, m.beam, -s / 2, 3.4, 0), box(0.3, 0.35, s + 0.4, m.beam, s / 2, 3.4, 0));
  const r1 = hipRoof(s / 2 + 1.5, s / 2 + 1.5, 1.4, 0.9);
  r1.position.y = 3.55;
  const r2 = hipRoof(s / 2 + 0.4, s / 2 + 0.4, 1.8, 0.7);
  r2.position.y = 4.65;
  g.add(r1, r2, box(s * 0.9, 0.9, s * 0.9, m.lacquer, 0, 4.4, 0));
  const sign = signBoard('望月亭', 2.6, 0.8);
  sign.position.set(0, 3.0, s / 2 + 0.05);
  g.add(sign);
  colliders.floor(x, z, s / 2 + 1, s / 2 + 1, 0, y);
  return g;
}

function bridge(terrain, colliders, x, z, len, rot) {
  const m = mats();
  const g = new THREE.Group();
  g.position.set(x, Math.max(0.4, terrain.heightAt(x, z) + 0.2), z);
  g.rotation.y = rot;
  g.add(box(2.4, 0.18, len, m.wood, 0, 0, 0));
  for (let i = 0; i <= len / 2.5; i++) {
    const pz = -len / 2 + i * 2.5;
    for (const sx of [-1, 1]) {
      g.add(cyl(0.12, 3, m.log, sx * 1.15, -2.6, pz, 8));
      g.add(cyl(0.06, 0.9, m.lacquer, sx * 1.15, 0, pz, 8));
    }
  }
  for (const sx of [-1, 1]) g.add(box(0.1, 0.1, len, m.lacquer, sx * 1.15, 0.9, 0));
  colliders.floor(x, z, 1.2, len / 2, rot, g.position.y + 0.09);
  return g;
}

function palisade(colliders, terrain) {
  const m = mats();
  const C = PLACES.camp;
  const n = 120, r = C.r;
  const geo = new THREE.CylinderGeometry(0.22, 0.26, 1, 7);
  geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, m.log, n);
  const tip = new THREE.ConeGeometry(0.24, 0.6, 7);
  const tipMesh = new THREE.InstancedMesh(tip, m.log, n);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  const gate = Math.atan2(1, 0.05); // cổng mở về phía nam (+z)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let da = Math.abs(((a - gate + Math.PI) % (Math.PI * 2)) - Math.PI);
    if (da < 0.12) continue;
    const x = C.x + Math.cos(a) * r, z = C.z + Math.sin(a) * r;
    const hgt = 3.6 + Math.sin(i * 7.1) * 0.5;
    const y = terrain.heightAt(x, z) - 0.4;
    q.setFromEuler(new THREE.Euler(Math.sin(i * 3.3) * 0.05, 0, Math.cos(i * 2.1) * 0.05));
    mesh.setMatrixAt(k, mtx.compose(p.set(x, y, z), q, sc.set(1, hgt, 1)));
    tipMesh.setMatrixAt(k, mtx.compose(p.set(x, y + hgt + 0.3, z), q, sc.set(1, 1, 1)));
    colliders.circle(x, z, 0.35);
    k++;
  }
  mesh.count = tipMesh.count = k;
  mesh.castShadow = tipMesh.castShadow = mesh.receiveShadow = true;
  const g = new THREE.Group();
  g.add(mesh, tipMesh);
  // tháp canh hai bên cổng
  for (const sx of [-1, 1]) {
    const tx = C.x + sx * 5.5, tz = C.z + r + 0.5;
    const ty = terrain.heightAt(tx, tz);
    const t = new THREE.Group();
    t.position.set(tx, ty, tz);
    for (const ax of [-1, 1]) for (const az of [-1, 1]) t.add(cyl(0.16, 6.5, m.log, ax * 1.1, -0.3, az * 1.1, 8));
    t.add(box(3, 0.2, 3, m.wood, 0, 5.2, 0));
    t.add(box(3, 1, 0.1, m.wood, 0, 5.8, 1.45), box(3, 1, 0.1, m.wood, 0, 5.8, -1.45));
    const tr = hipRoof(2.0, 2.0, 1.2, 0.2, m.thatch);
    tr.position.y = 7.2;
    for (const ax of [-1, 1]) for (const az of [-1, 1]) t.add(cyl(0.08, 1.7, m.log, ax * 1.3, 5.3, az * 1.3, 6));
    t.add(tr);
    g.add(t);
    colliders.box(tx, tz, 1.3, 1.3, 0);
  }
  return g;
}

function tent(x, z, terrain, rot = 0) {
  const g = new THREE.Group();
  g.position.set(x, terrain.heightAt(x, z), z);
  g.rotation.y = rot;
  const shape = new THREE.Shape([new THREE.Vector2(-2, 0), new THREE.Vector2(0, 2.4), new THREE.Vector2(2, 0)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false });
  geo.translate(0, 0, -2);
  const mesh = new THREE.Mesh(geo, mats().cloth);
  mesh.castShadow = mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}

function swordTomb(colliders, terrain) {
  const m = mats();
  const T = PLACES.tomb;
  const g = new THREE.Group();
  const y = terrain.heightAt(T.x, T.z);
  g.position.set(T.x, y, T.z);
  // nền đá tròn
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(14, 15, 1.2, 40), m.paving);
  disc.position.y = -0.5;
  disc.receiveShadow = true;
  g.add(disc);
  colliders.floor(T.x, T.z, 10, 10, 0, y + 0.1);
  // bia đá trung tâm
  g.add(box(2.4, 0.6, 1.2, m.stone, 0, 0.3, -6));
  const stele = box(1.6, 4.2, 0.6, m.stone, 0, 2.6, -6, 0.8);
  g.add(stele);
  const sign = signBoard('劍冢', 0.7, 2.6, true);
  sign.position.set(0, 2.8, -5.66);
  g.add(sign);
  colliders.box(T.x, T.z - 6, 1.2, 0.6);
  // vòng cột đá đổ nát
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const h = 2 + ((i * 7) % 5) * 0.8;
    const px = Math.cos(a) * 12.5, pz = Math.sin(a) * 12.5;
    const col = box(0.9, h, 0.9, m.stone, px, h / 2 - 0.2, pz, 0.6);
    col.rotation.set(Math.sin(i) * 0.06, a, Math.cos(i * 3) * 0.06);
    g.add(col);
    if (i % 3 !== 1) g.add(box(1.1, 0.35, 1.1, m.stone, px, h - 0.1, pz, 0.6));
    colliders.circle(T.x + px, T.z + pz, 0.7);
  }
  // hai chậu lửa
  for (const sx of [-1, 1]) {
    g.add(cyl(0.5, 1.1, m.stone, sx * 3, 0, -3.2, 12));
    colliders.circle(T.x + sx * 3, T.z - 3.2, 0.55);
  }
  // mái che nhỏ trên bia
  const r = hipRoof(2.2, 1.4, 1.0, 0.5, m.roofDark);
  r.position.set(0, 4.75, -6);
  g.add(r);
  return g;
}

function cage(colliders, terrain, x, z) {
  const m = mats();
  const g = new THREE.Group();
  g.position.set(x, terrain.heightAt(x, z), z);
  const s = 2.4, h = 2.4;
  g.add(box(s, 0.2, s, m.wood, 0, 0.1, 0));
  g.add(box(s, 0.2, s, m.wood, 0, h, 0));
  const bars = new THREE.Group();
  for (let i = 0; i <= 6; i++) {
    const t = -s / 2 + (i * s) / 6;
    for (const [bx, bz] of [[t, -s / 2], [t, s / 2], [-s / 2, t], [s / 2, t]]) bars.add(cyl(0.05, h, m.log, bx, 0, bz, 6));
  }
  g.add(bars);
  g.userData.bars = bars;
  colliders.box(x, z, s / 2, s / 2, 0, g.position.y + h);
  return g;
}

/** Dựng toàn bộ công trình. Trả về {group, spots} — spots là toạ độ đặt NPC, đồ vật. */
export function buildArchitecture(terrain, colliders) {
  const root = new THREE.Group();
  root.name = 'architecture';
  const spots = {};

  // Khách điếm: sảnh lớn mở mặt trước, mái hai tầng
  const inn = hall({ w: 16, d: 11, h: 4.4, front: 'open', roofH: 3.4, lift: 1.0 }, colliders, { x: PLACES.inn.x, z: PLACES.inn.z, terrain });
  const innUpper = hipRoof(5.5, 3.2, 1.8, 0.7);
  innUpper.position.y = 4.4 + 0.2 + 3.4 - 0.3;
  inn.group.add(innUpper);
  const innSign = signBoard('悅來客棧', 5, 1.15);
  innSign.position.set(0, 4.95, 5.5 + 0.35);
  inn.group.add(innSign);
  for (const [sx, txt] of [[-1, '賓至如歸'], [1, '酒香百里']]) {
    const v = signBoard(txt, 0.5, 2.8, true);
    v.position.set(sx * 8.0, 2.2, 5.5 + 0.25);
    inn.group.add(v);
  }
  root.add(inn.group);
  spots.innFloor = inn.floorY;

  // Nhà dân
  for (const [x, z, w, d, rot] of HOUSES) {
    const h = hall({ w, d, h: 3.2, front: 'door', roofH: 2.2, lift: 0.55, overhang: 1.1 }, colliders, { x, z, rot, terrain });
    root.add(h.group);
  }

  root.add(paifang('清風鎮', colliders, terrain, PLACES.gate.x, PLACES.gate.z));
  root.add(pavilion(colliders, terrain));
  // cầu gỗ từ đình ra hồ
  root.add(bridge(terrain, colliders, PLACES.pavilion.x - 13, PLACES.pavilion.z, 18, Math.PI / 2));

  // Hắc Phong trại
  root.add(palisade(colliders, terrain));
  const C = PLACES.camp;
  const bossHall = hall({ w: 12, d: 8, h: 3.6, front: 'open', roofH: 2.6, lift: 0.25, roofMat: mats().thatch, overhang: 1.2 }, colliders, { x: C.x, z: C.z - 22, terrain });
  root.add(bossHall.group);
  const campSign = signBoard('黑風寨', 3.6, 1.0);
  campSign.position.set(0, 3.9, 4.2);
  bossHall.group.add(campSign);
  for (const [tx, tz, r] of [[C.x - 20, C.z - 4, 0.5], [C.x + 20, C.z - 6, -0.6], [C.x - 16, C.z + 14, 1.2], [C.x + 18, C.z + 14, -1.1]]) {
    root.add(tent(tx, tz, terrain, r));
    colliders.box(tx, tz, 2.1, 2.1, r);
  }
  spots.bossHall = { x: C.x, z: C.z - 17, y: bossHall.floorY };
  spots.cages = PLACES.cages.map(([x, z]) => { const c = cage(colliders, terrain, x, z); root.add(c); return c; });
  root.add(swordTomb(colliders, terrain));
  return { group: root, spots };
}
