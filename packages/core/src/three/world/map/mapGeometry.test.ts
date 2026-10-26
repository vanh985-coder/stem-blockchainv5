import { describe, expect, it } from 'vitest';
import { assembleWorld } from '../worldLayout';
import { WORLD_BOUNDS } from '../worldFrames';
import { buildMapGeometry, ribbonPolygon } from './mapGeometry';

const world = assembleWorld();
const geo = buildMapGeometry(world);

describe('hình học phần tĩnh của bản đồ', () => {
  it('có chợ, đường, sông (thân và hai nhánh) và nhánh sông nhỏ của Làng Bạc, cầu, ao, nhà và 4 viền làng', () => {
    expect(geo.market.r).toBe(42);
    expect(geo.market.plaza).toBe(14);
    expect(geo.roads.length).toBeGreaterThanOrEqual(2);
    expect(geo.river).toHaveLength(4); // thân, hai nhánh, và nhánh sông nhỏ trong Làng Bạc
    expect(geo.ponds.length).toBeGreaterThanOrEqual(3);
    expect(geo.houses.length).toBeGreaterThan(100);
    expect(geo.outlines.map((o) => o.village)).toEqual(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']);
  });

  it('gộp đường theo bề rộng và loại: ít đường vẽ (dưới 15) dù có hàng chục đoạn', () => {
    expect(geo.roads.length).toBeLessThan(15);
    expect(geo.roads.reduce((n, r) => n + (r.d.match(/M/g)?.length ?? 0), 0)).toBeGreaterThan(15);
    expect(geo.roads.some((r) => r.kind === 'gach')).toBe(true);
    expect(geo.roads.some((r) => r.kind === 'dat')).toBe(true);
  });

  it('viền làng: cả bốn làng đã dựng (nét liền, tâm 197, bán kính lũy tre; Làng Bạc từ bước L5)', () => {
    const [giay, det, khacDau, bac, ...others] = geo.outlines;
    expect(others).toHaveLength(0);
    for (const o of [giay, det, khacDau, bac]) {
      expect(o.built).toBe(true);
      expect(Math.hypot(o.cx, o.cz)).toBeCloseTo(197, 6);
      expect(o.r).toBeCloseTo(122, 6);
    }
    expect(det.cz).toBeLessThan(0);
  });

  it('mọi thứ nằm trong biên thế giới', () => {
    for (const o of geo.outlines) expect(Math.hypot(o.cx, o.cz) + o.r).toBeLessThan(WORLD_BOUNDS);
    for (const p of geo.ponds) expect(Math.hypot(p.x, p.z) + p.r).toBeLessThan(WORLD_BOUNDS);
    const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
    for (const d of geo.river) for (const v of nums(d)) expect(Math.abs(v)).toBeLessThan(WORLD_BOUNDS + 40);
  });

  it('cầu bắc qua hết dải nước ở đoạn thân', () => {
    expect(geo.bridge.x0).toBeLessThan(-52);
    expect(geo.bridge.x1).toBeGreaterThan(-37);
    expect(geo.bridge.z0).toBeLessThan(0);
    expect(geo.bridge.z1).toBeGreaterThan(0);
  });

  it('dải nước thành đa giác đóng kín, hai mép đối xứng quanh đường tim', () => {
    const d = ribbonPolygon([
      { x: 0, z: 0, w: 4 },
      { x: 0, z: 10, w: 4 },
    ]);
    expect(d).toBe('M-2 0 L-2 10 L2 10 L2 0 Z');
  });

  it('cùng bố cục thì cùng hình học (tất định)', () => {
    expect(buildMapGeometry(assembleWorld())).toEqual(geo);
  });
});
