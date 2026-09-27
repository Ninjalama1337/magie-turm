/**
 * Prozedurale Musik: düstere Orgel-Akkorde in a-Moll, Bass, Totenglocken-Melodie.
 * Mit steigender „Hitze“ (Ritual-Fortschritt) kommen Arpeggio, Trommel und Chor hinzu.
 * Geplant wird mit Vorlauf über die AudioContext-Uhr, damit das Timing stabil bleibt.
 */

const A = 110;
const semi = (n: number) => A * Math.pow(2, n / 12);

/** Akkordfolge (Halbtöne über A2): Am – F – Dm – E | Am – G – F – E */
const PROGRESSION: number[][] = [
  [0, 3, 7],
  [-4, 0, 3],
  [5, 8, 12],
  [7, 11, 14],
  [0, 3, 7],
  [-2, 2, 5],
  [-4, 0, 3],
  [7, 11, 14],
];

/** Glockenmelodie je Akkord als Stufen (Index in Akkordtöne, -1 = Pause), 8 Achtel pro Takt */
const MELODY: number[][] = [
  [2, -1, -1, 1, -1, -1, 0, -1],
  [2, -1, 1, -1, -1, -1, -1, -1],
  [0, -1, -1, 1, 2, -1, -1, -1],
  [2, -1, -1, -1, 1, -1, 0, -1],
  [1, -1, 2, -1, -1, -1, -1, -1],
  [0, -1, -1, 2, -1, 1, -1, -1],
  [2, -1, -1, -1, -1, -1, 1, -1],
  [1, -1, 0, -1, 2, -1, -1, -1],
];

export class Music {
  private timer = 0;
  private next = 0;
  private step = 0;
  private heat = 0;
  private bus: GainNode;
  private verb: ConvolverNode;
  private noiseBuf: AudioBuffer;
  private running = false;

  constructor(
    private ctx: AudioContext,
    out: AudioNode,
  ) {
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    // Hall aus abklingendem Rauschen – eine Krypta aus Stein
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.8);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.bus.connect(out);
    this.bus.connect(this.verb).connect(wet).connect(out);
    this.noiseBuf = this.makeNoise(0.4);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(1, t + 4);
    this.next = t + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.bus.gain.cancelScheduledValues(t);
    this.bus.gain.setValueAtTime(this.bus.gain.value, t);
    this.bus.gain.linearRampToValueAtTime(0, t + 0.6);
  }

  setHeat(h: number): void {
    this.heat = h;
  }

  /** Dauer einer Achtel in Sekunden – bei Hitze schneller */
  private get eighth(): number {
    const bpm = 66 + this.heat * 26;
    return 30 / bpm;
  }

  private schedule(): void {
    while (this.next < this.ctx.currentTime + 0.25) {
      this.playStep(this.step, this.next);
      this.next += this.eighth;
      this.step++;
    }
  }

  private playStep(step: number, t: number): void {
    const bar = Math.floor(step / 8) % PROGRESSION.length;
    const pos = step % 8;
    const chord = PROGRESSION[bar];
    const barLen = this.eighth * 8;
    const h = this.heat;

    if (pos === 0) {
      // Orgel-Pad über den ganzen Takt
      for (const n of chord) this.voice(semi(n + 12), t, barLen * 1.05, 'triangle', 0.018, 0.6, 1400);
      this.voice(semi(chord[0] + 24), t, barLen * 1.05, 'sine', 0.008, 0.8);
      // Chor ab großer Hitze
      if (h > 0.7) for (const n of chord) this.voice(semi(n + 24) * 1.003, t, barLen, 'sawtooth', 0.006 * h, 0.9, 1800);
    }
    // Bass auf 1 und 5
    if (pos === 0 || pos === 4) this.voice(semi(chord[0] - 12), t, this.eighth * 3.5, 'sine', 0.09, 0.02);
    // Totenglocke
    const m = MELODY[bar][pos];
    if (m >= 0) this.bell(semi(chord[m] + 24), t, 0.03);
    // Arpeggio ab mittlerer Hitze
    if (h > 0.3) {
      const n = chord[(pos * 2 + (pos >> 2)) % 3] + (pos % 4 === 3 ? 24 : 12);
      this.voice(semi(n), t, this.eighth * 0.9, 'triangle', 0.012 + 0.018 * h, 0.005);
    }
    // Trommel ab großer Hitze
    if (h > 0.5 && (pos === 0 || pos === 3 || pos === 6)) this.drum(t, pos === 0 ? 0.35 : 0.2);
    if (h > 0.8 && pos % 2 === 1) this.hat(t, 0.05);
  }

  private voice(freq: number, t: number, dur: number, type: OscillatorType, vol: number, attack: number, lp = 0): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.max(0.005, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (lp) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      node = node.connect(f);
    }
    node.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Glocke: Grundton plus unharmonische Obertöne */
  private bell(freq: number, t: number, vol: number): void {
    for (const [ratio, v] of [
      [1, 1],
      [2.76, 0.4],
      [5.4, 0.15],
    ]) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / ratio);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + 2.3);
    }
  }

  private drum(t: number, vol: number): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.45);
  }

  private hat(t: number, vol: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.connect(f).connect(g).connect(this.bus);
    src.start(t);
    src.stop(t + 0.08);
  }

  private makeNoise(dur: number): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private impulse(dur: number): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
}
