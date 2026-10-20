/** Âm thanh tổng hợp bằng WebAudio (không cần file): tiếng kiếm, trúng đòn, đỡ đòn, gió. */
export class Audio {
  constructor() {
    this.ctx = null;
  }

  start() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.wind();
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

  swoosh(k = 1) { this.burst({ dur: 0.22 * k, freq: 600, q: 2, sweep: 4, gain: 0.35 }); }
  whoosh() { this.burst({ dur: 0.5, freq: 300, q: 1, sweep: 3, gain: 0.4 }); this.tone(220, 0.4, 0.08, 'triangle'); }
  hit() { this.burst({ dur: 0.12, freq: 220, q: 0.8, type: 'lowpass', gain: 0.9, sweep: 0.5 }); this.tone(90, 0.15, 0.3); }
  clang() { this.tone(1450, 0.5, 0.15, 'triangle'); this.tone(2310, 0.35, 0.08, 'sine'); this.burst({ dur: 0.08, freq: 3000, gain: 0.3 }); }
  chime() { [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.6, 0.12, 'sine'), i * 110)); }

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
