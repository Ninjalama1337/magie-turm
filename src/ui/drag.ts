/**
 * Drag & Drop per Pointer Events (Maus + Touch) für Kartenreihen und Rauten.
 * Ein kurzes Tippen bleibt ein normaler Klick.
 */
export interface DragOptions {
  /** Selektor der ziehbaren Elemente innerhalb des Containers */
  item: string;
  /** Wird beim Loslassen über einem anderen Element aufgerufen */
  onDrop: (from: number, to: number) => void;
  /** Ist Ziehen gerade erlaubt? */
  enabled?: () => boolean;
}

const THRESHOLD = 8;

export function makeDraggable(container: HTMLElement, opts: DragOptions): () => void {
  let start: { x: number; y: number; el: HTMLElement; idx: number; id: number } | null = null;
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  let suppressClick = false;

  const items = () => [...container.querySelectorAll<HTMLElement>(opts.item)];

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || (opts.enabled && !opts.enabled())) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(opts.item);
    if (!el || !container.contains(el)) return;
    start = { x: e.clientX, y: e.clientY, el, idx: items().indexOf(el), id: e.pointerId };
  };

  const onMove = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!ghost) {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      const r = start.el.getBoundingClientRect();
      ghost = start.el.cloneNode(true) as HTMLElement;
      ghost.classList.add('drag-ghost');
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      ghost.style.left = `${r.left}px`;
      ghost.style.top = `${r.top}px`;
      document.body.append(ghost);
      start.el.classList.add('dragging');
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        /* egal */
      }
    }
    e.preventDefault();
    ghost.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) rotate(${Math.max(-8, Math.min(8, dx / 12))}deg)`;
    ghost.style.visibility = 'hidden';
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(opts.item) ?? null;
    ghost.style.visibility = '';
    const target = hit && container.contains(hit) && hit !== start.el ? hit : null;
    if (target !== over) {
      over?.classList.remove('drop-target');
      over = target;
      over?.classList.add('drop-target');
    }
  };

  const end = (e: PointerEvent) => {
    if (!start || e.pointerId !== start.id) return;
    if (ghost) {
      ghost.remove();
      ghost = null;
      start.el.classList.remove('dragging');
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 50);
      if (over) {
        const to = items().indexOf(over);
        over.classList.remove('drop-target');
        if (to >= 0 && to !== start.idx) opts.onDrop(start.idx, to);
      }
    }
    over = null;
    start = null;
  };

  const onClick = (e: MouseEvent) => {
    if (suppressClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  container.addEventListener('pointerdown', onDown);
  container.addEventListener('pointermove', onMove);
  container.addEventListener('pointerup', end);
  container.addEventListener('pointercancel', end);
  container.addEventListener('click', onClick, true);
  container.style.touchAction = 'pan-y';
  return () => {
    container.removeEventListener('pointerdown', onDown);
    container.removeEventListener('pointermove', onMove);
    container.removeEventListener('pointerup', end);
    container.removeEventListener('pointercancel', end);
    container.removeEventListener('click', onClick, true);
  };
}
