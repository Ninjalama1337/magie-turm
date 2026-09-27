import { ARCANA_BY_ID } from '../content/arcana';
import { demonById, ENCHANT_BY_ID } from '../content/demons';
import { bonds, ELEMENTS, elementOf, resonance } from '../content/elements';
import { FUSION_LEVEL, recipesWith } from '../content/fusions';
import { PACT_BY_ID } from '../content/pacts';
import { SIGIL_BY_ID } from '../content/sigils';
import { SUIT_NAME } from '../content/arcana-minor';
import { POTION_BY_ID } from '../content/potions';
import { parseRef, unlockSource, type UnlockKind } from '../content/unlocks';
import type { ArcanaInst, Edition, Enchant, PactInst, RunState, SigilInst, Suit } from '../core/types';
import { colorOf, pocketLabel, type WheelDef } from '../core/wheel';
import { RARITY_COLOR, RARITY_LABEL, SIGIL_COLOR } from '../render/colors';
import { h } from './dom';
import { glyphSvg } from './icons';

export function levelPips(level: number, max = 5): string {
  let s = '';
  for (let i = 1; i <= max; i++) s += `<i class="${i <= level ? 'on' : ''}"></i>`;
  return `<span class="pips">${s}</span>`;
}

export const EDITION_LABEL: Record<Edition, string> = {
  folie: 'Folie',
  holo: 'Holo',
  poly: 'Polychrom',
  negativ: 'Negativ',
};

export const EDITION_DESC: Record<Edition, string> = {
  folie: 'Hat die Karte in einer Drehung ausgelöst: <b class="g">+50 Glut</b> am Drehende.',
  holo: 'Hat die Karte in einer Drehung ausgelöst: <b class="f">+8 Fluch</b> am Drehende.',
  poly: 'Hat die Karte in einer Drehung ausgelöst: <b class="x">×1,5 Fluch</b> am Drehende.',
  negativ: '<b>+1 Arkana-Platz</b> – belegt effektiv keinen Platz.',
};

const SUIT_GLYPH: Record<Suit, 'staff' | 'cup' | 'sword' | 'coin'> = {
  staebe: 'staff',
  kelche: 'cup',
  schwerter: 'sword',
  muenzen: 'coin',
};

export function arcanaCard(
  id: string,
  opts: { inst?: ArcanaInst; level?: number; inactive?: boolean; small?: boolean; edition?: Edition } = {},
): HTMLDivElement {
  const def = ARCANA_BY_ID[id];
  const level = opts.inst?.level ?? opts.level ?? 1;
  const edition = opts.inst?.edition ?? opts.edition;
  const el = h('div', {
    class: `tarot r-${def.rarity}${opts.inactive ? ' inactive' : ''}${opts.small ? ' small' : ''}${edition ? ` ed-${edition}` : ''}${def.suit ? ` suit-${def.suit}` : ''}`,
    style: `--rc:${RARITY_COLOR[def.rarity]}`,
  });
  el.innerHTML = `
    <div class="tarot-inner">
      ${def.suit ? `<span class="suit-badge" title="${SUIT_NAME[def.suit]}">${glyphSvg(SUIT_GLYPH[def.suit])}</span>` : ''}
      ${edition ? `<span class="ed-badge">${EDITION_LABEL[edition]}</span>` : ''}
      <div class="tarot-num">${def.numeral}</div>
      <div class="tarot-art">${glyphSvg(def.glyph)}</div>
      <div class="tarot-name">${def.name}</div>
      ${levelPips(level)}
    </div>`;
  return el;
}

export function arcanaDetail(id: string, inst?: ArcanaInst, level = 1, edition?: Edition): string {
  const def = ARCANA_BY_ID[id];
  const l = inst?.level ?? level;
  const ed = inst?.edition ?? edition;
  return `<div class="detail-head" style="--rc:${RARITY_COLOR[def.rarity]}">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.name}</div>
      <div class="detail-sub">${def.suit ? `Kleine Arkana · ${SUIT_NAME[def.suit]}` : 'Große Arkana'} · ${RARITY_LABEL[def.rarity]} · Stufe ${l}</div></div>
    </div>
    <p class="detail-desc">${def.desc(l, inst)}</p>
    ${ed ? `<p class="detail-ed"><b class="x">${EDITION_LABEL[ed]}:</b> ${EDITION_DESC[ed]}</p>` : ''}
    ${l < 5 ? `<p class="detail-next">Nächste Stufe: ${def.desc(l + 1, inst)}</p>` : ''}
    ${recipesWith(id)
      .map((r) => {
        const other = ARCANA_BY_ID[r.a === id ? r.b : r.a];
        return `<p class="detail-fusion">${glyphSvg('potion')} <b>Fusion:</b> mit <b>${other.name}</b> (beide Stufe ${FUSION_LEVEL}) → <b class="leg">${ARCANA_BY_ID[r.result].name}</b></p>`;
      })
      .join('')}`;
}

