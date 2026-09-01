/* E2E Teil 3: Spells, Achievements, Update-Banner-Logik */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  let fail = 0;
  const ok = (c, n) => { if (c) { console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ FAIL: ' + n); } };
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 850 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // State: etwas Mana + Wizards
  await page.goto('file://' + path.resolve('test-blank.html'));
  await page.evaluate(() => {
    const s = { mana: 1000, totalMana: 5000, runMana: 3000, tapLvl: 1,
      wiz: { azubi: 4, zauberer: 2, elfe: 0, drache: 0, einhorn: 0 },
      stars: 0, autoUnlocked: false, autoOn: false, autoThreshold: 1,
      spells: {}, spellsCast: 0, critCount: 0, achievements: [], lastSeen: Date.now() };
    localStorage.setItem('magieTurmSave_v1', JSON.stringify(s));
  });
  await page.goto('file://' + path.resolve('index.html'));
  await page.waitForTimeout(800);

  console.log('--- Spell-Leiste ---');
  ok(await page.locator('#spellBar .spellBtn').count() === 3, '3 Spell-Buttons sichtbar');
  // Mana-Blitz casten
  await page.locator('.spellBtn').nth(0).dispatchEvent('pointerdown');
  await page.waitForTimeout(300);
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(save.spellsCast === 1, 'spellsCast=1 nach Blitz (ist: ' + save.spellsCast + ')');
  ok(save.spells.blitz && save.spells.blitz.cd > 295, 'Blitz-Cooldown gesetzt (~300s)');
  // Blitz hat 8 mps * 3600 = 28800 addiert
  ok(save.mana > 28000, 'Blitz-Mana gutgeschrieben (ist: ' + Math.round(save.mana) + ')');
  const cdTxt = await page.locator('.spellBtn').nth(0).locator('.cd').textContent();
  ok(/4m|5m|299s|300s/.test(cdTxt), 'Cooldown-Anzeige sichtbar (ist: ' + cdTxt + ')');
  // Erneut casten → abgelehnt (cd bleibt)
  const cdBefore = save.spells.blitz.cd;
  await page.locator('.spellBtn').nth(0).dispatchEvent('pointerdown');
  await page.waitForTimeout(200);
  const save2 = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(save2.spells.blitz.cd <= cdBefore, '2. Blitz abgelehnt (Cooldown läuft weiter)');

  console.log('--- Fokus-Buff ---');
  await page.locator('.spellBtn').nth(1).dispatchEvent('pointerdown');
  await page.waitForTimeout(300);
  const save3 = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(save3.spells.fokus && save3.spells.fokus.buff > 28, 'Fokus-Buff aktiv (~30s)');
  const tapPow = await page.textContent('#tapPow');
  ok(/6/.test(tapPow), 'Tap-Anzeige zeigt ×3-Buff (2*3=6, ist: ' + tapPow.trim() + ')');
  const buffBadge = await page.locator('.spellBtn').nth(1).locator('.buff').isVisible();
  ok(buffBadge, 'Buff-Badge sichtbar');

  console.log('--- Magiesturm-Buff in HUD ---');
  await page.locator('.spellBtn').nth(2).dispatchEvent('pointerdown');
  await page.waitForTimeout(300);
  const mpsRow = await page.textContent('#mpsRow');
  ok(mpsRow.includes('×2'), 'HUD zeigt 🌪️×2 (ist: ' + mpsRow.trim() + ')');

  console.log('--- Achievements ---');
  // Erfolge sollten beim Load auto-poppen (tap1, mana1k, w1, w10, mana1m?)
  await page.waitForTimeout(600);
  const achSave = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')));
  ok(achSave.achievements.length >= 3, 'Automatisch freigeschaltet: ' + achSave.achievements.join(',') + '');
  // Toast sichtbar?
  const toastCount = await page.locator('.toast').count();
  ok(toastCount >= 1, 'Erfolgs-Toast sichtbar');
  // Modal öffnen
  await page.click('#achBtn');
  ok(await page.locator('#achModal').isVisible(), 'Achievements-Modal öffnet');
  const items = await page.locator('.achItem').count();
  ok(items === 11, '11 Einträge in Liste (ist: ' + items + ')');
  const unlockedRows = await page.locator('.achItem:not(.locked)').count();
  ok(unlockedRows === achSave.achievements.length, 'Freigeschaltete Zeilen = Save (' + unlockedRows + ')');
  await page.click('#achClose');
  ok(await page.locator('#achModal').isHidden(), 'Modal schließt');
  const starsRow = await page.textContent('#starsRow');
  ok(starsRow.includes('🏆'), 'HUD zeigt 🏆-Zähler (ist: ' + starsRow.trim() + ')');

  console.log('--- Krit-Taps (deterministisch via CI-Chance) ---');
  let critSeen = false, normalSeen = false;
  for (let i = 0; i < 60; i++) {
    await page.mouse.click(200, 300);
    await page.waitForTimeout(30);
  }
  const critCount = await page.evaluate(() => JSON.parse(localStorage.getItem('magieTurmSave_v1')).critCount);
  ok(critCount > 0, 'Krits passieren im echten Browser (critCount=' + critCount + ')');

  console.log('--- JS-Fehler ---');
  if (errors.length) { fail += errors.length; errors.forEach(e => console.log('  ✗ JS-Error: ' + e)); }
  else console.log('  ✓ Keine JS-Fehler');

  await page.screenshot({ path: 'shot-features.png' });
  await browser.close();
  console.log(fail ? '\nE2E-3 FEHLGESCHLAGEN: ' + fail : '\nE2E-3 ALLE CHECKS OK');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('E2E-3 CRASH:', e); process.exit(1); });
