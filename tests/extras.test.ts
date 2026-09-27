import { describe, expect, it } from 'vitest';
import { ALBUM, albumReady, claimAlbum } from '../src/content/album';
import { COSMETICS, COSMETIC_BY_ID } from '../src/content/cosmetics';
import { DEMON_BY_ID, demonById } from '../src/content/demons';
import { FUSIONS } from '../src/content/fusions';
import { Rng } from '../src/core/rng';
import { demonForCircle, FINAL_CIRCLE, finishRitual, newRun } from '../src/core/run';
import { DEFAULT_META_STATE, parseSave, exportSave } from '../src/core/save';
import { computeStats } from '../src/core/stats';
import { applySkin, SKIN } from '../src/render/skin';

describe('Jenseits-Doppeldämonen', () => {
  it('in der Hölle ein Dämon, im Jenseits zwei', () => {
    const rng = new Rng(5);
    for (let c = 1; c <= FINAL_CIRCLE; c++) expect(demonForCircle(c, rng)).not.toContain('+');
    for (let c = FINAL_CIRCLE + 1; c < FINAL_CIRCLE + 20; c++) {
      const id = demonForCircle(c, rng);
      const [a, b] = id.split('+');
      expect(a).not.toBe(b);
      expect(demonById(id)).toBeTruthy();
    }
  });

  it('vereint die Regeln beider Dämonen', () => {
    const ids = Object.keys(DEMON_BY_ID);
    const withTarget = ids.find((i) => DEMON_BY_ID[i].mods.targetMult)!;
    const withSpins = ids.find((i) => DEMON_BY_ID[i].mods.spinsAdd)!;
    const d = demonById(`${withTarget}+${withSpins}`)!;
    expect(d.mods.targetMult).toBe(DEMON_BY_ID[withTarget].mods.targetMult);
    expect(d.mods.spinsAdd).toBe(DEMON_BY_ID[withSpins].mods.spinsAdd);
    const run = newRun(1);
    run.demon = d.id;
    expect(computeStats(run).spins).toBe(Math.max(1, computeStats(newRun(1)).spins + (d.mods.spinsAdd ?? 0)));
  });

  it('Jenseits-Trophäe wertet eine Arkana auf', () => {
    const run = newRun(3);
    run.circle = FINAL_CIRCLE + 2;
    run.endless = true;
    run.ritual = 2;
    run.arcana = [{ uid: 70, id: 'narr', level: 1, state: {} }];
    run.ritualScore = run.target;
    const lines = finishRitual(run);
    expect(lines.some((l) => l.label.startsWith('Jenseits-Trophäe'))).toBe(true);
    expect(run.arcana[0].level).toBe(2);
  });
});

describe('Reliquienkammer', () => {
  it('Kosmetik hat eindeutige IDs und je einen kostenlosen Standard', () => {
    expect(new Set(COSMETICS.map((c) => c.id)).size).toBe(COSMETICS.length);
    for (const kind of ['ball', 'rim']) expect(COSMETICS.filter((c) => c.kind === kind && c.cost === 0)).toHaveLength(1);
  });

  it('Sammelalbum-Belohnungen sind erreichbar und nur einmal abholbar', () => {
    const meta = structuredClone(DEFAULT_META_STATE);
    for (const e of ALBUM) if (e.cosmetic) expect(COSMETIC_BY_ID[e.cosmetic]?.cost).toBe(-1);
    expect(albumReady(meta)).toBe(0);
    for (const f of FUSIONS) meta.seen.push(`fused:${f.result}`);
    const fus = ALBUM.find((e) => e.id === 'fusionen')!;
    expect(albumReady(meta)).toBe(1);
    const ash = meta.ash;
    expect(claimAlbum(meta, fus)).toBe(true);
    expect(meta.ash).toBe(ash + fus.ash);
    expect(meta.cosmetics.owned).toContain('ball:alchemie');
    expect(claimAlbum(meta, fus)).toBe(false);
  });

  it('Auswahl steuert die Optik des Kessels und übersteht den Export', () => {
    applySkin({ ball: 'ball:blut', rim: 'rim:jade' });
    expect(SKIN.rim).toBe(COSMETIC_BY_ID['rim:jade'].colors[0]);
    expect(SKIN.ball).toEqual(COSMETIC_BY_ID['ball:blut'].colors);
    applySkin(undefined);
    expect(SKIN.rim).toBe('#c9a25a');
    const meta = structuredClone(DEFAULT_META_STATE);
    meta.cosmetics = { owned: ['ball:glut'], ball: 'ball:glut', rim: 'rim:gold' };
    expect(parseSave(exportSave(meta, null))?.meta.cosmetics.ball).toBe('ball:glut');
  });
});
