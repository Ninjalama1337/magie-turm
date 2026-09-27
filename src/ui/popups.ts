import type { Tone } from '../core/types';

let layer: HTMLDivElement | null = null;
let live = 0;
const MAX_LIVE = 45;

function getLayer(): HTMLDivElement {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'popup-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

/** Schwebende Zahl an einer Seitenposition */
export function popup(x: number, y: number, text: string, tone: Tone, big = false): void {
  if (live >= MAX_LIVE) return;
  const el = document.createElement('div');
  el.className = `popup tone-${tone}${big ? ' big' : ''}`;
  el.textContent = text;
  const jitter = (Math.random() - 0.5) * 18;
  el.style.left = `${x + jitter}px`;
  el.style.top = `${y}px`;
  getLayer().appendChild(el);
  live++;
  el.addEventListener(
    'animationend',
    () => {
      el.remove();
      live--;
    },
    { once: true },
  );
}

export function popupAt(el: Element | null, text: string, tone: Tone, big = false): void {
  if (!el) return;
  const r = el.getBoundingClientRect();
  popup(r.left + r.width / 2, r.top + r.height * 0.25, text, tone, big);
}

let toastEl: HTMLDivElement | null = null;
let toastTimer = 0;
export function toast(text: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 2200);
}
