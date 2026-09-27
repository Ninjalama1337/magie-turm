import { sfx } from '../../audio/sfx';
import { META_UPGRADES, saveMeta } from '../../core/save';
import type { App } from '../app';
import { h } from '../dom';
import { glyphSvg } from '../icons';

export function renderGrimoire(app: App): void {
  const root = h('div', { class: 'screen grimoire' });
  app.root.append(root);

  const render = () => {
    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Zurück">←</button>
        <div class="tb-center"><div class="tb-circle">Grimoire</div><div class="tb-ritual">Dauerhafte Segnungen</div></div>
        <div class="souls-pill ash">${glyphSvg('flame')}<b>${app.meta.ash}</b></div>
      </header>
      <p class="intro">Aus der <b>Asche</b> vergangener Runs formst du dauerhafte Vorteile. Jeder Run bringt Asche – je tiefer du fällst, desto mehr.</p>
      <div class="meta-list" data-list></div>`;
    const list = root.querySelector('[data-list]') as HTMLElement;
    for (const u of META_UPGRADES) {
      const lvl = app.meta.upgrades[u.id] ?? 0;
      const max = lvl >= u.max;
      const cost = u.cost(lvl);
      const row = h('div', { class: 'meta-row' });
      row.innerHTML = `
        <div class="meta-info">
          <div class="meta-name">${u.name} <span class="muted">${lvl}/${u.max}</span></div>
          <div class="meta-desc">${u.desc(Math.max(1, max ? lvl : lvl + 1))}</div>
        </div>`;
      const btn = h('button', {
        class: 'btn price',
        html: max ? 'Gemeistert' : `${glyphSvg('flame')} ${cost}`,
        disabled: max || app.meta.ash < cost,
      });
      btn.addEventListener('click', () => {
        if (max || app.meta.ash < cost) return;
        app.meta.ash -= cost;
        app.meta.upgrades[u.id] = lvl + 1;
        saveMeta(app.meta);
        sfx.buy();
        render();
      });
      row.append(btn);
      list.append(row);
    }
    root.querySelector('[data-back]')!.addEventListener('click', () => app.show('title'));
  };
  render();
}
