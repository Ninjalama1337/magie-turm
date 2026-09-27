import Decimal from 'break_eternity.js';
import type { GlyphId, RunState, SpinResult } from '../core/types';

export interface AchievementCtx {
  run: RunState;
  spin?: SpinResult;
  runEnd?: boolean;
  victory?: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  glyph: GlyphId;
  ash: number;
  check: (c: AchievementCtx) => boolean;
}

const spinGte = (v: string) => (c: AchievementCtx) => !!c.spin && c.spin.score.gte(new Decimal(v));

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'erste', name: 'Erste Sünde', desc: 'Vollende dein erstes Ritual.', glyph: 'candle', ash: 1, check: (c) => c.run.stats.ritualsWon >= 1 },
  { id: 'daemon', name: 'Dämonenbanner', desc: 'Banne deinen ersten Dämon.', glyph: 'horn', ash: 2, check: (c) => c.run.circle >= 2 },
  { id: 'kreis5', name: 'Halbwegs verdammt', desc: 'Erreiche den 5. Höllenkreis.', glyph: 'tower', ash: 3, check: (c) => c.run.circle >= 5 },
  { id: 'sieg', name: 'Lichtbringer gestürzt', desc: 'Besiege Luzifer im 9. Kreis.', glyph: 'devil', ash: 10, check: (c) => !!c.victory },
  { id: 'jenseits5', name: 'Wanderer im Jenseits', desc: 'Erreiche Jenseits 5.', glyph: 'infinity', ash: 8, check: (c) => c.run.circle >= 14 },
  { id: 'k1', name: 'Tausend Seelen', desc: 'Erziele 1.000 in einer Drehung.', glyph: 'flame', ash: 1, check: spinGte('1e3') },
  { id: 'm1', name: 'Millionär der Hölle', desc: 'Erziele 1 Million in einer Drehung.', glyph: 'coin', ash: 2, check: spinGte('1e6') },
  { id: 'e12', name: 'Billionen Schreie', desc: 'Erziele 1e12 in einer Drehung.', glyph: 'skull', ash: 4, check: spinGte('1e12') },
  { id: 'e50', name: 'Jenseits der Zahlen', desc: 'Erziele 1e50 in einer Drehung.', glyph: 'eye', ash: 6, check: spinGte('1e50') },
  { id: 'e100', name: 'Googol', desc: 'Erziele 1e100 in einer Drehung.', glyph: 'pentagram', ash: 8, check: spinGte('1e100') },
  { id: 'inf', name: 'Unendlichkeit', desc: 'Überschreite 1,8e308 in einer Drehung.', glyph: 'infinity', ash: 15, check: spinGte('1.79e308') },
  { id: 'runden50', name: 'Endlose Runde', desc: 'Die Seelenkugel fährt 50 Runden in einer Drehung.', glyph: 'hourglass', ash: 3, check: (c) => !!c.spin && c.spin.mainLaps >= 50 },
  { id: 'geister10', name: 'Geisterzug', desc: 'Beschwöre 10 Irrlichter in einer Drehung.', glyph: 'wisp', ash: 3, check: (c) => !!c.spin && c.spin.ghosts >= 10 },
  { id: 'hoelle', name: 'Pforte zur Hölle', desc: 'Lande mit der Seelenkugel im Höllenfach.', glyph: 'horn', ash: 1, check: (c) => !!c.spin && c.spin.pocket <= 0 },
  { id: 'zahl', name: 'Volltreffer', desc: 'Triff einen Einsatz auf eine einzelne Zahl.', glyph: 'star', ash: 2, check: (c) => !!c.spin && c.spin.hit && c.run.lastBet.kind === 'number' },
  { id: 'reich', name: 'Seelenhort', desc: 'Besitze 50 Seelen gleichzeitig.', glyph: 'crystal', ash: 2, check: (c) => c.run.souls >= 50 },
  { id: 'voll', name: 'Volles Rad', desc: 'Belege alle 8 Rauten mit Siegeln.', glyph: 'rune', ash: 2, check: (c) => c.run.sigils.every(Boolean) },
  { id: 'max', name: 'Meisterwerk', desc: 'Bringe eine Arkana auf Stufe 5.', glyph: 'crown', ash: 2, check: (c) => c.run.arcana.some((a) => a.level >= 5) },
  { id: 'mini', name: 'Kleines Rad, großes Glück', desc: 'Gewinne mit dem Mini-Rad.', glyph: 'dice', ash: 5, check: (c) => !!c.victory && c.run.wheel === 'mini' },
  { id: 'stufe5', name: 'Erzverdammt', desc: 'Gewinne auf Höllenstufe 5.', glyph: 'sickle', ash: 12, check: (c) => !!c.victory && c.run.stake >= 5 },
  { id: 'daily', name: 'Tägliches Opfer', desc: 'Beende eine tägliche Herausforderung.', glyph: 'bell', ash: 2, check: (c) => !!c.runEnd && c.run.mode === 'daily' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Liefert neu erreichte Erfolge (noch nicht in `have`) */
export function checkAchievements(c: AchievementCtx, have: readonly string[]): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !have.includes(a.id) && a.check(c));
}
