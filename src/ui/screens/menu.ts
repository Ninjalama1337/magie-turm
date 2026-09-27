import type { App } from '../app';
import { modal } from '../components';
import { sfx } from '../../audio/sfx';
import { h } from '../dom';
import { toast } from '../popups';

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
  modal(
    `<div class="modal-kicker">Pausiert</div><div class="modal-title">Das Rad steht still</div>`,
    [
      { label: 'Weiter', cls: 'primary' },
      { label: 'Regeln', cls: 'ghost', onClick: () => showHelp() },
      { label: 'Einstellungen', cls: 'ghost', onClick: () => showSettings(app) },
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

export function showSettings(app: App): void {
  const s = app.meta.settings;
  const body = h('div', { class: 'settings' });
  body.innerHTML = `
    <div class="modal-kicker">Einstellungen</div>
    <div class="modal-title">Das Ohr des Teufels</div>
    <label class="set-row"><span>Ton</span><input type="checkbox" data-k="sound" ${app.meta.sound ? 'checked' : ''}></label>
    <label class="set-row"><span>Musik</span><input type="range" min="0" max="1" step="0.05" data-k="music" value="${s.music}"></label>
    <label class="set-row"><span>Effekte</span><input type="range" min="0" max="1" step="0.05" data-k="sfx" value="${s.sfx}"></label>
    <label class="set-row"><span>Bildschirmwackeln</span><input type="checkbox" data-k="shake" ${s.shake ? 'checked' : ''}></label>
    <label class="set-row"><span>Reduzierte Effekte</span><input type="checkbox" data-k="reducedFx" ${s.reducedFx ? 'checked' : ''}></label>
    <label class="set-row"><span>Standard-Tempo</span><select data-k="speed">${[1, 2, 4].map((v) => `<option value="${v}" ${app.meta.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select></label>
    <button class="btn ghost small" data-reset-tut>Tutorial erneut zeigen</button>`;
  body.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.k;
    if (k === 'music' || k === 'sfx') s[k] = Number(t.value);
    else if (k === 'shake' || k === 'reducedFx') s[k] = t.checked;
    else if (k === 'sound') app.meta.sound = t.checked;
    else if (k === 'speed') app.meta.speed = Number(t.value);
    app.applySettings();
    if (app.meta.sound) sfx.startDrone();
    app.saveAll();
  });
  body.querySelector('[data-reset-tut]')!.addEventListener('click', () => {
    app.meta.seen = app.meta.seen.filter((x) => !x.startsWith('tutorial'));
    app.saveAll();
    toast('Das Tutorial erscheint beim nächsten Ritual.');
  });
  modal(body, [{ label: 'Fertig', cls: 'primary' }]);
}
