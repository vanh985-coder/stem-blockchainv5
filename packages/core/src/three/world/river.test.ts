import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../collision';
import { propCollider } from '../cho/marketLayout';
import {
  RIVER_CENTER_X,
  RIVER_EAST_X,
  RIVER_TRUNK_HALF,
  RIVER_TRUNK_WIDTH,
  RIVER_WEST_X,
  ribbonOf,
  riverBranch,
  riverEdgeDistance,
  riverRocks,
  riverWaterColliders,
  smoothPath,
} from './river';
import { VILLAGE_FRAMES, VILLAGE_RADIUS, GATE_WORLD_DISTANCE } from './worldFrames';
import { assembleWorld } from './worldLayout';

const reserved = VILLAGE_FRAMES.map((f) => ({ x: f.dirX * (GATE_WORLD_DISTANCE + VILLAGE_RADIUS), z: f.dirZ * (GATE_WORLD_DISTANCE + VILLAGE_RADIUS) }));
const water = riverWaterColliders().map((c) => c.shape);
const inWater = (x: number, z: number) => resolveCollisions({ x, z } as Point2, 0.01, water);

describe('sông của thế giới mở (bước X3)', () => {
  it('đoạn thân như cũ: bờ chợ −37, bờ kia −52, rộng 15, chạy tới z = ±40', () => {
    expect(RIVER_WEST_X).toBe(-37);
    expect(RIVER_EAST_X).toBe(-52);
    expect(RIVER_TRUNK_WIDTH).toBe(15);
    expect(RIVER_CENTER_X).toBe(-44.5);
    expect(RIVER_TRUNK_HALF).toBe(40);
  });

  it('không cắt qua làng nào: mọi mẫu đường tim của hai nhánh cách chỗ dành riêng (bán kính 125) cộng nửa bề rộng nước và 4 đơn vị bờ cỏ', () => {
    for (const side of ['ne', 'se'] as const) {
      for (const p of riverBranch(side)) {
        for (const r of reserved) expect(Math.hypot(p.x - r.x, p.z - r.z) - VILLAGE_RADIUS - p.w / 2, `${side} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBeGreaterThanOrEqual(4);
      }
    }
    // đoạn thân (|z| ≤ 40) cũng xa mọi làng
    for (let z = -RIVER_TRUNK_HALF; z <= RIVER_TRUNK_HALF; z += 2) for (const x of [RIVER_EAST_X, RIVER_WEST_X]) for (const r of reserved) expect(Math.hypot(x - r.x, z - r.z)).toBeGreaterThanOrEqual(VILLAGE_RADIUS + 15);
  });

  it('vẫn chạy phía đông chợ: đoạn thân ở x < 0 (đông là −X), hai nhánh đều ở phía x âm và đi ra rìa thế giới', () => {
    for (const side of ['ne', 'se'] as const) {
      const pts = riverBranch(side);
      for (const p of pts) expect(p.x).toBeLessThan(-30);
      const last = pts[pts.length - 1];
      expect(Math.hypot(last.x, last.z)).toBeGreaterThan(330);
    }
  });

  it('hai nhánh đối xứng qua trục x, bắt đầu đúng chỗ cuối đoạn thân và liên tục (mẫu cách nhau không quá 4,5)', () => {
    const ne = riverBranch('ne');
    const se = riverBranch('se');
    expect(ne).toHaveLength(se.length);
    ne.forEach((p, i) => {
      expect(se[i].x).toBeCloseTo(p.x, 9);
      expect(se[i].z).toBeCloseTo(-p.z, 9);
      expect(se[i].w).toBeCloseTo(p.w, 9);
    });
    expect(ne[0].x).toBeCloseTo(RIVER_CENTER_X, 9);
    expect(ne[0].z).toBeCloseTo(24, 9); // nhánh bắt đầu gối lên đoạn thân từ z = 24
    expect(ne[0].w).toBe(RIVER_TRUNK_WIDTH);
    for (let i = 1; i < ne.length; i++) expect(Math.hypot(ne[i].x - ne[i - 1].x, ne[i].z - ne[i - 1].z)).toBeLessThanOrEqual(4.5);
  });

  it('làm mượt đi qua mọi điểm điều khiển và không đổi đầu cuối', () => {
    const control = [
      { x: 0, z: 0, w: 5 },
      { x: 10, z: 10, w: 6 },
      { x: 25, z: 12, w: 7 },
    ];
    const out = smoothPath(control, 2);
    for (const c of control) expect(out.some((p) => Math.hypot(p.x - c.x, p.z - c.z) < 1e-9)).toBe(true);
    expect(out[0]).toEqual(control[0]);
    expect(out[out.length - 1]).toEqual(control[2]);
  });

  it('người chơi không xuống nước ở hai nhánh: tim sông bị chặn, bờ cỏ cách 8 thì đi được; thân sông có chừa lối cho cầu', () => {
    for (const side of ['ne', 'se'] as const) {
      const pts = riverBranch(side);
      for (let i = 2; i < pts.length - 1; i += 3) {
        const p = pts[i];
        expect(inWater(p.x, p.z), `tim ${side} ${i}`).toBe(true);
      }
    }
    expect(inWater(-45, 6)).toBe(true);
    expect(inWater(-45, -6)).toBe(true);
    expect(inWater(-45, 0)).toBe(false); // lối cầu
    // điểm bờ cách mép nước vài đơn vị không bị chặn bởi nước
    for (const [x, z] of [[-20, 60], [-30, 30], [-70, 60], [-90, 120]] as const) expect(inWater(x, z), `bờ (${x}, ${z})`).toBe(false);
  });

  it('khoảng cách tới mép nước: âm trong nước, dương trên bờ, khớp vật cản', () => {
    expect(riverEdgeDistance(RIVER_CENTER_X, 0)).toBeCloseTo(-7.5, 9);
    expect(riverEdgeDistance(-20, 0)).toBeCloseTo(17, 9);
    const p = riverBranch('ne')[12];
    expect(riverEdgeDistance(p.x, p.z)).toBeLessThan(-p.w / 2 + 0.5);
    expect(riverEdgeDistance(0, 0)).toBeGreaterThan(30);
  });

  it('dải nước: hai đỉnh mỗi mẫu, nằm ngang, uv chạy dọc dòng, chỉ số trong khoảng', () => {
    const pts = riverBranch('ne');
    const r = ribbonOf(pts, 13.3);
    expect(r.positions.length).toBe(pts.length * 6);
    expect(r.uvs.length).toBe(pts.length * 4);
    expect(r.indices.length).toBe((pts.length - 1) * 6);
    for (let i = 1; i < r.positions.length; i += 3) expect(r.positions[i]).toBe(0);
    for (const idx of r.indices) expect(idx).toBeLessThan(pts.length * 2);
    expect(r.uvs[1]).toBe(0);
    expect(r.uvs[r.uvs.length - 1]).toBeGreaterThan(10);
    // bề rộng giữa hai đỉnh của mẫu 3 bằng bề rộng nước tại đó
    const k = 3;
    const w = Math.hypot(r.positions[k * 6] - r.positions[k * 6 + 3], r.positions[k * 6 + 2] - r.positions[k * 6 + 5]);
    expect(w).toBeCloseTo(pts[k].w, 5);
  });

  it('đá hai bờ: không nằm trong nước, có vật cản, không đè cầu; cùng seed cùng kết quả', () => {
    const rocks = riverRocks(20260101);
    expect(rocks.length).toBeGreaterThan(60);
    for (const p of rocks) {
      expect(riverEdgeDistance(p.x, p.z), `đá (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBeGreaterThan(0.2);
      expect(propCollider(p)).not.toBeNull();
      expect(Math.abs(p.z) > 3.5 || Math.abs(p.x - RIVER_CENTER_X) > 9).toBe(true);
    }
    expect(riverRocks(20260101)).toEqual(rocks);
  });

  it('cả thế giới: đá bờ có trong thế giới, chợ không còn rải đá bờ riêng; vật cản sông có trong vật cản nền', () => {
    const w = assembleWorld();
    expect(w.riverRocks.length).toBeGreaterThan(60);
    expect(w.market.props.some((p) => p.kind === 'da')).toBe(false);
    expect(w.baseObstacles.length).toBeGreaterThan(water.length);
    const p = riverBranch('ne')[10];
    expect(resolveCollisions({ x: p.x, z: p.z } as Point2, PLAYER_RADIUS, w.baseObstacles)).toBe(true);
  });
});
