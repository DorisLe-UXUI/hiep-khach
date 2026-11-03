import * as THREE from 'three';
import { BEASTS } from './beasts.js';

/**
 * Tâm giao linh thú: thân mật (0–1000) tăng khi cùng chiến đấu, cho ăn, vuốt ve, đi cùng nhau.
 * Đủ cấp + thân mật thì tiến hoá (Ấu thể → Thành thể → Linh thể → Thần thú): to hơn, phát sáng, mạnh hơn,
 * mở kỹ năng mới (Hộ chủ, Hợp kích, Thần uy) và mở dần ký ức riêng của từng con.
 */
export const BOND_TIERS = [
  { at: 0, name: 'Xa lạ', han: '生' },
  { at: 100, name: 'Quen thuộc', han: '熟' },
  { at: 300, name: 'Thân thiết', han: '親' },
  { at: 600, name: 'Tri kỷ', han: '知' },
  { at: 1000, name: 'Bất ly', han: '伴' },
];
export const STAGES = [
  { name: 'Ấu thể', han: '幼', lv: 1, bond: 0, scale: 1, mul: 1 },
  { name: 'Thành thể', han: '成', lv: 10, bond: 100, scale: 1.2, mul: 1.25, unlock: 'Hộ chủ: khi chủ dưới 30% khí huyết, linh thú lao tới che chắn (khiên 30% trong 5 giây, mỗi 60 giây)' },
  { name: 'Linh thể', han: '靈', lv: 20, bond: 300, scale: 1.4, mul: 1.6, glow: 0x8affd8, unlock: 'Hợp kích: khi chủ thi triển tuyệt kỹ, linh thú tung đòn từ trời theo cùng' },
  { name: 'Thần thú', han: '神', lv: 30, bond: 600, scale: 1.65, mul: 2.1, glow: 0xffd86a, unlock: 'Thần uy: mọi hiệu quả của linh thú ×1.5, toả hào quang thần thú' },
];
export const MAX_BOND = 1000;

// Ký ức mở theo bậc thân mật (theo tính cách = kỹ năng của linh thú)
const MEMORIES = {
  bite: [
    'Lần đầu gặp, nó gầm gừ và không cho ngươi lại gần. Nhưng đêm đó, nó nằm canh ngoài lửa trại.',
    'Nó mang về cho ngươi một con thỏ rừng, đặt trước chân, rồi quay đi như chẳng có gì.',
    'Trên Đồi Gió, có tiếng hú vọng lại từ bầy cũ. Nó nhìn về phía đó rất lâu, rồi lại bước theo ngươi.',
    'Ngươi bị thương nặng. Nó đứng chắn trước mặt, lông dựng đứng, không lùi nửa bước. Từ đó, ngươi là bầy của nó.',
  ],
  charm: [
    'Nó tò mò ngửi túi đồ của ngươi, rồi giật mất một chiếc bánh và chạy biến.',
    'Hồ ly thích ngồi trên vai ngươi nhìn trăng. Đuôi nó ấm như lửa nhỏ.',
    'Một đêm, ngươi thấy nó hoá thành bóng một thiếu nữ áo đỏ bên bờ suối. Sáng ra, nó lại là hồ ly, giả như chẳng có gì.',
    'Nó để lại trong tay ngươi một sợi lông đỏ phát sáng: "Dù xa ngàn dặm, ta vẫn tìm được ngươi."',
  ],
  heal: [
    'Thỏ ngọc run rẩy khi ngươi lại gần. Ngươi đặt xuống một nhánh cỏ, rồi lùi ra.',
    'Mỗi lần ngươi bị thương, nó lại dụi đầu vào vết thương. Chỗ đó ấm lên kỳ lạ.',
    'Đêm rằm, nó nhìn trăng không chớp mắt. Dường như nó nhớ cung Quảng Hàn.',
    'Nó có thể trở về trăng, nhưng nó chọn ở lại. Vì trên đời này, ngươi cũng cần người chữa thương.',
  ],
  greed: [
    'Nó lục túi ngươi lúc ngươi ngủ. Sáng ra, túi có thêm ba đồng bạc lạ.',
    'Tham Tài Ly giấu một kho báu nhỏ dưới gốc cây. Nó dẫn ngươi tới khoe, mắt sáng rỡ.',
    'Nó đánh đổi viên ngọc quý nhất của mình để lấy một chiếc bánh bao cho ngươi lúc đói.',
    'Với nó, kho báu lớn nhất không còn là bạc vàng. Là người cho nó ăn mỗi ngày.',
  ],
  loyal: [
    'Nó đi theo ngươi từ chợ về, không chịu rời nửa bước.',
    'Ngươi về muộn. Nó ngồi đợi ở cổng trấn, đuôi vẫy như chong chóng.',
    'Có kẻ định đánh lén sau lưng ngươi. Nó sủa vang cả khu rừng.',
    'Dù ngươi đi tới chân trời, nó vẫn theo. Trung thành không cần lý do.',
  ],
  fortune: [
    'Con mèo này chỉ thích nằm trên đống bạc. Ngươi đặt tên nó là "Chiêu Tài".',
    'Nó mang về một đồng xu cổ có khắc chữ "福".',
    'Lúc ngươi buồn, nó cuộn tròn trong lòng ngươi kêu rừ rừ. Ngươi thấy mình giàu có lạ thường.',
    'Ông lão bán mèo năm xưa bảo: mèo chiêu tài chỉ đem may cho người nó thương. Giờ thì ngươi hiểu.',
  ],
  iron: [
    'Thực Thiết Thú gặm luôn thanh đao gãy của ngươi như gặm măng.',
    'Nó lăn tròn đè bẹp một tên sơn tặc rồi ngồi lên đó ăn trúc, rất bình thản.',
    'Sách cổ nói: Thực Thiết Thú là toạ kỵ của Xi Vưu. Nó ngáp, như chẳng quan tâm chuyện xưa.',
    'Giữa trận chiến, nó ôm chặt lấy ngươi che mưa tên. Lưng nó cứng như thép, mà tim thì mềm.',
  ],
  breath: [
    'Rồng con phun lửa cháy sém mái tóc ngươi. Nó có vẻ rất tự hào.',
    'Nó học bay bằng cách nhảy từ vai ngươi xuống. Ngã sấp mặt mười lần, lần thứ mười một thì bay được.',
    'Trong mơ, nó thấy một con rồng đỏ khổng lồ gọi tên nó. Nó tỉnh dậy, rúc vào áo ngươi.',
    'Ngày nó thành thần long, nó cúi đầu trước ngươi: "Rồng không có chủ. Chỉ có bằng hữu."',
  ],
};
const BARKS = [
  ['(nhìn ngươi dè chừng)', '(đánh hơi xung quanh)'],
  ['(dụi đầu vào chân ngươi)', '(chạy vòng quanh ngươi)'],
  ['(kêu lên vui vẻ)', '(nhảy lên muốn được ôm)', '(mang về một nhành hoa)'],
  ['(nhìn ngươi đầy tin tưởng)', '(nằm cạnh ngươi, rất yên bình)', '(gầm khẽ về phía bóng tối, che chắn cho ngươi)'],
  ['(như hiểu được lòng ngươi)', '(cùng ngươi ngắm mây trời)', '(đứng sát bên, không bao giờ rời đi)'],
];

