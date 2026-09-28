import { ARCANA, ARCANA_BY_ID } from '../../content/arcana';
import { FUSIONS, FUSION_LEVEL } from '../../content/fusions';
import { HEROES, HERO_BY_ID } from '../../content/heroes';
import { Decimal, fmt } from '../../core/num';
import { DEMONS, ENCHANTS, LUCIFER } from '../../content/demons';
import { PACTS } from '../../content/pacts';
import { SIGILS } from '../../content/sigils';
import { ACHIEVEMENTS } from '../../content/achievements';
import { OMENS } from '../../content/omens';
import { POTIONS } from '../../content/potions';
import { WHEELS } from '../../core/wheel';
import type { App } from '../app';
import { DISCOVERIES } from '../../content/unlocks';
import {
  arcanaCard,
  arcanaDetail,
  bondsHelp,
  lockedCard,
  lockHint,
  modal,
  pactCard,
  pactDetail,
  potionCard,
  potionDetail,
  refKindLabel,
  refName,
  sigilDetail,
  sigilTile,
} from '../components';
import { h } from '../dom';
import { glyphSvg } from '../icons';

type Tab = 'arcana' | 'sigils' | 'pacts' | 'potions' | 'demons' | 'wheels' | 'achievements' | 'extras' | 'history';

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
  const unlocked = new Set(app.meta.insight.unlocked);
  const count = (kind: string, ids: { id: string }[]) => `${ids.filter((x) => unlocked.has(`${kind}:${x.id}`)).length}/${ids.length}`;
  const entry = (kind: 'arcana' | 'sigil' | 'pact' | 'potion', id: string, card: () => HTMLElement, detail: () => string): HTMLElement => {
    const r = `${kind}:${id}`;
    if (!unlocked.has(r)) {
      const c = lockedCard(r);
      c.addEventListener('click', () => modal(`${detail()}<p class="lock-note">${glyphSvg('chain')} ${lockHint(r)}</p>`, [{ label: 'Schließen' }]));
      return c;
    }
    const c = card();
    c.addEventListener('click', () => modal(detail(), [{ label: 'Schließen' }]));
    return c;
  };

  const tabs: [Tab, string][] = [
    ['arcana', `Arkana (${count('arcana', ARCANA)})`],
    ['sigils', `Siegel (${count('sigil', SIGILS)})`],
    ['pacts', `Pakte (${count('pact', PACTS)})`],
    ['potions', `Tränke (${count('potion', POTIONS)})`],
    ['history', 'Chronik'],
    ['extras', 'Beschwörer & Fusionen'],
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
    grid.className = `codex-grid t-${tab === 'wheels' || tab === 'achievements' || tab === 'extras' || tab === 'history' ? 'demons' : tab === 'potions' ? 'pacts' : tab}`;
    if (tab === 'arcana') {
      for (const a of ARCANA) grid.append(entry('arcana', a.id, () => arcanaCard(a.id), () => arcanaDetail(a.id)));
    } else if (tab === 'sigils') {
      for (const s of SIGILS) grid.append(entry('sigil', s.id, () => sigilTile(s.id), () => sigilDetail(s.id)));
    } else if (tab === 'pacts') {
      for (const p of PACTS) grid.append(entry('pact', p.id, () => pactCard(p.id), () => pactDetail(p.id)));
    } else if (tab === 'potions') {
      for (const p of POTIONS) grid.append(entry('potion', p.id, () => potionCard(p.id), () => potionDetail(p.id)));
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
    } else if (tab === 'history') {
      const m = app.meta;
      const t = m.totals;
      const stats = h('div', { class: 'chronik-stats' });
      stats.innerHTML = [
        ['Runs', m.runs],
        ['Siege', m.victories],
        ['Tiefster Kreis', m.bestCircle],
        ['Beste Drehung', fmt(new Decimal(m.bestSpin))],
        ['Rituale', t.rituals],
        ['Drehungen', t.spins],
        ['Trefferquote', t.spins ? `${Math.round((t.hits / t.spins) * 100)} %` : '–'],
        ['Meiste Runden', t.maxLaps],
      ]
        .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
        .join('');
      grid.append(stats);
      grid.append(h('h3', { class: 'codex-sub', text: 'Letzte Runs' }));
      if (!m.history.length) grid.append(h('p', { class: 'muted', text: 'Noch keine Runs aufgezeichnet.' }));
      for (const r of m.history) {
        const hero = HERO_BY_ID[r.hero] ?? HEROES[0];
        const wheel = WHEELS.find((w) => w.id === r.wheel);
        const el = h('div', { class: `demon-card run-rec${r.victory ? ' done' : ''}`, style: `--rc:${hero.color}` });
        const when = new Date(r.t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
        el.innerHTML = `${glyphSvg(r.victory ? 'crown' : hero.glyph, 'glyph big')}<div>
          <b>${r.victory ? 'Sieg' : `Kreis ${r.circle}`}</b> <span class="muted">${when} · ${hero.name} · ${wheel?.name ?? r.wheel} · Stufe ${r.stake}${r.mode !== 'normal' ? ` · ${r.mode === 'daily' ? 'Täglich' : 'Wöchentlich'}` : ''}</span>
          <p>${r.cause} · ${r.rituals} Rituale · beste Drehung <b>${fmt(new Decimal(r.bestSpin))}</b></p>
          <p class="run-deck">${r.arcana.map((id) => ARCANA_BY_ID[id]?.name ?? id).join(' · ') || '<span class="muted">keine Arkana</span>'}</p></div>`;
        grid.append(el);
      }
    } else if (tab === 'extras') {
      const progress = { runs: app.meta.runs, bestCircle: app.meta.bestCircle, victories: app.meta.victories, insightXp: app.meta.insight.xp };
      grid.append(h('h3', { class: 'codex-sub', text: 'Beschwörer' }));
      for (const x of HEROES) {
        const open = x.unlocked(progress);
        const el = h('div', { class: 'demon-card' + (open ? ' done' : ' locked'), style: `--rc:${x.color}` });
        el.innerHTML = `${glyphSvg(open ? x.glyph : 'chain', 'glyph big')}<div><b>${x.name}</b> <span class="muted">${x.title}</span><p>${x.perks.join(' ')}</p>${open ? '' : `<p class="muted">${glyphSvg('chain')} ${x.unlockHint}</p>`}</div>`;
        grid.append(el);
      }
      grid.append(h('h3', { class: 'codex-sub', text: 'Arkana-Fusionen' }));
      for (const r of FUSIONS) {
        const res = ARCANA_BY_ID[r.result];
        const done = app.meta.seen.includes(`fused:${r.result}`);
        const el = h('div', { class: 'demon-card' + (done ? ' done' : '') });
        el.innerHTML = `${glyphSvg(res.glyph, 'glyph big')}<div><b class="leg">${res.name}</b> <span class="muted">${ARCANA_BY_ID[r.a].name} + ${ARCANA_BY_ID[r.b].name} (Stufe ${FUSION_LEVEL})</span><p>${res.desc(1)}</p></div>`;
        el.addEventListener('click', () => modal(arcanaDetail(r.result), [{ label: 'Schließen' }]));
        grid.append(el);
      }
      grid.append(h('h3', { class: 'codex-sub', text: 'Siegel-Elemente' }));
      const help = h('div', { class: 'demon-card', html: `${glyphSvg('eye', 'glyph big')}<div><b>Bünde &amp; Resonanz</b><p>Tippe für alle Elemente und ihre Bund-Boni.</p></div>` });
      help.addEventListener('click', () => modal(bondsHelp(), [{ label: 'Verstanden', cls: 'primary' }], { cls: 'wide' }));
      grid.append(help);
    } else if (tab === 'achievements') {
      grid.append(h('h3', { class: 'codex-sub', text: 'Entdeckungen' }));
      for (const d of DISCOVERIES) {
        const have = unlocked.has(d.item);
        const el = h('div', { class: 'demon-card' + (have ? ' done' : ' locked') });
        el.innerHTML = `${glyphSvg(have ? 'eye' : 'chain', 'glyph big')}<div><b>${have ? refName(d.item) : '???'}</b> <span class="muted">${refKindLabel(d.item)}</span><p>${d.hint}</p></div>`;
        grid.append(el);
      }
      grid.append(h('h3', { class: 'codex-sub', text: 'Erfolge' }));
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
