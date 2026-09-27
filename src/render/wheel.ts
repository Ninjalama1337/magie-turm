import { SIGIL_BY_ID } from '../content/sigils';
import { ENCHANT_BY_ID } from '../content/demons';
import type { Enchant, SigilInst } from '../core/types';
import { colorOf, EURO, pocketLabel, wheelIndex, type WheelDef } from '../core/wheel';
import { drawGlyph } from '../ui/icons';
import { SIGIL_COLOR } from './colors';
import { rimA, SKIN } from './skin';
import { Particles } from './particles';

export interface VBall {
  id: number;
  ghost: boolean;
  angle: number;
  radius: number;
  alpha: number;
  trail: { x: number; y: number }[];
}

const TAU = Math.PI * 2;
export const SLOT_COUNT = 8;

export function slotAngle(i: number): number {
  return -Math.PI / 2 + ((i + 0.5) * TAU) / SLOT_COUNT;
}

export class WheelView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  size = 300;
  private dpr = 1;
  wheel: WheelDef = EURO;
  wheelAngle = 0;
  wheelSpeed = -0.32;
  balls: VBall[] = [];
  restPocket: number | null = null;
  sigils: (SigilInst | null)[] = [];
  unlocked = 3;
  /** Rauten mit Resonanz (Nachbar gleichen Elements) */
  resonant: boolean[] = [];
  blockedSlot = -1;
  enchants: Record<number, Enchant> = {};
  flash: number[] = new Array(SLOT_COUNT).fill(0);
  pocketGlow: { n: number; t: number } | null = null;
  particles = new Particles();
  shake = 0;
  shakeScale = 1;
  hot = 0;
  frameHooks = new Set<(dt: number) => void>();
  private staticLayer: HTMLCanvasElement | null = null;
  private ringLayer: HTMLCanvasElement | null = null;
  private ringKey = '';
  private raf = 0;
  private last = 0;
  private ro: ResizeObserver;
  private disposed = false;

  constructor(private container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'wheel-canvas';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.remove();
  }

  get R(): number {
    return this.size / 2;
  }
  get trackR(): number {
    return this.R * 0.885;
  }
  get diamondR(): number {
    return this.R * 0.765;
  }
  get restR(): number {
    return this.R * 0.555;
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const size = Math.max(160, Math.floor(Math.min(rect.width, rect.height)));
    if (size === this.size && this.staticLayer) return;
    this.size = size;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.staticLayer = this.renderStatic();
    this.ringKey = '';
  }

  get step(): number {
    return TAU / this.wheel.order.length;
  }

  pocketAngle(n: number): number {
    return this.wheelAngle - Math.PI / 2 + wheelIndex(n, this.wheel) * this.step;
  }

  slotPos(i: number): { x: number; y: number } {
    const a = slotAngle(i);
    return { x: this.R + Math.cos(a) * this.diamondR, y: this.R + Math.sin(a) * this.diamondR };
  }

  /** Seitenkoordinaten (für DOM-Popups) */
  toPage(p: { x: number; y: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + (p.x / this.size) * r.width, y: r.top + (p.y / this.size) * r.height };
  }

  /** Raute unter einer Seitenkoordinate (oder −1) */
  slotAt(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * this.size;
    const y = ((clientY - r.top) / r.height) * this.size;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const p = this.slotPos(i);
      if (Math.hypot(p.x - x, p.y - y) < this.R * 0.1) return i;
    }
    return -1;
  }

  pocketPos(n: number, radius = this.restR): { x: number; y: number } {
    const a = this.pocketAngle(n);
    return { x: this.R + Math.cos(a) * radius, y: this.R + Math.sin(a) * radius };
  }

  ballPos(b: { angle: number; radius: number }): { x: number; y: number } {
    return { x: this.R + Math.cos(b.angle) * b.radius, y: this.R + Math.sin(b.angle) * b.radius };
  }

  triggerSlot(i: number, color?: string): void {
    this.flash[i] = 1;
    const p = this.slotPos(i);
    const c = color ?? SIGIL_COLOR[this.sigils[i]?.id ?? ''] ?? '#fff';
    this.particles.emit(p.x, p.y, c, 7, this.R * 0.5, { life: 0.5, size: this.R * 0.012 });
  }

  burst(x: number, y: number, color: string, n = 40, speed = 1): void {
    this.particles.emit(x, y, color, n, this.R * 1.2 * speed, { life: 0.9, size: this.R * 0.014 });
  }

  // ------------------------------------------------------------------ Loop

  private loop = (now: number): void => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.wheelAngle += this.wheelSpeed * dt;
    for (const h of this.frameHooks) h(dt);
    for (let i = 0; i < SLOT_COUNT; i++) this.flash[i] = Math.max(0, this.flash[i] - dt * 3.2);
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.hot = Math.max(0, this.hot - dt * 0.4);
    if (this.pocketGlow) {
      this.pocketGlow.t -= dt;
      if (this.pocketGlow.t <= 0) this.pocketGlow = null;
    }
    this.ambient();
    this.particles.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private ambient(): void {
    const R = this.R;
    const rate = 0.25 + this.hot * 2;
    if (Math.random() < rate) {
      const a = Math.random() * TAU;
      const r = R * (0.9 + Math.random() * 0.08);
      this.particles.emit(R + Math.cos(a) * r, R + Math.sin(a) * r, Math.random() < 0.7 ? '#ff7a2c' : '#ff3b5c', 1, R * 0.08, {
        life: 1.6,
        size: R * 0.007,
        grav: -R * 0.12,
        drag: 0.6,
      });
    }
  }

  // ---------------------------------------------------------------- Layers

  private layer(): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = this.size * this.dpr;
    c.height = this.size * this.dpr;
    const g = c.getContext('2d')!;
    g.scale(this.dpr, this.dpr);
    return [c, g];
  }

  private renderStatic(): HTMLCanvasElement {
    const [c, g] = this.layer();
    const R = this.R;
    g.translate(R, R);

    // Äußerer Rand – geschwärztes Holz mit Goldkante
    let grad = g.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
    grad.addColorStop(0, '#1a0c0c');
    grad.addColorStop(0.6, '#2a1210');
    grad.addColorStop(1, '#0a0405');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, R * 0.995, 0, TAU);
    g.fill();

    g.strokeStyle = SKIN.rim;
    g.lineWidth = R * 0.012;
    g.beginPath();
    g.arc(0, 0, R * 0.985, 0, TAU);
    g.stroke();
    g.lineWidth = R * 0.004;
    g.strokeStyle = rimA(0.5);
    g.beginPath();
    g.arc(0, 0, R * 0.955, 0, TAU);
    g.stroke();

    // Gravierte Inschrift
    const text = '✠ RIEN NE VA PLUS ✠ LASCIATE OGNI SPERANZA ✠ SANGUIS PRO FORTUNA ';
    g.fillStyle = rimA(0.55);
    g.font = `${Math.max(7, R * 0.034)}px Cinzel, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const chars = [...text];
    for (let i = 0; i < chars.length; i++) {
      const a = (i / chars.length) * TAU - Math.PI / 2;
      g.save();
      g.rotate(a + Math.PI / 2);
      g.fillText(chars[i], 0, -R * 0.97 + R * 0.0);
      g.restore();
    }

    // Kugelbahn
    grad = g.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 0.95);
    grad.addColorStop(0, '#0d0708');
    grad.addColorStop(0.55, '#24100f');
    grad.addColorStop(0.9, '#3a1715');
    grad.addColorStop(1, '#150708');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, R * 0.95, 0, TAU);
    g.fill();

    // Glanzlicht
    grad = g.createLinearGradient(-R, -R, R, R);
    grad.addColorStop(0, 'rgba(255,220,180,0.10)');
    grad.addColorStop(0.5, 'rgba(255,220,180,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, R * 0.95, 0, TAU);
    g.arc(0, 0, R * 0.7, 0, TAU, true);
    g.fill();

    g.strokeStyle = rimA(0.35);
    g.lineWidth = R * 0.004;
    g.beginPath();
    g.arc(0, 0, R * 0.7, 0, TAU);
    g.stroke();
    return c;
  }

  private renderRing(): HTMLCanvasElement {
    const [c, g] = this.layer();
    const R = this.R;
    g.translate(R, R);
    const oOut = R * 0.69;
    const oIn = R * 0.605;
    const pIn = R * 0.5;

    // Schatten unter dem Rad
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.beginPath();
    g.arc(0, R * 0.01, oOut + R * 0.01, 0, TAU);
    g.fill();

    const STEP = this.step;
    const count = this.wheel.order.length;
    for (let i = 0; i < count; i++) {
      const n = this.wheel.order[i];
      const a0 = -Math.PI / 2 + (i - 0.5) * STEP;
      const a1 = a0 + STEP;
      const col = colorOf(n, this.wheel);
      const base = col === 'red' ? '#8e1224' : col === 'black' ? '#141012' : '#2f0b4a';
      const hi = col === 'red' ? '#c11f37' : col === 'black' ? '#2a2326' : '#6c1fa0';
      const grad = g.createRadialGradient(0, 0, oIn, 0, 0, oOut);
      grad.addColorStop(0, base);
      grad.addColorStop(1, hi);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, oOut, a0, a1);
      g.arc(0, 0, oIn, a1, a0, true);
      g.closePath();
      g.fill();

      // Taschen (innen)
      g.fillStyle = col === 'hell' ? '#1d0730' : i % 2 ? '#1a0e0c' : '#150a09';
      g.beginPath();
      g.arc(0, 0, oIn, a0, a1);
      g.arc(0, 0, pIn, a1, a0, true);
      g.closePath();
      g.fill();

      const ench = this.enchants[n];
      if (ench) {
        const ec = ENCHANT_BY_ID[ench].color;
        g.save();
        g.shadowColor = ec;
        g.shadowBlur = R * 0.04;
        g.strokeStyle = ec;
        g.lineWidth = R * 0.012;
        g.beginPath();
        g.arc(0, 0, oOut - R * 0.008, a0 + 0.02, a1 - 0.02);
        g.stroke();
        g.restore();
        g.globalAlpha = 0.28;
        g.fillStyle = ec;
        g.beginPath();
        g.arc(0, 0, oIn, a0, a1);
        g.arc(0, 0, pIn, a1, a0, true);
        g.closePath();
        g.fill();
        g.globalAlpha = 1;
      }

      // Zahl
      const am = -Math.PI / 2 + i * STEP;
      g.save();
      g.rotate(am + Math.PI / 2);
      g.fillStyle = col === 'hell' ? '#ffb347' : '#f1e4c8';
      g.font = `600 ${Math.max(7, R * 0.052 * Math.min(1.5, Math.sqrt(37 / count)))}px Cinzel, serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(pocketLabel(n), 0, -(oOut + oIn) / 2);
      g.restore();
    }

    // Stege
    g.strokeStyle = SKIN.rim;
    g.lineWidth = Math.max(1, R * 0.006);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (i - 0.5) * STEP;
      g.beginPath();
      g.moveTo(Math.cos(a) * pIn, Math.sin(a) * pIn);
      g.lineTo(Math.cos(a) * oOut, Math.sin(a) * oOut);
      g.stroke();
    }
    g.lineWidth = Math.max(1, R * 0.008);
    for (const r of [oOut, oIn, pIn]) {
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
      g.stroke();
    }

    // Kegel in der Mitte
    const cone = pIn * 0.98;
    let grad = g.createRadialGradient(-cone * 0.3, -cone * 0.3, cone * 0.1, 0, 0, cone);
    grad.addColorStop(0, '#5a2a1c');
    grad.addColorStop(0.5, '#2c120d');
    grad.addColorStop(1, '#120606');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, cone, 0, TAU);
    g.fill();

    // Pentagramm-Gravur
    g.strokeStyle = rimA(0.55);
    g.lineWidth = Math.max(1, R * 0.006);
    const pr = cone * 0.78;
    g.beginPath();
    g.arc(0, 0, pr, 0, TAU);
    g.stroke();
    g.beginPath();
    for (let k = 0; k <= 5; k++) {
      const a = -Math.PI / 2 + ((k * 2) % 5) * (TAU / 5);
      const x = Math.cos(a) * pr;
      const y = Math.sin(a) * pr;
      if (k === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();

    // Speichen/Turm
    grad = g.createRadialGradient(0, 0, 0, 0, 0, cone * 0.3);
    grad.addColorStop(0, '#f3d58a');
    grad.addColorStop(1, '#7a5222');
    g.fillStyle = grad;
    for (let k = 0; k < 4; k++) {
      g.save();
      g.rotate((k * TAU) / 4);
      g.beginPath();
      g.moveTo(-cone * 0.035, 0);
      g.lineTo(0, -cone * 0.62);
      g.lineTo(cone * 0.035, 0);
      g.closePath();
      g.fill();
      g.restore();
    }
    g.beginPath();
    g.arc(0, 0, cone * 0.14, 0, TAU);
    g.fill();
    return c;
  }

  // ------------------------------------------------------------------ Draw

  private draw(): void {
    const g = this.ctx;
    const R = this.R;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, this.size, this.size);
    if (this.shake > 0 && this.shakeScale > 0) {
      const s = this.shake * R * 0.03 * this.shakeScale;
      g.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    if (this.staticLayer) g.drawImage(this.staticLayer, 0, 0, this.size, this.size);

    const key = JSON.stringify(this.enchants) + this.size + this.wheel.id + SKIN.rim;
    if (key !== this.ringKey) {
      this.ringLayer = this.renderRing();
      this.ringKey = key;
    }
    if (this.ringLayer) {
      g.save();
      g.translate(R, R);
      g.rotate(this.wheelAngle);
      g.drawImage(this.ringLayer, -R, -R, this.size, this.size);
      g.restore();
    }

    if (this.pocketGlow) this.drawPocketGlow(this.pocketGlow.n, Math.min(1, this.pocketGlow.t));

    for (let i = 0; i < SLOT_COUNT; i++) this.drawDiamond(i);

    // Kugeln
    if (this.balls.length) {
      for (const b of this.balls) if (b.ghost) this.drawBall(b);
      for (const b of this.balls) if (!b.ghost) this.drawBall(b);
    } else {
      const angle = this.restPocket !== null ? this.pocketAngle(this.restPocket) : -Math.PI / 2 + 0.25;
      const radius = this.restPocket !== null ? this.restR : this.trackR;
      this.drawBall({ id: 0, ghost: false, angle, radius, alpha: 1, trail: [] });
    }

    this.particles.draw(g);
  }

  private drawPocketGlow(n: number, a: number): void {
    const g = this.ctx;
    const R = this.R;
    const ang = this.pocketAngle(n);
    const STEP = this.step;
    g.save();
    g.translate(R, R);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.6 * a;
    const grad = g.createRadialGradient(Math.cos(ang) * R * 0.6, Math.sin(ang) * R * 0.6, 0, Math.cos(ang) * R * 0.6, Math.sin(ang) * R * 0.6, R * 0.18);
    grad.addColorStop(0, '#fff2c0');
    grad.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, R * 0.7, ang - STEP * 0.6, ang + STEP * 0.6);
    g.arc(0, 0, R * 0.5, ang + STEP * 0.6, ang - STEP * 0.6, true);
    g.closePath();
    g.fill();
    g.restore();
  }

  private drawDiamond(i: number): void {
    const g = this.ctx;
    const R = this.R;
    const a = slotAngle(i);
    const p = this.slotPos(i);
    const f = this.flash[i];
    const inst = this.sigils[i];
    const locked = i >= this.unlocked;
    const blocked = i === this.blockedSlot;
    const w = R * 0.085 * (1 + f * 0.25);
    const h = R * 0.13 * (1 + f * 0.25);
    const color = inst ? SIGIL_COLOR[inst.id] ?? '#fff' : '#6d5a44';

    g.save();
    g.translate(p.x, p.y);
    g.rotate(a + Math.PI / 2);

    if (inst && !locked) {
      g.shadowColor = color;
      g.shadowBlur = R * (0.03 + f * 0.1);
    }
    const grad = g.createLinearGradient(0, -h, 0, h);
    grad.addColorStop(0, locked ? '#1a1112' : '#3b2418');
    grad.addColorStop(1, locked ? '#0c0708' : '#140a08');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, -h);
    g.lineTo(w, 0);
    g.lineTo(0, h);
    g.lineTo(-w, 0);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = locked ? '#3a2a22' : inst ? color : '#8a6d45';
    g.lineWidth = Math.max(1, R * (inst ? 0.008 : 0.005));
    g.globalAlpha = locked ? 0.7 : 1;
    g.stroke();
    if (inst && !locked && this.resonant[i]) {
      // Resonanz: zweiter, pulsierender Rahmen
      const k = 1.28 + Math.sin(performance.now() / 380 + i) * 0.05;
      g.save();
      g.globalAlpha = 0.75;
      g.setLineDash([R * 0.018, R * 0.012]);
      g.lineWidth = Math.max(1, R * 0.006);
      g.beginPath();
      g.moveTo(0, -h * k);
      g.lineTo(w * k, 0);
      g.lineTo(0, h * k);
      g.lineTo(-w * k, 0);
      g.closePath();
      g.stroke();
      g.restore();
    }
    g.rotate(-(a + Math.PI / 2));

    const gs = R * 0.09 * (1 + f * 0.3);
    if (locked) {
      drawGlyph(g, 'chain', 0, 0, R * 0.07, '#4d3a2c', 1.8);
    } else if (inst) {
      const def = SIGIL_BY_ID[inst.id];
      if (def) drawGlyph(g, def.glyph, 0, 0, gs, f > 0.05 ? '#fff' : color, 2);
      // Stufenpunkte
      for (let k = 0; k < inst.level; k++) {
        const off = (k - (inst.level - 1) / 2) * R * 0.022;
        g.fillStyle = color;
        g.beginPath();
        g.arc(off, R * 0.085, R * 0.0075, 0, TAU);
        g.fill();
      }
    } else {
      g.fillStyle = rimA(0.35);
      g.font = `${R * 0.05}px Cinzel, serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(i + 1), 0, 0);
    }
    if (blocked) {
      g.strokeStyle = '#ff3b5c';
      g.lineWidth = R * 0.012;
      g.beginPath();
      g.moveTo(-w * 0.7, -w * 0.7);
      g.lineTo(w * 0.7, w * 0.7);
      g.moveTo(w * 0.7, -w * 0.7);
      g.lineTo(-w * 0.7, w * 0.7);
      g.stroke();
    }
    g.restore();
  }

  private drawBall(b: VBall): void {
    const g = this.ctx;
    const R = this.R;
    const p = this.ballPos(b);
    const r = R * (b.ghost ? 0.026 : 0.032);

    b.trail.push(p);
    if (b.trail.length > (b.ghost ? 10 : 7)) b.trail.shift();
    if (b.trail.length > 1) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      for (let k = 1; k < b.trail.length; k++) {
        const t = k / b.trail.length;
        g.strokeStyle = b.ghost ? `rgba(126,249,255,${0.35 * t * b.alpha})` : `rgba(${SKIN.ball[3]},${0.3 * t * b.alpha})`;
        g.lineWidth = r * 1.6 * t;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(b.trail[k - 1].x, b.trail[k - 1].y);
        g.lineTo(b.trail[k].x, b.trail[k].y);
        g.stroke();
      }
      g.restore();
    }

    g.save();
    g.globalAlpha = b.alpha;
    if (b.ghost) {
      g.globalCompositeOperation = 'lighter';
      const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.6);
      grad.addColorStop(0, 'rgba(220,255,255,0.95)');
      grad.addColorStop(0.35, 'rgba(126,249,255,0.55)');
      grad.addColorStop(1, 'rgba(40,120,160,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, r * 2.6, 0, TAU);
      g.fill();
    } else {
      g.shadowColor = `rgba(${SKIN.ball[3]},0.9)`;
      g.shadowBlur = r * 1.5;
      const grad = g.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
      grad.addColorStop(0, SKIN.ball[0]);
      grad.addColorStop(0.5, SKIN.ball[1]);
      grad.addColorStop(1, SKIN.ball[2]);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, TAU);
      g.fill();
    }
    g.restore();
  }
}
