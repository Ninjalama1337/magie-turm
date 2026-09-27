import type { RunState, SpinResult } from '../core/types';

/** Referenz auf ein freischaltbares Element, z. B. „arcana:narr“ */
export type UnlockKind = 'arcana' | 'sigil' | 'pact' | 'potion';
export type UnlockRef = `${UnlockKind}:${string}`;

export const ref = (kind: UnlockKind, id: string): UnlockRef => `${kind}:${id}`;

export function parseRef(r: string): { kind: UnlockKind; id: string } {
  const i = r.indexOf(':');
  return { kind: r.slice(0, i) as UnlockKind, id: r.slice(i + 1) };
}

const A = (...ids: string[]) => ids.map((id) => ref('arcana', id));
const S = (...ids: string[]) => ids.map((id) => ref('sigil', id));
const P = (...ids: string[]) => ids.map((id) => ref('pact', id));
const T = (...ids: string[]) => ids.map((id) => ref('potion', id));

/** Von Beginn an verfügbar – einfache, verständliche Bausteine mit ersten Mini-Kombos. */
export const STARTER: UnlockRef[] = [
  ...A('narr', 'herrscherin', 'wagen', 'gerechtigkeit', 'maessigkeit', 'priesterin', 'hierophant', 'eremit', 'ass_muenzen', 'page_staebe', 'kraft', 'ritter_muenzen'),
  ...S('glut', 'fluch', 'tempo', 'wuerfel', 'seelen', 'sanduhr', 'glocke', 'stab'),
  ...P('gier', 'siebtes', 'glut', 'zins', 'haendler', 'sturm', 'schwere', 'weissagung', 'motte', 'handel'),
  ...T('blut', 'glut', 'sturm', 'gold'),
];

export interface InsightLevel {
  /** Thema der Stufe – die Karten ergeben zusammen eine Kombo */
  theme: string;
  items: UnlockRef[];
}

/** Kuratierte Reihenfolge: jede Stufe bringt zusammenpassende Kombo-Partner. */
export const LEVELS: InsightLevel[] = [
  { theme: 'Tag und Nacht', items: [...A('sonne', 'mond'), ...S('blut'), ...P('farbe'), ...T('phiole')] },
  { theme: 'Geisterstunde', items: [...A('schatten', 'liebende'), ...S('irrlicht'), ...P('zweitekugel', 'horde')] },
  { theme: 'Siegelmeister', items: [...A('herrscher', 'auge'), ...S('rune', 'spiegel'), ...P('ueberfluss', 'blut')] },
  { theme: 'Der Weg der Stäbe', items: [...A('ass_staebe', 'zwei_staebe'), ...S('kerze'), ...P('geduld'), ...T('zeit')] },
  { theme: 'Hexenzirkel', items: [...A('hexe', 'page_kelche'), ...S('magnet', 'horn'), ...P('schatten')] },
  { theme: 'Klingen', items: [...A('ass_schwerter', 'zwei_schwerter'), ...S('schwert'), ...P('zorn'), ...T('gezinkt')] },
  { theme: 'Sternzeichen', items: [...A('stern', 'gericht'), ...S('umkehr'), ...P('zahl', 'maske', 'waage')] },
  { theme: 'Der Weg der Kelche', items: [...A('ass_kelche', 'zwei_kelche'), ...S('kelch'), ...P('dutzend'), ...T('reife')] },
  { theme: 'Endlose Fahrt', items: [...A('drei_staebe', 'ritter_staebe'), ...S('frost'), ...P('feuer', 'sterne')] },
  { theme: 'Der Weg der Münzen', items: [...A('page_muenzen', 'zehn_muenzen', 'zwei_muenzen'), ...S('muenze'), ...T('zauber')] },
  { theme: 'Schicksalsfäden', items: [...A('gehaengte', 'koenigin_kelche'), ...S('goldader'), ...P('glueck')] },
  { theme: 'Blutopfer', items: [...A('drei_schwerter', 'ritter_schwerter'), ...S('altar'), ...P('tiefe'), ...T('spiegel')] },
  { theme: 'Hof der Hölle', items: [...A('koenig_staebe'), ...S('zwilling'), ...P('kerzen', 'hoelle')] },
  { theme: 'Traumdeutung', items: [...A('sieben_kelche'), ...S('sturmauge', 'nadir'), ...P('wiederkehr'), ...T('rune')] },
  { theme: 'Kettenreaktion', items: [...S('kette'), ...P('verdammnis', 'asche', 'rabe'), ...T('seele')] },
  { theme: 'Verbotenes Wissen', items: P('opfer', 'glanz', 'daemmerung', 'trankmeister', 'alchemie', 'knochen', 'rast', 'ewigkeit') },
];

/** Erkenntnis, die für Stufe `level` (1-basiert) insgesamt nötig ist */
export function xpForLevel(level: number): number {
  let sum = 0;
  for (let l = 1; l <= level; l++) sum += 90 + 20 * (l - 1);
  return sum;
}

