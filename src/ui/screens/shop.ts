import { sfx } from '../../audio/sfx';
import { DEMON_BY_ID } from '../../content/demons';
import { PACT_BY_ID } from '../../content/pacts';
import { SIGIL_BY_ID } from '../../content/sigils';
import { fmt } from '../../core/num';
import { circleName, nextRitual, ritualTarget, withRng } from '../../core/run';
import {
  arcanaSellValue,
  buy,
  canBuy,
  moveArcana,
  reroll,
  rerollPrice,
  sellArcana,
  sellSigil,
  sigilSellValue,
  swapSigils,
  unlockPrice,
  unlockSlot,
  sellPotion,
  upgradeArcana,
  upgradePrice,
  usePotion,
} from '../../core/shop';
import { wheelOf } from '../../core/wheel';
import { POTION_BY_ID } from '../../content/potions';
import { makeDraggable } from '../drag';
import { attachTip } from '../tooltip';
import { runTutorial, SHOP_TUTORIAL } from '../tutorial';
import { computeStats } from '../../core/stats';
import type { ShopItem } from '../../core/types';
import { SIGIL_COLOR } from '../../render/colors';
import { WheelView } from '../../render/wheel';
import type { App } from '../app';
import {
  arcanaCard,
  arcanaDetail,
  enchantCard,
  levelPips,
  modal,
  pactCard,
  pactChip,
  pactDetail,
  potionCard,
  potionChip,
  potionDetail,
  sigilDetail,
  sigilTile,
} from '../components';
import { h, restartAnim, roman } from '../dom';
import { glyphSvg } from '../icons';
import { popupAt, toast } from '../popups';
import { ENCHANT_BY_ID } from '../../content/demons';
import { showMenu } from './menu';

