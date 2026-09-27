import type { Stats } from '../core/types';

export interface StakeDef {
  level: number;
  name: string;
  desc: string;
  mod: (s: Stats) => void;
}

/** Höllenstufen – jede Stufe enthält alle vorherigen. */
export const STAKES: StakeDef[] = [
  { level: 1, name: 'Sünder', desc: 'Die gewöhnliche Verdammnis.', mod: () => {} },
  { level: 2, name: 'Ketzer', desc: 'Alle Ziele <b class="bad">+30 %</b>.', mod: (s) => (s.targetMult *= 1.3) },
  {
    level: 3,
    name: 'Verräter',
    desc: 'Ritual-Belohnung <b class="bad">−1 Seele</b>, Zinsen höchstens <b class="bad">3</b>.',
    mod: (s) => {
      s.rewardAdd -= 1;
      s.interestMax = Math.min(s.interestMax, 3);
    },
  },
  { level: 4, name: 'Frevler', desc: 'Alle Basar-Preise <b class="bad">+1</b>.', mod: (s) => (s.priceAdd += 1) },
  {
    level: 5,
    name: 'Erzverdammter',
    desc: '<b class="bad">−1 Drehung</b> und alle Ziele zusätzlich <b class="bad">+25 %</b>.',
    mod: (s) => {
      s.spins -= 1;
      s.targetMult *= 1.25;
    },
  },
];

export const MAX_STAKE = STAKES.length;

export function applyStake(s: Stats, stake: number): void {
  for (const st of STAKES) if (st.level <= stake) st.mod(s);
}
