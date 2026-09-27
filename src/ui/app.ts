import { sfx } from '../audio/sfx';
import { fmt } from '../core/num';
import { randomSeed } from '../core/rng';
import { ashFor, newRun } from '../core/run';
import { loadMeta, loadRun, metaBonuses, saveMeta, saveRun, type MetaState } from '../core/save';
import type { RunState } from '../core/types';
import { Decimal } from '../core/num';
import { renderCodex } from './screens/codex';
import { renderEnd } from './screens/end';
import { renderGrimoire } from './screens/grimoire';
import { renderRitual } from './screens/ritual';
import { renderShop } from './screens/shop';
import { renderTitle } from './screens/title';

export type ScreenName = 'title' | 'ritual' | 'shop' | 'end' | 'grimoire' | 'codex';

export class App {
  meta: MetaState;
  run: RunState | null;
  private cleanup: (() => void) | null = null;
  current: ScreenName = 'title';

  constructor(public root: HTMLElement) {
    this.meta = loadMeta();
    this.run = loadRun();
    sfx.setEnabled(this.meta.sound);
    document.addEventListener(
      'pointerdown',
      () => {
        sfx.unlock();
        if (this.meta.sound) sfx.startDrone();
      },
      { once: true },
    );
  }

  show(name: ScreenName): void {
    this.cleanup?.();
    this.cleanup = null;
    this.root.innerHTML = '';
    this.current = name;
    const map: Record<ScreenName, (app: App) => (() => void) | void> = {
      title: renderTitle,
      ritual: renderRitual,
      shop: renderShop,
      end: renderEnd,
      grimoire: renderGrimoire,
      codex: renderCodex,
    };
    this.cleanup = map[name](this) ?? null;
    this.root.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  /** Setzt den passenden Screen für den aktuellen Run-Zustand */
  resume(): void {
    const run = this.run;
    if (!run) return this.show('title');
    if (run.phase === 'shop') this.show('shop');
    else if (run.phase === 'ritual') this.show('ritual');
    else this.show('end');
  }

  startNewRun(): void {
    this.run = newRun(randomSeed(), metaBonuses(this.meta));
    this.meta.runs++;
    this.saveAll();
    this.show('ritual');
  }

  saveAll(): void {
    if (this.run) saveRun(this.run);
    saveMeta(this.meta);
  }

  /** Beendet einen Run, schreibt Meta-Fortschritt gut. Liefert verdiente Asche. */
  endRun(): number {
    const run = this.run;
    if (!run) return 0;
    const ash = ashFor(run);
    this.meta.ash += ash;
    this.meta.bestCircle = Math.max(this.meta.bestCircle, run.circle);
    if (run.stats.bestSpin.gt(new Decimal(this.meta.bestSpin))) this.meta.bestSpin = run.stats.bestSpin.toString();
    if (run.phase === 'victory' || run.endless) this.meta.victories++;
    if (run.stats.bestSpin.gte(Number.MAX_VALUE)) this.meta.infinity = true;
    saveRun(null);
    saveMeta(this.meta);
    return ash;
  }

  toggleSound(): boolean {
    this.meta.sound = !this.meta.sound;
    sfx.setEnabled(this.meta.sound);
    if (this.meta.sound) sfx.startDrone();
    saveMeta(this.meta);
    return this.meta.sound;
  }

  bestSpinText(): string {
    return fmt(new Decimal(this.meta.bestSpin));
  }
}
