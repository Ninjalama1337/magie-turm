import { sfx } from '../audio/sfx';
import { LEVELS, levelFor, xpForLevel } from '../content/unlocks';
import type { XpResult } from '../core/progress';
import { modal, refCard, refDetail, refKindLabel, refName } from './components';
import { h } from './dom';
import { glyphSvg } from './icons';

/** Fortschritt innerhalb der aktuellen Stufe (0..1) und Rest bis zur nächsten */
export function levelProgress(xp: number): { level: number; ratio: number; toNext: number; maxed: boolean } {
  const level = levelFor(xp);
  if (level >= LEVELS.length) return { level, ratio: 1, toNext: 0, maxed: true };
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  return { level, ratio: (xp - lo) / (hi - lo), toNext: hi - xp, maxed: false };
}

/** Kleiner Balken für den Titelbildschirm */
export function insightBadge(xp: number, unlocked: number, total: number): HTMLElement {
  const p = levelProgress(xp);
  const el = h('div', { class: 'insight-badge' });
  el.innerHTML = `<div class="ins-head">${glyphSvg('eye')} Erkenntnis <b>Stufe ${p.level}</b><span class="muted">${unlocked}/${total} freigeschaltet</span></div>
    <div class="bar"><div class="bar-fill ins" style="width:${(p.ratio * 100).toFixed(1)}%"></div></div>
    <div class="ins-next muted">${p.maxed ? 'Alle Stufen erreicht' : `Nächste Stufe „${LEVELS[p.level].theme}“ in ${p.toNext}`}</div>`;
  return el;
}

/** Ergebnis-Panel am Run-Ende: animierter Balken und aufgedeckte Karten */
export function insightPanel(res: XpResult, xpNow: number): HTMLElement {
  const before = levelProgress(res.before);
  const now = levelProgress(xpNow);
  const el = h('section', { class: 'panel insight-panel' });
  el.innerHTML = `
    <div class="panel-head"><h2>${glyphSvg('eye')} Erkenntnis</h2><span class="ins-gain">+${res.gained}</span></div>
    <div class="ins-level">Stufe <b data-lvl>${before.level}</b></div>
    <div class="bar"><div class="bar-fill ins" data-fill style="width:${(before.ratio * 100).toFixed(1)}%"></div></div>
    <div class="ins-next muted">${now.maxed ? 'Alle Stufen erreicht – der ganze Kodex liegt dir offen.' : `Nächste Stufe „${LEVELS[now.level].theme}“ in ${now.toNext} Erkenntnis`}</div>
    ${res.levels.length ? `<div class="ins-themes">${res.levels.map((l) => `<span>${l.theme}</span>`).join('')}</div>` : ''}
    <div class="unlock-grid" data-grid></div>`;
  const fill = el.querySelector<HTMLElement>('[data-fill]')!;
  const lvl = el.querySelector<HTMLElement>('[data-lvl]')!;
  const grid = el.querySelector<HTMLElement>('[data-grid]')!;

  // Balken füllen – bei Stufenaufstieg einmal voll und neu beginnen
  const steps = res.levelAfter - res.levelBefore;
  let delay = 400;
  for (let i = 0; i < steps; i++) {
    setTimeout(() => {
      fill.style.width = '100%';
      setTimeout(() => {
        fill.style.transition = 'none';
        fill.style.width = '0%';
        void fill.offsetWidth;
        fill.style.transition = '';
        lvl.textContent = String(res.levelBefore + i + 1);
        lvl.classList.add('pop');
        sfx.achievement();
      }, 800);
    }, delay);
    delay += 1100;
  }
  setTimeout(() => (fill.style.width = `${(now.ratio * 100).toFixed(1)}%`), delay);

  // Neue Karten nacheinander aufdecken
  res.items.forEach((r, i) => {
    const wrap = h('div', { class: 'unlock-item' });
    wrap.style.animationDelay = `${delay / 1000 + 0.25 + i * 0.18}s`;
    const card = refCard(r);
    card.addEventListener('click', () => modal(refDetail(r), [{ label: 'Schließen' }]));
    wrap.append(card, h('div', { class: 'unlock-label', html: `<b>${refName(r)}</b><span>${refKindLabel(r)}</span>` }));
    grid.append(wrap);
  });
  if (res.items.length) setTimeout(() => sfx.buy(), delay + 300);
  return el;
}
