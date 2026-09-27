import { ARCANA_BY_ID } from '../content/arcana';
import { info } from './effects';
import type { ArcanaHookName, ArcanaHooks, SpinCtx } from './types';

type HookArgs<H extends ArcanaHookName> = NonNullable<ArcanaHooks[H]> extends (
  ctx: SpinCtx,
  self: never,
  idx: number,
  ...args: infer A
) => boolean
  ? A
  : never;

const MAX_DEPTH = 4;

/** Löst den Hook einer Arkana aus, inkl. Wiederholungen durch den Magier rechts daneben. */
export function fireArcana<H extends ArcanaHookName>(ctx: SpinCtx, idx: number, hook: H, ...args: HookArgs<H>): boolean {
  if (!ctx.activeArcana[idx]) return false;
  const inst = ctx.run.arcana[idx];
  const fn = ARCANA_BY_ID[inst.id]?.hooks[hook] as
    | ((c: SpinCtx, s: typeof inst, i: number, ...a: HookArgs<H>) => boolean)
    | undefined;
  if (!fn) return false;
  const fired = fn(ctx, inst, idx, ...args);
  if (!fired || ctx.depth >= MAX_DEPTH) return fired;

  const right = ctx.run.arcana[idx + 1];
  if (right && right.id === 'magier' && ctx.activeArcana[idx + 1]) {
    const times = 1 + Math.floor((right.level - 1) / 2);
    ctx.depth++;
    for (let t = 0; t < times; t++) {
      info(ctx, 'Wiederholung!', { k: 'arcana', i: idx + 1 }, 0, 'info');
      fn(ctx, inst, idx, ...args);
    }
    ctx.depth--;
  }
  return fired;
}

export function fireAll<H extends ArcanaHookName>(ctx: SpinCtx, hook: H, ...args: HookArgs<H>): void {
  for (let i = 0; i < ctx.run.arcana.length; i++) fireArcana(ctx, i, hook, ...args);
}

export function hasArcana(ctx: SpinCtx, id: string): number {
  let best = 0;
  ctx.run.arcana.forEach((a, i) => {
    if (a.id === id && ctx.activeArcana[i]) best = Math.max(best, a.level);
  });
  return best;
}
