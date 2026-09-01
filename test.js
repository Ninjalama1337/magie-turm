/* Tests für Magie-Turm Game-Logik — node test.js */
'use strict';
const core = require('./game.js');
let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ FAIL: ' + name); }
}

console.log('--- Neuer State ---');
let s = core.newState();
ok(s.mana === 0 && s.stars === 0 && s.tapLvl === 0, 'Neuer State: alles 0');
ok(core.mps(s) === 0, 'Neuer State: mps=0');
core.tick(s, 5);
ok(s.mana === 0, 'Tick ohne Wizards: kein Mana');

console.log('--- Tap ---');
s = core.newState();
let g = core.tapMana(s);
ok(g === 1, 'Tap: +1 Mana');
ok(s.mana === 1 && s.totalMana === 1 && s.runMana === 1, 'Tap: Mana in allen Zählern');
ok(core.buyTap(s) === false, 'Tap-Upgrade ohne Mana abgelehnt');
s.mana = 25;
ok(core.buyTap(s), 'Tap-Upgrade gekauft (25)');
ok(s.tapLvl === 1, 'Tap-Upgrade Level 1');
g = core.tapMana(s);
ok(g === 2, 'Tap nach Upgrade: +2');
ok(core.tapCost(s) === Math.ceil(25 * 2.2), 'Nächste Stufe: 25*2.2 aufgerundet');

console.log('--- Wizard kaufen ---');
s = core.newState();
s.mana = 14;
ok(!core.buyWizard(s, 'azubi'), 'Zu wenig Mana: Kauf abgelehnt');
s.mana = 15;
ok(core.buyWizard(s, 'azubi'), 'Azubi für 15 gekauft');
ok(s.wiz.azubi === 1 && s.mana === 0, 'Azubi-Anzahl 1, Mana verbraucht');
ok(Math.abs(core.mps(s) - 0.5) < 1e-9, 'mps = 0.5');
ok(core.wizCostAt(s, 'azubi') === Math.ceil(15 * 1.15), 'Zweiter Azubi: 15*1.15 aufgerundet');
s.mana = 1000;
core.buyWizard(s, 'azubi');
core.buyWizard(s, 'azubi');
ok(s.wiz.azubi === 3, 'Weitere Azubis: Anzahl 3');
ok(Math.abs(core.mps(s) - 1.5) < 1e-9, 'mps = 1.5');
ok(!core.buyWizard(s, 'unsinn'), 'Unbekannter Wizard: abgelehnt');

console.log('--- Tick / mps ---');
s = core.newState();
s.wiz.azubi = 4; s.wiz.zauberer = 2; // 4*0.5 + 2*3 = 8
ok(Math.abs(core.mps(s) - 8) < 1e-9, 'mps = 8');
s.mana = 0;
core.tick(s, 10);
ok(Math.abs(s.mana - 80) < 1e-9, 'tick(10s): +80 Mana');
ok(Math.abs(s.runMana - 80) < 1e-9, 'runMana zählt mit');
core.tick(s, 0);
ok(s.mana === 80, 'tick(0): nichts passiert');

console.log('--- Prestige ---');
s = core.newState();
s.runMana = 9999;
ok(core.pendingStars(s) === 0, '9999 runMana: 0 Sterne');
s.runMana = 10000;
ok(core.pendingStars(s) === 1, '10000 runMana: 1 Stern');
s.runMana = 40200;
ok(core.pendingStars(s) === 2, '40200 runMana: 2 Sterne');
ok(core.canPrestige(s), 'canPrestige true');
s.runMana = 100;
ok(core.doPrestige(s) === 0, 'Prestige ohne Stern: 0, nichts passiert');
s.runMana = 40000;
const gained = core.doPrestige(s);
ok(gained === 2, 'Prestige von 40000: +2 Sterne');
ok(s.stars === 2 && s.mana === 0 && s.runMana === 0, 'State nach Prestige zurückgesetzt');
ok(s.wiz.azubi === 0 && s.tapLvl === 0, 'Wizards & Tap-Upgrade zurückgesetzt');

console.log('--- Stern-Bonus ---');
s = core.newState();
s.wiz.azubi = 10; // raw 5
ok(Math.abs(core.mps(s) - 5) < 1e-9, '0 Sterne: mps=5');
s.stars = 4;
ok(Math.abs(core.mps(s) - 6) < 1e-9, '4 Sterne (+20%): mps=6');
ok(Math.abs(core.starMult(s) - 1.2) < 1e-9, 'starMult=1.2');
g = core.tapMana(s);
ok(Math.abs(g - 1.2) < 1e-9, 'Tap mit Stern-Bonus: 1.2');

