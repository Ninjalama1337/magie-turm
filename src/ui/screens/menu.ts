import type { App } from '../app';
import { modal } from '../components';
import { sfx } from '../../audio/sfx';
import { h } from '../dom';
import { toast } from '../popups';
import { exportSave, parseSave, saveRun } from '../../core/save';

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
    <button class="btn ghost small" data-reset-tut>Tutorial erneut zeigen</button>
    <div class="set-save"><span>Spielstand</span><button class="btn ghost small" data-export>Exportieren</button><button class="btn ghost small" data-import>Importieren</button></div>`;
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
  body.querySelector('[data-export]')!.addEventListener('click', () => showExport(app));
  body.querySelector('[data-import]')!.addEventListener('click', () => showImport(app));
  modal(body, [{ label: 'Fertig', cls: 'primary' }]);
}

/** Spielstand als Code anzeigen und kopieren */
export function showExport(app: App): void {
  app.saveAll();
  const code = exportSave(app.meta, app.run);
  const body = h('div', { class: 'save-io' });
  body.innerHTML = `
    <div class="modal-kicker">Spielstand sichern</div>
    <div class="modal-title">Dein Seelenvertrag</div>
    <p class="muted">Kopiere diesen Code und bewahre ihn auf. Mit „Importieren“ holst du deinen Fortschritt auf jedes Gerät zurück, auch nach einer Neuinstallation.</p>
    <textarea readonly rows="5" data-code></textarea>`;
  const ta = body.querySelector('[data-code]') as HTMLTextAreaElement;
  ta.value = code;
  ta.addEventListener('focus', () => ta.select());
  modal(body, [
    { label: 'Schließen', cls: 'ghost' },
    {
      label: 'Kopieren',
      cls: 'primary',
      onClick: () => {
        const done = () => toast('Code kopiert.');
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, () => fallbackCopy(ta, done));
        else fallbackCopy(ta, done);
      },
    },
  ]);
}

function fallbackCopy(ta: HTMLTextAreaElement, done: () => void): void {
  ta.select();
  try {
    if (document.execCommand('copy')) done();
    else toast('Bitte den Code manuell kopieren.');
  } catch {
    toast('Bitte den Code manuell kopieren.');
  }
}

/** Code einfügen und Spielstand ersetzen */
export function showImport(app: App): void {
  const body = h('div', { class: 'save-io' });
  body.innerHTML = `
    <div class="modal-kicker">Spielstand laden</div>
    <div class="modal-title">Vertrag einlösen</div>
    <p class="muted">Füge einen exportierten Code ein. <b class="bad">Dein aktueller Fortschritt wird ersetzt.</b></p>
    <textarea rows="5" placeholder="TEUFELSRAD1:…" data-code></textarea>`;
  const ta = body.querySelector('[data-code]') as HTMLTextAreaElement;
  modal(body, [
    { label: 'Abbrechen', cls: 'ghost' },
    {
      label: 'Laden',
      cls: 'danger',
      onClick: () => {
        const data = parseSave(ta.value);
        if (!data) {
          toast('Ungültiger Code.');
          return true;
        }
        app.meta = data.meta;
        app.run = data.run;
        saveRun(data.run);
        app.saveAll();
        app.applySettings();
        toast(`Spielstand geladen: ${data.meta.ash} Asche, ${data.meta.runs} Runs.`);
        app.show('title');
      },
    },
  ]);
}
