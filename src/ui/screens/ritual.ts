import Decimal from 'break_eternity.js';
import { sfx } from '../../audio/sfx';
import { fmt } from '../../core/num';
import { circleName, finishRitual, ritualName, spin } from '../../core/run';
import { moveArcana } from '../../core/shop';
import { betLabel, betPayout, isBetAllowed } from '../../core/spin';
import { computeStats, currentDemon } from '../../core/stats';
import type { Bet, BetKind, SpinEvent } from '../../core/types';
import { colorOf } from '../../core/wheel';
import { TONE_COLOR } from '../../render/colors';
import { playSpin, type Playback } from '../../render/timeline';
import { WheelView } from '../../render/wheel';
import type { App } from '../app';
import { arcanaCard, arcanaDetail, demonBanner, modal, pactChip, pactDetail } from '../components';
import { h, restartAnim, roman, wait } from '../dom';
import { glyphSvg } from '../icons';
import { popup, popupAt } from '../popups';
import { showHelp, showMenu } from './menu';

const BET_BUTTONS: { kind: BetKind; label: string; cls?: string }[] = [
  { kind: 'red', label: 'Rot', cls: 'c-red' },
  { kind: 'black', label: 'Schwarz', cls: 'c-black' },
  { kind: 'even', label: 'Gerade' },
  { kind: 'odd', label: 'Ungerade' },
  { kind: 'number', label: 'Zahl', cls: 'c-number' },
  { kind: 'low', label: '1–18' },
  { kind: 'high', label: '19–36' },
  { kind: 'dozen1', label: '1–12' },
  { kind: 'dozen2', label: '13–24' },
  { kind: 'dozen3', label: '25–36' },
];

const BET_ODDS: Record<BetKind, string> = {
  red: '18/37', black: '18/37', even: '18/37', odd: '18/37', low: '18/37', high: '18/37',
  dozen1: '12/37', dozen2: '12/37', dozen3: '12/37', number: '1/37',
};

