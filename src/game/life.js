import * as THREE from 'three';
import { loadGLTF } from '../engine/assets.js';
import { PLACES, WATER_LEVEL } from '../world/layout.js';
import { rng } from '../world/noise.js';
import { randomGem, GEM_ITEMS } from './gear.js';

/**
 * Sinh hoạt: câu cá ở hồ, khai khoáng, chặt gỗ. Nút tài nguyên mọc lại sau một thời gian.
 */
export const LIFE_ITEMS = {
  fish: { name: 'Cá chép', han: '鯉魚', icon: 'fish', type: 'material', sell: 10, desc: 'Cá chép béo hồ Bích Thủy. Nấu thành Cá nướng hoặc bán.' },
  goldfish: { name: 'Kim lý ngư', han: '金鯉', icon: 'fish', type: 'material', sell: 80, desc: 'Cá chép vàng hiếm, nghe nói đem lại may mắn.' },
  ore: { name: 'Huyền thiết khoáng', han: '玄鐵礦', icon: 'ore', type: 'material', sell: 14, desc: 'Quặng sắt đen, nguyên liệu cường hoá và xây gia viên.' },
  jade_ore: { name: 'Ngọc thạch thô', han: '玉石', icon: 'nugget', type: 'material', sell: 40, desc: 'Ngọc thô quý, dùng nâng cấp gia viên.' },
  wood: { name: 'Thiết mộc', han: '鐵木', icon: 'wood', type: 'material', sell: 8, desc: 'Gỗ cứng, dùng xây gia viên.' },
  grilled: { name: 'Cá nướng', han: '烤魚', icon: 'meal', type: 'consumable', price: 0, desc: 'Hồi 30% khí huyết và nội lực.' },
};

const FISH_SPOTS = [[-62, 72], [-66, 30], [-90, 112], [-150, 108], [-175, 40]];

export class Life {
  constructor(g) {
    this.g = g;
    this.nodes = [];
    this.fishing = null;
  }

