import { Box3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../collision';
import { SCATTER_KINDS, SCATTER_MAX_DISTANCE, SCATTER_SIZES, chunkInRange, chunkScatter, ringColliders, scatterCollider, scatterRadius } from './scatter';
import { SCATTER_VERTEX_COLORS, createScatterGeometry } from './scatterGeometry';

const triangles = (g: BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;
const sizeOf = (g: BufferGeometry) => {
  g.computeBoundingBox();
  const b = g.boundingBox as Box3;
  return { w: b.max.x - b.min.x, h: b.max.y, d: b.max.z - b.min.z, minY: b.min.y };
};

describe('hình học đồ rải của làng lớn', () => {
  it('mỗi loại là một hình học gộp, nhẹ (dưới 200 tam giác), chân ở y = 0, có pháp tuyến; loại màu theo đỉnh có thuộc tính màu', () => {
    for (const k of SCATTER_KINDS) {
      const g = createScatterGeometry(k);
      expect(triangles(g), k).toBeLessThan(200);
      expect(triangles(g), k).toBeGreaterThan(30);
      expect(g.getAttribute('normal'), k).toBeDefined();
      expect(!!g.getAttribute('color'), k).toBe(SCATTER_VERTEX_COLORS[k]);
      expect(g.getAttribute('uv'), k).toBeUndefined();
      expect(sizeOf(g).minY, k).toBeGreaterThanOrEqual(-0.05);
      g.dispose();
    }
  });

  it('cỡ thật khớp bảng: chiều cao và bề rộng của từng loại trong khoảng cỡ ghi ở SCATTER_SIZES', () => {
    const tre = sizeOf(createScatterGeometry('tre'));
    expect(tre.h).toBeGreaterThan(SCATTER_SIZES.tre.h - 1);
    expect(tre.h).toBeLessThan(SCATTER_SIZES.tre.h + 1);
    expect(tre.w).toBeLessThan(SCATTER_SIZES.tre.r * 2 + 3);
    const cay = sizeOf(createScatterGeometry('cay-qua'));
    expect(cay.h).toBeCloseTo(SCATTER_SIZES['cay-qua'].h, 1);
    expect(cay.w / 2).toBeLessThanOrEqual(SCATTER_SIZES['cay-qua'].r);
    const phen = sizeOf(createScatterGeometry('phen'));
    expect(phen.w).toBeLessThanOrEqual(SCATTER_SIZES.phen.box!.hx * 2 + 0.05);
    expect(phen.d).toBeLessThanOrEqual(SCATTER_SIZES.phen.box!.hz * 2 + 0.05);
    expect(phen.h).toBeLessThanOrEqual(SCATTER_SIZES.phen.h + 0.01);
    const cau = sizeOf(createScatterGeometry('cau-ao'));
    expect(cau.w).toBeCloseTo(5, 0);
    expect(cau.d).toBeCloseTo(3, 0);
    expect(cau.h).toBeLessThan(1);
    const doi = sizeOf(createScatterGeometry('doi'));
    expect(doi.w).toBeCloseTo(2, 1);
    expect(doi.h).toBeCloseTo(1, 2);
  });
});

describe('vật cản và chia mảnh của đồ rải', () => {
  const at = (kind: (typeof SCATTER_KINDS)[number], x: number, z: number, extra = {}) => ({ kind, x, z, yaw: 0, scale: 1, tint: [1, 1, 1] as const, ...extra });
  const hit = (p: Parameters<typeof scatterCollider>[0], x: number, z: number) => {
    const c = scatterCollider(p);
    return !!c && resolveCollisions({ x, z } as Point2, PLAYER_RADIUS, [c.shape]);
  };

  it('đồi chặn trong bán kính chân, cao bằng đồi; cây chặn ở thân; phên chặn bằng hộp; cầu ao đi qua được; bụi tre rải ở lũy tre không có vật cản riêng', () => {
    const hill = at('doi', 0, 0, { scale: 10, sy: 0.5 });
    expect(scatterCollider(hill)!.height).toBeCloseTo(5, 9);
    expect(hit(hill, 8, 0)).toBe(true);
    expect(hit(hill, 11, 0)).toBe(false);
    const tree = at('cay-qua', 0, 0);
    expect(hit(tree, 0.5, 0)).toBe(true);
    expect(hit(tree, 1.6, 0)).toBe(false); // dưới tán đi được
    expect(hit(at('phen', 0, 0), 1.0, 0.3)).toBe(true);
    expect(hit(at('phen', 0, 0), 1.9, 0)).toBe(false);
    expect(scatterCollider(at('cau-ao', 0, 0))).toBeNull();
    expect(scatterCollider(at('tre', 0, 0, { collide: false }))).toBeNull();
    expect(hit(at('tre', 0, 0), 0.5, 0)).toBe(true);
    expect(scatterRadius(at('doi', 0, 0, { scale: 7 }))).toBe(7);
    expect(scatterRadius(at('phen', 0, 0, { scale: 2 }))).toBeCloseTo(SCATTER_SIZES.phen.r * 2, 9);
  });

  it('lũy tre: chuỗi hộp bao kín vòng, trừ chỗ chừa quanh cổng; đi xuyên vào lũy bị chặn, đi qua chỗ cổng thì không', () => {
    const center = { x: 0, z: 0 };
    const gate = { x: 0, z: -125 };
    const walls = ringColliders(center, 122, gate, 9.5);
    expect(walls.length).toBeGreaterThan(55);
    expect(walls.length).toBeLessThan(64);
    const shapes = walls.map((w) => w.shape);
    for (let a = 0; a < 360; a += 7) {
      const rad = (a * Math.PI) / 180;
      const x = Math.cos(rad) * 122;
      const z = Math.sin(rad) * 122;
      const nearGate = Math.hypot(x - gate.x, z - gate.z) < 16;
      const blocked = resolveCollisions({ x, z } as Point2, PLAYER_RADIUS, shapes);
      if (!nearGate) expect(blocked, `góc ${a}°`).toBe(true);
    }
    expect(resolveCollisions({ x: 0, z: -122 } as Point2, PLAYER_RADIUS, shapes)).toBe(false); // chỗ cổng
  });

  it('chia mảnh theo ô lưới: mọi món vào đúng một mảnh, hình cầu bao phủ hết món, thứ tự tất định', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ x: ((i * 37) % 130) - 65, z: ((i * 53) % 130) - 65 }));
    const chunks = chunkScatter(items, 40, () => 2);
    expect(chunks.reduce((a, c) => a + c.items.length, 0)).toBe(200);
    for (const c of chunks) for (const it of c.items) expect(Math.hypot(it.x - c.x, it.z - c.z)).toBeLessThanOrEqual(c.r);
    expect(chunkScatter(items, 40, () => 2).map((c) => `${c.cx},${c.cz}`)).toEqual(chunks.map((c) => `${c.cx},${c.cz}`));
  });

  it('tầm vẽ: ngắn dần theo mức chất lượng (Thấp < Vừa < Cao), và mảnh trong tầm khi cách người chơi dưới tầm tính tới mặt mảnh', () => {
    for (const k of SCATTER_KINDS) {
      expect(SCATTER_MAX_DISTANCE.low[k]).toBeLessThanOrEqual(SCATTER_MAX_DISTANCE.medium[k]);
      expect(SCATTER_MAX_DISTANCE.medium[k]).toBeLessThanOrEqual(SCATTER_MAX_DISTANCE.high[k]);
    }
    expect(chunkInRange(100, 0, 10, 0, 0, 95)).toBe(true); // mặt mảnh cách 90
    expect(chunkInRange(100, 0, 10, 0, 0, 90)).toBe(false);
  });
});
