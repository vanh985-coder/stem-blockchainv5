import { sizeInScene } from '@so-chung/core/three/modelSizes';
import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import { makeCell, type Cell } from './runnerLogic';
import { COLORS, MODEL_IDS, OBSTACLE_WIDTH, emitCell, srgbToLinear, type Emitter, type ModelKey } from './runnerShapes';

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** Gom mọi phần vẽ của một chướng ngại thành các hộp bao (đặt ở làn có tâm x = 0). */
function boxesOf(cell: Cell): { all: Box; models: Box[]; boxes: Box[]; modelKeys: ModelKey[] } {
  const models: Box[] = [];
  const boxes: Box[] = [];
  const modelKeys: ModelKey[] = [];
  const e: Emitter = {
    model(key, x, y, z, yaw, sx, sy, sz) {
      const d = sizeInScene(MODEL_IDS[key])!;
      const c = Math.abs(Math.cos(yaw));
      const s = Math.abs(Math.sin(yaw));
      const ex = (c * sx * d[0] + s * sz * d[2]) / 2;
      const ez = (s * sx * d[0] + c * sz * d[2]) / 2;
      models.push({ x0: x - ex, x1: x + ex, y0: y, y1: y + sy * d[1], z0: z - ez, z1: z + ez });
      modelKeys.push(key);
    },
    box(x, y, z, sx, sy, sz, yaw) {
      const c = Math.abs(Math.cos(yaw));
      const s = Math.abs(Math.sin(yaw));
      const ex = (c * sx + s * sz) / 2;
      const ez = (s * sx + c * sz) / 2;
      boxes.push({ x0: x - ex, x1: x + ex, y0: y - sy / 2, y1: y + sy / 2, z0: z - ez, z1: z + ez });
    },
  };
  emitCell(cell, 0, e);
  const list = [...models, ...boxes];
  const all = {
    x0: Math.min(...list.map((b) => b.x0)),
    x1: Math.max(...list.map((b) => b.x1)),
    y0: Math.min(...list.map((b) => b.y0)),
    y1: Math.max(...list.map((b) => b.y1)),
    z0: Math.min(...list.map((b) => b.z0)),
    z1: Math.max(...list.map((b) => b.z1)),
  };
  return { all, models, boxes, modelKeys };
}

const CELL_Z = 20;
const near = (a: number, b: number, tol = 0.06) => expect(Math.abs(a - b), `${a} ≠ ${b}`).toBeLessThanOrEqual(tol);

describe('hình dáng chướng ngại khớp kích thước trong runnerConfig', () => {
  it('thấp (sạp thấp): rộng bằng làn, cao 0,8, sâu bằng vùng va chạm; dùng model sap-thap', () => {
    const c = makeCell('low', CELL_Z, 0);
    const r = boxesOf(c);
    expect(r.modelKeys).toEqual(['sap']);
    near(r.all.x1 - r.all.x0, OBSTACLE_WIDTH);
    near(r.all.y1, T.low.height);
    expect(r.all.y0).toBeCloseTo(0, 6);
    near(r.all.z1 - r.all.z0, c.z1 - c.z0);
  });

  it('thấp (đống rơm, code dựng): không cao quá 0,8 và nằm trong vùng va chạm', () => {
    const c = makeCell('low', CELL_Z, 1);
    const r = boxesOf(c);
    expect(r.models).toHaveLength(0);
    expect(r.all.y1).toBeLessThanOrEqual(T.low.height + 1e-6);
    expect(r.all.x1 - r.all.x0).toBeLessThanOrEqual(OBSTACLE_WIDTH);
    expect(r.all.z0).toBeGreaterThanOrEqual(c.z0 - 1e-6);
    expect(r.all.z1).toBeLessThanOrEqual(c.z1 + 1e-6);
  });

  it('cao (sào phơi giấy bắc ngang): rèm giấy từ độ cao 1,0 tới 1,5; ở giữa làn không có gì thấp hơn 1,0 ngoài hai cột sát mép', () => {
    const c = makeCell('high', CELL_Z);
    const r = boxesOf(c);
    expect(r.models).toHaveLength(0);
    const curtain = r.boxes.find((b) => Math.abs(b.y0 - T.high.bottom) < 1e-6)!;
    expect(curtain).toBeDefined();
    near(curtain.y1, T.high.top, 1e-6);
    for (const b of r.boxes) if (b.y0 < T.high.bottom - 1e-6) expect(Math.abs((b.x0 + b.x1) / 2)).toBeGreaterThan(T.laneHalfWidth - 0.2);
    near(r.all.y1, T.high.top, 0.12);
  });

  it('chắn làn: cao 2,5 (xe bò chất rơm; phên giấy ba tầng); không rộng quá làn', () => {
    for (const variant of [0, 1]) {
      const c = makeCell('block', CELL_Z, variant);
      const r = boxesOf(c);
      near(r.all.y1, T.block.height, 0.06);
      expect(r.all.x1 - r.all.x0, `variant ${variant}`).toBeLessThanOrEqual(OBSTACLE_WIDTH + 0.02);
      expect(r.modelKeys).toEqual(variant === 0 ? ['xe-bo'] : ['phen', 'phen', 'phen']);
    }
  });

  it('xe chở hàng: nóc cao đúng 0,9, dài đúng chiều dài trong cấu hình, hẹp hơn làn', () => {
    const c = makeCell('truck', CELL_Z);
    const r = boxesOf(c);
    expect(r.modelKeys).toEqual(['xe-cho-hang']);
    expect(r.all.y1).toBeCloseTo(SPEC.roofHeight, 9);
    expect(r.all.y0).toBeCloseTo(0, 9);
    near(r.all.z1 - r.all.z0, T.truck.length, 1e-6);
    near((r.all.z0 + r.all.z1) / 2, (c.z0 + c.z1) / 2, 1e-6);
    expect(r.all.x1 - r.all.x0).toBeLessThan(OBSTACLE_WIDTH);
  });

  it('hình luôn nằm trong vùng va chạm theo chiều dọc đường (cộng chút dung sai cho cột)', () => {
    for (const [kind, variant] of [['low', 0], ['low', 1], ['high', 0], ['block', 0], ['block', 1], ['truck', 0]] as const) {
      const c = makeCell(kind, CELL_Z, variant);
      const r = boxesOf(c);
      expect(r.all.z0, `${kind}${variant}`).toBeGreaterThanOrEqual(c.z0 - 0.06);
      expect(r.all.z1, `${kind}${variant}`).toBeLessThanOrEqual(c.z1 + 0.06);
    }
  });
});

describe('màu', () => {
  it('đổi sRGB sang tuyến tính; mọi màu nằm trong [0, 1]', () => {
    expect(srgbToLinear(0, 0, 0)).toEqual([0, 0, 0]);
    expect(srgbToLinear(255, 255, 255)).toEqual([1, 1, 1]);
    expect(srgbToLinear(128, 128, 128)[0]).toBeCloseTo(0.2158, 3);
    for (const c of Object.values(COLORS)) {
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