export class Bond {
  constructor(g) { this.g = g; this.t = 0; this.barkT = 40; this.guardCool = 0; }
  rec(id) {
    const o = this.g.beasts.s.owned[id];
    if (!o) return null;
    o.bond ??= 0; o.stage ??= 0; o.mem ??= 0;
    return o;
  }
  tier(id) { const b = this.rec(id)?.bond || 0; let i = 0; BOND_TIERS.forEach((t, k) => { if (b >= t.at) i = k; }); return i; }
  stage(id) { return this.rec(id)?.stage || 0; }
  stageDef(id) { return STAGES[this.stage(id)]; }
  /** Hệ số mạnh của linh thú theo tiến hoá (Thần uy cộng thêm). */
  mul(id) { return this.stageDef(id)?.mul || 1; }
  memories(id) { const sk = BEASTS[id]?.pet?.skill; const o = this.rec(id); return (MEMORIES[sk] || []).slice(0, o?.mem || 0); }

  gain(id, n, why) {
    const o = this.rec(id);
    if (!o || !BEASTS[id].pet) return;
    const before = this.tier(id);
    o.bond = Math.min(MAX_BOND, o.bond + n);
    const after = this.tier(id);
    if (after > before) {
      const t = BOND_TIERS[after], d = BEASTS[id];
      this.g.toast(`<span class="han">${t.han}</span> <b>${d.name}</b> với ngươi: <b>${t.name}</b>`, 3);
      this.g.audio.skill?.('heal', 0.7);
      // mở ký ức mới
      const mem = MEMORIES[d.pet.skill]?.[after - 1];
      if (mem && o.mem < after) {
        o.mem = after;
        setTimeout(() => this.g.toast(`<span class="han">憶</span> Ký ức mới cùng <b>${d.name}</b><br><span class="sm">${mem}</span>`, 7), 1200);
      }
      if (this.canEvolve(id)) setTimeout(() => this.g.toast(`<b>${d.name}</b> có thể <b>tiến hoá</b>! Mở Ngự thú (B)`, 3), 2600);
    }
    if (why === 'pet') this.g.fx.burst(this.g.companions.petPos.clone().setY(this.g.companions.petPos.y + 0.8), 0xff8ab0, 18);
  }