export function levelFor(xp: number): number {
  let l = 0;
  while (l < LEVELS.length && xp >= xpForLevel(l + 1)) l++;
  return l;
}

/** Erkenntnis für einen Run – auch Niederlagen bringen Fortschritt */
export function xpForRun(run: RunState, victory: boolean): number {
  const base = 8 * run.stats.ritualsWon + 12 * (run.circle - 1) + (victory ? 40 : 0);
  return Math.max(10, Math.round(base * (1 + 0.25 * ((run.stake ?? 1) - 1))));
}

// ------------------------------------------------------------ Entdeckungen

export interface DiscoveryCtx {
  run: RunState;
  spin?: SpinResult;
  /** Ritual gerade gewonnen; Anzahl benötigter Drehungen */
  ritualWon?: { spinsUsed: number };
  /** Run verloren */
  lost?: boolean;
}

export interface Discovery {
  item: UnlockRef;
  hint: string;
  check: (c: DiscoveryCtx) => boolean;
}

const spinWith = (f: (s: SpinResult) => boolean) => (c: DiscoveryCtx) => !!c.spin && f(c.spin);

/** Karten, die man durch eine bestimmte Spielweise entdeckt */
export const DISCOVERIES: Discovery[] = [
  { item: ref('arcana', 'teufel'), hint: 'Lass die Seelenkugel 20 Runden in einer Drehung fahren.', check: spinWith((s) => s.mainLaps >= 20) },
  { item: ref('arcana', 'ritter_kelche'), hint: 'Beschwöre 5 Irrlichter in einer Drehung.', check: spinWith((s) => s.ghosts >= 5) },
  { item: ref('arcana', 'magier'), hint: 'Bringe eine Arkana auf Stufe 3.', check: (c) => c.run.arcana.some((a) => a.level >= 3) },
  { item: ref('arcana', 'welt'), hint: 'Belege 6 Rauten gleichzeitig mit Siegeln.', check: (c) => c.run.sigils.filter(Boolean).length >= 6 },
  { item: ref('arcana', 'turm'), hint: 'Lande mit der Seelenkugel in einem Höllenfach.', check: spinWith((s) => s.pocket <= 0) },
  { item: ref('arcana', 'spieler'), hint: 'Triff einen Einsatz auf eine einzelne Zahl.', check: (c) => !!c.spin?.hit && c.run.lastBet.kind === 'number' },
  { item: ref('arcana', 'koenig_muenzen'), hint: 'Besitze 30 Seelen gleichzeitig.', check: (c) => c.run.souls >= 30 },
  { item: ref('arcana', 'tod'), hint: 'Scheitere an einem Dämon.', check: (c) => !!c.lost && c.run.ritual === 2 },
  { item: ref('arcana', 'zehn_schwerter'), hint: 'Vollende ein Ritual mit höchstens 2 Arkana.', check: (c) => !!c.ritualWon && c.run.arcana.length <= 2 },
  { item: ref('arcana', 'rad'), hint: 'Vollende ein Ritual mit einer einzigen Drehung.', check: (c) => c.ritualWon?.spinsUsed === 1 },
  { item: ref('arcana', 'koenig_schwerter'), hint: 'Erreiche den 7. Höllenkreis.', check: (c) => c.run.circle >= 7 },
  { item: ref('sigil', 'pentagramm'), hint: 'Erreiche 50 Fluch in einer Drehung.', check: spinWith((s) => s.fluch.gte(50)) },
  { item: ref('sigil', 'echo'), hint: 'Erreiche 2.000 Glut in einer Drehung.', check: spinWith((s) => s.glut.gte(2000)) },
  { item: ref('sigil', 'blitz'), hint: 'Löse 100 Siegel in einer Drehung aus.', check: spinWith((s) => (s.sigilTriggers ?? 0) >= 100) },
  { item: ref('sigil', 'schaedel'), hint: 'Erreiche den 4. Höllenkreis.', check: (c) => c.run.circle >= 4 },
];

export function checkDiscoveries(c: DiscoveryCtx, have: ReadonlySet<string>): Discovery[] {
  return DISCOVERIES.filter((d) => !have.has(d.item) && d.check(c));
}

/** Wie wird ein Element freigeschaltet? (für Kodex-Hinweise) */
export function unlockSource(item: string): { level?: number; theme?: string; hint?: string; starter?: boolean } {
  if (STARTER.includes(item as UnlockRef)) return { starter: true };
  const li = LEVELS.findIndex((l) => l.items.includes(item as UnlockRef));
  if (li >= 0) return { level: li + 1, theme: LEVELS[li].theme };
  const d = DISCOVERIES.find((x) => x.item === item);
  return d ? { hint: d.hint } : {};
}

export const ALL_REFS = (): UnlockRef[] => [...STARTER, ...LEVELS.flatMap((l) => l.items), ...DISCOVERIES.map((d) => d.item)];
