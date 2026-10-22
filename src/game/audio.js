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
