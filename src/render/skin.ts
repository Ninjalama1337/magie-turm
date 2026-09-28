import { COSMETIC_BY_ID, DEFAULT_COSMETICS } from '../content/cosmetics';

/** Aktive Optik für den Kessel-Renderer (Reliquienkammer) */
export const SKIN = {
  rim: '#c9a25a',
  ball: ['#ffffff', '#e6dccd', '#8b7f73', '255,240,220'],
};

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Metallfarbe des Kessels mit Transparenz */
export function rimA(alpha: number): string {
  return `rgba(${hexToRgb(SKIN.rim)},${alpha})`;
}

export function applySkin(sel: { ball?: string; rim?: string } | undefined): void {
  const ball = COSMETIC_BY_ID[sel?.ball ?? DEFAULT_COSMETICS.ball] ?? COSMETIC_BY_ID[DEFAULT_COSMETICS.ball];
  const rim = COSMETIC_BY_ID[sel?.rim ?? DEFAULT_COSMETICS.rim] ?? COSMETIC_BY_ID[DEFAULT_COSMETICS.rim];
  SKIN.ball = ball.colors;
  SKIN.rim = rim.colors[0];
}
