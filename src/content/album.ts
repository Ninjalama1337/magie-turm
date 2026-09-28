import type { MetaState } from '../core/save';
import { ARCANA } from './arcana';
import { FUSIONS } from './fusions';
import { HEROES } from './heroes';
import { PACTS } from './pacts';
import { POTIONS } from './potions';
import { SIGILS } from './sigils';

/** Sammelalbum: Sammelziele mit einmaliger Belohnung */
export interface AlbumEntry {
  id: string;
  name: string;
  desc: string;
  progress: (m: MetaState) => [number, number];
  ash: number;
  /** Exklusive Kosmetik */
  cosmetic?: string;
}

const unlockedCount = (m: MetaState, kind: string, ids: { id: string }[]): [number, number] => {
  const set = new Set(m.insight.unlocked);
  return [ids.filter((x) => set.has(`${kind}:${x.id}`)).length, ids.length];
};

export const ALBUM: AlbumEntry[] = [
  { id: 'arkana', name: 'Das volle Tarot', desc: 'Schalte alle Arkana frei.', progress: (m) => unlockedCount(m, 'arcana', ARCANA), ash: 40 },
  { id: 'siegel', name: 'Meister der Rauten', desc: 'Schalte alle Siegel frei.', progress: (m) => unlockedCount(m, 'sigil', SIGILS), ash: 25 },
  { id: 'pakte', name: 'Vertragssammler', desc: 'Schalte alle Pakte frei.', progress: (m) => unlockedCount(m, 'pact', PACTS), ash: 25 },
  { id: 'traenke', name: 'Hexenküche', desc: 'Schalte alle Tränke frei.', progress: (m) => unlockedCount(m, 'potion', POTIONS), ash: 15 },
  {
    id: 'beschwoerer',
    name: 'Zirkel der Beschwörer',
    desc: 'Schalte alle Beschwörer frei.',
    progress: (m) => {
      const p = { runs: m.runs, bestCircle: m.bestCircle, victories: m.victories, insightXp: m.insight.xp };
      return [HEROES.filter((h) => h.unlocked(p)).length, HEROES.length];
    },
    ash: 20,
  },
  {
    id: 'fusionen',
    name: 'Großes Werk',
    desc: 'Vollbringe jede Arkana-Fusion einmal.',
    progress: (m) => [FUSIONS.filter((f) => m.seen.includes(`fused:${f.result}`)).length, FUSIONS.length],
    ash: 30,
    cosmetic: 'ball:alchemie',
  },
  {
    id: 'sieger',
    name: 'Drei Kronen',
    desc: 'Besiege Luzifer mit 3 verschiedenen Beschwörern.',
    progress: (m) => [Math.min(3, m.heroWins.length), 3],
    ash: 30,
    cosmetic: 'rim:krone',
  },
];

export function albumDone(m: MetaState, e: AlbumEntry): boolean {
  const [cur, max] = e.progress(m);
  return cur >= max;
}

/** Holt eine Belohnung ab; false, wenn nicht erfüllt oder schon abgeholt */
export function claimAlbum(m: MetaState, e: AlbumEntry): boolean {
  if (m.album.includes(e.id) || !albumDone(m, e)) return false;
  m.album.push(e.id);
  m.ash += e.ash;
  if (e.cosmetic && !m.cosmetics.owned.includes(e.cosmetic)) m.cosmetics.owned.push(e.cosmetic);
  return true;
}

/** Anzahl abholbereiter Belohnungen (für ein Abzeichen) */
export function albumReady(m: MetaState): number {
  return ALBUM.filter((e) => !m.album.includes(e.id) && albumDone(m, e)).length;
}
