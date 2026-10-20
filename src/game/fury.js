/**
 * Liên kích (combo) & Nộ khí: đánh trúng liên tục tăng combo (+% sát thương),
 * nộ khí đầy thì bấm X để "Bộc phát": 10 giây công +30%, hút máu 5%.
 */
export class Fury {
  constructor(g) { this.g = g; this.combo = 0; this.comboT = 0; this.rage = 0; this.burst = 0; this.best = 0; }

  hit(dmg) {
    this.combo++;
    this.comboT = 3;
    if (this.combo > this.best) this.best = this.combo;
    if (!this.burst) this.rage = Math.min(100, this.rage + 2.5);
    if (this.burst > 0) this.g.player.heal(dmg * 0.05);
    if (this.combo % 25 === 0) this.g.toast(`<span class="han">連擊</span> Liên kích <b>${this.combo}</b>!`, 1.2);
    const s = this.g.sys.s.stats; if (this.combo > (s.bestCombo || 0)) s.bestCombo = this.combo;
  }
  hurt() { this.rage = Math.min(100, this.rage + 4); }

  /** Hệ số sát thương: combo + bộc phát */
  mult() {
    const c = this.combo >= 50 ? 0.15 : this.combo >= 30 ? 0.1 : this.combo >= 10 ? 0.05 : 0;
    return 1 + c + (this.burst > 0 ? 0.3 : 0);
  }

  activate() {
    if (this.rage < 100 || this.burst > 0) return false;
    const g = this.g, p = g.player;
    this.rage = 0; this.burst = 10;
    g.vfx.pillar(p.pos.clone(), 0xff5a2a, 8);
    g.vfx.shockwave(p.pos.clone(), 0xff7a3a, 7);
    g.audio.levelUp();
    g.camRig.shake = 0.8;
    g.mhud?.announce(`<b>${g.profile.name}</b> Bộc phát nộ khí! <span class="han">怒</span>`);
    g.sys.s.stats.bursts = (g.sys.s.stats.bursts || 0) + 1;
    return true;
  }

  update(dt) {
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.burst > 0) {
      this.burst = Math.max(0, this.burst - dt);
      if (Math.random() < dt * 12) this.g.fx.sparkle(this.g.player.pos.clone().setY(this.g.player.pos.y + 0.4 + Math.random() * 1.6), 0xff6a2a);
    }
  }
}
