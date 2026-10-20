import * as THREE from 'three';
import { fbm, ridged, smoothstep } from './noise.js';
import { WORLD_SIZE, PLACES, FLATTEN, PATHS, WATER_LEVEL } from './layout.js';
import { rawTex } from '../engine/assets.js';

const SEG = 512;                 // số ô lưới mỗi cạnh
const HALF = WORLD_SIZE / 2;
const STEP = WORLD_SIZE / SEG;
const SPLAT_RES = 1024;

function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

function naturalHeight(x, z) {
  let h = 3 + fbm(x * 0.0055 + 3.1, z * 0.0055 - 7.4) * 13 + fbm(x * 0.03, z * 0.03, 3) * 1.4;
  // Dãy núi bao quanh
  const d = Math.hypot(x * 1.0, z * 1.1);
  const ring = smoothstep(235, 370, d + fbm(x * 0.01, z * 0.01, 3) * 60);
  h += ring * (35 + ridged(x * 0.008, z * 0.008) * 140);
  return h;
}

function computeHeight(x, z) {
  let h = naturalHeight(x, z);
  // Hồ
  const L = PLACES.lake;
  const ld = Math.hypot(x - L.x, (z - L.z) * 1.25) + fbm(x * 0.03, z * 0.03, 3) * 8;
  const lake = 1 - smoothstep(L.r * 0.45, L.r * 1.05, ld);
  const shore = 1 - smoothstep(L.r * 0.9, L.r * 1.6, ld);
  h = h * (1 - shore) + (WATER_LEVEL + 1.2) * shore;
  h = h * (1 - lake) + (WATER_LEVEL - 4.5) * lake;
  // Vùng san phẳng
  for (const [cx, cz, r, target, soft] of FLATTEN) {
    const w = 1 - smoothstep(r, r + soft, Math.hypot(x - cx, z - cz));
    if (w <= 0) continue;
    const t = target ?? naturalHeight(cx, cz);
    h = h * (1 - w) + t * w;
  }
  // Đường: làm phẳng nhẹ theo bề mặt đã được làm mượt
  let pd = 1e9, pw = 4;
  for (const p of PATHS) {
    for (let i = 0; i < p.pts.length - 1; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      const dd = distToSeg(x, z, ax, az, bx, bz);
      if (dd < pd) { pd = dd; pw = p.width; }
    }
  }
  const pathW = 1 - smoothstep(pw * 0.5, pw * 0.5 + 4, pd);
  if (pathW > 0) {
    const smooth = fbm(x * 0.0055 + 3.1, z * 0.0055 - 7.4, 2) * 13;
    h = h * (1 - pathW * 0.35) + Math.min(h, smooth) * pathW * 0.35;
  }
  return h;
}

/** Bản đồ splat: R = đường đất, G = sân lát đá, B = đất rừng trúc/trại */
function buildSplat() {
  const c = document.createElement('canvas');
  c.width = c.height = SPLAT_RES;
  const g = c.getContext('2d');
  const k = SPLAT_RES / WORLD_SIZE;
  const P = (x, z) => [(x + HALF) * k, (z + HALF) * k];
  g.fillStyle = '#000';
  g.fillRect(0, 0, SPLAT_RES, SPLAT_RES);
  g.filter = 'blur(2px)';
  g.lineCap = g.lineJoin = 'round';
  g.globalCompositeOperation = 'lighter';
  for (const p of PATHS) {
    g.strokeStyle = '#ff0000';
    g.lineWidth = p.width * k;
    g.beginPath();
    p.pts.forEach(([x, z], i) => (i ? g.lineTo(...P(x, z)) : g.moveTo(...P(x, z))));
    g.stroke();
  }
  const disc = (x, z, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(...P(x, z), r * k, 0, Math.PI * 2); g.fill(); };
  disc(PLACES.square.x, PLACES.square.z, PLACES.square.r, '#00ff00');
  disc(PLACES.inn.x, PLACES.inn.z + 10, 12, '#00ff00');
  disc(PLACES.camp.x, PLACES.camp.z, PLACES.camp.r, '#ff0000');
  disc(PLACES.camp.x, PLACES.camp.z, PLACES.camp.r + 8, '#000077');
  disc(PLACES.bamboo.x, PLACES.bamboo.z, PLACES.bamboo.r + 10, '#0000aa');
  return c;
}

