import type { Rarity, Tone } from '../core/types';

export const TONE_COLOR: Record<Tone, string> = {
  glut: '#ff9a3c',
  fluch: '#ff3b5c',
  xfluch: '#ff4fd8',
  souls: '#f4c95d',
  ghost: '#7ef9ff',
  info: '#e9dcc4',
  bad: '#8f8a86',
  tempo: '#a594ff',
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b08a5a',
  uncommon: '#7fb0c9',
  rare: '#d2334f',
  legendary: '#f2c14e',
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Gewöhnlich',
  uncommon: 'Ungewöhnlich',
  rare: 'Selten',
  legendary: 'Legendär',
};

export const SIGIL_COLOR: Record<string, string> = {
  glut: '#ff9a3c',
  fluch: '#ff3b5c',
  tempo: '#a594ff',
  blut: '#d2203a',
  spiegel: '#9fe3ff',
  kette: '#e9dcc4',
  irrlicht: '#7ef9ff',
  seelen: '#f4c95d',
  echo: '#ffb86b',
  pentagramm: '#ff4fd8',
  wuerfel: '#f1ead8',
  sanduhr: '#e8c170',
  zwilling: '#d7e3ff',
  altar: '#ff6a3c',
  magnet: '#7ef9ff',
  frost: '#bfefff',
  nadir: '#b48cff',
  goldader: '#f4c95d',
  umkehr: '#c9a2ff',
  horn: '#ff5a6e',
  kerze: '#ffcf7a',
  rune: '#c9a25a',
  schaedel: '#e9e2d0',
  glocke: '#d8c38a',
  kelch: '#6fd6ff',
  schwert: '#ff3b5c',
  stab: '#9d8cff',
  muenze: '#f4c95d',
  sturmauge: '#a594ff',
  blitz: '#fff27a',
};
