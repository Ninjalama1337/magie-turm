import { ARCANA_BY_ID } from '../content/arcana';
import { DEMON_BY_ID, ENCHANT_BY_ID } from '../content/demons';
import { PACT_BY_ID } from '../content/pacts';
import { SIGIL_BY_ID } from '../content/sigils';
import type { ArcanaInst, Enchant, PactInst, SigilInst } from '../core/types';
import { colorOf } from '../core/wheel';
import { RARITY_COLOR, RARITY_LABEL, SIGIL_COLOR } from '../render/colors';
import { h } from './dom';
import { glyphSvg } from './icons';

export function levelPips(level: number, max = 5): string {
  let s = '';
  for (let i = 1; i <= max; i++) s += `<i class="${i <= level ? 'on' : ''}"></i>`;
  return `<span class="pips">${s}</span>`;
}

export function arcanaCard(
  id: string,
  opts: { inst?: ArcanaInst; level?: number; inactive?: boolean; small?: boolean } = {},
): HTMLDivElement {
  const def = ARCANA_BY_ID[id];
  const level = opts.inst?.level ?? opts.level ?? 1;
  const el = h('div', {
    class: `tarot r-${def.rarity}${opts.inactive ? ' inactive' : ''}${opts.small ? ' small' : ''}`,
    style: `--rc:${RARITY_COLOR[def.rarity]}`,
  });
  el.innerHTML = `
    <div class="tarot-inner">
      <div class="tarot-num">${def.numeral}</div>
      <div class="tarot-art">${glyphSvg(def.glyph)}</div>
      <div class="tarot-name">${def.name}</div>
      ${levelPips(level)}
    </div>`;
  return el;
}

export function arcanaDetail(id: string, inst?: ArcanaInst, level = 1): string {
  const def = ARCANA_BY_ID[id];
  const l = inst?.level ?? level;
  return `<div class="detail-head" style="--rc:${RARITY_COLOR[def.rarity]}">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.numeral} · ${def.name}</div>
      <div class="detail-sub">Arkana · ${RARITY_LABEL[def.rarity]} · Stufe ${l}</div></div>
    </div>
    <p class="detail-desc">${def.desc(l, inst)}</p>
    ${l < 5 ? `<p class="detail-next">Nächste Stufe: ${def.desc(l + 1, inst)}</p>` : ''}`;
}

export function sigilTile(id: string, opts: { inst?: SigilInst; level?: number } = {}): HTMLDivElement {
  const def = SIGIL_BY_ID[id];
  const level = opts.inst?.level ?? opts.level ?? 1;
  const c = SIGIL_COLOR[id] ?? '#fff';
  const el = h('div', { class: `sigil-tile r-${def.rarity}`, style: `--sc:${c}` });
  el.innerHTML = `<div class="rhomb">${glyphSvg(def.glyph)}</div>
    <div class="sigil-name">${def.name}</div>${levelPips(level)}`;
  return el;
}

export function sigilDetail(id: string, level = 1): string {
  const def = SIGIL_BY_ID[id];
  const c = SIGIL_COLOR[id] ?? '#fff';
  return `<div class="detail-head" style="--rc:${c}">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.name}</div>
      <div class="detail-sub">Siegel · ${RARITY_LABEL[def.rarity]} · Stufe ${level}</div></div>
    </div>
    <p class="detail-desc">Jedes Mal, wenn eine Kugel diese Raute passiert: ${def.desc(level)}</p>
    ${level < 5 ? `<p class="detail-next">Nächste Stufe (erneut kaufen): ${def.desc(level + 1)}</p>` : ''}`;
}

export function pactCard(id: string, stacks = 0): HTMLDivElement {
  const def = PACT_BY_ID[id];
  const el = h('div', { class: 'pact-card' });
  el.innerHTML = `<div class="seal">${glyphSvg(def.glyph)}</div>
    <div class="pact-name">${def.name}</div>
    <div class="pact-desc">${def.desc}</div>
    ${def.max > 1 ? `<div class="pact-stack">${stacks}/${def.max}</div>` : ''}`;
  return el;
}

export function pactChip(p: PactInst): HTMLDivElement {
  const def = PACT_BY_ID[p.id];
  const el = h('div', { class: 'pact-chip', title: def.name });
  el.innerHTML = `${glyphSvg(def.glyph)}${p.stacks > 1 ? `<b>${p.stacks}</b>` : ''}`;
  return el;
}

export function pactDetail(id: string, stacks = 0): string {
  const def = PACT_BY_ID[id];
  return `<div class="detail-head" style="--rc:#c9a25a">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.name}</div>
      <div class="detail-sub">Pakt${def.max > 1 ? ` · ${stacks}/${def.max}` : ''}</div></div>
    </div>
    <p class="detail-desc">${def.desc}</p>`;
}

export function enchantCard(ench: Enchant, pocket: number): HTMLDivElement {
  const def = ENCHANT_BY_ID[ench];
  const col = colorOf(pocket);
  const el = h('div', { class: 'enchant-card', style: `--ec:${def.color}` });
  el.innerHTML = `<div class="pocket-badge c-${col}">${pocket}</div>
    <div class="pact-name">${def.name}</div>
    <div class="pact-desc">Verzaubert Fach <b>${pocket}</b>. ${def.desc}</div>`;
  return el;
}

export function demonBanner(id: string): HTMLDivElement {
  const d = DEMON_BY_ID[id];
  const el = h('div', { class: 'demon-banner' });
  el.innerHTML = `${glyphSvg(d.glyph, 'glyph')}<div><b>${d.name}</b>, ${d.title}<br><span>${d.desc}</span></div>`;
  return el;
}

// ------------------------------------------------------------------ Modal

export interface ModalButton {
  label: string;
  cls?: string;
  disabled?: boolean;
  onClick?: () => void | boolean;
}

export function modal(content: string | HTMLElement, buttons: ModalButton[] = [], opts: { cls?: string; dismiss?: boolean } = {}): () => void {
  const back = h('div', { class: `modal-back ${opts.cls ?? ''}` });
  const box = h('div', { class: 'modal' });
  if (typeof content === 'string') box.innerHTML = content;
  else box.append(content);
  const close = () => {
    back.classList.add('closing');
    setTimeout(() => back.remove(), 180);
  };
  if (buttons.length) {
    const row = h('div', { class: 'modal-buttons' });
    for (const b of buttons) {
      row.append(
        h('button', {
          class: `btn ${b.cls ?? ''}`,
          text: b.label,
          disabled: b.disabled,
          onclick: () => {
            const keep = b.onClick?.();
            if (keep !== true) close();
          },
        }),
      );
    }
    box.append(row);
  }
  back.append(box);
  if (opts.dismiss !== false) {
    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
  }
  document.body.append(back);
  return close;
}