export class Terrain {
  constructor() {
    const n = SEG + 1;
    this.heights = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        this.heights[j * n + i] = computeHeight(-HALF + i * STEP, -HALF + j * STEP);
      }
    }
    this.splatCanvas = buildSplat();
    this.splatData = this.splatCanvas.getContext('2d').getImageData(0, 0, SPLAT_RES, SPLAT_RES).data;
    this.mesh = this.buildMesh();
  }

  /** Độ cao nội suy song tuyến, khớp đúng với lưới đang vẽ. */
  heightAt(x, z) {
    const fx = Math.min(SEG - 1e-4, Math.max(0, (x + HALF) / STEP));
    const fz = Math.min(SEG - 1e-4, Math.max(0, (z + HALF) / STEP));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, n = SEG + 1;
    const h = this.heights;
    // Khớp cách chia tam giác của PlaneGeometry (đường chéo a-d)
    const a = h[j * n + i], b = h[j * n + i + 1], c = h[(j + 1) * n + i], d = h[(j + 1) * n + i + 1];
    return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  }

  normalAt(x, z) {
    const e = 0.8;
    return new THREE.Vector3(this.heightAt(x - e, z) - this.heightAt(x + e, z), 2 * e, this.heightAt(x, z - e) - this.heightAt(x, z + e)).normalize();
  }

  /** {path, paved, forest} trong [0,1] */
  splatAt(x, z) {
    const px = Math.min(SPLAT_RES - 1, Math.max(0, Math.floor(((x + HALF) / WORLD_SIZE) * SPLAT_RES)));
    const pz = Math.min(SPLAT_RES - 1, Math.max(0, Math.floor(((z + HALF) / WORLD_SIZE) * SPLAT_RES)));
    const o = (pz * SPLAT_RES + px) * 4, d = this.splatData;
    return { path: d[o] / 255, paved: d[o + 1] / 255, forest: d[o + 2] / 255 };
  }

  buildMesh() {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setY(k, this.heights[k]);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const splat = new THREE.CanvasTexture(this.splatCanvas);
    splat.colorSpace = THREE.NoColorSpace;
    splat.flipY = false; // hàng 0 của canvas = z nhỏ nhất, khớp với UV (z+HALF)/WORLD
    const T = (name) => [rawTex(name, 'diff'), rawTex(name, 'nor')];
    const sets = { grass: T('leafy_grass'), forest: T('forest_leaves_02'), rock: T('rock_face_03'), path: T('stony_dirt_path'), paved: T('grey_stone_path'), mud: T('brown_mud_leaves_01') };

    const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    const uniforms = { uSplat: { value: splat }, uWorld: { value: WORLD_SIZE }, uWater: { value: WATER_LEVEL } };
    const names = Object.keys(sets);
    names.forEach((n) => {
      uniforms[`d_${n}`] = { value: sets[n][0] };
      uniforms[`n_${n}`] = { value: sets[n][1] };
    });

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position,1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * normal);');

      const decl = names.map((n) => `uniform sampler2D d_${n}; uniform sampler2D n_${n};`).join('\n');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWPos; varying vec3 vWNor;
