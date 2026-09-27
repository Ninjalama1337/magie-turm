import Decimal, { type DecimalSource } from 'break_eternity.js';
import { fmt, fmtMult } from './num';
import type { Ball, SpinCtx, SpinEventType, Src, Tone } from './types';

export const MAX_LAPS_PER_BALL = 160;
export const MAX_EVENTS = 30000;

export function log(
  ctx: SpinCtx,
  type: SpinEventType,
  ball: number,
  extra: { src?: Src; text?: string; tone?: Tone; pocket?: number; hit?: boolean } = {},
): void {
  if (ctx.quiet) return;
  if (ctx.events.length >= MAX_EVENTS && type !== 'land' && type !== 'end' && type !== 'lap') return;
  ctx.events.push({
    type,
    tick: ctx.tick,
    at: ctx.at,
    ball,
    glut: ctx.glut,
    fluch: ctx.fluch,
    seq: ctx.seq++,
    ...extra,
  });
}

export function addGlut(ctx: SpinCtx, amount: DecimalSource, src: Src, ball = 0): void {
  const a = new Decimal(amount);
  if (a.lte(0)) return;
  ctx.glut = ctx.glut.add(a);
  log(ctx, 'fx', ball, { src, text: `+${fmt(a)}`, tone: 'glut' });
}

export function addFluch(ctx: SpinCtx, amount: DecimalSource, src: Src, ball = 0): void {
  const a = new Decimal(amount);
  if (a.eq(0)) return;
  ctx.fluch = Decimal.max(ctx.fluch.add(a), 1);
  log(ctx, 'fx', ball, { src, text: `+${fmt(a, true)} Fluch`, tone: 'fluch' });
}

export function mulFluch(ctx: SpinCtx, factor: DecimalSource, src: Src, ball = 0): void {
  const f = new Decimal(factor);
  ctx.fluch = Decimal.max(ctx.fluch.mul(f), 1);
  const label = f.lt(1e6) ? fmtMult(f.toNumber()) : fmt(f);
  log(ctx, 'fx', ball, { src, text: `×${label} Fluch`, tone: f.lt(1) ? 'bad' : 'xfluch' });
}

export function addSouls(ctx: SpinCtx, n: number, src: Src, ball = 0): void {
  if (n <= 0) return;
  ctx.souls += n;
  log(ctx, 'fx', ball, { src, text: `+${n} Seele${n === 1 ? '' : 'n'}`, tone: 'souls' });
}

export function addTempo(ctx: SpinCtx, ball: Ball, amount: number, src: Src): void {
  if (!ball.active) return;
  ball.energy = Math.max(0, ball.energy + amount);
  log(ctx, 'fx', ball.id, {
    src,
    text: `${amount >= 0 ? '+' : ''}${fmtMult(amount)} Tempo`,
    tone: amount >= 0 ? 'tempo' : 'bad',
  });
}

export function info(ctx: SpinCtx, text: string, src: Src, ball = 0, tone: Tone = 'info'): void {
  log(ctx, 'fx', ball, { src, text, tone });
}

/** Wahrscheinlichkeit, skaliert mit Glück */
export function roll(ctx: SpinCtx, p: number): boolean {
  return ctx.rng.next() < Math.min(1, p * ctx.stats.luck);
}

export function spawnGhost(ctx: SpinCtx, src: Src, energy?: number): Ball | null {
  if (ctx.demon?.mods.noGhosts) return null;
  if (ctx.ghostsSpawned >= ctx.stats.ghostCap) return null;
  ctx.ghostsSpawned++;
  const b: Ball = {
    id: ctx.balls.length,
    ghost: true,
    energy: energy ?? ctx.stats.tempo * 0.6,
    laps: 0,
    active: true,
    startTick: ctx.tick + 1,
    pocket: null,
    fric: 1,
  };
  ctx.balls.push(b);
  log(ctx, 'ghostSpawn', b.id, { src, text: 'Irrlicht!', tone: 'ghost' });
  return b;
}

/** Stufenwert: base + step·(level−1) */
export const lv = (level: number, base: number, step = base): number => base + step * (level - 1);
