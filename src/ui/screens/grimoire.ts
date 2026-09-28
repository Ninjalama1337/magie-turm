import { sfx } from '../../audio/sfx';
import { BRANCHES, TALENTS, TALENT_TOTAL_COST, talentAvailable, type Talent } from '../../content/talents';
import { saveMeta } from '../../core/save';
import { ALBUM, albumReady, claimAlbum } from '../../content/album';
import { COSMETICS, COSMETIC_BY_ID } from '../../content/cosmetics';
import { applySkin } from '../../render/skin';
import type { App } from '../app';
import { modal } from '../components';
import { h, restartAnim } from '../dom';
import { glyphSvg } from '../icons';
import { toast } from '../popups';

export function renderGrimoire(app: App): void {
  const root = h('div', { class: 'screen grimoire' });
  app.root.append(root);
  const meta = app.meta;

  if (meta.legacyRefund) {
    const n = meta.legacyRefund;
    delete meta.legacyRefund;
    saveMeta(meta);
    setTimeout(
      () =>
        modal(
          `<div class="modal-kicker">Das Grimoire wurde neu geschrieben</div><div class="modal-title">Der Talentbaum</div>
          <p>Deine bisherigen Segnungen wurden dir als <b class="g">${n} Asche</b> erstattet. Verteile sie jetzt frei auf die drei Pfade.</p>`,
          [{ label: 'Zum Talentbaum', cls: 'primary' }],
        ),
      200,
    );
  }

  const buy = (tal: Talent, el: HTMLElement) => {
    if (!talentAvailable(meta.talents, tal)) return;
    if (meta.ash < tal.cost) {
      toast('Zu wenig Asche');
      return;
    }
    meta.ash -= tal.cost;
    meta.talents.push(tal.id);
    saveMeta(meta);
    sfx.buy();
    if (tal.capstone) sfx.achievement();
    render();
    const fresh = root.querySelector(`[data-t="${tal.id}"]`);
    if (fresh) restartAnim(fresh, 'learned');
    void el;
  };

  let view: 'talents' | 'relics' = 'talents';

  const tabsHtml = () => {
    const ready = albumReady(meta);
    return `<nav class="tabs grim-tabs"><button class="tab${view === 'talents' ? ' on' : ''}" data-view="talents">Talentbaum</button><button class="tab${view === 'relics' ? ' on' : ''}" data-view="relics">Reliquienkammer${ready ? ` <span class="badge">${ready}</span>` : ''}</button></nav>`;
  };

  const bindTabs = () => {
    root.querySelectorAll<HTMLElement>('[data-view]').forEach((b) =>
      b.addEventListener('click', () => {
        view = b.dataset.view as typeof view;
        sfx.click();
        render();
      }),
    );
    root.querySelector('[data-back]')!.addEventListener('click', () => app.show('title'));
  };

  const renderRelics = () => {
    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Zurück">←</button>
        <div class="tb-center"><div class="tb-circle">Grimoire</div><div class="tb-ritual">Reliquienkammer</div></div>
        <div class="souls-pill ash">${glyphSvg('flame')}<b>${meta.ash}</b></div>
      </header>
      ${tabsHtml()}
      <section class="panel"><div class="panel-head"><h2>Sammelalbum</h2><span class="hint">Einmalige Belohnungen für vollständige Sammlungen</span></div><div class="album" data-album></div></section>
      <section class="panel"><div class="panel-head"><h2>Seelenkugeln</h2></div><div class="relics" data-balls></div></section>
      <section class="panel"><div class="panel-head"><h2>Kesselmetall</h2></div><div class="relics" data-rims></div></section>`;
    const album = root.querySelector('[data-album]') as HTMLElement;
    for (const e of ALBUM) {
      const [cur, max] = e.progress(meta);
      const claimed = meta.album.includes(e.id);
      const done = cur >= max;
      const row = h('div', { class: `album-row${claimed ? ' claimed' : done ? ' ready' : ''}` });
      const reward = `${glyphSvg('flame')}${e.ash}${e.cosmetic ? ` + <b class="leg">${COSMETIC_BY_ID[e.cosmetic].name}</b>` : ''}`;
      row.innerHTML = `<div class="album-body"><b>${e.name}</b><span>${e.desc}</span><div class="bar"><div class="bar-fill ins" style="width:${((Math.min(cur, max) / max) * 100).toFixed(1)}%"></div></div></div>
        <div class="album-side"><small>${cur}/${max}</small><span class="album-reward">${reward}</span></div>`;
      if (done && !claimed) {
        const b = h('button', { class: 'btn primary small', text: 'Abholen' });
        b.addEventListener('click', () => {
          if (!claimAlbum(meta, e)) return;
          saveMeta(meta);
          sfx.achievement();
          toast(`<b class="s">Sammelalbum:</b> ${e.name} <span class="muted">(+${e.ash} Asche)</span>`);
          render();
        });
        row.querySelector('.album-side')!.append(b);
      } else if (claimed) row.querySelector('.album-side')!.append(h('span', { class: 'muted', text: 'Abgeholt' }));
      album.append(row);
    }
    for (const kind of ['ball', 'rim'] as const) {
      const el = root.querySelector(kind === 'ball' ? '[data-balls]' : '[data-rims]') as HTMLElement;
      for (const c of COSMETICS.filter((x) => x.kind === kind)) {
        const owned = c.cost === 0 || meta.cosmetics.owned.includes(c.id);
        const active = meta.cosmetics[kind] === c.id;
        const exclusive = c.cost < 0;
        const swatch =
          kind === 'ball'
            ? `<i class="relic-ball" style="background:radial-gradient(circle at 35% 35%, ${c.colors[0]}, ${c.colors[1]} 50%, ${c.colors[2]});box-shadow:0 0 12px rgba(${c.colors[3]},0.7)"></i>`
            : `<i class="relic-rim" style="--rim:${c.colors[0]}"></i>`;
        const card = h('button', {
          class: `relic${active ? ' active' : ''}${owned ? ' owned' : ''}`,
          disabled: !owned && (exclusive || meta.ash < c.cost),
          html: `${swatch}<b>${c.name}</b><span>${c.desc}</span><em>${active ? 'Aktiv' : owned ? 'Anlegen' : exclusive ? 'Sammelalbum' : `${glyphSvg('flame')}${c.cost}`}</em>`,
        });
        card.addEventListener('click', () => {
          if (!owned) {
            if (exclusive || meta.ash < c.cost) return;
            meta.ash -= c.cost;
            meta.cosmetics.owned.push(c.id);
            sfx.buy();
          } else sfx.click();
          meta.cosmetics[kind] = c.id;
          applySkin(meta.cosmetics);
          saveMeta(meta);
          render();
        });
        el.append(card);
      }
    }
    bindTabs();
  };

  const render = () => {
    if (view === 'relics') return renderRelics();
    const owned = meta.talents;
    const spent = TALENTS.filter((x) => owned.includes(x.id)).reduce((s, x) => s + x.cost, 0);
    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Zurück">←</button>
        <div class="tb-center"><div class="tb-circle">Grimoire</div><div class="tb-ritual">Der Talentbaum</div></div>
        <div class="souls-pill ash">${glyphSvg('flame')}<b>${meta.ash}</b></div>
      </header>
      ${tabsHtml()}
      <p class="intro">Aus der <b>Asche</b> vergangener Runs formst du dauerhafte Macht. Jeder Pfad öffnet sich Knoten für Knoten – der letzte ist ein mächtiger <b>Schlussstein</b>.</p>
      <div class="talent-summary"><span>${owned.length}/${TALENTS.length} Talente</span><div class="bar"><div class="bar-fill ins" style="width:${((spent / TALENT_TOTAL_COST) * 100).toFixed(1)}%"></div></div><span class="muted">${spent}/${TALENT_TOTAL_COST} Asche</span></div>
      <div class="talent-tree" data-tree></div>`;
    const tree = root.querySelector('[data-tree]') as HTMLElement;
    for (const br of BRANCHES) {
      const col = h('section', { class: 'branch', style: `--bc:${br.color}` });
      const done = TALENTS.filter((x) => x.branch === br.id && owned.includes(x.id)).length;
      col.innerHTML = `<div class="branch-head">${glyphSvg(br.glyph, 'glyph big')}<div><b>${br.name}</b><span>${br.desc}</span></div><em>${done}/8</em></div>`;
      const list = h('div', { class: 'branch-nodes' });
      for (const tal of TALENTS.filter((x) => x.branch === br.id).sort((a, b) => a.tier - b.tier)) {
        const has = owned.includes(tal.id);
        const avail = talentAvailable(owned, tal);
        const afford = meta.ash >= tal.cost;
        const node = h('div', {
          class: `talent${has ? ' owned' : avail ? (afford ? ' ready' : ' avail') : ' locked'}${tal.capstone ? ' capstone' : ''}`,
          'data-t': tal.id,
        });
        node.innerHTML = `
          <div class="talent-icon">${glyphSvg(has || avail ? tal.glyph : 'chain')}</div>
          <div class="talent-body"><b>${tal.name}</b><span>${tal.desc}</span></div>
          <div class="talent-cost">${has ? glyphSvg('eye') : `${glyphSvg('flame')}${tal.cost}`}</div>`;
        if (avail) node.addEventListener('click', () => buy(tal, node));
        list.append(node);
      }
      col.append(list);
      tree.append(col);
    }
    bindTabs();
  };
  render();
}
