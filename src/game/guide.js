import * as THREE from 'three';
import { WATER_LEVEL } from '../world/layout.js';
import { LANG, SPEAKER_NAMES } from '../i18n.js';

const ZH_NAMES = { guard: '王老伯', keeper: '劉掌櫃', maiden: '林婉兒', doba: '屠霸', hanbang: '寒冰', villain: '慕容血', tieuho: '小虎', hanxue: '寒雪', honglian: '紅蓮', huyetma: '血魔', villager: '村民', captive: '被囚者' };

const N = 8, GAP = 2.6, START = 2.2;

/** Dải mũi tên vàng chạy dưới đất, từ chân nhân vật về phía mục tiêu nhiệm vụ. */
export class GuideTrail {
  constructor(scene, terrain) {
    this.terrain = terrain;
    const s = new THREE.Shape();
    s.moveTo(-0.8, -0.35); s.lineTo(0, 0.45); s.lineTo(0.8, -0.35); s.lineTo(0.8, 0.05); s.lineTo(0, 0.85); s.lineTo(-0.8, 0.05); s.closePath();
    const geo = new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); // nằm trên mặt đất, mũi chỉ về -z
    this.group = new THREE.Group();
    this.arrows = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffb300, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.renderOrder = 5;
      this.group.add(m);
      this.arrows.push(m);
    }
    this.group.visible = false;
    scene.add(this.group);
    this.t = 0;
  }

  update(dt, g) {
    this.t += dt;
    const mk = g.dialogOpen || g.player.dead ? null : g.markerPos();
    const p = g.player.pos;
    const d = mk ? Math.hypot(mk.x - p.x, mk.z - p.z) : 0;
    if (!mk || d < 4) { this.group.visible = false; return; }
    this.group.visible = true;
    const ux = (mk.x - p.x) / d, uz = (mk.z - p.z) / d, yaw = Math.atan2(-ux, -uz);
    this.arrows.forEach((m, i) => {
      const k = START + i * GAP;
      if (k > d - 1.5) { m.visible = false; return; }
      m.visible = true;
      const x = p.x + ux * k, z = p.z + uz * k;
      m.position.set(x, Math.max(this.terrain.heightAt(x, z), WATER_LEVEL) + 0.14, z);
      m.rotation.y = yaw;
      // sóng sáng chạy từ chân ra phía trước
      const wave = Math.max(0, Math.sin(this.t * 5 - i * 0.85));
      m.material.opacity = (0.5 + 0.5 * wave) * Math.min(1, (N - i) / 3);
      m.scale.setScalar(1.25 + 0.25 * wave);
    });
  }
}

const T = (vi, en, zh) => (LANG === 'en' ? en : LANG === 'zh' ? zh : vi);

/** Câu hướng dẫn cách làm bước hiện tại (theo ngôn ngữ người chơi chọn). */
export function stepHint(g) {
  const st = g.step;
  if (!st || g.dialogOpen) return '';
  const mk = g.markerPos();
  const p = g.player.pos;
  const d = mk ? Math.hypot(mk.x - p.x, mk.z - p.z) : 0;
  const far = d > 60 ? T(' · Xa quá? Bấm <b>M</b> → chọn nơi → Tự tìm đường', ' · Far? Press <b>M</b> → pick the place → Auto-path', ' · 太遠？按 <b>M</b> → 選地點 → 自動尋路') : '';
  const walk = T('Đi theo <b>mũi tên vàng</b> dưới đất', 'Follow the <b>gold arrows</b> on the ground', '跟隨地上的<b>金色箭頭</b>');
  let obj = '';
  try { obj = st.objective?.(g) || ''; } catch { obj = ''; }
  if (st.interact?.chest) return d > 3 ? `${walk}${LANG === 'zh' ? '' : ' '}${T('tới rương gỗ', 'to the wooden chest', '前往木箱')}${far}` : T('Đứng sát rương, bấm <b>E</b> để mở', 'Stand by the chest and press <b>E</b> to open it', '站在木箱旁，按 <b>E</b> 打開');
  if (st.interact?.cage) return T('Tới từng lồng giam, bấm <b>E</b> để phá lồng', 'Go to each cage and press <b>E</b> to break it', '走到每個牢籠旁，按 <b>E</b> 破籠');
  if (st.talk) {
    const id = Object.keys(st.talk)[0], n = g.npcById?.[id];
    const name = (LANG === 'zh' ? ZH_NAMES[id] : LANG === 'en' ? SPEAKER_NAMES.en[id] : null) || n?.name || '';
    return d > 3.5 ? `${walk}${LANG === 'zh' ? '' : ' '}${T('tới gặp ', 'to meet ', '去見')}<b>${name}</b>${far}` : T(`Đứng cạnh <b>${name}</b>, bấm <b>E</b> để nói chuyện`, `Stand next to <b>${name}</b> and press <b>E</b> to talk`, `站在<b>${name}</b>身旁，按 <b>E</b> 對話`);
  }
  if (/\(\d+\/\d+\)/.test(obj)) return T('Đánh kẻ địch có <b>dấu ◆ vàng</b>: chuột trái để chém, <b>Q F</b> kỹ năng, <b>X</b> nộ khí', 'Fight the enemy with the <b>gold ◆</b>: left-click to strike, <b>Q F</b> skills, <b>X</b> rage', '攻擊標有<b>金色◆</b>的敵人：左鍵攻擊，<b>Q F</b> 技能，<b>X</b> 怒氣');
  return mk ? `${walk}${far}` : '';
}
