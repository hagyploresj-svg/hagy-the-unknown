// Tamamen WebAudio ile üretilen sesler — harici ses dosyası gerekmez.
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private chaseGain: GainNode | null = null;
  private genGain: GainNode | null = null;
  private heartT = 0;
  private creakT = 6;

  init(): void {
    if (typeof window === 'undefined') return;
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    this.master = master;

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    this.buildDrone(ctx, master);
    this.buildChase(ctx, master);
    this.buildGenerator(ctx, master);
  }

  private buildDrone(ctx: AudioContext, out: GainNode): void {
    const g = ctx.createGain();
    g.gain.value = 0.2;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180;
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 46;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 51.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 70;
    lfo.connect(lfoG);
    lfoG.connect(lp.frequency);
    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(out);
    o1.start();
    o2.start();
    lfo.start();
  }

  private buildChase(ctx: AudioContext, out: GainNode): void {
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const a = ctx.createOscillator();
    a.type = 'square';
    a.frequency.value = 110;
    const b = ctx.createOscillator();
    b.type = 'sawtooth';
    b.frequency.value = 155.6; // tritone — gerilim
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.5;
    lfo.connect(lfoG);
    lfoG.connect(trem.gain);
    a.connect(lp);
    b.connect(lp);
    lp.connect(trem);
    trem.connect(g);
    g.connect(out);
    a.start();
    b.start();
    lfo.start();
    this.chaseGain = g;
  }

  private buildGenerator(ctx: AudioContext, out: GainNode): void {
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 58;
    o.connect(lp);
    lp.connect(g);
    g.connect(out);
    o.start();
    this.genGain = g;
  }

  private burst(
    dur: number,
    freq: number,
    q: number,
    gain: number,
    type: BiquadFilterType = 'bandpass',
    when = 0,
  ): void {
    const ctx = this.ctx;
    const nb = this.noiseBuf;
    const m = this.master;
    if (!ctx || !nb || !m) return;
    const src = ctx.createBufferSource();
    src.buffer = nb;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(m);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType = 'sine',
    when = 0,
    slideTo?: number,
  ): void {
    const ctx = this.ctx;
    const m = this.master;
    if (!ctx || !m) return;
    const o = ctx.createOscillator();
    o.type = type;
    const t = ctx.currentTime + when;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(m);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  step(run: boolean): void {
    this.burst(0.09, 320, 0.7, run ? 0.34 : 0.2, 'lowpass');
  }

  thud(vol: number): void {
    const v = Math.max(0.02, Math.min(1, vol));
    this.tone(70, 0.16, 0.5 * v, 'sine');
    this.burst(0.12, 200, 0.7, 0.35 * v, 'lowpass');
  }

  click(): void {
    this.burst(0.03, 2400, 3, 0.25, 'bandpass');
  }

  pickup(): void {
    this.tone(660, 0.18, 0.18, 'sine');
    this.tone(990, 0.3, 0.16, 'sine', 0.09);
  }

  bang(): void {
    this.burst(0.7, 140, 0.8, 0.9, 'lowpass');
    this.tone(60, 0.6, 0.6, 'sine', 0, 30);
  }

  heart(strength: number): void {
    this.tone(55, 0.18, 0.12 + 0.45 * strength, 'sine');
    this.tone(48, 0.2, 0.08 + 0.35 * strength, 'sine', 0.17);
  }

  private ambientEvent(): void {
    const r = Math.random();
    if (r < 0.4) {
      this.tone(130, 1.3, 0.05, 'sawtooth', 0, 70);
      this.burst(1.0, 500, 6, 0.05, 'bandpass');
    } else if (r < 0.75) {
      this.tone(80, 0.12, 0.35, 'sine');
      this.tone(80, 0.12, 0.3, 'sine', 0.22);
    } else {
      this.burst(1.8, 1300, 9, 0.05, 'bandpass'); // uzaktan fısıltı gibi
    }
  }

  jumpscare(): void {
    this.burst(0.9, 2200, 0.6, 1.0, 'bandpass');
    this.burst(0.7, 120, 0.7, 1.0, 'lowpass');
    this.tone(190, 1.0, 0.5, 'sawtooth', 0, 60);
    this.tone(201, 1.0, 0.45, 'sawtooth', 0, 63);
    this.tone(95, 1.2, 0.5, 'square', 0, 40);
  }

  generatorStart(): void {
    this.burst(1.4, 180, 0.8, 0.7, 'lowpass');
    this.tone(40, 1.4, 0.5, 'sawtooth', 0, 62);
  }

  winSting(): void {
    this.tone(392, 0.8, 0.2, 'sine');
    this.tone(523, 1.0, 0.2, 'sine', 0.25);
    this.tone(784, 1.6, 0.18, 'sine', 0.5);
  }

  setChase(on: boolean): void {
    if (!this.ctx || !this.chaseGain) return;
    this.chaseGain.gain.setTargetAtTime(on ? 0.09 : 0, this.ctx.currentTime, 0.4);
  }

  setGenerator(on: boolean): void {
    if (!this.ctx || !this.genGain) return;
    this.genGain.gain.setTargetAtTime(on ? 0.1 : 0, this.ctx.currentTime, 0.8);
  }

  /** Her karede oyun döngüsünden çağrılır. */
  update(dt: number, enemyDist: number): void {
    if (!this.ctx) return;
    this.creakT -= dt;
    if (this.creakT <= 0) {
      this.creakT = 7 + Math.random() * 12;
      this.ambientEvent();
    }
    if (enemyDist < 16) {
      const k = enemyDist / 16;
      this.heartT -= dt;
      if (this.heartT <= 0) {
        this.heartT = 0.45 + k * 0.9;
        this.heart(1 - k);
      }
    }
  }

  pause(): void {
    if (this.ctx) void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx) void this.ctx.resume();
  }
}

export const audio = new AudioEngine();
