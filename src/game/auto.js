import * as THREE from 'three';

/**
 * Auto (tự động): tìm địch gần nhất, áp sát, đánh thường + xả chiêu khi có nội lực,
 * uống thuốc khi máu thấp; hết địch thì tự đi tới mục tiêu nhiệm vụ và bắt chuyện với NPC.
 */
export class AutoPilot {
  constructor(g) {
    this.g = g;
    this.on = false;
    this.pausedT = 0;
    this.target = null;
    this.stuckT = 0;
    this.lastPos = new THREE.Vector3();
    this.atkT = 0;
  }

  toggle() {
    this.on = !this.on;
    this.g.toast(this.on ? 'Tự động chiến đấu: <b>BẬT</b>' : 'Tự động chiến đấu: TẮT', 1.4);
    this.g.mhud?.log('system', this.on ? 'Đã bật tự động chiến đấu & làm nhiệm vụ.' : 'Đã tắt tự động.');
  }

  /** Người chơi tự điều khiển thì tạm dừng Auto một lúc. */
  pause(t) { this.pausedT = Math.max(this.pausedT, t); }

  /** Trả về input ảo (move + nút) cho frame này, hoặc null nếu không can thiệp. */
  drive(dt) {
    const g = this.g, p = g.player;
    if (!this.on || g.dialogOpen || p.dead) return null;
    if (this.pausedT > 0) { this.pausedT -= dt; return null; }
    const out = { move: null, press: [] };

    if (p.hp < p.maxHp * 0.4 && g.rpg.potions > 0 && p.cooldowns.potion <= 0) out.press.push('KeyR');

    // chọn mục tiêu
    if (!this.target || this.target.dead) this.target = g.combat.nearestEnemy(p.pos, 28, p.forward(), -1);
    const e = this.target;
    if (e) {
      const to = new THREE.Vector3().subVectors(e.pos, p.pos).setY(0);
      const d = to.length();
      const reach = p.cls.attack === 'melee' ? p.cls.range * 0.8 : 14;
      p.yaw = Math.atan2(to.x, to.z);
      if (d > reach) out.move = to.normalize();
      else {
        this.atkT -= dt;
        if (this.atkT <= 0) { out.press.push('Mouse0'); this.atkT = p.cls.attack === 'melee' ? 0.18 : 0.4; }
        if (p.cooldowns.dash <= 0 && p.mp > p.cls.q.mp + 10 && Math.random() < 0.03) out.press.push('KeyQ');
        if (p.cooldowns.cast <= 0 && p.mp > p.cls.f.mp + 5 && Math.random() < 0.04) out.press.push('KeyF');
      }
      return out;
    }

    // không có địch: đi làm nhiệm vụ
    const mk = g.markerPos();
    if (mk) {
      const to = new THREE.Vector3(mk.x - p.pos.x, 0, mk.z - p.pos.z);
      const d = to.length();
      const it = g.nearestInteract();
      if (it && d < 4) { out.press.push('KeyE'); return out; }
      if (d > 2.2) {
        out.move = to.normalize();
        out.sprint = d > 20;
        // kẹt vật cản: lách sang ngang
        this.stuckT = p.pos.distanceTo(this.lastPos) < dt * 1.2 ? this.stuckT + dt : 0;
        this.lastPos.copy(p.pos);
        if (this.stuckT > 0.6) out.move.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(performance.now() / 700) > 0 ? 1.2 : -1.2);
        if (this.stuckT > 2.5) { out.press.push('Space'); this.stuckT = 0; }
      }
    }
    return out;
  }
}