export function renderShop(app: App): () => void {
  const run = app.run!;
  let selectedSlot = -1;

  const root = h('div', { class: 'screen shop' });
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-menu aria-label="Menü">${glyphSvg('book')}</button>
      <div class="tb-center">
        <div class="tb-circle">Kreis ${roman(run.circle)} · ${circleName(run.circle)}</div>
        <div class="tb-ritual">Basar der Verdammten</div>
      </div>
      <div class="souls-pill">${glyphSvg('coin')}<b data-souls>${run.souls}</b></div>
    </header>
    <section class="panel offers-panel">
      <div class="panel-head"><h2>Angebote</h2><button class="btn ghost small" data-reroll></button></div>
      <div class="offers" data-offers></div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Arkana <span class="muted" data-acount></span></h2><span class="hint">Tippen: Aufwerten, Verkaufen, Umordnen</span></div>
      <div class="arcana-row owned" data-arcana></div>
    </section>
    <section class="panel runes-panel">
      <div class="panel-head"><h2>Rauten</h2><span class="hint">Die Kugel passiert sie in dieser Reihenfolge. Tippe zwei Rauten an, um sie zu tauschen.</span></div>
      <div class="runes-body">
        <div class="wheel-mini" data-wheel></div>
        <div class="runes" data-runes></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Pakte</h2></div>
      <div class="pacts-row" data-pacts></div>
    </section>
    <section class="panel potions-panel">
      <div class="panel-head"><h2>Tränke <span class="muted" data-pcount></span></h2><span class="hint">Tippen: trinken oder verkaufen</span></div>
      <div class="potion-row" data-potions></div>
    </section>
    <section class="next-panel" data-next></section>`;
  app.root.append(root);

  const q = <T extends HTMLElement>(s: string) => root.querySelector(`[data-${s}]`) as T;
  const soulsEl = q('souls');
  const view = new WheelView(q('wheel'));
  view.wheel = wheelOf(run);
  view.wheelSpeed = -0.18;
  const cleanups: (() => void)[] = [];

  function refresh(): void {
    soulsEl.textContent = String(run.souls);
    renderOffers();
    renderArcana();
    renderRunes();
    renderPacts();
    renderPotions();
    renderNext();
    view.sigils = run.sigils;
    view.unlocked = run.sigilUnlocked;
    view.enchants = { ...run.enchants };
    app.saveAll();
  }

  function offerCard(o: ShopItem): HTMLElement {
    switch (o.kind) {
      case 'arcana':
        return arcanaCard(o.id, { edition: o.edition });
      case 'potion':
        return potionCard(o.id);
      case 'sigil': {
        const own = run.sigils.find((s) => s?.id === o.id);
        const el = sigilTile(o.id, { level: own ? own.level + 1 : 1 });
        if (own) el.append(h('div', { class: 'tag', text: 'Aufwertung' }));
        return el;
      }
      case 'pact':
        return pactCard(o.id, run.pacts.find((p) => p.id === o.id)?.stacks ?? 0);
      case 'enchant':
        return enchantCard(o.enchant, o.pocket, wheelOf(run));
    }
  }

  function offerDetail(o: ShopItem): string {
    switch (o.kind) {
      case 'arcana':
        return arcanaDetail(o.id, undefined, 1, o.edition);
      case 'potion':
        return potionDetail(o.id);
      case 'sigil': {
        const own = run.sigils.find((s) => s?.id === o.id);
        return sigilDetail(o.id, own ? own.level + 1 : 1) + (own ? '<p class="muted">Du besitzt dieses Siegel bereits – der Kauf erhöht seine Stufe.</p>' : '');
      }
      case 'pact':
        return pactDetail(o.id, run.pacts.find((p) => p.id === o.id)?.stacks ?? 0);
      case 'enchant': {
        const e = ENCHANT_BY_ID[o.enchant];
        return `<div class="detail-head" style="--rc:${e.color}">${glyphSvg(e.glyph, 'glyph big')}<div><div class="detail-title">${e.name}</div><div class="detail-sub">Verzauberung · Fach ${o.pocket}</div></div></div><p class="detail-desc">${e.desc}</p>${run.enchants[o.pocket] ? `<p class="muted">Ersetzt die bestehende Verzauberung (${ENCHANT_BY_ID[run.enchants[o.pocket]].name}).</p>` : ''}`;
      }
    }
  }

  function doBuy(i: number, anchor: Element | null): void {
    const o = run.shop!.offers[i];
    const chk = canBuy(run, o);
    if (!chk.ok) {
      toast(chk.reason);
      return;
    }
    buy(run, i);
    sfx.buy();
    popupAt(anchor, `−${o.price}`, 'souls');
    refresh();
  }

  function renderOffers(): void {
    const el = q('offers');
    el.innerHTML = '';
    const shop = run.shop!;
    shop.offers.forEach((o, i) => {
      const wrap = h('div', { class: `offer kind-${o.kind}${o.sold ? ' sold' : ''}` });
      const card = offerCard(o);
      wrap.append(card);
      if (o.sold) {
        wrap.append(h('div', { class: 'sold-mark', text: 'Verkauft' }));
      } else {
        const chk = canBuy(run, o);
        const btn = h('button', {
          class: `btn price${chk.ok ? '' : ' no'}`,
          html: `${glyphSvg('coin')} ${o.price}`,
          title: chk.ok ? 'Kaufen' : chk.reason,
        });
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          doBuy(i, btn);
        });
        wrap.append(btn);
        attachTip(card, () => offerDetail(o));
        card.addEventListener('click', () =>
          modal(offerDetail(o), [
            { label: 'Zurück', cls: 'ghost' },
            { label: chk.ok ? `Kaufen · ${o.price}` : chk.reason, cls: 'primary', disabled: !chk.ok, onClick: () => doBuy(i, btn) },
          ]),
        );
      }
      el.append(wrap);
    });
    const rr = q<HTMLButtonElement>('reroll');
    const price = rerollPrice(run);
    rr.innerHTML = `${glyphSvg('dice')} Neu würfeln · ${price === 0 ? 'gratis' : price}`;
    rr.disabled = run.souls < price;
  }

  q('reroll').addEventListener('click', () => {
    if (withRng(run, (rng) => reroll(run, rng))) {
      sfx.click();
      refresh();
      root.querySelectorAll('.offer').forEach((o) => restartAnim(o, 'deal'));
    }
  });

  function renderArcana(): void {
    const el = q('arcana');
    el.innerHTML = '';
    const slots = computeStats(run, false).arcanaSlots;
    q('acount').textContent = `${run.arcana.length}/${slots}`;
    run.arcana.forEach((a, i) => {
      const card = arcanaCard(a.id, { inst: a });
      card.addEventListener('click', () => inspectArcana(i));
      el.append(card);
    });
    for (let i = run.arcana.length; i < slots; i++) el.append(h('div', { class: 'tarot empty' }));
  }

  function inspectArcana(i: number): void {
    const a = run.arcana[i];
    const up = upgradePrice(run, i);
    const canUp = a.level < 5 && run.souls >= up;
    modal(arcanaDetail(a.id, a), [
      { label: '◀', cls: 'ghost', disabled: i === 0, onClick: () => { moveArcana(run, i, i - 1); refresh(); } },
      {
        label: a.level >= 5 ? 'Max. Stufe' : `Aufwerten · ${up}`,
        cls: 'primary',
        disabled: !canUp,
        onClick: () => {
          upgradeArcana(run, i);
          sfx.buy();
          refresh();
          inspectArcana(i);
        },
      },
      {
        label: `Verkaufen · +${arcanaSellValue(run, i)}`,
        cls: 'danger',
        onClick: () => {
          sellArcana(run, i);
          sfx.souls();
          refresh();
        },
      },
      { label: '▶', cls: 'ghost', disabled: i === run.arcana.length - 1, onClick: () => { moveArcana(run, i, i + 1); refresh(); } },
    ]);
  }

  function renderRunes(): void {
    const el = q('runes');
    el.innerHTML = '';
    for (let i = 0; i < run.sigils.length; i++) {
      const s = run.sigils[i];
      const locked = i >= run.sigilUnlocked;
      const tile = h('div', { class: `rune${locked ? ' locked' : ''}${s ? ' filled' : ''}${selectedSlot === i ? ' sel' : ''}` });
      tile.style.setProperty('--sc', s ? SIGIL_COLOR[s.id] ?? '#fff' : '#6d5a44');
      if (locked) {
        const first = i === run.sigilUnlocked;
        tile.innerHTML = `<span class="rune-n">${i + 1}</span>${glyphSvg('chain')}${first ? `<span class="rune-price">${glyphSvg('coin')}${unlockPrice(run)}</span>` : ''}`;
        if (first) {
          tile.addEventListener('click', () => {
            if (unlockSlot(run)) {
              sfx.buy();
              refresh();
            } else toast('Zu wenig Seelen');
          });
          tile.classList.add('buyable');
        }
      } else if (s) {
        const def = SIGIL_BY_ID[s.id];
        tile.innerHTML = `<span class="rune-n">${i + 1}</span><div class="rhomb">${glyphSvg(def.glyph)}</div>${levelPips(s.level)}`;
        tile.addEventListener('click', () => clickSlot(i));
      } else {
        tile.innerHTML = `<span class="rune-n">${i + 1}</span><span class="rune-empty">leer</span>`;
        tile.addEventListener('click', () => clickSlot(i));
      }
      el.append(tile);
    }
  }

  function clickSlot(i: number): void {
    sfx.click();
    if (selectedSlot >= 0 && selectedSlot !== i) {
      swapSigils(run, selectedSlot, i);
      selectedSlot = -1;
      refresh();
      return;
    }
    const s = run.sigils[i];
    if (selectedSlot === i) {
      selectedSlot = -1;
      renderRunes();
      if (s) {
        modal(sigilDetail(s.id, s.level), [
          { label: 'Schließen', cls: 'ghost' },
          {
            label: `Verkaufen · +${sigilSellValue(run, i)}`,
            cls: 'danger',
            onClick: () => {
              sellSigil(run, i);
              sfx.souls();
              refresh();
            },
          },
        ]);
      }
      return;
    }
    if (!s) return;
    selectedSlot = i;
    renderRunes();
    toast(`<b>${SIGIL_BY_ID[s.id].name}</b> gewählt – tippe eine andere Raute zum Tauschen, oder nochmal für Details.`);
  }

  function renderPacts(): void {
    const el = q('pacts');
    el.innerHTML = '';
    if (!run.pacts.length) el.innerHTML = '<span class="muted">Noch keine Pakte geschlossen</span>';
    for (const p of run.pacts) {
      const c = pactChip(p);
      c.append(h('span', { class: 'chip-name', text: PACT_BY_ID[p.id].name }));
      c.addEventListener('click', () => modal(pactDetail(p.id, p.stacks), [{ label: 'Schließen' }]));
      el.append(c);
    }
  }

  function renderNext(): void {
    let nr = run.ritual + 1;
    let nc = run.circle;
    if (nr > 2) {
      nr = 0;
      nc++;
    }
    const names = ['Kleines Ritual', 'Großes Ritual', 'Dämonenritual'];
    const demon = nr === 2 ? DEMON_BY_ID[run.circleDemon] : null;
    const el = q('next');
    el.innerHTML = `
      <div class="next-info">
        <div class="lbl">Als Nächstes</div>
        <div class="next-title">${demon ? `${demon.name} · ${demon.title}` : names[nr]}${nc !== run.circle ? ` · Kreis ${roman(nc)}` : ''}</div>
        <div class="next-goal">Ziel: <b>${fmt(ritualTarget(run, nc, nr))}</b></div>
        ${demon ? `<div class="next-demon">${glyphSvg(demon.glyph)} ${demon.desc}</div>` : ''}
      </div>`;
    const go = h('button', { class: 'btn primary big', text: 'Ritual beginnen' });
    go.addEventListener('click', () => {
      nextRitual(run);
      app.saveAll();
      app.show('ritual');
    });
    el.append(go);
  }

  function renderPotions(): void {
    const el = q('potions');
    el.innerHTML = '';
    const slots = computeStats(run, false).potionSlots;
    q('pcount').textContent = `${run.potions.length}/${slots}`;
    if (!run.potions.length) el.innerHTML = '<span class="muted">Keine Tränke</span>';
    run.potions.forEach((id, i) => {
      const def = POTION_BY_ID[id];
      const chip = potionChip(id);
      chip.append(h('span', { class: 'chip-name', text: def.name }));
      attachTip(chip, () => potionDetail(id));
      chip.addEventListener('click', () =>
        modal(potionDetail(id), [
          { label: 'Zurück', cls: 'ghost' },
          {
            label: `Verkaufen · +${Math.max(1, Math.floor(def.cost / 2))}`,
            cls: 'danger',
            onClick: () => {
              sellPotion(run, i);
              sfx.souls();
              refresh();
            },
          },
          {
            label: def.when === 'ritual' ? 'Nur im Ritual' : 'Trinken',
            cls: 'primary',
            disabled: def.when === 'ritual',
            onClick: () => {
              const res = withRng(run, (rng) => usePotion(run, i, rng));
              if (!res.ok) return void toast(res.reason);
              sfx.buy();
              toast(res.msg);
              refresh();
            },
          },
        ]),
      );
      el.append(chip);
    });
  }

  cleanups.push(
    makeDraggable(q('arcana'), {
      item: '.tarot:not(.empty)',
      onDrop: (from, to) => {
        moveArcana(run, from, to);
        sfx.click();
        refresh();
      },
    }),
    makeDraggable(q('runes'), {
      item: '.rune:not(.locked)',
      onDrop: (from, to) => {
        swapSigils(run, from, to);
        selectedSlot = -1;
        sfx.click();
        refresh();
      },
    }),
  );

  q('menu').addEventListener('click', () => showMenu(app, { inRun: true }));
  refresh();
  if (!app.meta.seen.includes('tutorial-shop')) {
    app.meta.seen.push('tutorial-shop');
    app.saveAll();
    setTimeout(() => void runTutorial(SHOP_TUTORIAL), 400);
  }

  return () => {
    cleanups.forEach((c) => c());
    view.dispose();
  };
}
