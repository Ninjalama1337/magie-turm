import { ARCANA } from '../../content/arcana';
import { DEMONS, ENCHANTS, LUCIFER } from '../../content/demons';
import { PACTS } from '../../content/pacts';
import { SIGILS } from '../../content/sigils';
import type { App } from '../app';
import { arcanaCard, arcanaDetail, modal, pactCard, sigilDetail, sigilTile } from '../components';
import { h } from '../dom';
import { glyphSvg } from '../icons';

type Tab = 'arcana' | 'sigils' | 'pacts' | 'demons';

export function renderCodex(app: App): void {
  let tab: Tab = 'arcana';
  const root = h('div', { class: 'screen codex' });
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="Zurück">←</button>
      <div class="tb-center"><div class="tb-circle">Kodex</div><div class="tb-ritual">Alles Wissen der Hölle</div></div>
      <span></span>
    </header>
    <nav class="tabs" data-tabs></nav>
    <div class="codex-grid" data-grid></div>`;
  app.root.append(root);
  const tabsEl = root.querySelector('[data-tabs]') as HTMLElement;
  const grid = root.querySelector('[data-grid]') as HTMLElement;
  const tabs: [Tab, string][] = [
    ['arcana', `Arkana (${ARCANA.length})`],
    ['sigils', `Siegel (${SIGILS.length})`],
    ['pacts', `Pakte (${PACTS.length})`],
    ['demons', 'Dämonen & Fächer'],
  ];

  const render = () => {
    tabsEl.innerHTML = '';
    for (const [id, label] of tabs) {
      const b = h('button', { class: `tab${tab === id ? ' on' : ''}`, text: label });
      b.addEventListener('click', () => {
        tab = id;
        render();
      });
      tabsEl.append(b);
    }
    grid.innerHTML = '';
    grid.className = `codex-grid t-${tab}`;
    if (tab === 'arcana') {
      for (const a of ARCANA) {
        const c = arcanaCard(a.id);
        c.addEventListener('click', () => modal(arcanaDetail(a.id), [{ label: 'Schließen' }]));
        grid.append(c);
      }
    } else if (tab === 'sigils') {
      for (const s of SIGILS) {
        const c = sigilTile(s.id);
        c.addEventListener('click', () => modal(sigilDetail(s.id), [{ label: 'Schließen' }]));
        grid.append(c);
      }
    } else if (tab === 'pacts') {
      for (const p of PACTS) grid.append(pactCard(p.id));
    } else {
      for (const d of [...DEMONS, LUCIFER]) {
        const el = h('div', { class: 'demon-card' });
        el.innerHTML = `${glyphSvg(d.glyph, 'glyph big')}<div><b>${d.name}</b> <span class="muted">${d.title}</span><p>${d.desc}</p></div>`;
        grid.append(el);
      }
      for (const e of ENCHANTS) {
        const el = h('div', { class: 'demon-card', style: `--rc:${e.color}` });
        el.innerHTML = `${glyphSvg(e.glyph, 'glyph big ench')}<div><b>${e.name}</b> <span class="muted">Verzauberung</span><p>${e.desc}</p></div>`;
        grid.append(el);
      }
    }
  };
  root.querySelector('[data-back]')!.addEventListener('click', () => app.show('title'));
  render();
}
