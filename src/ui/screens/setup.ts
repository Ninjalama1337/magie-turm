import { sfx } from '../../audio/sfx';
import { STAKES } from '../../content/stakes';
import { maxStakeFor, saveMeta } from '../../core/save';
import { WHEELS } from '../../core/wheel';
import { WheelView } from '../../render/wheel';
import type { App } from '../app';
import { modal } from '../components';
import { h, roman } from '../dom';
import { glyphSvg } from '../icons';

export function renderSetup(app: App): () => void {
  const meta = app.meta;
  let wheelIdx = Math.max(0, WHEELS.findIndex((w) => w.id === (meta.seen.find((s) => s.startsWith('lastWheel:'))?.slice(10) ?? 'euro')));
  let stake = 1;

  const root = h('div', { class: 'screen setup' });
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="Zurück">←</button>
      <div class="tb-center"><div class="tb-circle">Neuer Pakt</div><div class="tb-ritual">Wähle deinen Kessel</div></div>
      <div class="souls-pill ash">${glyphSvg('flame')}<b data-ash>${meta.ash}</b></div>
    </header>
    <section class="wheel-pick">
      <button class="icon-btn arrow" data-prev aria-label="Vorheriger">‹</button>
      <div class="wheel-preview" data-preview></div>
      <button class="icon-btn arrow" data-next aria-label="Nächster">›</button>
    </section>
    <section class="panel wheel-info" data-info></section>
    <div class="wheel-dots" data-dots></div>
    <section class="panel">
      <div class="panel-head"><h2>Höllenstufe</h2><span class="hint">Gewinne eine Stufe, um die nächste freizuschalten.</span></div>
      <div class="stakes" data-stakes></div>
      <p class="stake-desc" data-sdesc></p>
    </section>
    <div class="setup-go" data-go></div>`;
  app.root.append(root);
  const q = <T extends HTMLElement>(s: string) => root.querySelector(`[data-${s}]`) as T;

  const view = new WheelView(q('preview'));
  view.wheelSpeed = -0.25;
  view.unlocked = 3;
  view.sigils = [{ uid: 1, id: 'glut', level: 1 }, null, null, null, null, null, null, null];

  function render(): void {
    const w = WHEELS[wheelIdx];
    const unlocked = meta.unlockedWheels.includes(w.id);
    const maxStake = maxStakeFor(meta, w.id);
    stake = Math.min(stake, maxStake);
    view.wheel = w;
    view.enchants = w.id === 'blut' ? { 32: 'blood', 19: 'blood', 21: 'blood', 25: 'blood', 34: 'blood', 27: 'blood' } : {};
    view.unlocked = w.id === 'knochen' ? 8 : 3;
    q('preview').classList.toggle('locked', !unlocked);

    const best = meta.wheelStakes[w.id] ?? 0;
    q('info').innerHTML = `
      <div class="detail-head" style="--rc:var(--gold2)">${glyphSvg(w.glyph, 'glyph big')}
        <div><div class="detail-title">${w.name}</div><div class="detail-sub">${w.title}</div></div></div>
      <p class="detail-desc">${w.desc}</p>
      <p class="muted">${unlocked ? (best ? `Bezwungen bis Stufe ${roman(best)}` : 'Noch nicht bezwungen') : `Versiegelt – gewinne mit dem vorherigen Kessel oder zahle ${w.ashCost} Asche.`}</p>`;

    q('dots').innerHTML = WHEELS.map(
      (x, i) => `<i class="${i === wheelIdx ? 'on' : ''} ${meta.unlockedWheels.includes(x.id) ? '' : 'lock'}"></i>`,
    ).join('');

    const st = q('stakes');
    st.innerHTML = '';
    for (const s of STAKES) {
      const b = h('button', {
        class: `stake${s.level === stake ? ' sel' : ''}${(meta.wheelStakes[w.id] ?? 0) >= s.level ? ' won' : ''}`,
        disabled: !unlocked || s.level > maxStake,
        html: `<b>${roman(s.level)}</b><small>${s.name}</small>`,
      });
      b.addEventListener('click', () => {
        stake = s.level;
        sfx.click();
        render();
      });
      st.append(b);
    }
    q('sdesc').innerHTML = STAKES.filter((s) => s.level <= stake)
      .map((s) => `<span>${roman(s.level)}: ${s.desc}</span>`)
      .join('');

    const go = q('go');
    go.innerHTML = '';
    if (unlocked) {
      go.append(
        h('button', {
          class: 'btn primary big',
          html: `Pakt schließen<small>${w.name} · Stufe ${roman(stake)}</small>`,
          onclick: () => begin(),
        }),
      );
    } else {
      go.append(
        h('button', {
          class: 'btn big',
          disabled: meta.ash < w.ashCost,
          html: `Freischalten<small>${w.ashCost} Asche</small>`,
          onclick: () => {
            meta.ash -= w.ashCost;
            meta.unlockedWheels.push(w.id);
            saveMeta(meta);
            sfx.buy();
            q('ash').textContent = String(meta.ash);
            render();
          },
        }),
      );
    }
  }

  function begin(): void {
    const w = WHEELS[wheelIdx];
    const start = () => {
      meta.seen = meta.seen.filter((s) => !s.startsWith('lastWheel:'));
      meta.seen.push(`lastWheel:${w.id}`);
      app.startRun({ wheel: w.id, stake });
    };
    if (app.run && (app.run.phase === 'ritual' || app.run.phase === 'shop')) {
      modal('<div class="modal-title">Neuen Run beginnen?</div><p class="muted">Dein laufender Run geht verloren.</p>', [
        { label: 'Abbrechen', cls: 'ghost' },
        { label: 'Neu beginnen', cls: 'danger', onClick: start },
      ]);
    } else start();
  }

  const step = (d: number) => {
    wheelIdx = (wheelIdx + d + WHEELS.length) % WHEELS.length;
    sfx.click();
    render();
  };
  q('prev').addEventListener('click', () => step(-1));
  q('next').addEventListener('click', () => step(1));
  q('back').addEventListener('click', () => app.show('title'));
  let sx = 0;
  q('preview').addEventListener('pointerdown', (e) => (sx = e.clientX));
  q('preview').addEventListener('pointerup', (e) => {
    if (Math.abs(e.clientX - sx) > 40) step(e.clientX < sx ? 1 : -1);
  });
  render();
  return () => view.dispose();
}
