/* E2E-Smoke-Test: baut nicht selbst – vorher `npm run build`.
 * Startet `vite preview`, spielt Titel → Ritual → Drehung → Basar → Kauf → nächstes Ritual
 * auf Handy- und Desktop-Viewport und speichert Screenshots in e2e/shots/.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
mkdirSync('e2e/shots', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const stop = () => server.kill('SIGTERM');

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Preview-Server startet nicht');
}

let fail = 0;
const ok = (cond, name) => {
  console.log(`  ${cond ? '✓' : '✗ FAIL:'} ${name}`);
  if (!cond) fail++;
};

async function scenario(browser, name, viewport) {
  console.log(`--- ${name} (${viewport.width}×${viewport.height})`);
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(URL);
  await page.waitForSelector('.logo');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `e2e/shots/${name}-1-title.png` });
  ok(await page.locator('.logo').isVisible(), 'Titel sichtbar');

  await page.getByRole('button', { name: /Pakt schließen/ }).click();
  await page.waitForSelector('.setup');
  await page.waitForTimeout(500);
  ok((await page.locator('.stake').count()) === 5, '5 Höllenstufen im Setup');
  ok((await page.locator('.hero').count()) === 6, '6 Beschwörer im Setup');
  ok((await page.locator('.hero.locked').count()) === 5, 'Nur der Wanderer ist zu Beginn frei');
  await page.screenshot({ path: `e2e/shots/${name}-0-setup.png` });
  await page.locator('.setup-go .btn').click();
  await page.waitForSelector('.ritual');
  await page.waitForSelector('.tut-box');
  await page.screenshot({ path: `e2e/shots/${name}-1b-tutorial.png` });
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.waitForTimeout(300);
  ok((await page.locator('.bet').count()) === 10, '10 Einsatz-Felder');
  ok(await page.locator('.wheel-canvas').isVisible(), 'Kessel sichtbar');

  // Zum Testen: ein bisschen Ausstattung, damit Effekte sichtbar werden
  await page.evaluate(() => {
    const run = window.__app.run;
    run.arcana.push({ uid: 900, id: 'herrscherin', level: 2, state: {} }, { uid: 901, id: 'sonne', level: 1, state: {} }, { uid: 902, id: 'schatten', level: 1, state: {} });
    run.sigils[1] = { uid: 903, id: 'pentagramm', level: 1 };
    run.sigils[2] = { uid: 904, id: 'tempo', level: 2 };
    run.arcana[0].edition = 'holo';
    run.potions = ['blut', 'phiole'];
    window.__app.show('ritual');
  });
  await page.waitForTimeout(300);
  ok((await page.locator('.bonds-bar').count()) === 1, 'Bünde-Leiste im Ritual');
  await page.screenshot({ path: `e2e/shots/${name}-2-ritual.png` });

  // Drag & Drop: erste Arkana ans Ende ziehen
  const cards = page.locator('.arcana-row .tarot:not(.empty)');
  const first = await cards.nth(0).boundingBox();
  const last = await cards.nth(2).boundingBox();
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(first.x + 30, first.y + 20, { steps: 4 });
  await page.mouse.move(last.x + last.width / 2, last.y + last.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const order = await page.evaluate(() => window.__app.run.arcana.map((a) => a.id).join(','));
  ok(order.endsWith('herrscherin'), `Drag & Drop ordnet Arkana um (${order})`);

  // Trank trinken
  await page.locator('.potion-bar .potion-chip').first().click();
  await page.getByRole('button', { name: 'Trinken' }).click();
  await page.waitForTimeout(200);
  ok((await page.locator('.buff').count()) >= 1, 'Trank-Wirkung wird angezeigt');

  await page.locator('.bet[data-kind="red"]').click();
  await page.locator('[data-spin]').click();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `e2e/shots/${name}-3-spinning.png` });
  // Überspringen und auf Ergebnis warten
  await page.locator('[data-skip]').click();
  await page.waitForSelector('.reveal', { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/shots/${name}-4-result.png` });
  const score = await page.locator('[data-score]').textContent();
  ok(score && score !== '0', `Opfergabe gestiegen (${score})`);

  // Ritual gewinnen erzwingen
  await page.waitForFunction(() => !document.querySelector('[data-spin]')?.disabled || document.querySelector('.reward'), null, { timeout: 15000 });
  if (!(await page.locator('.reward').count())) {
    await page.evaluate(() => {
      const run = window.__app.run;
      run.target = run.ritualScore.add(1);
    });
    await page.locator('[data-spin]').click();
    await page.locator('[data-skip]').click();
  }
  await page.waitForSelector('.reward', { timeout: 20000 });
  await page.screenshot({ path: `e2e/shots/${name}-5-reward.png` });
  await page.getByRole('button', { name: 'Zum Basar' }).click();
  await page.waitForSelector('.shop');
  await page.waitForSelector('.tut-box');
  await page.getByRole('button', { name: 'Überspringen' }).click();
  await page.evaluate(() => {
    const run = window.__app.run;
    run.souls = 40;
    run.shop.event = { id: 'katze' };
    run.arcana = run.arcana.slice(0, 3);
    run.arcana.push({ uid: 950, id: 'narr', level: 3, state: {} }, { uid: 951, id: 'wagen', level: 3, state: {} });
    window.__app.show('shop');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/shots/${name}-6-shop.png`, fullPage: true });
  ok((await page.locator('.event-card').count()) === 1, 'Begegnung im Basar');
  await page.locator('.event-opt').first().click();
  await page.waitForTimeout(150);
  ok((await page.locator('.event-result').count()) === 1, 'Begegnung entschieden');
  ok((await page.locator('.fusion-btn').count()) === 1, 'Fusion angeboten');
  await page.locator('.fusion-btn').click();
  await page.getByRole('button', { name: /Verschmelzen/ }).click();
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__app.run.arcana.some((a) => a.id === 'wilderritt')), 'Fusion durchgeführt');
  await page.evaluate(() => (window.__app.run.souls = 40));
  await page.evaluate(() => window.__app.show('shop'));
  await page.waitForTimeout(200);

  const before = await page.locator('.offer.sold').count();
  await page.locator('.offer .btn.price:not(.no)').first().click();
  await page.waitForTimeout(200);
  ok((await page.locator('.offer.sold').count()) === before + 1, 'Kauf im Basar');

  await page.getByRole('button', { name: 'Ritual beginnen' }).click();
  await page.waitForSelector('.ritual');
  ok((await page.locator('.tb-ritual').textContent())?.includes('Großes Ritual'), 'Nächstes Ritual gestartet');

  // Kodex und Grimoire
  await page.evaluate(() => window.__app.show('codex'));
  await page.waitForSelector('.codex-grid .tarot');
  ok((await page.locator('.codex-grid .tarot').count()) === 50, '50 Arkana im Kodex');
  await page.screenshot({ path: `e2e/shots/${name}-7-codex.png` });
  await page.locator('.tab', { hasText: 'Beschwörer' }).click();
  ok((await page.locator('.codex-grid .demon-card').count()) >= 13, 'Beschwörer, Fusionen und Elemente im Kodex');
  await page.locator('.tab', { hasText: 'Chronik' }).click();
  ok((await page.locator('.chronik-stats').count()) === 1, 'Chronik im Kodex');

  // Mini-Rad
  await page.evaluate(() => {
    window.__app.meta.unlockedWheels.push('mini');
    window.__app.startRun({ wheel: 'mini' });
  });
  await page.waitForSelector('.ritual');
  ok((await page.locator('.bet[data-kind="dozen1"] .bet-l').textContent()) === '1–4', 'Mini-Rad: Drittel-Einsatz 1–4');
  await page.locator('.bet[data-kind="number"]').click();
  ok((await page.locator('.num-grid .num').count()) === 13, 'Mini-Rad: 13 Zahlen wählbar');
  await page.locator('.num-grid .num', { hasText: /^7$/ }).click();
  await page.locator('[data-spin]').click();
  await page.locator('[data-skip]').click();
  await page.waitForSelector('.reveal', { timeout: 15000 });
  await page.screenshot({ path: `e2e/shots/${name}-8-mini.png` });

  // Tägliche Herausforderung
  await page.evaluate(() => window.__app.show('challenge'));
  await page.waitForSelector('.challenge-card');
  ok((await page.locator('.challenge-card').count()) === 2, 'Täglich & wöchentlich angeboten');
  await page.screenshot({ path: `e2e/shots/${name}-9-challenge.png`, fullPage: true });
  await page.locator('.challenge-card.daily .btn').click();
  await page.getByRole('button', { name: 'Annehmen', exact: true }).click();
  await page.waitForSelector('.ritual .mode-tag');
  ok(true, 'Tägliche Herausforderung gestartet');

  // Grimoire-Talentbaum
  await page.evaluate(() => {
    window.__app.meta.ash = 40;
    window.__app.show('grimoire');
  });
  await page.waitForSelector('.talent-tree');
  ok((await page.locator('.talent').count()) === 24, '24 Talente im Grimoire');
  await page.locator('.talent.ready').first().click();
  await page.waitForTimeout(200);
  ok((await page.locator('.talent.owned').count()) === 1, 'Talent gekauft');
  await page.screenshot({ path: `e2e/shots/${name}-9c-grimoire.png`, fullPage: true });
  await page.locator('[data-view="relics"]').click();
  await page.waitForSelector('.relics');
  ok((await page.locator('.album-row').count()) >= 7, 'Sammelalbum in der Reliquienkammer');
  await page.evaluate(() => (window.__app.meta.ash = 100));
  await page.locator('.relic', { hasText: 'Glutkugel' }).click();
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__app.meta.cosmetics.ball === 'ball:glut'), 'Kosmetik gekauft und angelegt');
  await page.screenshot({ path: `e2e/shots/${name}-9e-relics.png`, fullPage: true });

  // Beschwörer wählen (freigeschaltet über Fortschritt)
  await page.evaluate(() => {
    const m = window.__app.meta;
    m.runs = 5;
    m.bestCircle = 5;
    window.__app.show('setup');
  });
  await page.waitForSelector('.heroes');
  await page.locator('.hero', { hasText: 'Spieler' }).click();
  await page.screenshot({ path: `e2e/shots/${name}-9d-heroes.png`, fullPage: true });
  await page.locator('.setup-go .btn').click();
  await page.getByRole('button', { name: 'Neu beginnen' }).click();
  await page.waitForSelector('.ritual');
  const hero = await page.evaluate(() => [window.__app.run.hero, window.__app.run.sigils[0]?.id].join(','));
  ok(hero === 'spieler,wuerfel', `Run mit Beschwörer gestartet (${hero})`);

  // Spielstand exportieren und wieder importieren
  await page.evaluate(() => window.__app.show('title'));
  await page.evaluate(() => (window.__app.meta.ash = 777));
  await page.evaluate(() => window.__app.saveAll());
  await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('button', { name: 'Exportieren' }).click();
  const exported = await page.locator('.save-io textarea').inputValue();
  ok(exported.startsWith('TEUFELSRAD1:'), 'Spielstand-Code exportiert');
  await page.getByRole('button', { name: 'Schließen' }).last().click();
  await page.evaluate(() => (window.__app.meta.ash = 1));
  await page.getByRole('button', { name: 'Importieren' }).click();
  await page.locator('.save-io textarea').fill(exported);
  await page.getByRole('button', { name: 'Laden' }).click();
  await page.waitForTimeout(300);
  ok((await page.evaluate(() => window.__app.meta.ash)) === 777, 'Spielstand importiert');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelectorAll('.modal-back').forEach((m) => m.remove()));

  // Freischaltungen: Titel-Balken, versiegelte Karten, Enthüllung nach Niederlage
  await page.evaluate(() => window.__app.show('title'));
  await page.waitForSelector('.insight-badge');
  ok(true, 'Erkenntnis-Balken auf dem Titel');
  await page.evaluate(() => window.__app.show('codex'));
  await page.waitForSelector('.codex-grid .tarot');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `e2e/shots/${name}-9b-codex-locked.png` });
  const locked = await page.locator('.codex-grid .locked-card').count();
  ok(locked > 20, `Versiegelte Arkana im Kodex (${locked})`);
  await page.evaluate(() => {
    const app = window.__app;
    app.meta.insight.xp = 85;
    app.startRun({});
    const run = app.run;
    run.target = run.target.mul(1e9);
    run.spinsLeft = 1;
    app.show('ritual');
  });
  await page.waitForSelector('.ritual');
  await page.locator('[data-spin]').click();
  await page.locator('[data-skip]').click();
  await page.waitForSelector('.insight-panel', { timeout: 20000 });
  await page.waitForTimeout(2500);
  const items = await page.locator('.unlock-item').count();
  ok(items >= 4, `Neue Karten nach Stufenaufstieg enthüllt (${items})`);
  await page.screenshot({ path: `e2e/shots/${name}-10-unlocks.png`, fullPage: true });

  ok(errors.length === 0, `Keine Konsolenfehler${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}

try {
  await waitForServer();
  const browser = await chromium.launch();
  await scenario(browser, 'mobile', { width: 412, height: 860 });
  await scenario(browser, 'desktop', { width: 1366, height: 820 });
  await browser.close();
} catch (e) {
  console.error(e);
  fail++;
} finally {
  stop();
}
console.log(fail ? `FEHLER: ${fail}` : 'E2E OK');
process.exit(fail ? 1 : 0);