uniform sampler2D uSplat; uniform float uWorld; uniform float uWater;
${decl}
vec3 tB; vec3 tN; float tR;
float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y); }
void addLayer(vec3 c, vec3 n, float r, float w){ tB += c*w; tN += n*w; tR += r*w; }
`)
        .replace('#include <map_fragment>', `
  vec2 wuv = vWPos.xz;
  vec4 sp = texture2D(uSplat, (vWPos.xz + uWorld*0.5) / uWorld);
  float slope = 1.0 - clamp(vWNor.y, 0.0, 1.0);
  float big = vnoise(wuv * 0.02) * 0.6 + vnoise(wuv * 0.09) * 0.4;
  tB = vec3(0.0); tN = vec3(0.0); tR = 0.0;
  vec2 uvA = wuv / 3.2;
  vec3 grass_c = texture2D(d_grass, uvA).rgb; vec3 grass_n = texture2D(n_grass, uvA).xyz*2.0-1.0; float grass_r = 0.92;
  vec3 grass2 = texture2D(d_grass, wuv / 13.0).rgb;
  grass_c = mix(grass_c, grass2, 0.35) * mix(0.82, 1.12, big);
  grass_c *= vec3(0.78, 1.0, 0.62);
  vec3 forest_c = texture2D(d_forest, uvA).rgb; vec3 forest_n = texture2D(n_forest, uvA).xyz*2.0-1.0; float forest_r = 0.95;
  vec3 mud_c = texture2D(d_mud, wuv / 2.6).rgb; vec3 mud_n = texture2D(n_mud, wuv / 2.6).xyz*2.0-1.0; float mud_r = 0.75;
  vec3 path_c = texture2D(d_path, wuv / 2.4).rgb; vec3 path_n = texture2D(n_path, wuv / 2.4).xyz*2.0-1.0; float path_r = 0.9;
  vec3 paved_c = texture2D(d_paved, wuv / 2.8).rgb; vec3 paved_n = texture2D(n_paved, wuv / 2.8).xyz*2.0-1.0; float paved_r = 0.8;
  // Đá vách núi: trộn 3 mặt phẳng chiếu để không bị kéo giãn
  vec3 bw = pow(abs(vWNor), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
  vec3 rock_c = texture2D(d_rock, vWPos.zy/6.0).rgb*bw.x + texture2D(d_rock, vWPos.xz/6.0).rgb*bw.y + texture2D(d_rock, vWPos.xy/6.0).rgb*bw.z;
  vec3 rock_n = texture2D(n_rock, vWPos.xz/6.0).xyz*2.0-1.0;
  float rock_r = 0.85;

  float wForest = smoothstep(0.35, 0.75, big) * 0.8 + sp.b * 0.9;
  float wRock = smoothstep(0.28, 0.5, slope) + smoothstep(30.0, 60.0, vWPos.y) * 0.8;
  float wShore = 1.0 - smoothstep(uWater + 0.3, uWater + 1.6, vWPos.y);
  float wPath = smoothstep(0.15, 0.6, sp.r);
  float wPaved = smoothstep(0.2, 0.7, sp.g);
  float wGrass = 1.0;
  // Ghép lớp theo thứ tự ưu tiên
  float fF = clamp(wForest, 0.0, 1.0);
  float fS = clamp(wShore, 0.0, 1.0);
  float fP = clamp(wPath, 0.0, 1.0);
  float fV = clamp(wPaved, 0.0, 1.0);
  float fR = clamp(wRock, 0.0, 1.0);
  vec3 c = grass_c; vec3 nn = grass_n; float rr = grass_r;
  c = mix(c, forest_c, fF); nn = mix(nn, forest_n, fF); rr = mix(rr, forest_r, fF);
  c = mix(c, mud_c, fS); nn = mix(nn, mud_n, fS); rr = mix(rr, mud_r * 0.6, fS);
  c = mix(c, path_c, fP); nn = mix(nn, path_n, fP); rr = mix(rr, path_r, fP);
  c = mix(c, paved_c, fV); nn = mix(nn, paved_n, fV); rr = mix(rr, paved_r, fV);
  c = mix(c, rock_c, fR); nn = mix(nn, rock_n, fR); rr = mix(rr, rock_r, fR);
  tB = c; tN = normalize(nn); tR = rr;
#ifdef STYLIZED
  {
    // phong cách hoạt hình: màu phẳng tươi + vân nhẹ từ texture gốc
    float lum = dot(tB, vec3(0.299, 0.587, 0.114));
    float detail = clamp(lum * 2.0, 0.82, 1.06);
    vec3 sGrass = mix(vec3(0.33, 0.66, 0.16), vec3(0.55, 0.80, 0.22), smoothstep(0.3, 0.8, big));
    vec3 sForest = vec3(0.28, 0.52, 0.17);
    vec3 sMud = vec3(0.88, 0.78, 0.55);
    vec3 sPath = vec3(0.78, 0.58, 0.34);
    vec3 sPaved = vec3(0.70, 0.64, 0.54);
    vec3 sRock = mix(vec3(0.55, 0.53, 0.60), vec3(0.72, 0.70, 0.76), smoothstep(40.0, 90.0, vWPos.y));
    vec3 sc = sGrass;
    sc = mix(sc, sForest, fF * 0.8);
    sc = mix(sc, sMud, fS);
    sc = mix(sc, sPath, fP);
    sc = mix(sc, sPaved, fV);
    sc = mix(sc, sRock, fR);
    // tuyết trên đỉnh núi
    sc = mix(sc, vec3(0.95, 0.97, 1.0), smoothstep(95.0, 120.0, vWPos.y + vnoise(wuv * 0.05) * 12.0));
    tB = sc * detail;
    tN = normalize(mix(vec3(0.0, 0.0, 1.0), tN, 0.35));
    tR = 0.9;
  }
#endif
  diffuseColor.rgb *= tB;
`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(tR, 0.35, 1.0);')
        .replace('#include <normal_fragment_maps>', `
  {
    vec3 N = normalize(vWNor);
    vec3 T = normalize(vec3(1.0,0.0,0.0) - N * N.x);
    vec3 B = cross(T, N);
    vec3 wn = normalize(T * tN.x + B * tN.y + N * tN.z);
    normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
  }
`);
    };

    if (Terrain.stylized) mat.defines = { STYLIZED: '' };
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
  }
}
