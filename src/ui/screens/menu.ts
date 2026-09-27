import type { App } from '../app';
import { modal } from '../components';
import { h } from '../dom';

export function showHelp(): void {
  const body = h('div', { class: 'help' });
  body.innerHTML = `
    <div class="modal-kicker">Das Buch der Regeln</div>
    <div class="modal-title">Wie man den Teufel betrügt</div>
    <ol class="help-list">
      <li><b>Setze</b> vor jeder Drehung einen Einsatz: Farbe, Gerade/Ungerade, Hälfte, Dutzend oder eine einzelne Zahl. Triffst du, wird dein <b class="f">Fluch</b> multipliziert.</li>
      <li>Die <b>Seelenkugel</b> kreist Runde um Runde. Jede Runde bringt <b class="g">Glut</b>. Mit mehr <b class="t">Tempo</b> fährt sie mehr Runden.</li>
      <li>Auf den <b>8 Rauten</b> am Rand liegen <b>Siegel</b>. Jede Kugel löst sie bei jeder Runde der Reihe nach aus. Die Reihenfolge zählt!</li>
      <li>Deine <b>Arkana</b> (Tarotkarten) reagieren auf Runden, Siegel, Landungen und Einsätze. Die Reihenfolge von links nach rechts ist wichtig, zum Beispiel für den Magier.</li>
      <li><b>Glut × Fluch = Opfergabe.</b> Erreiche das Ziel des Rituals, bevor dir die Drehungen ausgehen.</li>
      <li>Nach jedem Ritual gibt es <b class="s">Seelen</b> für den <b>Basar</b>: Arkana, Siegel, Pakte und Verzauberungen.</li>
      <li>Jeder der <b>9 Höllenkreise</b> endet mit einem <b>Dämon</b>, der die Regeln verdreht. Danach wartet das <b>Jenseits</b> – bis zur Unendlichkeit.</li>
    </ol>
    <p class="muted">Tipp: Leertaste = Drehen / Überspringen. Tippe auf Karten für Details.</p>`;
  modal(body, [{ label: 'Verstanden', cls: 'primary' }], { cls: 'wide' });
}

export function showMenu(app: App, opts: { inRun: boolean }): void {
  const close = modal(
    `<div class="modal-kicker">Pausiert</div><div class="modal-title">Das Rad steht still</div>`,
    [
      { label: 'Weiter', cls: 'primary' },
      { label: 'Regeln', cls: 'ghost', onClick: () => showHelp() },
      {
        label: app.meta.sound ? 'Ton: an' : 'Ton: aus',
        cls: 'ghost',
        onClick: () => {
          app.toggleSound();
          close();
          showMenu(app, opts);
          return true;
        },
      },
      { label: 'Zum Titel', cls: 'ghost', onClick: () => (app.saveAll(), app.show('title')) },
      ...(opts.inRun
        ? [
            {
              label: 'Run aufgeben',
              cls: 'danger',
              onClick: () => {
                modal('<div class="modal-title">Deine Seele wirklich aufgeben?</div><p class="muted">Der Run endet sofort. Du erhältst Asche für deinen Fortschritt.</p>', [
                  { label: 'Abbrechen', cls: 'ghost' },
                  {
                    label: 'Aufgeben',
                    cls: 'danger',
                    onClick: () => {
                      if (app.run) app.run.phase = 'gameover';
                      app.show('end');
                    },
                  },
                ]);
              },
            },
          ]
        : []),
    ],
    { cls: 'menu' },
  );
}
