import { h } from './dom';

export interface TutorialStep {
  /** CSS-Selektor des hervorgehobenen Elements (optional) */
  sel?: string;
  title: string;
  text: string;
}

/** Geführtes Tutorial mit Spotlight. Löst das Promise nach dem letzten Schritt auf. */
export function runTutorial(steps: TutorialStep[]): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const back = h('div', { class: 'tut-back' });
    const spot = h('div', { class: 'tut-spot' });
    const box = h('div', { class: 'tut-box' });
    back.append(spot, box);
    document.body.append(back);

    const finish = () => {
      back.remove();
      window.removeEventListener('resize', place);
      resolve();
    };

    function place(): void {
      const step = steps[i];
      const target = step.sel ? document.querySelector<HTMLElement>(step.sel) : null;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
        const r = target.getBoundingClientRect();
        const pad = 6;
        spot.style.display = 'block';
        spot.style.left = `${r.left - pad}px`;
        spot.style.top = `${r.top - pad}px`;
        spot.style.width = `${r.width + pad * 2}px`;
        spot.style.height = `${r.height + pad * 2}px`;
        const below = r.bottom + 180 < window.innerHeight;
        box.style.top = below ? `${Math.min(window.innerHeight - 170, r.bottom + 14)}px` : `${Math.max(10, r.top - 14 - box.offsetHeight)}px`;
      } else {
        spot.style.display = 'none';
        box.style.top = `${window.innerHeight / 2 - box.offsetHeight / 2}px`;
      }
    }

    function render(): void {
      const step = steps[i];
      box.innerHTML = `<div class="tut-count">${i + 1} / ${steps.length}</div>
        <div class="tut-title">${step.title}</div><p>${step.text}</p>`;
      const row = h('div', { class: 'tut-buttons' });
      row.append(
        h('button', { class: 'btn ghost small', text: 'Überspringen', onclick: finish }),
        h('button', {
          class: 'btn primary small',
          text: i === steps.length - 1 ? 'Los geht’s' : 'Weiter',
          onclick: () => {
            i++;
            if (i >= steps.length) finish();
            else render();
          },
        }),
      );
      box.append(row);
      requestAnimationFrame(place);
    }

    window.addEventListener('resize', place);
    render();
  });
}

export const RITUAL_TUTORIAL: TutorialStep[] = [
  {
    title: 'Willkommen am Teufelsrad',
    text: 'Du spielst um deine Seele. Jedes Ritual verlangt eine <b>Opfergabe</b>, die du erreichen musst, bevor dir die Drehungen ausgehen.',
    sel: '.goal',
  },
  {
    title: 'Dein Einsatz',
    text: 'Wähle vor jeder Drehung einen Einsatz. Triffst du, wird dein <b class="f">Fluch</b> multipliziert. Riskantere Einsätze zahlen mehr.',
    sel: '.bets',
  },
  {
    title: 'Der Kessel',
    text: 'Die <b>Seelenkugel</b> kreist Runde um Runde und sammelt <b class="g">Glut</b>. Die Rauten am Rand tragen <b>Siegel</b>, die bei jeder Runde der Reihe nach auslösen.',
    sel: '.wheel-wrap',
  },
  {
    title: 'Arkana',
    text: 'Deine Tarotkarten reagieren auf Runden, Siegel, Landungen und Einsätze. Ziehe sie, um ihre Reihenfolge zu ändern – manche wirken auf ihre Nachbarn.',
    sel: '.arcana-row',
  },
  {
    title: 'Glut × Fluch',
    text: 'Am Ende jeder Drehung wird <b class="g">Glut</b> × <b class="f">Fluch</b> zur Opfergabe. Jetzt: <b>Drehen!</b>',
    sel: '.spin-btn',
  },
];

export const SHOP_TUTORIAL: TutorialStep[] = [
  {
    title: 'Der Basar',
    text: 'Hier tauschst du <b class="s">Seelen</b> gegen Arkana, Siegel, Pakte, Tränke und Verzauberungen. Tippe eine Karte für Details an.',
    sel: '.offers-panel',
  },
  {
    title: 'Rauten ordnen',
    text: 'Die Reihenfolge der Siegel zählt. Ziehe Siegel auf andere Rauten, um sie zu tauschen – ein Spiegelsiegel verstärkt zum Beispiel das nächste.',
    sel: '.runes',
  },
  {
    title: 'Weiter geht’s',
    text: 'Wenn du bereit bist, beginne das nächste Ritual. Im dritten Ritual jedes Kreises wartet ein <b>Dämon</b>.',
    sel: '.next-panel',
  },
];
