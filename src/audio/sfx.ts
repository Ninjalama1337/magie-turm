import { Music } from './music';

/** Prozedurale Soundeffekte über WebAudio – keine Assets nötig. */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private drone: { stop: () => void; heat: (h: number) => void } | null = null;
  private vol = { music: 0.6, sfx: 0.8 };
  private heat = 0;
  private last: Record<string, number> = {};
  enabled = true;
  /** Vibration auf dem Handy (unabhängig vom Ton) */
  haptics = true;

  /** Kurze Vibration; nur auf Geräten mit Vibrationsmotor */
  buzz(pattern: number | number[]): void {
    if (!this.haptics) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* nicht unterstützt */
    }
  }

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.6 * this.vol.sfx;
        this.music = this.ctx.createGain();
        this.music.gain.value = this.vol.music;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp).connect(this.ctx.destination);
        this.music.connect(comp);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.stopDrone();
    if (this.master) this.master.gain.value = on ? 0.6 * this.vol.sfx : 0;
  }

  setVolumes(music: number, sfxVol: number): void {
    this.vol = { music, sfx: sfxVol };
    if (this.master) this.master.gain.value = this.enabled ? 0.6 * sfxVol : 0;
    if (this.music) this.music.gain.value = music;
  }

  /** Hitze 0..1 – blendet Musik-Ebenen ein */
  setHeat(h: number): void {
    this.heat = Math.max(0, Math.min(1, h));
    this.drone?.heat(this.heat);
  }

  private throttle(key: string, ms: number): boolean {
    const now = performance.now();
    if (now - (this.last[key] ?? 0) < ms) return false;
    this.last[key] = now;
    return true;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq = 2000, q = 1): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  /** Kugel-Klicken; Tonhöhe steigt mit den Runden */
  lap(n: number): void {
    if (!this.throttle('lap', 45)) return;
    this.tone(320 + Math.min(n, 60) * 14, 0.05, 'triangle', 0.08);
  }

  record(): void {
    this.buzz([40, 60, 40, 60, 120]);
    [0, 7, 12, 19, 24].forEach((s, i) => this.tone(261.6 * Math.pow(2, s / 12), 0.9, 'triangle', 0.07, 1, i * 0.08));
    this.noise(1.2, 0.2, 4000, 0.5);
  }

  achievement(): void {
    this.buzz([30, 50, 30]);
    [0, 4, 7, 11, 14].forEach((s, i) => this.tone(523 * Math.pow(2, s / 12), 0.5, 'sine', 0.05, 1, i * 0.06));
  }

  sigil(slot: number): void {
    if (!this.throttle('sigil', 35)) return;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    this.tone(440 * Math.pow(2, scale[slot % 8] / 12), 0.18, 'sine', 0.07);
  }

  glut(): void {
    if (!this.throttle('glut', 50)) return;
    this.tone(660, 0.08, 'square', 0.025, 1.4);
  }

  fluch(): void {
    if (!this.throttle('fluch', 50)) return;
    this.tone(220, 0.14, 'sawtooth', 0.04, 1.8);
  }

  xfluch(): void {
    if (!this.throttle('xfluch', 70)) return;
    this.tone(110, 0.35, 'sawtooth', 0.07, 3);
    this.tone(165, 0.35, 'square', 0.03, 3);
  }

  souls(): void {
    if (!this.throttle('souls', 60)) return;
    this.tone(1320, 0.08, 'triangle', 0.06);
    this.tone(1760, 0.12, 'triangle', 0.05, 1, 0.06);
  }

  ghost(): void {
    if (!this.throttle('ghost', 80)) return;
    this.tone(880, 0.5, 'sine', 0.05, 0.5);
  }

  land(): void {
    this.noise(0.25, 0.25, 900, 2);
    this.tone(90, 0.3, 'sine', 0.2, 0.6);
  }

  hit(): void {
    this.buzz(25);
    [0, 4, 7, 12].forEach((s, i) => this.tone(330 * Math.pow(2, s / 12), 0.4, 'triangle', 0.06, 1, i * 0.07));
  }

  miss(): void {
    this.tone(160, 0.4, 'sawtooth', 0.04, 0.5);
  }

  score(big: boolean): void {
    this.buzz(big ? [20, 40, 60] : 12);
    this.noise(0.5, big ? 0.35 : 0.2, 300, 0.7);
    this.tone(big ? 55 : 82, 0.8, 'sine', 0.3, 0.5);
  }

  click(): void {
    if (!this.throttle('click', 30)) return;
    this.tone(900, 0.03, 'square', 0.03);
  }

  buy(): void {
    this.buzz(8);
    this.tone(523, 0.1, 'triangle', 0.07);
    this.tone(784, 0.16, 'triangle', 0.06, 1, 0.08);
  }

  win(): void {
    this.buzz([40, 80, 40, 80, 160]);
    [0, 3, 7, 10, 12, 15].forEach((s, i) => this.tone(220 * Math.pow(2, s / 12), 0.6, 'triangle', 0.07, 1, i * 0.09));
  }

  lose(): void {
    this.buzz([200, 100, 300]);
    [0, -3, -6, -12].forEach((s, i) => this.tone(220 * Math.pow(2, s / 12), 0.8, 'sawtooth', 0.05, 0.9, i * 0.25));
  }

  startDrone(): void {
    const ctx = this.ensure();
    if (!ctx || !this.music || this.drone) return;
    const out = this.music;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 3);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 380;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 160;
    lfo.connect(lfoG).connect(f.frequency);
    const oscs = [55, 55.4, 82.4, 110.2].map((fr, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sawtooth' : 'triangle';
      o.frequency.value = fr;
      o.connect(f);
      o.start();
      return o;
    });
    f.connect(g).connect(out);
    lfo.start();

    // Musik: Orgel, Bass, Glocken; Arpeggio, Trommel und Chor mit der Hitze
    const music = new Music(ctx, out);
    music.setHeat(this.heat);
    music.start();

    this.drone = {
      heat: (h) => {
        music.setHeat(h);
        f.frequency.linearRampToValueAtTime(380 + 900 * h, ctx.currentTime + 0.4);
      },
      stop: () => {
        music.stop();
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
          oscs.forEach((o) => o.stop());
          lfo.stop();
        }, 600);
      },
    };
  }

  stopDrone(): void {
    this.drone?.stop();
    this.drone = null;
  }
}

export const sfx = new Sfx();
