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
  await page.waitForSelector('.ritual');
  await page.getByRole('button', { name: 'Verstanden' }).click();
  await page.waitForTimeout(300);
  ok((await page.locator('.bet').count()) === 10, '10 Einsatz-Felder');
  ok(await page.locator('.wheel-canvas').isVisible(), 'Kessel sichtbar');

  // Zum Testen: ein bisschen Ausstattung, damit Effekte sichtbar werden
  await page.evaluate(() => {
    const run = window.__app.run;
    run.arcana.push({ uid: 900, id: 'herrscherin', level: 2, state: {} }, { uid: 901, id: 'sonne', level: 1, state: {} }, { uid: 902, id: 'schatten', level: 1, state: {} });
    run.sigils[1] = { uid: 903, id: 'pentagramm', level: 1 };
    run.sigils[2] = { uid: 904, id: 'tempo', level: 2 };
    window.__app.show('ritual');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `e2e/shots/${name}-2-ritual.png` });

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
  ok((await page.locator('.codex-grid .tarot').count()) === 25, '25 Arkana im Kodex');
  await page.screenshot({ path: `e2e/shots/${name}-7-codex.png` });

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