export function countUp(el: HTMLElement, from: Decimal, to: Decimal, ms: number): void {
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    const v = to.gt(1e12) ? Decimal.pow(10, from.max(1).log10().add(to.max(1).log10().sub(from.max(1).log10()).mul(e))) : from.add(to.sub(from).mul(e));
    el.textContent = fmt(p >= 1 ? to : v);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function renderRitual(app: App): () => void {
  const run = app.run!;
  const stats = computeStats(run);
  const demon = currentDemon(run);
  let bet: Bet = isBetAllowed(run, run.lastBet) ? { ...run.lastBet } : { kind: 'red' };
  let busy = false;
  let playback: Playback | null = null;
  let disposed = false;

  const root = h('div', { class: 'screen ritual' + (demon ? ' is-demon' : '') });
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-menu aria-label="Menü">${glyphSvg('book')}</button>
      <div class="tb-center">
        <div class="tb-circle">Kreis ${roman(run.circle)} · ${circleName(run.circle)}</div>
        <div class="tb-ritual">${demon ? demon.name : ritualName(run)}</div>
      </div>
      <div class="souls-pill" title="Seelen">${glyphSvg('coin')}<b data-souls>${run.souls}</b></div>
    </header>
    <div class="col col-left">
      <section class="goal">
        <div class="goal-top"><span class="lbl">Opfergabe</span>
          <span class="goal-nums"><b data-score>${fmt(run.ritualScore)}</b> <span class="of">/ ${fmt(run.target)}</span></span></div>
        <div class="bar"><div class="bar-fill" data-bar></div></div>
        <div class="spins-row"><span class="lbl">Drehungen</span><span class="spin-pips" data-spins></span></div>
      </section>
      <div class="demon-slot" data-demon></div>
      <section class="calc">
        <div class="calc-box glut"><span class="lbl">Glut</span><b data-glut>0</b></div>
        <span class="times">×</span>
        <div class="calc-box fluch"><span class="lbl">Fluch</span><b data-fluch>${fmt(stats.baseFluch)}</b></div>
      </section>
      <section class="pacts-row" data-pacts></section>
      <section class="stats-panel">
        <span class="lbl">Kesselwerte</span>
        <span class="t">Start-Tempo</span><b>${stats.tempo}</b>
        <span>Reibung je Runde</span><b>${stats.friction.toFixed(2).replace('.', ',')}</b>
        <span class="g">Glut je Runde</span><b>${stats.lapGlut}</b>
        <span class="f">Basis-Fluch</span><b>${stats.baseFluch}</b>
        <span class="w">Max. Irrlichter</span><b>${demon?.mods.noGhosts ? 0 : stats.ghostCap}</b>
        <span>Freie Rauten</span><b>${run.sigilUnlocked}/8</b>
      </section>
    </div>
    <div class="col col-mid">
      <section class="arcana-row" data-arcana></section>
      <section class="stage">
        <div class="wheel-wrap" data-wheel>
          <div class="wheel-center" data-center></div>
          <div class="pocket-flag" data-pocket></div>
        </div>
      </section>
    </div>
    <div class="col col-right">
      <section class="bets" data-bets></section>
      <section class="controls">
        <button class="btn ghost speed" data-speed title="Tempo">${app.meta.speed}×</button>
        <button class="btn primary spin-btn" data-spin>Drehen</button>
        <button class="btn ghost skip" data-skip title="Überspringen" disabled>»</button>
      </section>
    </div>`;
  app.root.append(root);

  const q = <T extends HTMLElement>(s: string) => root.querySelector(`[data-${s}]`) as T;
  const soulsEl = q('souls');
  const scoreEl = q('score');
  const barEl = q('bar');
  const spinsEl = q('spins');
  const arcanaEl = q('arcana');
  const glutEl = q('glut');
  const fluchEl = q('fluch');
  const betsEl = q('bets');
  const spinBtn = q<HTMLButtonElement>('spin');
  const skipBtn = q<HTMLButtonElement>('skip');
  const speedBtn = q<HTMLButtonElement>('speed');
  const centerEl = q('center');
  const pocketEl = q('pocket');

  if (demon) q('demon').append(demonBanner(demon.id));

  const view = new WheelView(q('wheel'));
  view.sigils = run.sigils;
  view.unlocked = run.sigilUnlocked;
  view.enchants = { ...run.enchants };
  view.blockedSlot = demon?.mods.blockFirstSigil ? 0 : -1;

  // ---------------------------------------------------------------- Rendering

  function renderGoal(score = run.ritualScore): void {
    const ratio = run.target.gt(0) ? Math.min(1, score.div(run.target).toNumber()) : 0;
    barEl.style.width = `${(ratio * 100).toFixed(1)}%`;
    const total = stats.spins;
    spinsEl.innerHTML = Array.from({ length: total }, (_, i) => `<i class="${i < run.spinsLeft ? 'on' : ''}"></i>`).join('');
  }

  function renderArcana(): void {
    arcanaEl.innerHTML = '';
    const slots = stats.arcanaSlots;
    run.arcana.forEach((a, i) => {
      const inactive = !!demon?.mods.disableRightmost && i === run.arcana.length - 1;
      const card = arcanaCard(a.id, { inst: a, inactive });
      card.dataset.i = String(i);
      card.addEventListener('click', () => inspectArcana(i));
      arcanaEl.append(card);
    });
    for (let i = run.arcana.length; i < slots; i++) arcanaEl.append(h('div', { class: 'tarot empty' }));
  }

  function renderPacts(): void {
    const el = q('pacts');
    el.innerHTML = '';
    if (!run.pacts.length) {
      el.innerHTML = '<span class="muted">Noch keine Pakte geschlossen</span>';
      return;
    }
    for (const p of run.pacts) {
      const c = pactChip(p);
      c.addEventListener('click', () => modal(pactDetail(p.id, p.stacks), [{ label: 'Schließen' }]));
      el.append(c);
    }
  }

  function renderBets(): void {
    betsEl.innerHTML = '';
    for (const b of BET_BUTTONS) {
      const candidate: Bet = b.kind === 'number' ? { kind: 'number', number: bet.kind === 'number' ? bet.number : 17 } : { kind: b.kind };
      const allowed = isBetAllowed(run, candidate);
      const sel = bet.kind === b.kind;
      const label = b.kind === 'number' && bet.kind === 'number' ? `Zahl ${bet.number}` : b.label;
      const btn = h('button', {
        class: `bet ${b.cls ?? ''}${sel ? ' sel' : ''}`,
        disabled: !allowed || busy,
        html: `<span class="bet-l">${label}</span><span class="bet-p">×${betPayout(candidate, stats)}</span><span class="bet-o">${BET_ODDS[b.kind]}</span>`,
      });
      btn.dataset.kind = b.kind;
      btn.addEventListener('click', () => {
        sfx.click();
        if (b.kind === 'number') return pickNumber();
        bet = { kind: b.kind };
        renderBets();
      });
      betsEl.append(btn);
    }
  }

  function pickNumber(): void {
    const grid = h('div', { class: 'num-grid' });
    const zero = h('button', { class: 'num c-hell', text: '0' });
    zero.style.gridRow = '1 / span 3';
    grid.append(zero);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 12; col++) {
        const n = col * 3 + (3 - row);
        grid.append(h('button', { class: `num c-${colorOf(n)}`, text: String(n) }));
      }
    }
    let close = () => {};
    grid.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      if (!t.classList.contains('num')) return;
      bet = { kind: 'number', number: Number(t.textContent) };
      sfx.click();
      renderBets();
      close();
    });
    const wrap = h('div', {}, [h('div', { class: 'modal-title', text: 'Auf welche Zahl setzt du?' }), grid]);
    close = modal(wrap, [{ label: 'Abbrechen', cls: 'ghost' }], { cls: 'wide' });
  }

  function inspectArcana(i: number): void {
    const a = run.arcana[i];
    if (!a) return;
    modal(arcanaDetail(a.id, a), [
      { label: '◀', disabled: busy || i === 0, onClick: () => { moveArcana(run, i, i - 1); renderArcana(); app.saveAll(); } },
      { label: 'Schließen' },
      { label: '▶', disabled: busy || i === run.arcana.length - 1, onClick: () => { moveArcana(run, i, i + 1); renderArcana(); app.saveAll(); } },
    ]);
  }

  function setBusy(b: boolean): void {
    busy = b;
    spinBtn.disabled = b;
    skipBtn.disabled = !b;
    root.classList.toggle('busy', b);
    renderBets();
  }

  renderGoal();
  renderArcana();
  renderPacts();
  renderBets();

  // ---------------------------------------------------------------- Events

  function handleEvents(evs: SpinEvent[], skipping: boolean): void {
    let last: SpinEvent | null = null;
    let pops = 0;
    const cards = arcanaEl.querySelectorAll<HTMLElement>('.tarot:not(.empty)');
    for (const e of evs) {
      last = e;
      if (skipping) continue;
      switch (e.type) {
        case 'lap':
          if (e.ball === 0) sfx.lap(e.tick);
          break;
        case 'ghostSpawn': {
          sfx.ghost();
          const p = view.ballPos({ angle: -Math.PI / 2, radius: view.trackR });
          view.burst(p.x, p.y, TONE_COLOR.ghost, 18, 0.6);
          break;
        }
        case 'land': {
          const n = e.pocket ?? 0;
          view.pocketGlow = { n, t: 3 };
          const p = view.pocketPos(n);
          view.burst(p.x, p.y, colorOf(n) === 'red' ? '#ff3b5c' : colorOf(n) === 'hell' ? '#b44cff' : '#f1e4c8', 50);
          view.shake = Math.max(view.shake, 0.5);
          sfx.land();
          showPocket(n);
          break;
        }
        case 'ghostLand': {
          const p = view.pocketPos(e.pocket ?? 0);
          view.burst(p.x, p.y, TONE_COLOR.ghost, 12, 0.5);
          break;
        }
        case 'fx': {
          const show = pops++ < 14;
          const tone = e.tone ?? 'info';
          const src = e.src;
          if (!src) break;
          if (src.k === 'arcana') {
            const card = cards[src.i];
            if (card) {
              restartAnim(card, 'jump');
              if (show && e.text) popupAt(card, e.text, tone);
            }
          } else if (src.k === 'sigil') {
            view.triggerSlot(src.i, TONE_COLOR[tone]);
            sfx.sigil(src.i);
            if (show && e.text) {
              const p = view.toPage(view.slotPos(src.i));
              popup(p.x, p.y - 10, e.text, tone);
            }
          } else if (src.k === 'pocket') {
            if (show && e.text && view.restPocket === null) {
              const pp = view.toPage(view.pocketPos(e.pocket ?? 0, view.R * 0.4));
              popup(pp.x, pp.y, e.text, tone);
            } else if (e.text) {
              popupAt(centerEl, e.text, tone);
            }
          } else if (src.k === 'bet') {
            const btn = betsEl.querySelector('.bet.sel');
            if (e.text) popupAt(btn, e.text, tone, true);
            if (tone === 'bad') sfx.miss();
            else {
              sfx.hit();
              view.shake = 1;
              if (btn) restartAnim(btn, 'won');
            }
          } else if (src.k === 'pact' || src.k === 'demon') {
            if (e.text) popupAt(centerEl, e.text, tone, true);
          }
          if (tone === 'glut') sfx.glut();
          else if (tone === 'fluch') sfx.fluch();
          else if (tone === 'xfluch') {
            sfx.xfluch();
            view.shake = Math.min(1.2, view.shake + 0.25);
          } else if (tone === 'souls') {
            sfx.souls();
            const m = e.text?.match(/\d+/);
            if (m) soulsEl.textContent = String(Number(soulsEl.textContent) + Number(m[0]));
          }
          break;
        }
      }
    }
    if (last) {
      glutEl.textContent = fmt(last.glut);
      fluchEl.textContent = fmt(last.fluch, true);
      restartAnim(glutEl, 'tick');
      restartAnim(fluchEl, 'tick');
      const live = last.glut.mul(last.fluch);
      view.hot = Math.min(1, Math.max(view.hot, live.div(run.target.max(1)).toNumber()));
      root.classList.toggle('frenzy', last.fluch.gte(1e4));
    }
  }

  function showPocket(n: number): void {
    const c = colorOf(n);
    const name = c === 'red' ? 'Rot' : c === 'black' ? 'Schwarz' : 'Höllenfach';
    pocketEl.innerHTML = `<span class="pocket-badge c-${c}">${n}</span><span>${name}</span>`;
    restartAnim(pocketEl, 'show');
  }

  // ---------------------------------------------------------------- Drehen

  async function doSpin(): Promise<void> {
    if (busy || run.phase !== 'ritual' || run.spinsLeft <= 0) return;
    if (!isBetAllowed(run, bet)) return;
    sfx.unlock();
    setBusy(true);
    const prevScore = run.ritualScore;
    pocketEl.classList.remove('show');
    centerEl.innerHTML = '';
    glutEl.textContent = '0';
    fluchEl.textContent = fmt(stats.baseFluch);
    view.hot = 0;

    const { result, outcome } = spin(run, bet);
    const betName = betLabel(bet);
    centerEl.innerHTML = `<div class="bet-show">${betName}</div>`;

    playback = playSpin(view, result, { speed: () => app.meta.speed, onEvents: handleEvents });
    await playback.done;
    playback = null;
    if (disposed) return;

    glutEl.textContent = fmt(result.glut);
    fluchEl.textContent = fmt(result.fluch, true);
    soulsEl.textContent = String(run.souls);
    view.enchants = { ...run.enchants };

    centerEl.innerHTML = `<div class="reveal"><span>Opfergabe</span><b>+${fmt(result.score)}</b></div>`;
    const big = result.score.gte(run.target.div(2));
    sfx.score(big);
    view.shake = big ? 1.2 : 0.5;
    view.burst(view.R, view.R, big ? '#ff4fd8' : '#ff9a3c', big ? 90 : 40, big ? 1.4 : 0.9);
    countUp(scoreEl, prevScore, run.ritualScore, 800);
    renderGoal();
    restartAnim(scoreEl, 'tick');
    renderArcana();
    app.saveAll();
    await wait(1000 / Math.max(1, app.meta.speed / 1.5));
    if (disposed) return;

    if (outcome === 'won') {
      sfx.win();
      showReward();
    } else if (outcome === 'lost') {
      sfx.lose();
      await wait(600);
      app.show('end');
    } else {
      setBusy(false);
    }
  }

  function showReward(): void {
    const lines = finishRitual(run);
    app.saveAll();
    const total = lines.reduce((s, l) => s + l.souls, 0);
    const body = h('div', { class: 'reward' });
    body.innerHTML = `
      <div class="modal-kicker">${demon ? `${demon.name} ist gebannt` : 'Das Ritual ist vollendet'}</div>
      <div class="modal-title">Opfergabe ${fmt(run.ritualScore)}</div>
      <ul class="reward-lines">${lines.map((l) => `<li><span>${l.label}</span><b class="s">+${l.souls}</b></li>`).join('')}</ul>
      <div class="reward-total">${glyphSvg('coin')} <b>+${total}</b> Seelen</div>`;
    modal(
      body,
      [
        {
          label: run.phase === 'victory' ? 'Luzifer fällt …' : 'Zum Basar',
          cls: 'primary',
          onClick: () => app.show(run.phase === 'victory' ? 'end' : 'shop'),
        },
      ],
      { dismiss: false },
    );
  }

  spinBtn.addEventListener('click', () => void doSpin());
  skipBtn.addEventListener('click', () => playback?.skip());
  speedBtn.addEventListener('click', () => {
    const order = [1, 2, 4];
    app.meta.speed = order[(order.indexOf(app.meta.speed) + 1) % order.length] ?? 1;
    speedBtn.textContent = `${app.meta.speed}×`;
    app.saveAll();
  });
  q('menu').addEventListener('click', () => showMenu(app, { inRun: true }));

  const onKey = (e: KeyboardEvent) => {
    if (document.querySelector('.modal-back')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (busy) playback?.skip();
      else void doSpin();
    }
  };
  window.addEventListener('keydown', onKey);

  if (!app.meta.seen.includes('help')) {
    app.meta.seen.push('help');
    app.saveAll();
    setTimeout(() => showHelp(), 300);
  }

  return () => {
    disposed = true;
    playback?.skip();
    window.removeEventListener('keydown', onKey);
    view.dispose();
  };
}
