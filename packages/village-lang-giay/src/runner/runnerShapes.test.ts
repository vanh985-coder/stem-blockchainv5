import { sizeInScene } from '@so-chung/core/three/modelSizes';
import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import { makeCell, type Cell } from './runnerLogic';
import { CART_MODEL, CART_SCALE, CART_TOP, COLORS, MODEL_IDS, OBSTACLE_WIDTH, TRUCK_MODEL, emitCell, srgbToLinear, type Emitter, type ModelKey } from './runnerShapes';

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

interface ModelDraw {
  key: ModelKey;
  x: number;
  y: number;
  z: number;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
}

/** Gom mọi phần vẽ của một chướng ngại thành các hộp bao (đặt ở làn có tâm x = 0). */
function boxesOf(cell: Cell): { all: Box; models: Box[]; boxes: Box[]; hays: Box[]; draws: ModelDraw[] } {
  const models: Box[] = [];
  const boxes: Box[] = [];
  const hays: Box[] = [];
  const draws: ModelDraw[] = [];
  const e: Emitter = {
    model(key, x, y, z, yaw, sx, sy, sz) {
      const d = sizeInScene(MODEL_IDS[key])!;
      const c = Math.abs(Math.cos(yaw));
      const s = Math.abs(Math.sin(yaw));
      const ex = (c * sx * d[0] + s * sz * d[2]) / 2;
      const ez = (s * sx * d[0] + c * sz * d[2]) / 2;
      models.push({ x0: x - ex, x1: x + ex, y0: y, y1: y + sy * d[1], z0: z - ez, z1: z + ez });
      draws.push({ key, x, y, z, yaw, sx, sy, sz });
    },
    box(x, y, z, sx, sy, sz, yaw) {
      const c = Math.abs(Math.cos(yaw));
      const s = Math.abs(Math.sin(yaw));
      const ex = (c * sx + s * sz) / 2;
      const ez = (s * sx + c * sz) / 2;
      boxes.push({ x0: x - ex, x1: x + ex, y0: y - sy / 2, y1: y + sy / 2, z0: z - ez, z1: z + ez });
    },
    hay(x, y, z, rx, h, rz) {
      hays.push({ x0: x - rx, x1: x + rx, y0: y, y1: y + h, z0: z - rz, z1: z + rz });
    },
  };
  emitCell(cell, 0, e);
  const list = [...models, ...boxes, ...hays];
  const all = {
    x0: Math.min(...list.map((b) => b.x0)),
    x1: Math.max(...list.map((b) => b.x1)),
    y0: Math.min(...list.map((b) => b.y0)),
    y1: Math.max(...list.map((b) => b.y1)),
    z0: Math.min(...list.map((b) => b.z0)),
    z1: Math.max(...list.map((b) => b.z1)),
  };
  return { all, models, boxes, hays, draws };
}

const CELL_Z = 20;
const near = (a: number, b: number, tol = 0.06) => expect(Math.abs(a - b), `${a} ≠ ${b}`).toBeLessThanOrEqual(tol);
const ratio = (d: ModelDraw) => Math.max(d.sx, d.sy, d.sz) / Math.min(d.sx, d.sy, d.sz);

