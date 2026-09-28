import { Rng } from '../core/rng';
import type { GlyphId, RunState } from '../core/types';
import { ARCANA } from './arcana';
import { PACTS } from './pacts';
import { POTIONS } from './potions';

const MAX_LEVEL = 5;

export interface EventOption {
  label: string;
  desc: string;
  /** Wählbar? Sonst ausgegraut mit Begründung */
  can?: (run: RunState, ctx: EventCtx) => string | true;
  /** Führt die Wahl aus und liefert den Ergebnistext */
  apply: (run: RunState, rng: Rng, ctx: EventCtx) => string;
}

export interface EventCtx {
  arcanaSlots: number;
  potionSlots: number;
}

export interface EventDef {
  id: string;
  name: string;
  glyph: GlyphId;
  text: string;
  options: EventOption[];
}

const inPool = (run: RunState, ref: string) => !run.pool || run.pool.includes(ref);
const leave: EventOption = { label: 'Weitergehen', desc: 'Nichts geschieht.', apply: () => 'Du gehst weiter.' };
const needSouls = (n: number) => (run: RunState) => (run.souls >= n ? true : `Benötigt ${n} Seelen`);

export const EVENTS: EventDef[] = [
  {
    id: 'haendler',
    name: 'Der Wanderhändler',
    glyph: 'mask',
    text: 'Ein Händler ohne Gesicht öffnet seinen Mantel. Darin glimmt eine Karte, die nach Schwefel riecht.',
    options: [
      {
        label: 'Kaufen · 6 Seelen',
        desc: 'Eine zufällige <b class="x">seltene Arkana</b>.',
        can: (run, c) => (run.arcana.length >= c.arcanaSlots ? 'Keine freie Arkana-Stelle' : needSouls(6)(run)),
        apply: (run, rng) => {
          const pool = ARCANA.filter((a) => a.rarity === 'rare' && inPool(run, `arcana:${a.id}`) && !run.arcana.some((o) => o.id === a.id));
          if (!pool.length) return 'Der Händler zuckt mit den Schultern – er hat nichts für dich.';
          const a = rng.pick(pool);
          run.souls -= 6;
          run.arcana.push({ uid: run.uid++, id: a.id, level: 1, state: {} });
          return `Du erhältst <b>${a.name}</b>.`;
        },
      },
      leave,
    ],
  },
  {
    id: 'altar',
    name: 'Der Blutaltar',
    glyph: 'altar',
    text: 'Ein Altar, noch warm. Eine Stimme flüstert: „Gib mir Zeit, und ich gebe dir Macht.“',
    options: [
      {
        label: 'Opfern',
        desc: '<b class="bad">−1 Drehung</b> im nächsten Ritual, dafür dauerhaft <b class="f">+2 Basis-Fluch</b>.',
        apply: (run) => {
          addBoon(run, 'baseFluch', 2);
          run.nextRitual = { ...run.nextRitual, spinsAdd: (run.nextRitual?.spinsAdd ?? 0) - 1 };
          return 'Der Altar trinkt. Dein Fluch wächst.';
        },
      },
      leave,
    ],
  },
  {
    id: 'katze',
    name: 'Die schwarze Katze',
    glyph: 'eye',
    text: 'Eine schwarze Katze setzt sich vor dich und wirft eine Münze in die Luft.',
    options: [
      {
        label: 'Kopf oder Zahl',
        desc: '50 %: <b class="s">+8 Seelen</b>. 50 %: <b class="bad">−4 Seelen</b>.',
        apply: (run, rng) => {
          if (rng.chance(0.5)) {
            run.souls += 8;
            return 'Kopf! <b class="s">+8 Seelen</b>.';
          }
          run.souls = Math.max(0, run.souls - 4);
          return 'Zahl. Die Katze stiehlt <b class="bad">4 Seelen</b>.';
        },
      },
      leave,
    ],
  },
  {
    id: 'grab',
    name: 'Das vergessene Grab',
    glyph: 'grave',
    text: 'Zwischen den Fächern liegt ein eingesunkenes Grab. Die Erde ist locker.',
    options: [
      {
        label: 'Ausgraben',
        desc: 'Bis zu <b>2 zufällige Tränke</b> (je nach freien Plätzen).',
        can: (run, c) => (run.potions.length >= c.potionSlots ? 'Trank-Plätze voll' : true),
        apply: (run, rng, c) => {
          const pool = POTIONS.filter((p) => inPool(run, `potion:${p.id}`));
          const got: string[] = [];
          for (let k = 0; k < 2 && run.potions.length < c.potionSlots && pool.length; k++) {
            const p = rng.pick(pool);
            run.potions.push(p.id);
            got.push(p.name);
          }
          return `Du findest: <b>${got.join('</b>, <b>')}</b>.`;
        },
      },
      {
        label: 'Grabbeigaben verkaufen',
        desc: '<b class="s">+4 Seelen</b>.',
        apply: (run) => {
          run.souls += 4;
          return 'Die Toten brauchen kein Gold. <b class="s">+4 Seelen</b>.';
        },
      },
    ],
  },
  {
    id: 'schmied',
    name: 'Der Höllenschmied',
    glyph: 'sword',
    text: 'Ein Schmied mit glühenden Händen bietet an, eines deiner Siegel nachzuschärfen – gegen einen Preis.',
    options: [
      {
        label: 'Schmieden lassen',
        desc: 'Ein zufälliges Siegel <b>+1 Stufe</b>, aber das nächste Ziel <b class="bad">+25 %</b>.',
        can: (run) => (run.sigils.some((s) => s && s.level < MAX_LEVEL) ? true : 'Kein Siegel aufwertbar'),
        apply: (run, rng) => {
          const list = run.sigils.filter((s): s is NonNullable<typeof s> => !!s && s.level < MAX_LEVEL);
          const s = rng.pick(list);
          s.level++;
          run.nextRitual = { ...run.nextRitual, targetMult: (run.nextRitual?.targetMult ?? 1) * 1.25 };
          return `Ein Siegel glüht auf Stufe <b>${s.level}</b>.`;
        },
      },
      leave,
    ],
  },
  {
    id: 'wahrsager',
    name: 'Die Wahrsagerin',
    glyph: 'crystal',
    text: 'In ihrer Kugel siehst du die Zahlen, bevor sie fallen – beinahe.',
    options: [
      {
        label: 'Bezahlen · 4 Seelen',
        desc: 'Dauerhaft alle Wahrscheinlichkeiten <b>×1,15</b>.',
        can: needSouls(4),
        apply: (run) => {
          run.souls -= 4;
          run.boons = { ...run.boons, luck: (run.boons?.luck ?? 1) * 1.15 };
          return 'Das Glück ist dir hold.';
        },
      },
      leave,
    ],
  },
  {
    id: 'flicker',
    name: 'Der Kesselflicker',
    glyph: 'rune',
    text: 'Ein buckliger Geselle klopft auf den Kesselrand. „Da ist noch eine Raute versteckt.“',
    options: [
      {
        label: 'Freilegen lassen',
        desc: 'Eine weitere <b>Raute</b> kostenlos frei.',
        can: (run) => (run.sigilUnlocked < run.sigils.length ? true : 'Alle Rauten frei'),
        apply: (run) => {
          run.sigilUnlocked++;
          return 'Eine neue Raute leuchtet auf.';
        },
      },
      {
        label: 'Trinkgeld nehmen',
        desc: '<b class="s">+2 Seelen</b>.',
        apply: (run) => {
          run.souls += 2;
          return '<b class="s">+2 Seelen</b>.';
        },
      },
    ],
  },
  {
    id: 'quelle',
    name: 'Die Irrlicht-Quelle',
    glyph: 'wisp',
    text: 'Aus einer Spalte steigen blasse Lichter auf und umkreisen dich neugierig.',
    options: [
      {
        label: 'Trinken',
        desc: 'Dauerhaft <b class="w">+2</b> maximale Irrlichter und <b class="g">+1 Glut</b> pro Runde.',
        apply: (run) => {
          addBoon(run, 'ghostCap', 2);
          addBoon(run, 'lapGlut', 1);
          return 'Die Lichter folgen dir nun.';
        },
      },
      leave,
    ],
  },
  {
    id: 'pakt',
    name: 'Der Fremde am Scheideweg',
    glyph: 'horn',
    text: 'Ein Fremder mit Hörnern unter dem Hut bietet dir die Hand. „Nur eine Kleinigkeit …“',
    options: [
      {
        label: 'Einschlagen · 5 Seelen',
        desc: 'Ein zufälliger <b>Pakt</b>, den du noch stapeln kannst.',
        can: needSouls(5),
        apply: (run, rng) => {
          const pool = PACTS.filter((p) => inPool(run, `pact:${p.id}`) && (run.pacts.find((o) => o.id === p.id)?.stacks ?? 0) < p.max);
          if (!pool.length) return 'Der Fremde lacht und verschwindet.';
          const p = rng.pick(pool);
          run.souls -= 5;
          const own = run.pacts.find((o) => o.id === p.id);
          if (own) own.stacks++;
          else run.pacts.push({ id: p.id, stacks: 1 });
          p.onBuy?.(run);
          return `Pakt geschlossen: <b>${p.name}</b>.`;
        },
      },
      leave,
    ],
  },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

function addBoon(run: RunState, key: 'baseFluch' | 'lapGlut' | 'ghostCap', v: number): void {
  run.boons = { ...run.boons, [key]: (run.boons?.[key] ?? 0) + v };
}

export const EVENT_CHANCE = 0.4;

/** Eigener RNG je Basar, damit Ereignisse die übrige Zufallsfolge nicht verschieben */
export function eventRng(run: RunState): Rng {
  return new Rng((run.seed ^ (run.circle * 7919 + run.ritual * 104729 + 0x5bd1e995)) >>> 0);
}

export function rollEvent(run: RunState): string | undefined {
  const rng = eventRng(run);
  if (!rng.chance(EVENT_CHANCE)) return undefined;
  return rng.pick(EVENTS).id;
}