export function sigilTile(id: string, opts: { inst?: SigilInst; level?: number } = {}): HTMLDivElement {
  const def = SIGIL_BY_ID[id];
  const level = opts.inst?.level ?? opts.level ?? 1;
  const c = SIGIL_COLOR[id] ?? '#fff';
  const el = elementOf(id);
  const tile = h('div', { class: `sigil-tile r-${def.rarity}`, style: `--sc:${c}` });
  tile.innerHTML = `<div class="rhomb">${glyphSvg(def.glyph)}</div>
    <div class="sigil-name">${def.name}</div>${levelPips(level)}${el ? elementTag(el.id) : ''}`;
  return tile;
}

export function elementTag(id: string, withName = true): string {
  const el = ELEMENTS.find((e) => e.id === id);
  if (!el) return '';
  return `<span class="el-tag" style="--ec:${el.color}">${glyphSvg(el.glyph)}${withName ? el.name : ''}</span>`;
}

export function sigilDetail(id: string, level = 1, opts: { resonant?: boolean } = {}): string {
  const def = SIGIL_BY_ID[id];
  const c = SIGIL_COLOR[id] ?? '#fff';
  const el = elementOf(id);
  const eff = opts.resonant ? level + 1 : level;
  return `<div class="detail-head" style="--rc:${c}">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.name}</div>
      <div class="detail-sub">Siegel · ${RARITY_LABEL[def.rarity]} · Stufe ${level}${el ? ` · ${el.name}` : ''}</div></div>
    </div>
    <p class="detail-desc">Jedes Mal, wenn eine Kugel diese Raute passiert: ${def.desc(eff)}</p>
    ${opts.resonant ? `<p class="detail-ed"><b class="x">Resonanz:</b> Ein Nachbar ist ebenfalls ${el?.name} – wirkt wie Stufe ${eff}.</p>` : ''}
    ${level < 5 ? `<p class="detail-next">Nächste Stufe (erneut kaufen): ${def.desc(level + 1)}</p>` : ''}`;
}

/** Erklärung aller Elemente, Bünde und der Resonanz */
export function bondsHelp(run?: RunState): string {
  const active = run ? bonds(run) : [];
  const rows = ELEMENTS.map((e) => {
    const b = active.find((x) => x.element.id === e.id);
    const tiers = e.tiers
      .map((t, k) => `<li class="${b && b.tier > k ? 'on' : ''}"><b>${t.n}×</b> ${t.desc}</li>`)
      .join('');
    return `<div class="bond-help" style="--ec:${e.color}"><div class="bond-help-head">${glyphSvg(e.glyph)}<b>${e.name}</b>${b ? `<span>${b.count} auf dem Kessel</span>` : ''}</div><ul>${tiers}</ul></div>`;
  }).join('');
  return `<div class="modal-kicker">Siegel-Synergien</div><div class="modal-title">Bünde &amp; Resonanz</div>
    <p class="muted">Jedes Siegel gehört zu einem <b>Element</b>. Mehrere Siegel desselben Elements auf freien Rauten schließen einen <b>Bund</b>. <b class="x">Resonanz:</b> Liegt ein Siegel direkt neben einem Siegel desselben Elements, wirkt es <b>eine Stufe stärker</b>.</p>
    <div class="bond-help-grid">${rows}</div>`;
}

