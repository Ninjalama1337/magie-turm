import type { PactDef } from '../core/types';

export const PACTS: PactDef[] = [
  {
    id: 'gier',
    name: 'Pakt der Gier',
    glyph: 'coin',
    cost: 6,
    max: 1,
    desc: '<b class="s">+4 Seelen</b> pro gewonnenem Ritual, aber <b class="bad">−1 Drehung</b>.',
    mod: (s) => {
      s.ritualBonus += 4;
      s.spins -= 1;
    },
  },
  {
    id: 'siebtes',
    name: 'Das Siebte Siegel',
    glyph: 'rune',
    cost: 6,
    max: 2,
    desc: 'Legt sofort <b>eine weitere Raute</b> für ein Siegel frei.',
    onBuy: (run) => {
      run.sigilUnlocked = Math.min(run.sigils.length, run.sigilUnlocked + 1);
    },
  },
  {
    id: 'zweitekugel',
    name: 'Pakt der Zweiten Kugel',
    glyph: 'wisp',
    cost: 7,
    max: 3,
    desc: 'Jede Drehung startet mit einem zusätzlichen <b class="w">Irrlicht</b>.',
    mod: (s, k) => {
      s.startGhosts += k;
    },
  },
  {
    id: 'schwere',
    name: 'Pakt der Schwerelosigkeit',
    glyph: 'feather',
    cost: 5,
    max: 3,
    desc: '<b class="t">−12 % Reibung</b>: Kugeln fahren mehr Runden.',
    mod: (s, k) => {
      s.friction *= Math.pow(0.88, k);
    },
  },
  {
    id: 'blut',
    name: 'Blutpakt',
    glyph: 'drop',
    cost: 5,
    max: 5,
    desc: '<b class="f">+2 Basis-Fluch</b> für jede Drehung.',
    mod: (s, k) => {
      s.baseFluch += 2 * k;
    },
  },
  {
    id: 'glut',
    name: 'Pakt der Glut',
    glyph: 'flame',
    cost: 5,
    max: 5,
    desc: '<b class="g">+4 Glut</b> pro Runde jeder Kugel.',
    mod: (s, k) => {
      s.lapGlut += 4 * k;
    },
  },
  {
    id: 'weissagung',
    name: 'Pakt der Weissagung',
    glyph: 'eye',
    cost: 5,
    max: 1,
    desc: '<b>+1 Arkana-Angebot</b> im Basar.',
    mod: (s) => {
      s.shopArcana += 1;
    },
  },
  {
    id: 'tiefe',
    name: 'Pakt der Tiefe',
    glyph: 'book',
    cost: 8,
    max: 2,
    desc: '<b>+1 Arkana-Platz</b>.',
    mod: (s, k) => {
      s.arcanaSlots += k;
    },
  },
  {
    id: 'glueck',
    name: 'Pakt der Fortuna',
    glyph: 'dice',
    cost: 8,
    max: 1,
    desc: 'Alle <b>Wahrscheinlichkeiten</b> werden verdoppelt.',
    mod: (s) => {
      s.luck *= 2;
    },
  },
  {
    id: 'zins',
    name: 'Wucherpakt',
    glyph: 'coin',
    cost: 5,
    max: 2,
    desc: '<b class="s">+5</b> maximale Zinsen am Ritualende.',
    mod: (s, k) => {
      s.interestCap += 5 * k;
    },
  },
  {
    id: 'haendler',
    name: 'Händlerpakt',
    glyph: 'key',
    cost: 4,
    max: 2,
    desc: 'Neu würfeln im Basar kostet <b class="s">1 Seele weniger</b>.',
    mod: (s, k) => {
      s.rerollDiscount += k;
    },
  },
  {
    id: 'wiederkehr',
    name: 'Pakt der Wiederkehr',
    glyph: 'hourglass',
    cost: 9,
    max: 2,
    desc: '<b>+1 Drehung</b> pro Ritual.',
    mod: (s, k) => {
      s.spins += k;
    },
  },
  {
    id: 'horde',
    name: 'Pakt der Horde',
    glyph: 'shadow',
    cost: 5,
    max: 3,
    desc: '<b class="w">+4</b> maximale Irrlichter pro Drehung.',
    mod: (s, k) => {
      s.ghostCap += 4 * k;
    },
  },
  {
    id: 'hoelle',
    name: 'Höllenpakt',
    glyph: 'horn',
    cost: 4,
    max: 1,
    desc: 'Landung im <b>Höllenfach</b>: <b class="x">×7 Fluch</b>.',
    mod: (s) => {
      s.hellFluch *= 7;
    },
  },
  {
    id: 'verdammnis',
    name: 'Pakt der Verdammnis',
    glyph: 'skull',
    cost: 7,
    max: 1,
    desc: 'Drehende: <b class="x">×2 Fluch</b>, aber <b class="bad">−1 Arkana-Platz</b>.',
    mod: (s) => {
      s.endFluch *= 2;
      s.arcanaSlots -= 1;
    },
  },
  {
    id: 'farbe',
    name: 'Pakt der Farben',
    glyph: 'sun',
    cost: 5,
    max: 2,
    desc: 'Einsätze auf <b>Rot/Schwarz</b> zahlen <b class="x">+×1</b> mehr.',
    mod: (s, k) => {
      s.colorPay += k;
    },
  },
  {
    id: 'waage',
    name: 'Pakt der Waage',
    glyph: 'scales',
    cost: 5,
    max: 2,
    desc: 'Einsätze auf <b>Gerade/Ungerade</b> und <b>Hälften</b> zahlen <b class="x">+×1</b> mehr.',
    mod: (s, k) => {
      s.parityPay += k;
      s.halfPay += k;
    },
  },
  {
    id: 'dutzend',
    name: 'Pakt der Dutzend',
    glyph: 'candle',
    cost: 5,
    max: 2,
    desc: 'Einsätze auf ein <b>Dutzend</b> zahlen <b class="x">+×2</b> mehr.',
    mod: (s, k) => {
      s.dozenPay += 2 * k;
    },
  },
  {
    id: 'zahl',
    name: 'Pakt der Zahl',
    glyph: 'pentagram',
    cost: 5,
    max: 2,
    desc: 'Einsätze auf eine <b>Zahl</b> zahlen <b class="x">+×12</b> mehr.',
    mod: (s, k) => {
      s.numberPay += 12 * k;
    },
  },
  {
    id: 'ewigkeit',
    name: 'Pakt der Ewigkeit',
    glyph: 'infinity',
    cost: 5,
    max: 1,
    desc: 'Aufwertungen von Arkana kosten <b class="s">30 % weniger</b>.',
    mod: (s) => {
      s.upgradeDiscount += 0.3;
    },
  },
  {
    id: 'feuer',
    name: 'Feuerpakt',
    glyph: 'flame',
    cost: 5,
    max: 2,
    desc: '<b class="g">+8 Glut</b> pro Runde, aber <b class="bad">−2 Tempo</b>.',
    mod: (s, k) => {
      s.lapGlut += 8 * k;
      s.tempo -= 2 * k;
    },
  },
  {
    id: 'sturm',
    name: 'Sturmpakt',
    glyph: 'bolt',
    cost: 5,
    max: 3,
    desc: '<b class="t">+3 Start-Tempo</b>.',
    mod: (s, k) => {
      s.tempo += 3 * k;
    },
  },
  {
    id: 'zorn',
    name: 'Pakt des Zorns',
    glyph: 'sword',
    cost: 6,
    max: 1,
    desc: '<b class="f">+6 Basis-Fluch</b>, aber <b class="bad">−1 Drehung</b>.',
    mod: (s) => {
      s.baseFluch += 6;
      s.spins -= 1;
    },
  },
  {
    id: 'geduld',
    name: 'Pakt der Geduld',
    glyph: 'hourglass',
    cost: 7,
    max: 1,
    desc: 'Die Reibung <b class="t">wächst nur halb so schnell</b> – lange Fahrten werden länger.',
    mod: (s) => {
      s.frictionGrowth *= 0.5;
    },
  },
  {
    id: 'sterne',
    name: 'Sternenpakt',
    glyph: 'star',
    cost: 6,
    max: 1,
    desc: 'Alle <b>Wahrscheinlichkeiten ×1,5</b>.',
    mod: (s) => {
      s.luck *= 1.5;
    },
  },
  {
    id: 'opfer',
    name: 'Opferpakt',
    glyph: 'altar',
    cost: 8,
    max: 1,
    desc: '<b>+2 Arkana-Plätze</b>, aber <b class="bad">keine Zinsen</b> mehr.',
    mod: (s) => {
      s.arcanaSlots += 2;
      s.interestMax = 0;
    },
  },
  {
    id: 'kerzen',
    name: 'Kerzenpakt',
    glyph: 'candle',
    cost: 4,
    max: 1,
    desc: 'Höllenfächer: <b class="x">×3 Fluch</b>; <b class="g">+2 Glut</b> pro Runde.',
    mod: (s) => {
      s.hellFluch *= 3;
      s.lapGlut += 2;
    },
  },
  {
    id: 'schatten',
    name: 'Schattenpakt',
    glyph: 'shadow',
    cost: 6,
    max: 1,
    desc: '<b class="w">+2 Start-Irrlichter</b> und +2 Limit, aber <b class="bad">Glück ×0,5</b>.',
    mod: (s) => {
      s.startGhosts += 2;
      s.ghostCap += 2;
      s.luck *= 0.5;
    },
  },
  {
    id: 'maske',
    name: 'Pakt der Maske',
    glyph: 'mask',
    cost: 5,
    max: 1,
    desc: 'Einsätze auf <b>Gerade/Ungerade</b> zahlen <b class="x">+×2</b>.',
    mod: (s) => {
      s.parityPay += 2;
    },
  },
  {
    id: 'knochen',
    name: 'Knochenpakt',
    glyph: 'grave',
    cost: 6,
    max: 1,
    desc: 'Legt <b>zwei Rauten</b> frei, aber <b class="bad">−15 % Tempo</b>.',
    mod: (s) => {
      s.tempo *= 0.85;
    },
    onBuy: (run) => {
      run.sigilUnlocked = Math.min(run.sigils.length, run.sigilUnlocked + 2);
    },
  },
  {
    id: 'rast',
    name: 'Pakt der Rast',
    glyph: 'feather',
    cost: 6,
    max: 1,
    desc: '<b>+1 Drehung</b>, aber Ritual-Belohnung <b class="bad">−3 Seelen</b>.',
    mod: (s) => {
      s.spins += 1;
      s.ritualBonus -= 3;
    },
  },
  {
    id: 'asche',
    name: 'Aschepakt',
    glyph: 'sickle',
    cost: 9,
    max: 2,
    desc: 'Drehende: <b class="x">×1,5 Fluch</b>.',
    mod: (s, k) => {
      s.endFluch *= Math.pow(1.5, k);
    },
  },
  {
    id: 'handel',
    name: 'Seelenhandel',
    glyph: 'coin',
    cost: 4,
    max: 1,
    desc: 'Arkana werden zum <b class="s">vollen Preis</b> verkauft.',
    mod: (s) => {
      s.sellFull = true;
    },
  },
  {
    id: 'trankmeister',
    name: 'Pakt des Trankmeisters',
    glyph: 'potion',
    cost: 5,
    max: 2,
    desc: '<b>+1 Trank-Platz</b>.',
    mod: (s, k) => {
      s.potionSlots += k;
    },
  },
  {
    id: 'alchemie',
    name: 'Alchemistenpakt',
    glyph: 'crystal',
    cost: 4,
    max: 1,
    desc: 'Tränke kosten <b class="s">2 Seelen weniger</b>.',
    mod: (s) => {
      s.potionDiscount += 2;
    },
  },
  {
    id: 'glanz',
    name: 'Pakt des Glanzes',
    glyph: 'eye',
    cost: 6,
    max: 1,
    desc: 'Arkana im Basar erscheinen <b class="x">viel öfter mit Edition</b>.',
    mod: (s) => {
      s.editionChance += 0.25;
    },
  },
  {
    id: 'daemmerung',
    name: 'Pakt der Dämmerung',
    glyph: 'raven',
    cost: 5,
    max: 1,
    desc: 'Gebannte Dämonen geben <b class="s">+6 Seelen</b>.',
    mod: (s) => {
      s.demonBonus += 6;
    },
  },
  {
    id: 'ueberfluss',
    name: 'Pakt des Überflusses',
    glyph: 'rune',
    cost: 6,
    max: 1,
    desc: '<b>+1 Siegel-Angebot</b> im Basar.',
    mod: (s) => {
      s.shopSigils += 1;
    },
  },
  {
    id: 'motte',
    name: 'Mottenpakt',
    glyph: 'moth',
    cost: 5,
    max: 1,
    desc: '<b>1 kostenloses Neu-Würfeln</b> in jedem Basar.',
    mod: (s) => {
      s.freeRerolls += 1;
    },
  },
  {
    id: 'rabe',
    name: 'Rabenpakt',
    glyph: 'raven',
    cost: 7,
    max: 1,
    desc: '<b class="g">+50 % Glut</b> pro Runde, aber <b class="bad">−2 Basis-Fluch</b> (min. 1).',
    mod: (s) => {
      s.lapGlut = Math.round(s.lapGlut * 1.5);
      s.baseFluch = Math.max(1, s.baseFluch - 2);
    },
  },
];

export const PACT_BY_ID: Record<string, PactDef> = Object.fromEntries(PACTS.map((p) => [p.id, p]));