  async build() {
    const g = this.g;
    const rock = (await loadGLTF('/assets/nature/rock_medium_2.glb')).scene;
    const log = (await loadGLTF('/assets/nature/deadtree_4.glb')).scene;
    const r = rng(2024);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x6ad0ff, emissive: 0x2a7aff, emissiveIntensity: 0.8, roughness: 0.2 });
    const add = (kind, x, z) => {
      const y = g.terrain.heightAt(x, z);
      const m = (kind === 'wood' ? log : rock).clone(true);
      m.position.set(x, y - 0.1, z);
      m.scale.setScalar(kind === 'wood' ? 1.1 : 1.6);
      m.rotation.y = r() * 6.28;
      if (kind !== 'wood') {
        // tinh thể trên mỏ quặng
        for (let i = 0; i < 4; i++) {
          const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 + r() * 0.15), kind === 'jade' ? crystalMat.clone() : crystalMat);
          if (kind === 'jade') { c.material.color.set(0x6aff9a); c.material.emissive.set(0x1a9a4a); }
          c.position.set((r() - 0.5) * 0.9, 0.7 + r() * 0.4, (r() - 0.5) * 0.9);
          c.scale.y = 1.8;
          m.add(c);
        }
      }
      g.scene.add(m);
      this.nodes.push({ kind, x, z, mesh: m, respawn: 0 });
      g.colliders.circle(x, z, 0.8, y + 1.2);
    };
    // mỏ: chân núi phía bắc & đông; gỗ: rìa rừng
    const spots = (n, cx, cz, rad) => Array.from({ length: n }, () => { const a = r() * 6.28, d = Math.sqrt(r()) * rad; return [cx + Math.cos(a) * d, cz + Math.sin(a) * d]; });
    for (const [x, z] of spots(10, -40, -240, 40)) add('ore', x, z);
    for (const [x, z] of spots(5, 215, -215, 30)) add('jade', x, z);
    for (const [x, z] of spots(8, 160, -110, 45)) add('ore', x, z);
    for (const [x, z] of spots(12, -78, -18, 45)) add('wood', x, z);
    for (const [x, z] of spots(8, 150, 70, 45)) add('wood', x, z);
    // bến câu: phao nổi + gợn nước
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff3a2a, roughness: 0.4 }));
    for (const [x, z] of FISH_SPOTS) {
      const m = bob.clone();
      m.position.set(x, WATER_LEVEL + 0.1, z);
      g.scene.add(m);
      this.nodes.push({ kind: 'fish', x, z, mesh: m, respawn: 0 });
    }
  }

  nearest(p) {
    let best = null, bd = 3.2;
    for (const n of this.nodes) {
      if (n.respawn > 0) continue;
      const d = Math.hypot(n.x - p.x, n.z - p.z) - (n.kind === 'fish' ? 3 : 0);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  label(n) { return { fish: 'Câu cá', ore: 'Khai khoáng', jade: 'Khai ngọc thạch', wood: 'Chặt gỗ' }[n.kind]; }

  /** Bắt đầu khai thác. */
  start(n) {
    const g = this.g, p = g.player;
    p.setState('talk');
    p.faceTowards(Math.atan2(n.x - p.pos.x, n.z - p.pos.z), 1, 100);
    if (n.kind === 'fish') {
      p.char.play('Fishing_Cast', { once: true, restart: true, onDone: () => p.char.play('Fishing_Idle') });
      this.fishing = { node: n, t: 0, bite: (2 + Math.random() * 4) * (this.g.clock?.raining ? 0.5 : 1), window: 0 };
      g.toast('Thả câu... chờ cá cắn câu rồi bấm <kbd>E</kbd>', 2.5);
      return;
    }
    const anim = n.kind === 'wood' ? 'Chopping' : 'Pickaxing';
    p.char.play(anim, { restart: true });
    this.working = { node: n, t: 0, dur: n.kind === 'wood' ? 2.2 : 2.8 };
  }

  give(id, n = 1) {
    const g = this.g;
    g.rpg.add(id, n);
    g.audio.coin();
    g.toast(`Nhận <b>${LIFE_ITEMS[id].name}</b> ×${n}`, 1.8);
    g.mhud?.log('system', `Sinh hoạt: nhận <b class="cp">${LIFE_ITEMS[id].name}</b> ×${n}`);
    g.sys.s.stats.life = (g.sys.s.stats.life || 0) + n;
  }

  update(dt, input) {
    const g = this.g, p = g.player;
    for (const n of this.nodes) {
      if (n.respawn > 0) { n.respawn -= dt; n.mesh.visible = n.respawn <= 0; }
      else if (n.kind !== 'wood' && Math.random() < 0.02) g.fx.sparkle(n.mesh.position.clone().setY(n.mesh.position.y + 1), n.kind === 'fish' ? 0xbfe6ff : n.kind === 'jade' ? 0x8affb0 : 0x8ad0ff);
      if (n.kind === 'fish' && n.mesh.visible) n.mesh.position.y = WATER_LEVEL + 0.08 + Math.sin(performance.now() / 400 + n.x) * 0.05;
    }
    const f = this.fishing;
    if (f) {
      f.t += dt;
      if (f.t > f.bite && !f.window) { f.window = 1.3; g.toast('<b style="color:#ff6a5a">Cá cắn câu!</b> Bấm <kbd>E</kbd>', 1.2); g.audio.sfx('pluck') || g.audio.chime(); g.fx.burst(f.node.mesh.position.clone(), 0xbfe6ff, 16); }
      if (f.window) {
        f.window -= dt;
        if (input.pressed('KeyE') || input.pressed('Mouse0')) {
          this.fishing = null;
          p.char.play('Fishing_Catch', { once: true, restart: true, onDone: () => p.setState('free') });
          this.give(Math.random() < (g.clock?.raining ? 0.18 : 0.08) ? 'goldfish' : 'fish');
          g.rpg.gainExp(15);
          f.node.respawn = 8;
          return true;
        }
        if (f.window <= 0) { this.fishing = null; p.setState('free'); g.toast('Cá chạy mất rồi...', 1.4); }
      }
      if (input.pressed('Escape') || p.state !== 'talk') { this.fishing = null; p.setState('free'); }
      return true;
    }
    const w = this.working;
    if (w) {
      w.t += dt;
      if (Math.random() < 0.15) g.fx.sparks(w.node.mesh.position.clone().setY(w.node.mesh.position.y + 0.8));
      if ((w.snd = (w.snd || 0) - dt) <= 0) { w.snd = 0.7; g.audio.sfx(w.node.kind === 'wood' ? 'chop' : 'mine', { vol: 0.6 }); }
      if (w.t >= w.dur) {
        this.working = null;
        p.setState('free');
        const k = w.node.kind;
        this.give(k === 'wood' ? 'wood' : k === 'jade' ? 'jade_ore' : 'ore', 1 + (Math.random() < 0.3 ? 1 : 0));
        g.rpg.gainExp(12);
        if (k !== 'wood' && Math.random() < (k === 'jade' ? 0.4 : 0.12)) {
          const gid = randomGem(k === 'jade' ? 2 : 1);
          g.rpg.add(gid);
          g.toast(`Đào được <b style="color:${GEM_ITEMS[gid].color}">${GEM_ITEMS[gid].name}</b>!`, 2.2);
          g.audio.sfx('sparkle');
        }
        w.node.respawn = 45;
        w.node.mesh.visible = false;
      }
      return true;
    }
    return false;
  }
}
