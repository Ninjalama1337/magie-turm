import { sfx } from '../../audio/sfx';
import { fmt } from '../../core/num';
import { ashFor, circleName, continueEndless } from '../../core/run';
import type { App } from '../app';
import { h } from '../dom';
import { glyphSvg } from '../icons';

export function renderEnd(app: App): void {
  const run = app.run;
  if (!run) return app.show('title');
  const victory = run.phase === 'victory';
  const ash = victory ? ashFor(run) : app.endRun();

  const st = run.stats;
  const root = h('div', { class: `screen end ${victory ? 'victory' : 'defeat'}` });
  root.innerHTML = `
    <div class="end-sigil">${glyphSvg(victory ? 'devil' : 'skull', 'glyph huge')}</div>
    <div class="modal-kicker">${victory ? 'Der Lichtbringer ist gefallen' : 'Rien ne va plus'}</div>
    <h1 class="end-title">${victory ? 'Du hast die Hölle bezwungen' : 'Deine Seele gehört mir'}</h1>
    <p class="end-sub">${
      victory
        ? 'Neun Kreise liegen hinter dir. Doch jenseits der Hölle dreht sich das Rad weiter – bis zur Unendlichkeit.'
        : `Gefallen in Kreis ${run.circle} · ${circleName(run.circle)}.`
    }</p>
    <div class="end-stats">
      <div><span>Erreichter Kreis</span><b>${run.circle}</b></div>
      <div><span>Rituale vollendet</span><b>${st.ritualsWon}</b></div>
      <div><span>Beste Drehung</span><b>${fmt(st.bestSpin)}</b></div>
      <div><span>Bestes Ritual</span><b>${fmt(st.bestRitual)}</b></div>
      <div><span>Meiste Runden</span><b>${st.maxLaps}</b></div>
      <div><span>Meiste Irrlichter</span><b>${st.maxGhosts}</b></div>
      <div><span>Einsätze getroffen</span><b>${st.betsHit}/${st.spins}</b></div>
    </div>
    <div class="end-ash">${glyphSvg('flame')} <b>+${ash}</b> Asche ${victory ? '(beim Beenden)' : 'verdient'}</div>
    <div class="end-buttons" data-b></div>`;
  app.root.append(root);
  const b = root.querySelector('[data-b]') as HTMLElement;

  if (victory) {
    sfx.win();
    b.append(
      h('button', {
        class: 'btn primary big',
        html: 'Ins Jenseits<small>Endlos-Modus</small>',
        onclick: () => {
          continueEndless(run);
          app.saveAll();
          app.show('shop');
        },
      }),
      h('button', {
        class: 'btn big',
        html: 'Triumph einfordern<small>Run beenden</small>',
        onclick: () => {
          app.endRun();
          app.run = null;
          app.show('title');
        },
      }),
    );
  } else {
    app.run = null;
    b.append(
      h('button', { class: 'btn primary big', text: 'Neuer Pakt', onclick: () => app.startNewRun() }),
      h('button', { class: 'btn', text: 'Grimoire', onclick: () => app.show('grimoire') }),
      h('button', { class: 'btn ghost', text: 'Zum Titel', onclick: () => app.show('title') }),
    );
  }
}