  canEvolve(id) {
    const o = this.rec(id), nx = STAGES[(o?.stage || 0) + 1];
    return !!(o && nx && o.lv >= nx.lv && o.bond >= nx.bond);
  }
  evolve(id) {
    if (!this.canEvolve(id)) return false;
    const o = this.rec(id), d = BEASTS[id];
    o.stage++;
    const st = STAGES[o.stage], g = this.g, pos = g.companions.petPos.clone();
    const pal = [st.glow || 0x8affc0, 0xffffff, 0xffd86a, 0xff8ae0];
    g.vfx.pillar(pos, pal[0], 7);
    g.vfx.rings(pos, pal, 6);
    g.vfx.spiral(pos, pal, 90, 5, 1.2);
    g.vfx.banner(st.han + '化', `${d.name} · ${st.name}`, '#' + pal[0].toString(16).padStart(6, '0'));
    g.vfx.flashScreen('#' + pal[0].toString(16).padStart(6, '0'), 0.4);
    g.audio.skill?.('ult', 0.8);
    g.mhud?.announce(`<b>${d.name}</b> của <b>${g.profile.name}</b> tiến hoá thành <b>${st.name}</b> <span class="han">${st.han}</span>!`);
    this.applyLook();
    g.rpg.apply();
    return true;
  }

  /** Kích thước + quầng sáng theo bậc tiến hoá. */
  applyLook() {
    const c = this.g.companions, id = c.petId;
    if (!c.pet || !id) return;
    const st = this.stageDef(id) || STAGES[0];
    c.pet.root.scale.setScalar(st.scale);
    if (c.petGlow) { c.pet.root.remove(c.petGlow); c.petGlow = null; }
    if (st.glow) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.4, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), color: st.glow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
      sp.scale.setScalar(2.2); sp.position.y = 0.5;
      c.pet.root.add(sp); c.petGlow = sp;
    }
  }

  /** Vuốt ve: mỗi 5 phút một lần. */
  pat(id) {
    const o = this.rec(id), now = Date.now();
    if (!o) return false;
    if (now - (o.patAt || 0) < 5 * 60 * 1000) { this.g.toast(`<b>${BEASTS[id].name}</b> đang lim dim ngủ… (thử lại sau ${Math.ceil((5 * 60 * 1000 - (now - (o.patAt || 0))) / 60000)} phút)`, 2); return false; }
    o.patAt = now;
    this.gain(id, 25, 'pet');
    this.say(id, true);
    return true;
  }

  say(id, force) {
    const t = this.tier(id), list = BARKS[t];
    this.g.hud.bark(BEASTS[id].name, `/assets/thumbs/mon_b_${id}.png`, list[Math.random() * list.length | 0], 3.5);
    if (force) this.g.audio.chime();
  }

  /** Gọi khi chủ thi triển tuyệt kỹ (Hợp kích từ Linh thể). */
  onUlt() {
    const g = this.g, c = g.companions, id = c.petId;
    if (!c.pet?.root.visible || this.stage(id) < 2) return;
    const pal = [STAGES[this.stage(id)].glow, 0xffffff, 0xff8ae0, 0xffd86a];
    setTimeout(() => {
      g.vfx.skyRain(g.player.pos, pal, 'blade', 6, 8, 0.8);
      for (const e of g.enemies) if (!e.dead && !e.beast && e.pos.distanceTo(g.player.pos) < 7) g.combat.hurtEnemy(c, e, c.petAtk() * 2.2, { knock: true, back: 3 });
      g.toast(`<b>${BEASTS[id].name}</b> · Hợp kích!`, 1.2);
    }, 500);
  }

  update(dt) {
    const g = this.g, c = g.companions, id = c.petId, p = g.player;
    if (!c.pet?.root.visible || !id || p.dead) return;
    this.t += dt; this.guardCool -= dt;
    if (this.t > 60) { this.t = 0; this.gain(id, 1); } // đi cùng nhau
    // Hộ chủ (Thành thể trở lên)
    if (this.stage(id) >= 1 && this.guardCool <= 0 && p.hp < p.maxHp * 0.3) {
      this.guardCool = 60;
      g.status?.add('shield', 5, 0.3);
      c.petPos.copy(p.pos).addScaledVector(p.forward(), 1.2);
      g.vfx.shockwave(p.pos.clone(), 0x8affd8, 3);
      g.vfx.impact(p.pos.clone().setY(p.pos.y + 1), [0x8affd8, 0xffffff], 2);
      g.toast(`<b>${BEASTS[id].name}</b> lao tới che chắn cho ngươi! · Hộ chủ`, 2);
      this.gain(id, 5);
    }
    // thỉnh thoảng nói (ngoài lúc đánh nhau, hội thoại)
    if (!g.dialogOpen && !(p.inCombat > 0) && (this.barkT -= dt) <= 0) { this.barkT = 70 + Math.random() * 60; this.say(id); }
    // Thần thú: hạt sáng bay quanh
    if (this.stage(id) >= 3 && Math.random() < dt * 6) g.fx.sparkle(c.petPos.clone().setY(c.petPos.y + 0.6), 0xffd86a);
  }
}
