/** Hover-Tooltips (nur bei Geräten mit Maus). */
let tipEl: HTMLDivElement | null = null;
const canHover = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

function el(): HTMLDivElement {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

export function showTip(html: string, x: number, y: number): void {
  if (!canHover) return;
  const t = el();
  t.innerHTML = html;
  t.classList.add('show');
  const r = t.getBoundingClientRect();
  const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
  const top = y - r.height - 12 < 8 ? y + 24 : y - r.height - 12;
  t.style.left = `${left}px`;
  t.style.top = `${top}px`;
}

export function hideTip(): void {
  tipEl?.classList.remove('show');
}

export function attachTip(target: HTMLElement, html: () => string): void {
  if (!canHover) return;
  target.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = target.getBoundingClientRect();
    showTip(html(), r.left + r.width / 2, r.top);
  });
  target.addEventListener('pointerleave', hideTip);
  target.addEventListener('pointerdown', hideTip);
}
