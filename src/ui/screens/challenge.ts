import { sfx } from '../../audio/sfx';
import { OMEN_BY_ID } from '../../content/omens';
import { STAKES } from '../../content/stakes';
import { challengeFor, dayKey, msUntilReset } from '../../core/daily';
import { Decimal, fmt } from '../../core/num';
import { WHEEL_BY_ID } from '../../core/wheel';
import type { App } from '../app';
import { modal } from '../components';
import { h, roman } from '../dom';
import { glyphSvg } from '../icons';

function streak(app: App): number {
  let n = 0;
  const d = new Date();
  for (;;) {
    const key = `daily:${dayKey(d)}`;
    if (!app.meta.dailies[key]) break;
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

export function renderChallenge(app: App): () => void {
  const root = h('div', { class: 'screen challenge' });
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="Zurück">←</button>
      <div class="tb-center"><div class="tb-circle">Herausforderungen</div><div class="tb-ritual">Das Schicksal ist für alle gleich</div></div>
      <div class="souls-pill ash" title="Serie">${glyphSvg('flame')}<b>${streak(app)}</b></div>
    </header>
    <p class="intro">Jeden Tag und jede Woche dreht sich das Rad für alle Verdammten mit demselben Schicksal: gleicher Kessel, gleiche Omen, gleiche Angebote. Grimoire-Boni gelten hier nicht. Gewertet wird dein <b>erster Versuch</b>.</p>
    <div class="challenges" data-list></div>
    <section class="panel">
      <div class="panel-head"><h2>Verlauf</h2></div>
      <div class="history" data-history></div>
    </section>`;
  app.root.append(root);
  const list = root.querySelector('[data-list]') as HTMLElement;

  let timerEl: HTMLElement | null = null;
  for (const mode of ['daily', 'weekly'] as const) {
    const spec = challengeFor(mode);
    const key = `${mode}:${spec.key}`;
    const rec = app.meta.dailies[key];
    const w = WHEEL_BY_ID[spec.wheel];
    const card = h('section', { class: `panel challenge-card ${mode}` });
    card.innerHTML = `
      <div class="panel-head"><h2>${mode === 'daily' ? 'Tägliches Opfer' : 'Wöchentliche Prüfung'}</h2><span class="hint">${spec.key}${mode === 'daily' ? ' · <span data-timer></span>' : ''}</span></div>
      <div class="ch-row">${glyphSvg(w.glyph, 'glyph big')}<div><b>${w.name}</b><br><span class="muted">Höllenstufe ${roman(spec.stake)} · ${STAKES[spec.stake - 1].name}</span></div></div>
      <ul class="omens">${spec.omens.map((id) => `<li>${glyphSvg(OMEN_BY_ID[id].glyph)}<div><b>${OMEN_BY_ID[id].name}</b><br>${OMEN_BY_ID[id].desc}</div></li>`).join('')}</ul>
      <div class="ch-result">${
        rec
          ? `Gewertet: <b>Kreis ${rec.first.circle}</b> · ${fmt(new Decimal(rec.first.score))}<br><span class="muted">Bestwert: Kreis ${rec.best.circle} · ${rec.attempts} Versuch${rec.attempts > 1 ? 'e' : ''}</span>`
          : '<span class="muted">Noch nicht gespielt</span>'
      }</div>`;
    const btn = h('button', { class: `btn ${rec ? '' : 'primary'} big`, html: rec ? 'Erneut versuchen<small>zählt nicht mehr</small>' : 'Herausforderung annehmen' });
    btn.addEventListener('click', () => {
      sfx.click();
      const start = () => app.startChallenge(mode);
      if (app.run && (app.run.phase === 'ritual' || app.run.phase === 'shop')) {
        modal('<div class="modal-title">Laufenden Run aufgeben?</div><p class="muted">Dein aktueller Run geht verloren.</p>', [
          { label: 'Abbrechen', cls: 'ghost' },
          { label: 'Annehmen', cls: 'danger', onClick: start },
        ]);
      } else start();
    });
    card.append(btn);
    list.append(card);
    if (mode === 'daily') timerEl = card.querySelector('[data-timer]');
  }

  const hist = root.querySelector('[data-history]') as HTMLElement;
  const entries = Object.entries(app.meta.dailies).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  hist.innerHTML = entries.length
    ? entries
        .map(
          ([k, r]) =>
            `<div class="hist-row"><span>${k.startsWith('daily') ? 'Täglich' : 'Woche'} ${k.split(':')[1]}</span><b>Kreis ${r.first.circle}</b><span class="muted">${fmt(new Decimal(r.first.score))}</span></div>`,
        )
        .join('')
    : '<span class="muted">Noch keine Herausforderungen gespielt.</span>';

  const tick = () => {
    if (!timerEl) return;
    const ms = msUntilReset();
    const hh = Math.floor(ms / 3600000);
    const mm = Math.floor((ms % 3600000) / 60000);
    const ss = Math.floor((ms % 60000) / 1000);
    timerEl.textContent = `neu in ${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };
  tick();
  const iv = window.setInterval(tick, 1000);
  root.querySelector('[data-back]')!.addEventListener('click', () => app.show('title'));
  return () => clearInterval(iv);
}
