import { sfx } from '../audio/sfx';
import { checkAchievements, type AchievementCtx } from '../content/achievements';
import { challengeFor } from '../core/daily';
import { Decimal, fmt } from '../core/num';
import { randomSeed } from '../core/rng';
import { ashFor, DEFAULT_META, newRun, type RunOptions } from '../core/run';
import { loadMeta, loadRun, metaBonuses, recordChallenge, saveMeta, saveRun, type MetaState } from '../core/save';
import type { RunState } from '../core/types';
import { WHEELS } from '../core/wheel';
import { toast } from './popups';
import { renderChallenge } from './screens/challenge';
import { renderCodex } from './screens/codex';
import { renderEnd } from './screens/end';
import { renderGrimoire } from './screens/grimoire';
import { renderRitual } from './screens/ritual';
import { renderSetup } from './screens/setup';
import { renderShop } from './screens/shop';
import { renderTitle } from './screens/title';

export type ScreenName = 'title' | 'setup' | 'challenge' | 'ritual' | 'shop' | 'end' | 'grimoire' | 'codex';

export class App {
  meta: MetaState;
  run: RunState | null;
  private cleanup: (() => void) | null = null;
  current: ScreenName = 'title';

  constructor(public root: HTMLElement) {
    this.meta = loadMeta();
    this.run = loadRun();
    this.applySettings();
    document.addEventListener(
      'pointerdown',
      () => {
        sfx.unlock();
        if (this.meta.sound) sfx.startDrone();
      },
      { once: true },
    );
  }

  applySettings(): void {
    const s = this.meta.settings;
    sfx.setEnabled(this.meta.sound);
    sfx.setVolumes(s.music, s.sfx);
    document.documentElement.classList.toggle('reduced-fx', s.reducedFx);
  }

  show(name: ScreenName): void {
    this.cleanup?.();
    this.cleanup = null;
    this.root.innerHTML = '';
    this.current = name;
    const map: Record<ScreenName, (app: App) => (() => void) | void> = {
      title: renderTitle,
      setup: renderSetup,
      challenge: renderChallenge,
      ritual: renderRitual,
      shop: renderShop,
      end: renderEnd,
      grimoire: renderGrimoire,
      codex: renderCodex,
    };
    this.cleanup = map[name](this) ?? null;
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

  startRun(opts: RunOptions = {}): void {
    this.run = newRun(randomSeed(), metaBonuses(this.meta), opts);
    this.meta.runs++;
    this.saveAll();
    this.show('ritual');
  }

  startChallenge(mode: 'daily' | 'weekly'): void {
    const spec = challengeFor(mode);
    this.run = newRun(spec.seed, DEFAULT_META, {
      wheel: spec.wheel,
      stake: spec.stake,
      mode,
      dailyKey: `${mode}:${spec.key}`,
      omens: spec.omens,
    });
    this.meta.runs++;
    this.saveAll();
    this.show('ritual');
  }

  saveAll(): void {
    if (this.run) saveRun(this.run);
    saveMeta(this.meta);
  }

  /** Prüft Erfolge, schreibt Asche gut und zeigt sie an */
  achievements(ctx: AchievementCtx): void {
    const got = checkAchievements(ctx, this.meta.achievements);
    if (!got.length) return;
    for (const a of got) {
      this.meta.achievements.push(a.id);
      this.meta.ash += a.ash;
    }
    saveMeta(this.meta);
    sfx.achievement();
    got.forEach((a, i) =>
      setTimeout(() => toast(`<b class="s">Erfolg:</b> ${a.name} <span class="muted">(+${a.ash} Asche)</span>`), i * 2400),
    );
  }

  /** Einmalig beim Sieg über Luzifer: Stufen-Fortschritt und neue Kessel */
  recordVictory(): string[] {
    const run = this.run;
    if (!run) return [];
    const key = `victory:${run.seed}:${run.mode}`;
    if (this.meta.seen.includes(key)) return [];
    this.meta.seen.push(key);
    const news: string[] = [];
    if (run.mode === 'normal') {
      const prev = this.meta.wheelStakes[run.wheel] ?? 0;
      if (run.stake > prev) {
        this.meta.wheelStakes[run.wheel] = run.stake;
        if (run.stake < 5) news.push(`Höllenstufe ${run.stake + 1} für diesen Kessel freigeschaltet`);
      }
      const idx = WHEELS.findIndex((w) => w.id === run.wheel);
      const next = WHEELS[idx + 1];
      if (next && !this.meta.unlockedWheels.includes(next.id)) {
        this.meta.unlockedWheels.push(next.id);
        news.push(`Neuer Kessel: ${next.name}`);
      }
    }
    this.achievements({ run, victory: true });
    saveMeta(this.meta);
    return news;
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
    if (run.mode !== 'normal' && run.dailyKey) recordChallenge(this.meta, run.dailyKey, run.circle, run.stats.bestSpin.toString());
    this.achievements({ run, runEnd: true });
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
