/* E2E Teil 2: Prestige-Modal, Auto-Prestige-Modal, Tap-Upgrade */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  let fail = 0;
  const ok = (c, n) => { if (c) { console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ FAIL: ' + n); } };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 850 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // State mit Sternen + runMana vorbereiten
  await page.goto('file://' + path.resolve('test-blank.html'));
  await page.evaluate(() => {
    const s = { mana: 500, totalMana: 60000, runMana: 45000, tapLvl: 0,
      wiz: { azubi: 2, zauberer: 1, elfe: 0, drache: 0, einhorn: 0 },
      stars: 0, autoUnlocked: false, autoOn: false, autoThreshold: 1, lastSeen: Date.now() };
    localStorage.setItem('magieTurmSave_v1', JSON.stringify(s));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(800);

  console.log('--- Prestige-Modal ---');
  const prestTxt = await page.textContent('#prestigeBtn');
  ok(/\+\d/.test(prestTxt), 'Prestige-Button zeigt +N (ist: ' + prestTxt.trim() + ')');
  await page.click('#prestigeBtn');
  ok(await page.locator('#prestigeModal').isVisible(), 'Prestige-Modal öffnet');
  const gain = await page.textContent('#prestigeGain');
  ok(gain.includes('+2'), 'Zeigt +2 Sterne (ist: ' + gain.trim() + ')');
  await page.click('#prestigeCancel');
  ok(await page.locator('#prestigeModal').isHidden(), 'Abbrechen schließt');
  // Sterne im Save prüfen: noch 0
  let st = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).stars);
  // Autosave kann Stars noch nicht haben — prüfe erst nach Prestige
  await page.click('#prestigeBtn');
  await page.click('#prestigeGo');
  await page.waitForTimeout(300);
  ok(await page.locator('#prestigeModal').isHidden(), 'Prestige ausführen schließt Modal');
  st = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).stars);
  ok(st === 2, 'Sterne im Save nach Prestige: 2 (ist: ' + st + ')');
  const wiz = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).wiz);
  ok(wiz.azubi === 0 && wiz.zauberer === 0, 'Wizards nach Prestige zurückgesetzt');
  const starsRow = await page.textContent('#starsRow');
  ok(starsRow.includes('2'), 'HUD zeigt 2 Sterne (ist: ' + starsRow.trim() + ')');

  console.log('--- Tap-Upgrade-Karte ---');
  // Mana für Tap-Upgrade (Kosten 25) über Taps verdienen — Turm-Tap ist der normale Gameplay-Weg
  for (let i = 0; i < 26; i++) { await page.mouse.click(200, 300); await page.waitForTimeout(20); }
  await page.locator('#tapCard').dispatchEvent('pointerdown');
  await page.waitForTimeout(300);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(save.tapLvl >= 1, 'Tap-Upgrade im Save: Level >= 1 (ist: ' + save.tapLvl + ')');

  console.log('--- Auto-Prestige Modal (locked) ---');
  await page.click('#autoBtn');
  ok(await page.locator('#autoModal').isVisible(), 'Auto-Modal öffnet');
  ok(await page.locator('#autoUnlock').isVisible(), 'Unlock-Button sichtbar (2 Sterne < 3)');
  await page.click('#autoUnlock');
  await page.waitForTimeout(200);
  const bodyVis = await page.locator('#autoBody').isVisible();
  ok(!bodyVis, 'Unlock abgelehnt (nur 2 Sterne) — Locked-View bleibt');
  await page.click('#autoClose');
  ok(await page.locator('#autoModal').isHidden(), 'Auto-Modal schließt');

  console.log('--- Auto-Prestige Modal (mit 5 Sternen) ---');
  await page.goto('file://' + path.resolve('test-blank.html'));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('magieTurmSave_v1'));
    s.stars = 5; s.autoUnlocked = false;
    localStorage.setItem('magieTurmSave_v1', JSON.stringify(s));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(800);
  await page.click('#autoBtn');
  await page.click('#autoUnlock');
  await page.waitForTimeout(200);
  ok(await page.locator('#autoBody').isVisible(), 'Unlock erfolgreich: Body sichtbar');
  const st2 = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).stars);
  ok(st2 === 2, '5-3=2 Sterne nach Unlock (ist: ' + st2 + ')');
  const thr = await page.textContent('#autoThreshold');
  ok(thr.includes('1'), 'Schwelle default 1 (ist: ' + thr.trim() + ')');
  await page.click('#autoPlus');
  await page.click('#autoPlus');
  const thr2 = await page.textContent('#autoThreshold');
  ok(thr2.includes('3'), 'Schwelle +2 → 3 (ist: ' + thr2.trim() + ')');
  await page.click('#autoToggle');
  const save2 = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  await page.click('#autoClose'); // speichert
  const save3 = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(save3.autoThreshold === 3 && save3.autoUnlocked, 'Auto-Einstellungen im Save');
  ok(typeof save3.autoOn === 'boolean', 'AutoOn ist Boolean');

  console.log('--- Stern-Bonus sichtbar in UI ---');
  const mpsRow = await page.textContent('#mpsRow');
  ok(/\d/.test(mpsRow), 'mps-Zeile zeigt Wert (ist: ' + mpsRow.trim() + ')');

  console.log('--- JS-Fehler ---');
  if (errors.length) { fail += errors.length; errors.forEach(e => console.log('  ✗ JS-Error: ' + e)); }
  else console.log('  ✓ Keine JS-Fehler');

  await page.screenshot({ path: 'shot-prestige.png' });
  await browser.close();
  console.log(fail ? '\nE2E-2 FEHLGESCHLAGEN: ' + fail : '\nE2E-2 ALLE CHECKS OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E-2 CRASH:', e); process.exit(1); });
