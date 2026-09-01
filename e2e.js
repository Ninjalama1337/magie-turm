/* E2E-Browsertest: Magie-Turm via Playwright */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  let fail = 0;
  const ok = (c, n) => { if (c) { console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ FAIL: ' + n); } };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 850 } }); // Android-Viewport
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(1200);

  console.log('--- Laden ---');
  ok(await page.locator('#manaBig').isVisible(), 'HUD sichtbar');
  ok(await page.locator('#shop .card').count() === 6, '6 Shop-Karten (1 Tap + 5 Wizards)');
  ok(await page.locator('#offlineModal').isHidden(), 'Offline-Modal versteckt bei Erststart');

  console.log('--- Tap auf Canvas = Mana ---');
  await page.mouse.click(200, 400);
  await page.mouse.click(210, 410);
  await page.mouse.click(190, 420);
  await page.waitForTimeout(300);
  const manaTxt = await page.textContent('#manaBig');
  ok(/✨\s*3/.test(manaTxt), '3 Taps → ✨ 3 (ist: ' + manaTxt.trim() + ')');

  console.log('--- Wizard kaufen (Azubi 15) ---');
  // Mana via JS setzen wäre geschummelt — wir tappen in Schleife (Tap gibt +1)
  for (let i = 0; i < 20; i++) { await page.mouse.click(200, 380 + (i % 5) * 8); }
  await page.waitForTimeout(200);
  ok(await page.locator('#shop .card').nth(1).evaluate(el => el.classList.contains('afford')), 'Azubi-Karte grün (bezahlbar)');
  await page.locator('#shop .card').nth(1).dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  const wizCount = await page.evaluate(() => window.GameCore ? null : null); // state ist privat; prüfe UI
  const ctVisible = await page.locator('#ct_azubi').isVisible();
  ok(ctVisible, 'Azubi-Zähler sichtbar nach Kauf');
  const mpsTxt = await page.textContent('#mpsRow');
  ok(/0,5\/s|0,50\/s/.test(mpsTxt), 'mps zeigt 0,5/s (ist: ' + mpsTxt.trim() + ')');

  console.log('--- Mana tickt automatisch ---');
  const m1 = await page.textContent('#manaBig');
  await page.waitForTimeout(2100);
  const m2 = await page.textContent('#manaBig');
  ok(m1 !== m2, 'Mana steigt automatisch (' + m1.trim() + ' → ' + m2.trim() + ')');

  console.log('--- Prestige-Button disabled ohne Sterne ---');
  ok(await page.locator('#prestigeBtn').isDisabled(), 'Prestige disabled bei 0 pending');

  console.log('--- Offline-Modal (State manipulieren + Reload) ---');
  // Über die leere Hilfsseite setzen (file:// Origin), damit der beforeunload-Autosave
  // des Spiels den manipulierten Save beim Reload nicht überschreibt
  await page.goto('file://' + path.resolve('test-blank.html'));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('magieTurmSave_v1'));
    s.wiz.zauberer = 10; s.lastSeen = Date.now() - 3600000; // 1h weg
    localStorage.setItem('magieTurmSave_v1', JSON.stringify(s));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(1000);
  ok(await page.locator('#offlineModal').isVisible(), 'Offline-Modal sichtbar nach 1h');
  const offGain = await page.textContent('#offlineGain');
  ok(/✨\s*54/.test(offGain), 'Offline-Gewinn ~54.000 (ist: ' + offGain.trim() + ')');
  await page.click('#offlineOk');
  ok(await page.locator('#offlineModal').isHidden(), 'Modal schließt');

  console.log('--- Save/Load: Kauf überlebt Reload ---');
  const stars = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).wiz.azubi);
  ok(stars >= 1, 'Azubi im Save (azubi=' + stars + ')');

  console.log('--- Screenshots ---');
  await page.screenshot({ path: 'shot-game.png' });
  console.log('shot-game.png gespeichert');

  console.log('--- JS-Fehler ---');
  if (errors.length) { fail += errors.length; errors.forEach(e => console.log('  ✗ JS-Error: ' + e)); }
  else console.log('  ✓ Keine JS-Fehler');

  await browser.close();
  console.log(fail ? '\nE2E FEHLGESCHLAGEN: ' + fail : '\nE2E ALLE CHECKS OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E CRASH:', e); process.exit(1); });
