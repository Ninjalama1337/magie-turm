import { ARCANA } from '../../content/arcana';
import { DEMONS, ENCHANTS, LUCIFER } from '../../content/demons';
import { PACTS } from '../../content/pacts';
import { SIGILS } from '../../content/sigils';
import { ACHIEVEMENTS } from '../../content/achievements';
import { OMENS } from '../../content/omens';
import { POTIONS } from '../../content/potions';
import { WHEELS } from '../../core/wheel';
import type { App } from '../app';
import { arcanaCard, arcanaDetail, modal, pactCard, potionCard, sigilDetail, sigilTile } from '../components';
import { h } from '../dom';
import { glyphSvg } from '../icons';

type Tab = 'arcana' | 'sigils' | 'pacts' | 'potions' | 'demons' | 'wheels' | 'achievements';

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
    ['potions', `Tränke (${POTIONS.length})`],
    ['demons', 'Dämonen & Fächer'],
    ['wheels', 'Kessel & Omen'],
    ['achievements', `Erfolge (${app.meta.achievements.length}/${ACHIEVEMENTS.length})`],
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
    grid.className = `codex-grid t-${tab === 'wheels' || tab === 'achievements' ? 'demons' : tab === 'potions' ? 'pacts' : tab}`;
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
    } else if (tab === 'potions') {
      for (const p of POTIONS) grid.append(potionCard(p.id));
    } else if (tab === 'wheels') {
      for (const w of WHEELS) {
        const el = h('div', { class: 'demon-card' + (app.meta.unlockedWheels.includes(w.id) ? '' : ' locked') });
        el.innerHTML = `${glyphSvg(w.glyph, 'glyph big')}<div><b>${w.name}</b> <span class="muted">${w.title}</span><p>${w.desc}</p><p class="muted">Bezwungen bis Stufe ${app.meta.wheelStakes[w.id] ?? 0}/5</p></div>`;
        grid.append(el);
      }
      for (const o of OMENS) {
        const el = h('div', { class: 'demon-card' });
        el.innerHTML = `${glyphSvg(o.glyph, 'glyph big')}<div><b>${o.name}</b> <span class="muted">Omen</span><p>${o.desc}</p></div>`;
        grid.append(el);
      }
    } else if (tab === 'achievements') {
      for (const a of ACHIEVEMENTS) {
        const have = app.meta.achievements.includes(a.id);
        const el = h('div', { class: 'demon-card' + (have ? ' done' : ' locked') });
        el.innerHTML = `${glyphSvg(a.glyph, 'glyph big')}<div><b>${a.name}</b> <span class="muted">+${a.ash} Asche</span><p>${a.desc}</p></div>`;
        grid.append(el);
      }
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
