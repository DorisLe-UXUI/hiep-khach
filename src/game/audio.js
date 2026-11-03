/**
 * Âm thanh: hiệu ứng thật (Kenney CC0) + nhạc nền theo khu vực (OpenGameArt CC0).
 * Khi file chưa tải xong thì dùng âm tổng hợp WebAudio làm dự phòng.
 */
const SFX = {
  hit: 3, heavy: 3, clang: 3, step: 3, mine: 3, chop: 3, swing: 3, coin: 2,
  latch: 1, click: 1, open: 1, close: 1, error: 1, sparkle: 1, pluck: 1,
  levelup: 1, success: 1, fail: 1,
};
export const MUSIC = ['menu', 'town', 'wild', 'lake', 'home', 'dungeon', 'boss', 'battle'];

export class Audio {
  constructor() {
    this.ctx = null;
    this.buf = {};
    this.musicVol = 0.45;
    this.track = null; this.trackName = null;
  }

  start() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.vol ?? 0.5;
    this.master.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.wind();
    this.loadSfx();
    if (this.wantMusic) this.music(this.wantMusic);
  }

  async loadSfx() {
    const jobs = [];
    for (const [name, n] of Object.entries(SFX)) {
      for (let i = 0; i < n; i++) {
        const file = n > 1 ? `${name}${i}` : name;
        jobs.push(fetch(`/assets/audio/sfx/${file}.mp3`).then((r) => r.arrayBuffer()).then((a) => this.ctx.decodeAudioData(a)).then((b) => { (this.buf[name] ??= []).push(b); }).catch(() => {}));
      }
    }
    await Promise.all(jobs);
  }

  /** Phát một hiệu ứng thật; trả false nếu chưa có để dùng âm tổng hợp. */
  sfx(name, { vol = 0.7, rate = 1, jitter = 0.08 } = {}) {
    const list = this.buf[name];
    if (!this.ctx || !list?.length) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = rate * (1 + (Math.random() - 0.5) * jitter * 2);
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.master);
    src.start();
    return true;
  }

  /** Nhạc nền: đổi bài mượt (fade 2s). */
  music(name) {
    this.wantMusic = name;
    if (!this.ctx || name === this.trackName) return;
    const old = this.track;
    this.trackName = name;
    if (old) { const a = old; const t0 = a.volume; let k = 0; const iv = setInterval(() => { k += 0.05; a.volume = Math.max(0, t0 * (1 - k)); if (k >= 1) { clearInterval(iv); a.pause(); } }, 100); }
    if (!name) { this.track = null; return; }
    const a = new window.Audio(`/assets/audio/music/${name}.mp3`);
    a.loop = true; a.volume = 0;
    a.play().catch(() => {});
    this.track = a;
    let k = 0;
    const iv = setInterval(() => { k += 0.05; if (this.track !== a) return clearInterval(iv); a.volume = Math.min(1, k) * this.musicVol * (this.vol ?? 0.5) * 1.6; if (k >= 1) clearInterval(iv); }, 100);
  }

  burst({ dur = 0.2, freq = 1000, q = 1, type = 'bandpass', gain = 0.5, sweep = 1 }) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 1;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  tone(freq, dur, gain = 0.2, type = 'sine') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur);
  }

  swoosh(k = 1) { if (this.sfx('swing', { vol: 0.55 * k })) return; this.burst({ dur: 0.22 * k, freq: 600, q: 2, sweep: 4, gain: 0.35 }); }
  whoosh() { if (this.sfx('swing', { vol: 0.7, rate: 0.7 })) return; this.burst({ dur: 0.5, freq: 300, q: 1, sweep: 3, gain: 0.4 }); this.tone(220, 0.4, 0.08, 'triangle'); }
  hit(heavy) { if (this.sfx(heavy ? 'heavy' : 'hit', { vol: 0.8 })) return; this.burst({ dur: 0.12, freq: 220, q: 0.8, type: 'lowpass', gain: 0.9, sweep: 0.5 }); this.tone(90, 0.15, 0.3); }
  clang() { if (this.sfx('clang', { vol: 0.6 })) return; this.tone(1450, 0.5, 0.15, 'triangle'); this.tone(2310, 0.35, 0.08, 'sine'); this.burst({ dur: 0.08, freq: 3000, gain: 0.3 }); }
  coin() { if (this.sfx('coin', { vol: 0.6 })) return; this.tone(1320, 0.12, 0.1, 'triangle'); setTimeout(() => this.tone(1760, 0.18, 0.1, 'triangle'), 70); }
  levelUp() { if (this.sfx('levelup', { vol: 0.6, jitter: 0 })) return; [392, 523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.7, 0.13, 'triangle'), i * 90)); }
  // ─────────── âm chiêu thức tổng hợp nhiều lớp (có vang) ───────────
  /** Bus vang: tiếng chiêu đi qua đây cho cảm giác rộng, "ảo". */
  fxBus() {
    if (this._bus) return this._bus;
    const c = this.ctx, len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    const rev = c.createConvolver(); rev.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.45;
    const dry = c.createGain(); dry.gain.value = 0.85;
    const bus = c.createGain();
    bus.connect(dry).connect(this.master);
    bus.connect(rev).connect(wet).connect(this.master);
    return (this._bus = bus);
  }
  /** Dao động có đường cao độ + đường âm lượng. */
  osc({ type = 'sine', f0 = 440, f1 = f0, dur = 0.5, gain = 0.2, at = 0, attack = 0.01, detune = 0 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.fxBus());
    o.start(t); o.stop(t + dur + 0.05);
  }
  noiz({ dur = 0.3, f0 = 1000, f1 = f0, q = 1, type = 'bandpass', gain = 0.3, at = 0, attack = 0.01 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.fxBus());
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  /** Bộ âm chiêu: charge (gồng), slash (kiếm khí), zap (sét), ice, fire, boom (nổ), heal, ult (tuyệt kỹ), rage, arrow. */
  skill(kind, k = 1) {
    if (!this.ctx) return;
    const O = (o) => this.osc(o), N = (o) => this.noiz(o);
    switch (kind) {
      case 'charge':
        O({ type: 'sawtooth', f0: 110, f1: 440, dur: 0.6, gain: 0.05 * k, attack: 0.4 });
        O({ type: 'sine', f0: 220, f1: 880, dur: 0.6, gain: 0.08 * k, attack: 0.4 });
        [1318, 1568, 1976, 2637].forEach((f, i) => O({ type: 'triangle', f0: f, dur: 0.5, gain: 0.04 * k, at: i * 0.07 }));
        N({ dur: 0.6, f0: 400, f1: 6000, q: 3, gain: 0.08 * k, attack: 0.45 });
        break;
      case 'slash':
        N({ dur: 0.32, f0: 2600, f1: 500, q: 2.5, gain: 0.35 * k });
        O({ type: 'sine', f0: 2093, dur: 0.7, gain: 0.07 * k }); O({ type: 'sine', f0: 3136, dur: 0.5, gain: 0.05 * k });
        O({ type: 'triangle', f0: 523, f1: 1046, dur: 0.25, gain: 0.06 * k });
        break;
      case 'zap':
        for (let i = 0; i < 5; i++) N({ dur: 0.07, f0: 3000 + Math.random() * 3000, q: 1.5, gain: 0.32 * k, at: i * 0.045 + Math.random() * 0.02 });
        O({ type: 'square', f0: 1400, f1: 90, dur: 0.35, gain: 0.05 * k });
        O({ type: 'sine', f0: 70, f1: 35, dur: 0.9, gain: 0.3 * k, at: 0.03 });
        break;
      case 'ice':
        [2349, 2793, 3520, 4186].forEach((f, i) => O({ type: 'sine', f0: f, dur: 0.8, gain: 0.05 * k, at: i * 0.04 }));
        N({ dur: 0.4, f0: 6000, f1: 2000, q: 4, gain: 0.15 * k });
        O({ type: 'triangle', f0: 880, f1: 220, dur: 0.4, gain: 0.08 * k });
        break;
      case 'fire':
        N({ dur: 0.7, f0: 300, f1: 1800, q: 0.8, type: 'lowpass', gain: 0.4 * k, attack: 0.08 });
        N({ dur: 0.5, f0: 2500, f1: 900, q: 1, gain: 0.12 * k, at: 0.05 });
        O({ type: 'sawtooth', f0: 90, f1: 55, dur: 0.6, gain: 0.07 * k });
        break;
      case 'boom':
        O({ type: 'sine', f0: 140, f1: 32, dur: 0.9, gain: 0.55 * k });
        O({ type: 'triangle', f0: 70, f1: 28, dur: 1.2, gain: 0.25 * k });
        N({ dur: 0.6, f0: 1200, f1: 90, q: 0.7, type: 'lowpass', gain: 0.55 * k });
        N({ dur: 0.15, f0: 4000, q: 0.8, gain: 0.15 * k });
        break;
      case 'heal':
        [523, 659, 784, 1046, 1318].forEach((f, i) => { O({ type: 'sine', f0: f, dur: 1.2, gain: 0.07 * k, at: i * 0.08 }); O({ type: 'sine', f0: f * 2.01, dur: 0.7, gain: 0.02 * k, at: i * 0.08 }); });
        N({ dur: 1, f0: 5000, f1: 9000, q: 6, gain: 0.05 * k, attack: 0.3 });
        break;
      case 'arrow':
        N({ dur: 0.22, f0: 1800, f1: 600, q: 3, gain: 0.22 * k });
        O({ type: 'sine', f0: 1760, f1: 2637, dur: 0.3, gain: 0.04 * k });
        break;
      case 'ult':
        // gồng → nổ trầm → cồng chiêng → hợp xướng
        this.skill('boom', 1.2 * k);
        [110, 167.4, 232.7, 314, 413].forEach((f, i) => O({ type: 'sine', f0: f, f1: f * 0.98, dur: 3.2 - i * 0.4, gain: (0.16 - i * 0.025) * k, at: 0.02 }));
        [220, 277.2, 329.6, 440].forEach((f) => { O({ type: 'sawtooth', f0: f, dur: 2.2, gain: 0.025 * k, attack: 0.5, detune: -8, at: 0.1 }); O({ type: 'sawtooth', f0: f, dur: 2.2, gain: 0.025 * k, attack: 0.5, detune: 9, at: 0.1 }); });
        [1046, 1318, 1568, 2093, 2637].forEach((f, i) => O({ type: 'triangle', f0: f, dur: 0.9, gain: 0.04 * k, at: 0.25 + i * 0.07 }));
        N({ dur: 1.6, f0: 8000, f1: 400, q: 0.6, gain: 0.12 * k });
        break;
      case 'rage':
        O({ type: 'sawtooth', f0: 55, f1: 110, dur: 0.9, gain: 0.12 * k, attack: 0.2 });
        O({ type: 'square', f0: 82, f1: 165, dur: 0.9, gain: 0.05 * k, attack: 0.2 });
        this.skill('boom', 0.8 * k);
        [392, 523, 659, 784].forEach((f, i) => O({ type: 'triangle', f0: f, dur: 0.8, gain: 0.05 * k, at: 0.3 + i * 0.06 }));
        break;
    }
  }
  /** Tiếng trúng chí mạng: ting kim loại + nổ ngắn. */
  crit() { this.skill('slash', 0.6); this.osc({ type: 'sine', f0: 3520, dur: 0.4, gain: 0.06 }); this.osc({ type: 'sine', f0: 90, f1: 40, dur: 0.3, gain: 0.3 }); }
  setVolume(v) { if (this.master) this.master.gain.value = v; this.vol = v; if (this.track) this.track.volume = this.musicVol * v * 1.6; }
  setMusicVolume(v) { this.musicVol = v; if (this.track) this.track.volume = v * (this.vol ?? 0.5) * 1.6; }
  /** Tiếng mưa (nhiễu lọc thông thấp), k: 0..1 */
  rain(k) {
    if (!this.ctx) return;
    if (!this.rainG) {
      if (k < 0.02) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.4;
      this.rainG = this.ctx.createGain(); this.rainG.gain.value = 0;
      src.connect(f).connect(this.rainG).connect(this.master);
      src.start();
    }
    this.rainG.gain.value = k * 0.22;
  }
  /** Lồng tiếng: phát một câu (ngắt câu trước); name = null để dừng */
  voice(name) {
    if (this.voiceEl) { this.voiceEl.pause(); this.voiceEl = null; }
    if (!name) return;
    const a = new window.Audio(`/assets/voice/${name}.mp3`);
    a.volume = Math.min(1, (this.vol ?? 0.5) * 1.5) * (this.voiceVol ?? 0.9);
    a.play().catch(() => {});
    this.voiceEl = a;
    // nhạc nền nhỏ lại khi có người nói
    if (this.track) { this.track.volume *= 0.45; a.onended = () => this.setMusicVolume(this.musicVol); }
  }
  ui(name = 'click') { this.sfx(name, { vol: 0.35, jitter: 0.02 }); }
  step() { this.sfx('step', { vol: 0.18 }); }
  chime() { if (this.sfx('success', { vol: 0.45, jitter: 0 })) return; [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 0.12, 'sine'), i * 110)); }

  wind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 380;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lg = this.ctx.createGain();
    lg.gain.value = 160;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    lfo.start();
  }
}
