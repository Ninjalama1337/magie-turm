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
    window.__app.run.souls = 40;
    window.__app.show('shop');
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `e2e/shots/${name}-6-shop.png`, fullPage: true });

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