describe('hình dáng chướng ngại khớp kích thước trong runnerConfig', () => {
  it('thấp: đống rơm cao 0,8, không rộng quá làn, nằm trong vùng va chạm (cả hai kiểu); không dùng model nào', () => {
    for (const variant of [0, 1]) {
      const c = makeCell('low', CELL_Z, variant);
      const r = boxesOf(c);
      expect(r.models).toHaveLength(0);
      near(r.all.y1, T.low.height, 1e-9);
      expect(r.all.y0).toBe(0);
      expect(r.all.x1 - r.all.x0).toBeLessThanOrEqual(OBSTACLE_WIDTH);
      expect(r.all.x1 - r.all.x0).toBeGreaterThan(OBSTACLE_WIDTH * 0.9);
      expect(r.all.z0).toBeGreaterThanOrEqual(c.z0 - 1e-6);
      expect(r.all.z1).toBeLessThanOrEqual(c.z1 + 1e-6);
    }
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

  it('chắn làn kiểu xe bò: model phóng ĐỀU, dài đúng vùng va chạm, con bò thấp ở đầu, thùng xe chất rơm tới 2,5', () => {
    const c = makeCell('block', CELL_Z, 0);
    const r = boxesOf(c);
    expect(r.draws).toHaveLength(1);
    const d = r.draws[0];
    expect(d.key).toBe('xe-bo');
    expect(ratio(d)).toBeCloseTo(1, 9);
    near(r.models[0].z1 - r.models[0].z0, c.z1 - c.z0, 1e-6);
    expect(r.models[0].x1 - r.models[0].x0).toBeLessThanOrEqual(OBSTACLE_WIDTH);
    near(r.all.y1, T.block.height, 1e-6);
    // đống rơm chỉ ở nửa sau (thùng xe), không đè lên con bò
    for (const h of r.hays) expect(h.z0).toBeGreaterThanOrEqual(c.z0 + c.frontLen - 1e-6);
    expect(c.frontTop).toBeLessThan(T.block.height);
    expect(CART_TOP).toBeCloseTo(CART_MODEL.cartTop * CART_SCALE, 12);
    expect(CART_TOP).toBeLessThan(T.block.height);
  });

  it('chắn làn kiểu phên giấy: ba tầng phóng đều, cao 2,5, rộng đúng làn', () => {
    const c = makeCell('block', CELL_Z, 1);
    const r = boxesOf(c);
    expect(r.draws.map((d) => d.key)).toEqual(['phen', 'phen', 'phen']);
    for (const d of r.draws) expect(ratio(d)).toBeCloseTo(1, 9);
    near(r.all.y1, T.block.height, 0.06);
    expect(r.all.x1 - r.all.x0).toBeLessThanOrEqual(OBSTACLE_WIDTH + 0.02);
    expect(r.all.z1 - r.all.z0).toBeLessThanOrEqual(c.z1 - c.z0 + 0.06);
  });

  it('xe chở hàng: nhiều xe nối đuôi thành một khối; nóc cao đúng 0,9; dài đúng chiều dài trong cấu hình; hẹp hơn làn; tỉ lệ các trục lệch ≤ 1,3', () => {
    const c = makeCell('truck', CELL_Z);
    const r = boxesOf(c);
    expect(r.draws).toHaveLength(T.truck.units);
    expect(T.truck.units).toBeGreaterThanOrEqual(2);
    expect(T.truck.units).toBeLessThanOrEqual(4);
    expect(r.all.y1).toBeCloseTo(SPEC.roofHeight, 9);
    near(c.z1 - c.z0, T.truck.length, 1e-9);
    expect(T.truck.length).toBeGreaterThanOrEqual(4);
    expect(T.truck.length).toBeCloseTo(T.truck.units * T.truck.unitBed, 9);
    expect(T.truck.unitBed).toBeCloseTo(TRUCK_MODEL.bedLength * T.truck.scale, 9);
    for (const d of r.draws) {
      expect(d.sx).toBeCloseTo(d.sz, 12);
      expect(ratio(d), 'tỉ lệ trục').toBeLessThanOrEqual(1.3);
    }
    // các thùng xe liền nhau, phủ kín từ đầu đến cuối khối
    const beds = r.draws.map((d) => ({ z0: d.z - TRUCK_MODEL.bedFront * d.sx, z1: d.z - TRUCK_MODEL.bedFront * d.sx + TRUCK_MODEL.bedLength * d.sx }));
    near(beds[0].z0, c.z0, 1e-9);
    for (let i = 1; i < beds.length; i++) near(beds[i].z0, beds[i - 1].z1, 1e-9);
    near(beds[beds.length - 1].z1, c.z1, 1e-9);
    expect(c.halfWidth).toBe(T.truck.halfWidth);
    expect(2 * T.truck.halfWidth).toBeLessThan(OBSTACLE_WIDTH);
  });

  it('đầu xe quay về phía người chơi chạy tới (phía z nhỏ): càng xe của xe chở hàng và con bò của xe bò', () => {
    const rot = (key: ModelKey) => boxesOf(makeCell(key === 'xe-bo' ? 'block' : 'truck', CELL_Z, 0)).draws.find((d) => d.key === key)!;
    // điểm x của model sau khi xoay yaw thành độ lệch z: z' = −x·sin(yaw)
    const zOf = (x: number, yaw: number) => -x * Math.sin(yaw);
    const truck = rot('xe-cho-hang');
    expect(zOf(0.4, truck.yaw)).toBeLessThan(0); // càng xe ở phía x dương → z nhỏ
    expect(zOf(-0.4, truck.yaw)).toBeGreaterThan(0);
    const cart = rot('xe-bo');
    expect(zOf(-0.4, cart.yaw)).toBeLessThan(0); // con bò ở phía x âm → z nhỏ
    expect(zOf(0.4, cart.yaw)).toBeGreaterThan(0);
  });

  it('mọi model được phóng gần đều (lệch tối đa 1,3 giữa các trục) ở mọi chướng ngại', () => {
    for (const [kind, variant] of [['low', 0], ['low', 1], ['high', 0], ['block', 0], ['block', 1], ['truck', 0]] as const) {
      for (const d of boxesOf(makeCell(kind, CELL_Z, variant)).draws) expect(ratio(d), `${kind}${variant} ${d.key}`).toBeLessThanOrEqual(1.3);
    }
  });

  it('hình luôn nằm trong vùng va chạm theo chiều dọc đường (cộng chút dung sai cho cột và càng xe)', () => {
    for (const [kind, variant] of [['low', 0], ['low', 1], ['high', 0], ['block', 0], ['block', 1], ['truck', 0]] as const) {
      const c = makeCell(kind, CELL_Z, variant);
      const r = boxesOf(c);
      // càng xe nhô ra phía người chơi (z nhỏ) tối đa chiều dài càng xe; phần còn lại phải nằm trong vùng va chạm
      const slack = kind === 'truck' ? 0.28 * T.truck.scale + 0.01 : 0.06;
      expect(r.all.z0, `${kind}${variant}`).toBeGreaterThanOrEqual(c.z0 - slack);
      expect(r.all.z1, `${kind}${variant}`).toBeLessThanOrEqual(c.z1 + 0.06);
    }
  });
});

describe('va chạm khớp hình', () => {
  it('xe bò: đoạn con bò chỉ cao frontTop, thùng xe cao 2,5; xe chở hàng hẹp hơn làn; các loại khác rộng cả làn', () => {
    const cart = makeCell('block', CELL_Z, 0);
    expect(cart.frontLen).toBeCloseTo(T.block.frontLen, 12);
    expect(cart.frontTop).toBeCloseTo(T.block.frontTop, 12);
    expect(cart.top).toBe(T.block.height);
    expect(cart.z1 - cart.z0).toBeCloseTo(2 * T.block.halfDepth, 12);
    const phen = makeCell('block', CELL_Z, 1);
    expect(phen.frontLen).toBe(0);
    expect(phen.z1 - phen.z0).toBeCloseTo(2 * T.phenHalfDepth, 12);
    expect(makeCell('truck', CELL_Z).halfWidth).toBeLessThan(makeCell('low', CELL_Z).halfWidth);
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