/** Leiste der aktiven Bünde; Klick öffnet die Erklärung */
export function bondsBar(run: RunState): HTMLElement {
  const bar = h('div', { class: 'bonds-bar' });
  const list = bonds(run).sort((a, b) => b.tier - a.tier || b.count - a.count);
  const reso = resonance(run).filter(Boolean).length;
  if (!list.length) bar.innerHTML = '<span class="muted">Keine Bünde</span>';
  for (const b of list) {
    const next = b.element.tiers[b.tier];
    const chip = h('span', {
      class: `bond-chip${b.tier ? ' on' : ''}`,
      style: `--ec:${b.element.color}`,
      html: `${glyphSvg(b.element.glyph)}<b>${b.count}</b>${next ? `<small>/${next.n}</small>` : '<small>★</small>'}`,
    });
    chip.title = `${b.element.name}: ${b.tier ? b.element.tiers.slice(0, b.tier).map((t) => t.desc.replace(/<[^>]+>/g, '')).join(', ') : `ab ${next?.n} Siegeln`}`;
    bar.append(chip);
  }
  if (reso) bar.append(h('span', { class: 'bond-chip reso on', html: `${glyphSvg('echo')}<b>${reso}</b><small>Resonanz</small>` }));
  bar.addEventListener('click', () => modal(bondsHelp(run), [{ label: 'Verstanden', cls: 'primary' }], { cls: 'wide' }));
  return bar;
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

export function enchantCard(ench: Enchant, pocket: number, wheel?: WheelDef): HTMLDivElement {
  const def = ENCHANT_BY_ID[ench];
  const col = colorOf(pocket, wheel);
  const el = h('div', { class: 'enchant-card', style: `--ec:${def.color}` });
  el.innerHTML = `<div class="pocket-badge c-${col}">${pocketLabel(pocket)}</div>
    <div class="pact-name">${def.name}</div>
    <div class="pact-desc">Verzaubert Fach <b>${pocketLabel(pocket)}</b>. ${def.desc}</div>`;
  return el;
}

export function potionCard(id: string): HTMLDivElement {
  const def = POTION_BY_ID[id];
  const el = h('div', { class: 'potion-card', style: `--pc:${def.color}` });
  el.innerHTML = `<div class="flask">${glyphSvg(def.glyph)}</div>
    <div class="pact-name">${def.name}</div>
    <div class="pact-desc">${def.desc}</div>`;
  return el;
}

export function potionChip(id: string): HTMLButtonElement {
  const def = POTION_BY_ID[id];
  const el = h('button', { class: 'potion-chip', style: `--pc:${def.color}`, title: def.name });
  el.innerHTML = glyphSvg(def.glyph);
  return el;
}

export function potionDetail(id: string): string {
  const def = POTION_BY_ID[id];
  return `<div class="detail-head" style="--rc:${def.color}">
      ${glyphSvg(def.glyph, 'glyph big')}
      <div><div class="detail-title">${def.name}</div>
      <div class="detail-sub">Trank · ${def.when === 'ritual' ? 'vor einer Drehung' : 'jederzeit'}</div></div>
    </div>
    <p class="detail-desc">${def.desc}</p>`;
}

export function demonBanner(id: string): HTMLDivElement {
  const d = demonById(id)!;
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

// ------------------------------------------------------------ Freischaltungen

const KIND_LABEL: Record<UnlockKind, string> = { arcana: 'Arkana', sigil: 'Siegel', pact: 'Pakt', potion: 'Trank' };

export function refName(r: string): string {
  const { kind, id } = parseRef(r);
  const name =
    kind === 'arcana' ? ARCANA_BY_ID[id]?.name : kind === 'sigil' ? SIGIL_BY_ID[id]?.name : kind === 'pact' ? PACT_BY_ID[id]?.name : POTION_BY_ID[id]?.name;
  return name ?? id;
}

export function refKindLabel(r: string): string {
  return KIND_LABEL[parseRef(r).kind];
}

export function refCard(r: string): HTMLElement {
  const { kind, id } = parseRef(r);
  if (kind === 'arcana') return arcanaCard(id);
  if (kind === 'sigil') return sigilTile(id);
  if (kind === 'pact') return pactCard(id);
  return potionCard(id);
}

export function refDetail(r: string): string {
  const { kind, id } = parseRef(r);
  if (kind === 'arcana') return arcanaDetail(id);
  if (kind === 'sigil') return sigilDetail(id);
  if (kind === 'pact') return pactDetail(id);
  return potionDetail(id);
}

/** Hinweis, wie ein versiegeltes Element freigeschaltet wird */
export function lockHint(r: string): string {
  const src = unlockSource(r);
  if (src.level) return `Erkenntnis-Stufe ${src.level} · „${src.theme}“`;
  if (src.hint) return `Entdeckung: ${src.hint}`;
  return 'Versiegelt';
}

/** Versiegelte Karte für den Kodex */
export function lockedCard(r: string): HTMLElement {
  const el = refCard(r);
  el.classList.add('locked-card');
  el.append(h('div', { class: 'lock-overlay', html: `${glyphSvg('chain')}<span>${lockHint(r)}</span>` }));
  return el;
}
