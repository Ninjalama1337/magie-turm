import { sfx } from '../../audio/sfx';
import { albumReady } from '../../content/album';
import { circleName } from '../../core/run';
import { WheelView } from '../../render/wheel';
import type { App } from '../app';
import { h } from '../dom';
import { glyphSvg } from '../icons';
import { showHelp, showSettings } from './menu';
import { insightBadge } from '../insight';
import { ALL_REFS } from '../../content/unlocks';

export function renderTitle(app: App): () => void {
  const root = h('div', { class: 'screen title' });
  const run = app.run && (app.run.phase === 'ritual' || app.run.phase === 'shop') ? app.run : null;
  root.innerHTML = `
    <div class="title-wheel" data-wheel></div>
    <div class="title-content">
      <div class="title-kicker">Ein Roulette-Roguelite der Verdammnis</div>
      <h1 class="logo">Teufels<span>rad</span></h1>
      <div class="title-sub">Setze deine Seele. Dreh das Rad. Jage die Unendlichkeit.</div>
      <div class="title-buttons" data-buttons></div>
      <div class="title-stats">
        <span>${glyphSvg('flame')} Asche <b>${app.meta.ash}</b></span>
        <span>${glyphSvg('skull')} Runs <b>${app.meta.runs}</b></span>
        <span>${glyphSvg('tower')} Bester Kreis <b>${app.meta.bestCircle || '–'}</b></span>
        <span>${glyphSvg('pentagram')} Beste Drehung <b>${app.bestSpinText()}</b></span>
      </div>
    </div>
    <button class="icon-btn sound-btn" data-sound aria-label="Ton">${glyphSvg(app.meta.sound ? 'bell' : 'feather')}</button>`;
  app.root.append(root);

  const view = new WheelView(root.querySelector('[data-wheel]') as HTMLElement);
  view.wheelSpeed = -0.12;
  view.unlocked = 8;
  view.sigils = [
    { uid: 1, id: 'glut', level: 2 },
    { uid: 2, id: 'spiegel', level: 1 },
    { uid: 3, id: 'pentagramm', level: 3 },
    { uid: 4, id: 'tempo', level: 1 },
    { uid: 5, id: 'irrlicht', level: 2 },
    { uid: 6, id: 'echo', level: 1 },
    { uid: 7, id: 'blut', level: 2 },
    { uid: 8, id: 'kette', level: 1 },
  ];
  view.restPocket = 0;
  view.hot = 0.4;

  const btns = root.querySelector('[data-buttons]') as HTMLElement;
  root.querySelector('.title-stats')!.before(insightBadge(app.meta.insight.xp, app.meta.insight.unlocked.length, ALL_REFS().length));
  const add = (label: string, cls: string, fn: () => void, sub?: string) => {
    const b = h('button', { class: `btn ${cls}`, html: `${label}${sub ? `<small>${sub}</small>` : ''}` });
    b.addEventListener('click', () => {
      sfx.unlock();
      sfx.click();
      fn();
    });
    btns.append(b);
  };
  if (run) add('Fortsetzen', 'primary big', () => app.resume(), `Kreis ${run.circle} · ${circleName(run.circle)}`);
  add(run ? 'Neuer Pakt' : 'Pakt schließen', run ? 'big' : 'primary big', () => app.show('setup'));
  add('Herausforderungen', '', () => app.show('challenge'), 'Täglich & wöchentlich');
  const ready = albumReady(app.meta);
  add('Grimoire', '', () => app.show('grimoire'), `${app.meta.ash} Asche${ready ? ` · ${ready} Belohnung${ready > 1 ? 'en' : ''}` : ''}`);
  add('Kodex', '', () => app.show('codex'), `${app.meta.achievements.length} Erfolge`);
  const row = h('div', { class: 'title-row' });
  row.append(
    h('button', { class: 'btn ghost', text: 'Regeln', onclick: () => showHelp() }),
    h('button', { class: 'btn ghost', text: 'Einstellungen', onclick: () => showSettings(app) }),
  );
  btns.append(row);

  root.querySelector('[data-sound]')!.addEventListener('click', (e) => {
    const on = app.toggleSound();
    (e.currentTarget as HTMLElement).innerHTML = glyphSvg(on ? 'bell' : 'feather');
  });

  return () => view.dispose();
}
