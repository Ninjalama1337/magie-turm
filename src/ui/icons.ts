import type { GlyphId } from '../core/types';

/** Handgezeichnete Linien-Glyphen (24×24, Stroke). Für DOM (SVG) und Canvas (Path2D). */
export const GLYPHS: Record<GlyphId, string> = {
  fool: 'M5 11 L8 4 L12 9 L16 4 L19 11 M6 11 H18 M8 5 h.01 M16 5 h.01 M9 15 a3 3 0 0 0 6 0 M12 11 V13',
  wand: 'M5 19 L15 9 M15 9 l2 -2 M18 3 v4 M16 5 h4 M20 10 h2 M10 3 v3',
  moon: 'M15 4 a8 8 0 1 0 5 13 a6.5 6.5 0 1 1 -5 -13 z',
  crown: 'M4 17 L5 8 L9 12 L12 6 L15 12 L19 8 L20 17 Z M4 20 H20',
  throne: 'M7 3 V21 M17 13 V21 M7 13 H17 M7 3 H13 V13 M5 21 H9 M15 21 H19',
  key: 'M3 12 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M11 12 H21 M18 12 V15 M21 12 V15',
  heart: 'M12 20 C4 14 3 9 6.5 6.5 C9 5 11 6 12 8 C13 6 15 5 17.5 6.5 C21 9 20 14 12 20 Z',
  chariot: 'M4 7 H16 V14 H4 Z M16 10 L21 8 M5 18 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M11 18 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',
  lion: 'M12 4 C17 4 20 8 20 12 C20 17 16 20 12 20 C8 20 4 17 4 12 C4 8 7 4 12 4 Z M9 11 h.01 M15 11 h.01 M10 15 Q12 17 14 15',
  lantern: 'M9 3 H15 M10 3 V6 M14 3 V6 M8 6 H16 L15 18 H9 Z M12 10 V14 M8 20 H16',
  wheel: 'M4 12 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M12 4 V20 M4 12 H20 M6.3 6.3 L17.7 17.7 M17.7 6.3 L6.3 17.7',
  scales: 'M12 3 V20 M8 20 H16 M5 7 H19 M5 7 L3 12 Q5 14 7 12 Z M19 7 L17 12 Q19 14 21 12 Z',
  hanged: 'M4 3 H20 M12 3 V8 M10 10 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M12 12 V17 M12 14 L9 16 M12 14 L15 16 M12 17 L10 21 M12 17 L14 21',
  skull: 'M6 11 a6 6 0 1 1 12 0 V15 H15 V19 H9 V15 H6 Z M9 11 h.01 M15 11 h.01 M12 13 v1.5',
  cup: 'M6 4 H18 Q18 12 12 13 Q6 12 6 4 Z M12 13 V19 M8 20 H16',
  devil: 'M6 4 Q7 9 9 9 M18 4 Q17 9 15 9 M6 13 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M9.5 12 l1.5 1 M14.5 12 l-1.5 1 M10 16.5 Q12 18 14 16.5',
  tower: 'M8 21 V9 H15 V21 M7 9 L11.5 4 L16 9 M10.5 13 H12.5 M6 21 H17 M20 3 l-3 4 h2 l-2 4',
  star: 'M12 3 L14.6 9.2 L21 9.5 L16 13.6 L17.8 20 L12 16.4 L6.2 20 L8 13.6 L3 9.5 L9.4 9.2 Z',
  sun: 'M8 12 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M12 2 v3 M12 19 v3 M2 12 h3 M19 12 h3 M4.9 4.9 l2.1 2.1 M17 17 l2.1 2.1 M4.9 19.1 l2.1 -2.1 M17 7 l2.1 -2.1',
  trumpet: 'M3 10 V14 H6 L17 19 V5 L6 10 Z M20 8 l2 -1 M20 12 h2 M20 16 l2 1',
  world: 'M4 12 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M4 12 H20 M12 4 Q7 12 12 20 M12 4 Q17 12 12 20',
  witch: 'M3 19 H21 M6 19 L11 4 L15 11 L18 19 M9 15 H15 M15 11 L19 9',
  shadow: 'M12 3 C7 3 6 9 6 12 L4 21 H20 L18 12 C18 9 17 3 12 3 Z M10 11 h.01 M14 11 h.01',
  eye: 'M2 12 Q12 3 22 12 Q12 21 2 12 Z M9 12 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M12 12 h.01',
  flame: 'M12 21 C7 21 5 17 6 13 C7 10 9 9 9 5 C12 7 13 9 13 11 C14 10 15 9 15 7 C18 10 19 13 18 16 C17 19 15 21 12 21 Z',
  drop: 'M12 3 C9 8 6 11 6 15 a6 6 0 0 0 12 0 C18 11 15 8 12 3 Z',
  bolt: 'M13 2 L5 13 H11 L10 22 L19 10 H13 Z',
  mirror: 'M7 9 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0 M12 15 V21 M9 21 H15 M9.5 8 L11.5 6',
  chain: 'M3 12 a4 3 0 0 1 4 -3 H10 a3 3 0 0 1 0 6 H7 a4 3 0 0 1 -4 -3 Z M14 9 H17 a4 3 0 0 1 0 6 H14 a3 3 0 0 1 0 -6 Z M9 12 H15',
  wisp: 'M12 21 a4 4 0 0 1 -4 -4 C8 13 12 11 11 6 C14 8 16 11 16 15 a4 4 0 0 1 -4 6 Z M12 17 h.01 M16 6 Q19 4 20 7',
  coin: 'M4 12 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0 M8 12 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M12 4 V8 M12 16 V20',
  echo: 'M5 12 a7 7 0 0 1 14 0 M8 12 a4 4 0 0 1 8 0 M11 12 a1 1 0 0 1 2 0 M5 16 a7 7 0 0 0 14 0',
  pentagram: 'M3 12 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0 M12 3 L17.3 19.3 L3.4 9.2 H20.6 L6.7 19.3 Z',
  dice: 'M4 4 H20 V20 H4 Z M8 8 h.01 M16 8 h.01 M12 12 h.01 M8 16 h.01 M16 16 h.01',
  hourglass: 'M6 3 H18 M6 21 H18 M7 3 C7 9 12 10 12 12 C12 14 7 15 7 21 M17 3 C17 9 12 10 12 12 C12 14 17 15 17 21 M10 18 H14',
  snake: 'M4 18 C8 22 12 18 10 14 C8 10 12 6 16 8 C19 9.5 20 6 18 4 M18 4 l2 -1 M17 5 h.01',
  candle: 'M9 10 H15 V21 H9 Z M12 10 V8 M12 8 C10 6 12 3.5 12 2 C13 4 14.5 6 12 8 Z',
  feather: 'M20 4 C12 4 6 10 5 19 M20 4 C20 12 14 18 5 19 M5 19 L3 21 M9 14 H14 M12 10 H17',
  horn: 'M4 20 C4 12 10 6 20 4 C16 8 14 12 14 16 C14 18 12 20 10 20 Z',
  bell: 'M6 17 C6 10 8 5 12 5 C16 5 18 10 18 17 Z M4 17 H20 M10 20 a2 2 0 0 0 4 0 M12 5 V3',
  book: 'M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z M12 6 V20',
  dagger: 'M12 2 L14 5 V14 H10 V5 Z M7 14 H17 M12 14 V21 M10 21 H14',
  rune: 'M8 3 V21 M8 8 L16 4 M8 13 L16 9 M8 21 L4 18',
  infinity: 'M12 12 C9 7 3 8 3 12 C3 16 9 17 12 12 C15 7 21 8 21 12 C21 16 15 17 12 12 Z',
};

export function glyphSvg(id: GlyphId, cls = 'glyph'): string {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS[id]}"/></svg>`;
}

const pathCache = new Map<GlyphId, Path2D>();
export function glyphPath(id: GlyphId): Path2D {
  let p = pathCache.get(id);
  if (!p) {
    p = new Path2D(GLYPHS[id]);
    pathCache.set(id, p);
  }
  return p;
}

/** Zeichnet eine Glyphe zentriert auf (x, y) mit Größe size */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  id: GlyphId,
  x: number,
  y: number,
  size: number,
  color: string,
  lineWidth = 1.7,
): void {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  const s = size / 24;
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(glyphPath(id));
  ctx.restore();
}