console.log('--- Auto-Prestige ---');
s = core.newState();
s.stars = 2;
ok(!core.unlockAuto(s), 'Nur 2 Sterne (<3): Unlock abgelehnt, nichts gezahlt');
ok(s.stars === 2 && !s.autoUnlocked, 'Kein Stern verbraucht bei abgelehntem Unlock');
s.stars = 5;
ok(core.unlockAuto(s), 'Auto-Prestige für 3 Sterne freigeschaltet');
ok(s.stars === 2 && s.autoUnlocked && s.autoOn, '3 Sterne gezahlt (5-3=2), auto an');
ok(!core.unlockAuto(s), 'Doppelter Unlock abgelehnt');
ok(core.toggleAuto(s) && !s.autoOn, 'Toggle: Auto aus');
ok(core.toggleAuto(s) && s.autoOn, 'Toggle: Auto wieder an');
s.runMana = 1e9;
core.toggleAuto(s); // aus
ok(core.checkAutoPrestige(s) === 0, 'Auto aus: kein Auto-Prestige');
core.toggleAuto(s); // an
s.autoThreshold = 3;
s.runMana = 30000; // sqrt(3)=1.73 -> 1 Stern
ok(core.checkAutoPrestige(s) === 0, '1 Stern < Schwelle 3: kein Auto-Prestige');
s.runMana = 500000; // sqrt(50)=7.07 -> 7 Sterne
const ap = core.checkAutoPrestige(s);
ok(ap === 7, '7 Sterne >= Schwelle 3: Auto-Prestige +7');
ok(s.stars === 2 + 7, 'Sterne korrekt verbucht (2+7=9)');
ok(s.runMana === 0 && s.mana === 0, 'runMana & Mana nach Auto-Prestige 0');
core.setAutoThreshold(s, 0);
ok(s.autoThreshold === 1, 'Schwelle 0 wird auf Minimum 1 geklemmt');
core.setAutoThreshold(s, 5);
ok(s.autoThreshold === 5, 'Schwelle auf 5 gesetzt');
ok(!core.setAutoThreshold(s, 5) === false, 'Schwelle setzen ok');
ok(!core.setAutoThreshold(core.newState(), 5), 'Schwelle ohne Unlock: abgelehnt');

console.log('--- Save / Load ---');
s = core.newState();
s.mana = 123.5; s.tapLvl = 2; s.wiz.drache = 3; s.stars = 7;
s.autoUnlocked = true; s.autoOn = true; s.autoThreshold = 4; s.runMana = 555;
const json = core.serialize(s);
const l = core.deserialize(json);
ok(l.mana === 123.5 && l.tapLvl === 2, 'Mana & TapLvl erhalten');
ok(l.wiz.drache === 3, 'Drache-Anzahl erhalten');
ok(l.stars === 7 && l.autoUnlocked && l.autoOn && l.autoThreshold === 4, 'Sterne & Auto-Flags erhalten');
ok(core.deserialize('müll{{{').tapLvl === 0, 'Kaputtes JSON: neuer State, kein Crash');

console.log('--- Offline ---');
s = core.newState();
s.wiz.zauberer = 10; // 30 mps raw
const now = Date.now();
s.lastSeen = now - 3600 * 1000;
const r = core.applyOffline(s, now);
ok(Math.abs(r.dt - 3600) < 1, '1h offline erkannt');
ok(Math.abs(s.mana - 30 * 3600 * 0.5) < 1, 'Offline-Ertrag: 30 * 3600 * 50% = 54000');
s.lastSeen = now - 100 * 3600 * 1000;
const m0 = s.mana;
const r2 = core.applyOffline(s, now);
ok(Math.abs(r2.dt - 24 * 3600) < 1, '100h -> auf 24h gedeckelt');
ok(s.mana > m0, 'Mana bei Cap addiert');
s.lastSeen = now;
const m1 = s.mana;
core.applyOffline(s, now);
ok(s.mana === m1, 'Gerade erst gesehen: kein Offline-Sprung');

console.log('--- Format ---');
ok(core.fmt(999.96) === '999,9' || core.fmt(999.96) === '1000', 'fmt <1000: Komma');
ok(core.fmt(1500) === '1,50k', 'fmt 1500 -> 1,50k');
ok(core.fmt(2345678) === '2,35M', 'fmt 2345678 -> 2,35M');
ok(core.fmt(0) === '0', 'fmt 0');

console.log('\n=== ' + pass + ' bestanden, ' + fail + ' fehlgeschlagen ===');
process.exit(fail ? 1 : 0);
