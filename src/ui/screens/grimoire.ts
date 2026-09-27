import { sfx } from '../../audio/sfx';
import { BRANCHES, TALENTS, TALENT_TOTAL_COST, talentAvailable, type Talent } from '../../content/talents';
import { saveMeta } from '../../core/save';
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

  const render = () => {
    const owned = meta.talents;
    const spent = TALENTS.filter((x) => owned.includes(x.id)).reduce((s, x) => s + x.cost, 0);
    root.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" data-back aria-label="Zurück">←</button>
        <div class="tb-center"><div class="tb-circle">Grimoire</div><div class="tb-ritual">Der Talentbaum</div></div>
        <div class="souls-pill ash">${glyphSvg('flame')}<b>${meta.ash}</b></div>
      </header>
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
    root.querySelector('[data-back]')!.addEventListener('click', () => app.show('title'));
  };
  render();
}
