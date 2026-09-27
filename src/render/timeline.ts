import type { SpinEvent, SpinResult } from '../core/types';
import type { VBall, WheelView } from './wheel';

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;
const DROP = 1.25;

interface LapInterval {
  t0: number;
  t1: number;
  balls: Set<number>;
}

interface GhostLife {
  id: number;
  t0: number;
  t1: number;
}

export interface Playback {
  done: Promise<void>;
  skip: () => void;
}

export function lapDuration(k: number): number {
  return Math.max(0.07, 0.85 * Math.pow(0.9, k));
}

function easeOutBounce(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Spielt das Event-Log einer Drehung zeitlich animiert auf dem Kessel ab. */
export function playSpin(
  view: WheelView,
  result: SpinResult,
  opts: { speed: () => number; onEvents: (evs: SpinEvent[], skipping: boolean) => void },
): Playback {
  const evs = result.events;
  const times: number[] = new Array(evs.length).fill(0);
  const laps: LapInterval[] = [];
  const ghosts = new Map<number, GhostLife>();
  let drop: { t0: number; t1: number; pocket: number } | null = null;

  // --- Zeitplan aufbauen
  const byTick = new Map<number, number[]>();
  evs.forEach((e, i) => {
    const l = byTick.get(e.tick);
    if (l) l.push(i);
    else byTick.set(e.tick, [i]);
  });
  const ticks = [...byTick.keys()].sort((a, b) => a - b);
  const endTick = ticks[ticks.length - 1];
  let t = 0;
  let lapIdx = 0;

  for (const tick of ticks) {
    const idx = byTick.get(tick)!;
    if (tick === 0) {
      t = 0.35;
      for (const i of idx) {
        if (evs[i].type !== 'start') t += 0.22;
        times[i] = t;
      }
      t += 0.15;
      continue;
    }
    if (tick === endTick && evs[idx[idx.length - 1]].type === 'end') {
      t += 0.2;
      for (const i of idx) {
        t += evs[i].type === 'end' ? 0.45 : 0.3;
        times[i] = t;
      }
      continue;
    }
    const landing = idx.filter((i) => evs[i].at === 0);
    const rest = idx.filter((i) => evs[i].at > 0);
    const mainLand = landing.find((i) => evs[i].type === 'land');
    if (mainLand !== undefined) {
      drop = { t0: t, t1: t + DROP, pocket: evs[mainLand].pocket ?? 0 };
      t += DROP;
      let first = true;
      for (const i of landing) {
        if (!first && evs[i].type === 'fx' && evs[i].ball === 0) t += 0.28;
        first = false;
        times[i] = t;
      }
      t += 0.25;
    } else {
      for (const i of landing) times[i] = t;
    }
    if (rest.length) {
      const dur = lapDuration(lapIdx++);
      const balls = new Set<number>();
      for (const i of rest) {
        times[i] = t + evs[i].at * dur;
        if (evs[i].type === 'lap') balls.add(evs[i].ball);
      }
      laps.push({ t0: t, t1: t + dur, balls });
      t += dur;
    }
  }
  const total = t + 0.35;

  evs.forEach((e, i) => {
    if (e.type === 'ghostSpawn') ghosts.set(e.ball, { id: e.ball, t0: times[i], t1: total });
    if (e.type === 'ghostLand') {
      const g = ghosts.get(e.ball);
      if (g) g.t1 = times[i];
    }
  });

  // --- Abspielen
  let clock = 0;
  let next = 0;
  let skipping = false;
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const startPocket = view.restPocket;
  const startAngle = startPocket !== null ? view.pocketAngle(startPocket) : TOP + 0.25;
  const main: VBall = { id: 0, ghost: false, angle: startAngle, radius: view.trackR, alpha: 1, trail: [] };
  const ghostBalls = new Map<number, VBall>();
  let dropK: number | null = null;
  view.restPocket = null;

  const firstLap = laps.length ? laps[0].t0 : total;

  const frame = (dt: number) => {
    clock = skipping ? Infinity : clock + dt * opts.speed();

    const batch: SpinEvent[] = [];
    while (next < evs.length && times[next] <= clock) batch.push(evs[next++]);
    if (batch.length) opts.onEvents(batch, skipping);

    // Phase ermitteln
    let phase = 0;
    let lapBalls: Set<number> | null = null;
    for (let k = laps.length - 1; k >= 0; k--) {
      const L = laps[k];
      if (clock >= L.t0) {
        if (clock < L.t1) {
          phase = (clock - L.t0) / (L.t1 - L.t0);
          lapBalls = L.balls;
        }
        break;
      }
    }
    const lapAngle = TOP + TAU * phase;

    // Hauptkugel
    if (drop && clock >= drop.t0) {
      const p = Math.min(1, (clock - drop.t0) / (drop.t1 - drop.t0));
      let target = view.pocketAngle(drop.pocket);
      if (dropK === null) {
        dropK = 0;
        while (target + dropK * TAU < TOP + 1.2) dropK++;
        while (target + dropK * TAU > TOP + 1.2 + TAU) dropK--;
      }
      target += dropK * TAU;
      main.angle = TOP + (target - TOP) * (1 - Math.pow(1 - p, 2.4));
      main.radius = view.trackR + (view.restR - view.trackR) * easeOutBounce(p);
    } else if (clock < firstLap) {
      const p = Math.min(1, clock / Math.max(0.3, firstLap));
      if (startPocket !== null) {
        const from = view.pocketAngle(startPocket);
        const target = TOP + TAU * Math.ceil((from - TOP) / TAU);
        main.angle = from + (target - from) * easeInOut(p);
        main.radius = view.restR + (view.trackR - view.restR) * easeInOut(p);
      } else {
        main.angle = startAngle + (TOP + TAU - startAngle) * easeInOut(p);
        main.radius = view.trackR;
      }
    } else if (lapBalls?.has(0)) {
      main.angle = lapAngle;
      main.radius = view.trackR * (1 + Math.sin(phase * TAU * 3) * 0.004);
    } else if (!drop || clock < drop.t0) {
      main.angle = TOP;
    }

    // Irrlichter
    const list: VBall[] = [];
    let rank = 0;
    for (const g of ghosts.values()) {
      if (clock < g.t0 || clock > g.t1 + 0.35) {
        ghostBalls.delete(g.id);
        continue;
      }
      let vb = ghostBalls.get(g.id);
      if (!vb) {
        vb = { id: g.id, ghost: true, angle: main.angle, radius: view.trackR, alpha: 0, trail: [] };
        ghostBalls.set(g.id, vb);
      }
      rank++;
      const fadeIn = Math.min(1, (clock - g.t0) / 0.3);
      const fadeOut = clock > g.t1 ? 1 - (clock - g.t1) / 0.35 : 1;
      vb.alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      const off = 0.16 + 0.11 * ((rank - 1) % 6);
      const base = lapBalls ? lapAngle : TOP;
      vb.angle = base - off;
      vb.radius = view.trackR * (0.965 - 0.028 * ((rank - 1) % 3)) + Math.sin(clock * 6 + g.id) * view.R * 0.006;
      list.push(vb);
    }
    list.push(main);
    view.balls = list;

    if (clock >= total) finish();
  };

  const finish = () => {
    view.frameHooks.delete(frame);
    view.balls = [];
    view.restPocket = result.pocket;
    resolve();
  };

  view.frameHooks.add(frame);
  return {
    done,
    skip: () => {
      skipping = true;
    },
  };
}
