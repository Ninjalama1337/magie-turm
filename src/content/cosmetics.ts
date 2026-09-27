/** Kosmetik aus der Reliquienkammer – rein optisch, gekauft mit Asche */
export type CosmeticKind = 'ball' | 'rim';

export interface CosmeticDef {
  id: string;
  kind: CosmeticKind;
  name: string;
  desc: string;
  /** Asche-Preis; -1 = nur als Sammelalbum-Belohnung */
  cost: number;
  /** Farben: Kugel = [Glanz, Mitte, Rand, Leuchten]; Kessel = [Metall] */
  colors: string[];
}

export const COSMETICS: CosmeticDef[] = [
  { id: 'ball:knochen', kind: 'ball', name: 'Knochenkugel', desc: 'Geschliffen aus dem Schädel eines Spielers.', cost: 0, colors: ['#ffffff', '#e6dccd', '#8b7f73', '255,240,220'] },
  { id: 'ball:glut', kind: 'ball', name: 'Glutkugel', desc: 'Eine Kohle, die nie erlischt.', cost: 25, colors: ['#fff3c4', '#ff9a3c', '#8a2a08', '255,150,60'] },
  { id: 'ball:blut', kind: 'ball', name: 'Blutperle', desc: 'Gewachsen im Herzen eines Dämons.', cost: 40, colors: ['#ffd6dc', '#ff3b5c', '#5a0614', '255,60,90'] },
  { id: 'ball:amethyst', kind: 'ball', name: 'Amethystauge', desc: 'Sieht jede Zahl, bevor sie fällt.', cost: 60, colors: ['#f7e6ff', '#c07cff', '#3c1466', '200,130,255'] },
  { id: 'ball:gold', kind: 'ball', name: 'Goldene Seele', desc: 'Die Seele eines Königs, zur Kugel gepresst.', cost: 90, colors: ['#fffbe6', '#f4c95d', '#7a5510', '255,215,110'] },
  { id: 'ball:obsidian', kind: 'ball', name: 'Obsidian', desc: 'Schwärzer als die Nacht zwischen den Kreisen.', cost: 120, colors: ['#9a8cb8', '#2a2238', '#050308', '160,90,255'] },
  { id: 'ball:alchemie', kind: 'ball', name: 'Stein der Weisen', desc: 'Belohnung: alle Fusionen vollbracht.', cost: -1, colors: ['#ffffff', '#7ef9c8', '#0c5a48', '120,255,210'] },
  { id: 'rim:gold', kind: 'rim', name: 'Höllengold', desc: 'Der klassische Kessel.', cost: 0, colors: ['#c9a25a'] },
  { id: 'rim:silber', kind: 'rim', name: 'Mondsilber', desc: 'Kalt und klar wie eine Winternacht.', cost: 30, colors: ['#c9d0dc'] },
  { id: 'rim:blut', kind: 'rim', name: 'Blutkupfer', desc: 'Rostet nur, wenn es Blut trinkt.', cost: 50, colors: ['#c2405a'] },
  { id: 'rim:jade', kind: 'rim', name: 'Grabjade', desc: 'Aus den Gräbern vergessener Kaiser.', cost: 70, colors: ['#5fcf9a'] },
  { id: 'rim:feuer', kind: 'rim', name: 'Höllenfeuer', desc: 'Der Rand glüht, als würde er schmelzen.', cost: 110, colors: ['#ff7a2a'] },
  { id: 'rim:krone', kind: 'rim', name: 'Krone der Hölle', desc: 'Belohnung: mit 3 Beschwörern gesiegt.', cost: -1, colors: ['#f2c14e'] },
];

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

export const DEFAULT_COSMETICS = { ball: 'ball:knochen', rim: 'rim:gold' };

export const COSMETICS_TOTAL_COST = COSMETICS.reduce((s, c) => s + Math.max(0, c.cost), 0);
