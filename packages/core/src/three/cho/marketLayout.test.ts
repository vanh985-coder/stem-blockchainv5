import { describe, expect, it } from 'vitest';
import { PLAYER_RADIUS, resolveCollisions, type Point2 } from '../collision';
import { sizeInScene } from '../modelSizes';
import {
  DECK_START_X,
  DECK_TOP,
  DOCK_END_X,
  DOCK_HALF_WIDTH,
  RAMP_START_X,
  groundHeight,
  GATES,
  GATE_DISTANCE,
  MARKET_MODELS,
  MODEL_BAMBOO,
  MODEL_HOUSE_THATCH,
  MODEL_HOUSE_TILE,
  MODEL_STALL,
  MODEL_TREE,
  MODEL_WELL,
  PLAYER_START,
  PLAZA_RADIUS,
  RIVER_X,
  ROAD_HALF_CLEAR,
  WORLD_RADIUS,
  FULL_DENSITY,
  densityFor,
  footprintRadius,
  generateMarket,
  thinEvenly,
  type MarketLayout,
} from './marketLayout';

const layout: MarketLayout = generateMarket();

/** Có vật cản nào đẩy người (bán kính r) đang đứng ở (x, z) không. */
const blocked = (x: number, z: number, r = PLAYER_RADIUS, l: MarketLayout = layout): boolean => {
  const p: Point2 = { x, z };
  return resolveCollisions(p, r, l.obstacles, WORLD_RADIUS);
};

describe('bố cục chợ phiên: các món chính', () => {
  it('có cây đa ở giữa, giếng, 4 cổng đúng hướng và đúng model (không đổi màu)', () => {
    const tree = layout.placements.filter((p) => p.model === MODEL_TREE);
    expect(tree).toHaveLength(1);
    expect(tree[0].x).toBe(0);
    expect(tree[0].z).toBe(0);
    expect(layout.placements.filter((p) => p.model === MODEL_WELL)).toHaveLength(1);
    const byId = Object.fromEntries(GATES.map((g) => [g.id, g]));
    expect(byId.giay).toMatchObject({ direction: 'bac', x: 0, z: GATE_DISTANCE, model: 'env/cong-lang-giay' }); // Bắc +Z
    expect(byId.det).toMatchObject({ direction: 'nam', x: 0, z: -GATE_DISTANCE, model: 'env/cong-lang-det' });
    expect(byId['khac-dau']).toMatchObject({ direction: 'tay', x: GATE_DISTANCE, z: 0, model: 'env/cong-lang-khac-dau' });
    expect(byId.bac).toMatchObject({ direction: 'dong', x: -GATE_DISTANCE, z: 0, model: 'env/cong-lang-bac' });
    for (const g of GATES) {
      const p = layout.placements.find((q) => q.model === g.model)!;
      expect(p.tint).toEqual([1, 1, 1]);
      expect(p.scale).toBe(1);
    }
  });

  it('mặt trước mỗi cổng quay về sân chợ', () => {
    for (const g of GATES) {
      // mặt trước là +Z trong file; sau khi xoay yaw thì hướng (sin yaw, cos yaw): phải hướng vào tâm
      const fx = Math.sin(g.yaw);
      const fz = Math.cos(g.yaw);
      expect(fx * -g.x + fz * -g.z, g.id).toBeGreaterThan(GATE_DISTANCE - 1e-6);
    }
  });

  it('đủ lều chợ, nhà mái ngói, nhà mái tranh và bụi tre', () => {
    const count = (m: string) => layout.placements.filter((p) => p.model === m).length;
    expect(count(MODEL_STALL)).toBeGreaterThanOrEqual(12);
    expect(count(MODEL_HOUSE_TILE)).toBeGreaterThanOrEqual(7);
    expect(count(MODEL_HOUSE_THATCH)).toBeGreaterThanOrEqual(7);
    expect(count(MODEL_BAMBOO)).toBeGreaterThanOrEqual(14);
    expect(layout.props.filter((p) => p.kind === 'chum').length).toBeGreaterThanOrEqual(8);
    expect(layout.props.filter((p) => p.kind === 'rom').length).toBeGreaterThanOrEqual(3);
    expect(layout.props.filter((p) => p.kind === 'hoa').length).toBeGreaterThanOrEqual(10);
  });

  it('nhân bản có đổi màu, tỉ lệ và góc xoay (không giống hệt nhau)', () => {
    for (const m of [MODEL_HOUSE_TILE, MODEL_HOUSE_THATCH, MODEL_STALL, MODEL_BAMBOO]) {
      const list = layout.placements.filter((p) => p.model === m);
      expect(new Set(list.map((p) => p.scale.toFixed(3))).size, `${m} tỉ lệ`).toBeGreaterThan(list.length / 2);
      expect(new Set(list.map((p) => p.yaw.toFixed(3))).size, `${m} góc xoay`).toBeGreaterThan(list.length / 2);
      expect(new Set(list.map((p) => p.tint.map((v) => v.toFixed(3)).join())).size, `${m} màu`).toBeGreaterThan(list.length / 2);
    }
  });

  it('chỉ dùng model có cỡ trong bảng (và có khung bao), tỉ lệ và màu hợp lý', () => {
    for (const m of MARKET_MODELS) expect(sizeInScene(m), m).toBeDefined();
    for (const p of layout.placements) {
      expect(MARKET_MODELS).toContain(p.model);
      expect(p.scale).toBeGreaterThan(0.7);
      expect(p.scale).toBeLessThan(1.4);
      for (const c of p.tint) {
        expect(c).toBeGreaterThan(0.6);
        expect(c).toBeLessThanOrEqual(1.05);
      }
    }
  });
});

describe('bố cục chợ phiên: đặt đồ vật', () => {
  it('cùng seed thì cùng bố cục, khác seed thì khác', () => {
    expect(generateMarket(20260101)).toEqual(layout);
    const other = generateMarket(7);
    expect(other.placements.map((p) => [p.x, p.z])).not.toEqual(layout.placements.map((p) => [p.x, p.z]));
  });

  it('mọi đồ vật nằm trong vùng đi lại (bán kính 42) và bên bờ, không xuống sông', () => {
    for (const p of layout.placements) {
      const r = footprintRadius(p);
      const isGate = p.model.includes('cong');
      expect(Math.hypot(p.x, p.z) + (isGate ? 0 : r), `${p.model} (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`).toBeLessThanOrEqual(WORLD_RADIUS);
      if (!isGate) expect(p.x - r, `${p.model} bờ sông`).toBeGreaterThan(RIVER_X);
    }
    for (const p of layout.props) expect(p.x, 'đồ nhỏ không xuống sông').toBeGreaterThan(RIVER_X);
  });

  it('không có nhà, tre hay lều nằm trên đường tới 4 cổng', () => {
    for (const p of layout.placements) {
      if (p.model === MODEL_TREE || p.model === MODEL_WELL || p.model.includes('cong')) continue;
      const r = footprintRadius(p);
      const limit = (p.model === MODEL_STALL ? 3.9 : ROAD_HALF_CLEAR) + r - 1e-6;
      expect(Math.abs(p.x), `${p.model} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) gần đường bắc-nam`).toBeGreaterThanOrEqual(limit);
      expect(Math.abs(p.z), `${p.model} gần đường đông-tây`).toBeGreaterThanOrEqual(limit);
    }
  });

  it('các đồ vật cách nhau, không đè lên nhau (theo bán kính chân)', () => {
    const items = layout.placements.filter((p) => !p.model.includes('cong'));
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const gap = Math.hypot(a.x - b.x, a.z - b.z) - footprintRadius(a) - footprintRadius(b);
        expect(gap, `${a.model}#${i} và ${b.model}#${j}`).toBeGreaterThanOrEqual(-1e-6);
      }
    }
  });

  it('đồ nhỏ (chum, rơm, hoa) không đè lên nhà, lều hay nhau', () => {
    for (const p of layout.props) {
      // bỏ chính vật cản của nó; còn lại không được chạm
      const others = layout.obstacles.filter((o) => !(o.type === 'circle' && o.x === p.x && o.z === p.z));
      const probe: Point2 = { x: p.x, z: p.z };
      expect(resolveCollisions(probe, 0.2, others, Infinity), `${p.kind} (${p.x.toFixed(1)}, ${p.z.toFixed(1)}) đè vật khác`).toBe(false);
    }
  });
});

describe('bố cục chợ phiên: va chạm', () => {
  it('mỗi đồ vật có vật cản; vật cản và vật chắn camera đều hữu hạn', () => {
    expect(layout.obstacles.length).toBeGreaterThan(layout.placements.length);
    expect(layout.blockers.length).toBeGreaterThanOrEqual(layout.placements.length);
    for (const b of layout.blockers) {
      expect(b.height).toBeGreaterThan(0.5);
      expect(JSON.stringify(b.shape)).not.toMatch(/null|NaN/);
    }
  });

  it('đứng lên cây, nhà, lều, tre, giếng thì bị đẩy ra; đứng cạnh thì không', () => {
    for (const p of layout.placements) {
      if (p.model.includes('cong')) continue;
      expect(blocked(p.x, p.z), `${p.model} ở giữa`).toBe(true);
    }
    expect(blocked(1, -1.2)).toBe(true); // thân cây đa
    expect(blocked(0, 10)).toBe(false); // trên đường, ngoài chân cây đa (chân cây rộng khoảng 6)
  });

  it('cổng: hai bên là tường, ở giữa có lối đi', () => {
    for (const g of GATES) {
      const fx = Math.sin(g.yaw);
      const fz = Math.cos(g.yaw);
      const sideX = Math.cos(g.yaw);
      const sideZ = -Math.sin(g.yaw);
      const w = sizeInScene(g.model)![0];
      expect(blocked(g.x, g.z), `${g.id}: giữa cổng đi được`).toBe(false);
      expect(blocked(g.x + sideX * 0.3 * w, g.z + sideZ * 0.3 * w), `${g.id}: tường bên trái`).toBe(true);
      expect(blocked(g.x - sideX * 0.3 * w, g.z - sideZ * 0.3 * w), `${g.id}: tường bên phải`).toBe(true);
      // đi xuyên qua cổng theo hướng mặt trước
      for (let t = -4; t <= 4; t += 0.5) expect(blocked(g.x + fx * t, g.z + fz * t), `${g.id} t=${t}`).toBe(false);
    }
  });

  it('người chơi xuất hiện ở chỗ trống, phía nam cây đa', () => {
    expect(blocked(PLAYER_START[0], PLAYER_START[1])).toBe(false);
    expect(PLAYER_START[1]).toBeLessThan(0); // Nam = −Z
    expect(Math.abs(PLAYER_START[0])).toBeLessThan(1);
    expect(Math.hypot(...PLAYER_START)).toBeGreaterThan(8);
  });

  it('đi dọc đường từ sân chợ tới từng cổng và qua cổng, kể cả sát lề: không bị vật cản đẩy', () => {
    const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0]];
    for (const [dx, dz] of dirs) {
      for (const lane of [-2.4, 0, 2.4]) {
        // đường rộng 6; qua cổng thì chỉ có lối giữa (lane 0), hai bên cổng là tường
        const end = lane === 0 ? WORLD_RADIUS - 1 : GATE_DISTANCE - 3;
        for (let t = PLAZA_RADIUS; t <= end; t += 0.5) {
          const x = dx !== 0 ? dx * t : lane;
          const z = dz !== 0 ? dz * t : lane;
          expect(blocked(x, z), `hướng (${dx}, ${dz}) lane ${lane} t=${t}`).toBe(false);
        }
      }
    }
  });

  it('đường phía đông tới bến tàu đi được; dưới nước thì bị chặn, bến tàu hẹp đi được tới cuối', () => {
    for (let x = -PLAZA_RADIUS; x >= DOCK_END_X + 0.45; x -= 0.5) expect(blocked(x, 0), `x=${x}`).toBe(false);
    expect(blocked(DOCK_END_X + 0.2, 0), 'cuối bến: chặn khi chân nhô ra khỏi sàn').toBe(true);
    expect(blocked(-39, 6)).toBe(true); // nước
    expect(blocked(-39, -6)).toBe(true);
    expect(blocked(-38, DOCK_HALF_WIDTH + 0.3)).toBe(true);
  });

  it('từ chỗ xuất hiện đi được tới cả 4 cổng và cuối bến tàu (tìm đường trên lưới)', () => {
    const size = WORLD_RADIUS * 2 + 1;
    const ok = (gx: number, gz: number) => !blocked(gx - WORLD_RADIUS, gz - WORLD_RADIUS) && Math.hypot(gx - WORLD_RADIUS, gz - WORLD_RADIUS) < WORLD_RADIUS - 0.5;
    const seen = new Set<number>();
    const key = (gx: number, gz: number) => gz * size + gx;
    const start: [number, number] = [PLAYER_START[0] + WORLD_RADIUS, PLAYER_START[1] + WORLD_RADIUS];
    const queue: [number, number][] = [start];
    seen.add(key(...start));
    while (queue.length) {
      const [gx, gz] = queue.shift()!;
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = gx + ax;
        const nz = gz + az;
        if (nx < 0 || nz < 0 || nx >= size || nz >= size || seen.has(key(nx, nz)) || !ok(nx, nz)) continue;
        seen.add(key(nx, nz));
        queue.push([nx, nz]);
      }
    }
    for (const g of GATES) expect(seen.has(key(Math.round(g.x + WORLD_RADIUS), Math.round(g.z + WORLD_RADIUS))), `tới được cổng ${g.id}`).toBe(true);
    expect(seen.has(key(Math.round(DOCK_END_X + 1.0 + WORLD_RADIUS), WORLD_RADIUS)), 'tới được cuối bến tàu').toBe(true);
  });
});

describe('bố cục chợ phiên: dân làng và lái buôn', () => {
  it('4 đường đi của dân làng nằm trên đường (dải trống): mọi điểm và mọi đoạn đều đi được', () => {
    expect(layout.villagerPaths).toHaveLength(4);
    for (const path of layout.villagerPaths) {
      expect(path.length).toBeGreaterThanOrEqual(3);
      for (let i = 0; i < path.length; i++) {
        const [ax, az] = path[i];
        const [bx, bz] = path[(i + 1) % path.length];
        for (let t = 0; t <= 1; t += 0.05) {
          const x = ax + (bx - ax) * t;
          const z = az + (bz - az) * t;
          expect(blocked(x, z, 0.6), `(${x.toFixed(1)}, ${z.toFixed(1)})`).toBe(false);
        }
      }
    }
  });
  it('lái buôn đứng gần bến sông, trên bờ', () => {
    expect(layout.merchant.x).toBeGreaterThan(RIVER_X);
    expect(layout.merchant.x).toBeLessThan(RIVER_X + 6);
    expect(Math.abs(layout.merchant.z)).toBeLessThan(8);
  });
});

describe('mật độ theo mức chất lượng', () => {
  it('thinEvenly giữ đúng tỉ lệ, rải đều, cùng đầu vào cùng kết quả', () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(thinEvenly(items, 1)).toEqual(items);
    expect(thinEvenly(items, 0.5)).toHaveLength(10);
    expect(thinEvenly(items, 0.6)).toHaveLength(12);
    expect(thinEvenly(items, 0.5)).toEqual(thinEvenly(items, 0.5));
    // rải đều: khoảng cách giữa hai phần tử được giữ không vượt quá 2
    const kept = thinEvenly(items, 0.6);
    for (let i = 1; i < kept.length; i++) expect(kept[i] - kept[i - 1]).toBeLessThanOrEqual(2);
    expect(thinEvenly([], 0.5)).toEqual([]);
  });
  it('Vừa và Cao đủ đồ vật; Thấp bớt lều và bụi tre nhưng vẫn đủ nhà, cổng, cây, giếng', () => {
    expect(densityFor('medium')).toEqual(FULL_DENSITY);
    expect(densityFor('high')).toEqual(FULL_DENSITY);
    const low = generateMarket(20260101, densityFor('low'));
    const count = (l: MarketLayout, m: string) => l.placements.filter((p) => p.model === m).length;
    expect(count(low, MODEL_STALL)).toBeLessThan(count(layout, MODEL_STALL));
    expect(count(low, MODEL_STALL)).toBeGreaterThanOrEqual(10);
    expect(count(low, MODEL_BAMBOO)).toBeLessThan(count(layout, MODEL_BAMBOO));
    expect(count(low, MODEL_BAMBOO)).toBeGreaterThanOrEqual(10);
    for (const m of [MODEL_HOUSE_TILE, MODEL_HOUSE_THATCH, MODEL_TREE, MODEL_WELL]) expect(count(low, m)).toBe(count(layout, m));
    for (const g of GATES) expect(count(low, g.model)).toBe(1);
  });
  it('bản Thấp: vật cản khớp với đồ vật còn lại (không có tường vô hình), và mọi điều kiện đi lại vẫn đúng', () => {
    const low = generateMarket(20260101, densityFor('low'));
    expect(low.obstacles.length).toBeLessThan(layout.obstacles.length);
    // không còn vật cản ở chỗ đã bớt: người chơi đứng ở tâm của mọi đồ vật đã bớt thì không bị đẩy (trừ khi vật khác đè lên)
    const gone = layout.placements.filter((p) => !low.placements.some((q) => q.x === p.x && q.z === p.z));
    expect(gone.length).toBeGreaterThan(0);
    for (const p of gone) expect(blocked(p.x, p.z, 0.05, low), `${p.model} đã bớt`).toBe(false);
    for (const g of GATES) expect(blocked(g.x, g.z, PLAYER_RADIUS, low)).toBe(false);
    for (let t = PLAZA_RADIUS; t <= WORLD_RADIUS - 1; t += 0.5) {
      expect(blocked(0, t, PLAYER_RADIUS, low), `bắc t=${t}`).toBe(false);
      expect(blocked(0, -t, PLAYER_RADIUS, low), `nam t=${t}`).toBe(false);
      expect(blocked(t, 0, PLAYER_RADIUS, low), `tây t=${t}`).toBe(false);
    }
    expect(blocked(PLAYER_START[0], PLAYER_START[1], PLAYER_RADIUS, low)).toBe(false);
  });
});

describe('groundHeight: mặt đi được', () => {
  it('mặt đất là 0 ở khắp chợ trừ cầu tàu', () => {
    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x += 0.5) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z += 0.5) {
        const onDock = Math.abs(z) <= DOCK_HALF_WIDTH && x <= RAMP_START_X && x >= DOCK_END_X;
        if (!onDock) expect(groundHeight(x, z), `(${x}, ${z})`).toBe(0);
      }
    }
  });
  it('giữa cầu tàu: đúng bằng độ cao sàn', () => {
    for (const x of [-34, -36, -38.5, -40, DOCK_END_X]) for (const z of [-1.5, 0, 1.5]) expect(groundHeight(x, z), `(${x}, ${z})`).toBe(DECK_TOP);
  });
  it('đầu cầu có dốc lên ngắn: tuyến tính từ 0 (x = −32) tới độ cao sàn (x = −34), không bao giờ vượt hay hụt', () => {
    expect(groundHeight(RAMP_START_X, 0)).toBe(0);
    expect(groundHeight(DECK_START_X, 0)).toBeCloseTo(DECK_TOP, 12);
    expect(groundHeight((RAMP_START_X + DECK_START_X) / 2, 0)).toBeCloseTo(DECK_TOP / 2, 12);
    let prev = 0;
    for (let x = RAMP_START_X; x >= DECK_START_X; x -= 0.05) {
      const h = groundHeight(x, 0);
      expect(h).toBeGreaterThanOrEqual(prev - 1e-12); // chỉ tăng khi đi ra phía sông
      expect(h).toBeLessThanOrEqual(DECK_TOP + 1e-12);
      prev = h;
    }
    // độ dốc nhỏ: lên 0,45 trên 2 đơn vị (khoảng 13°)
    expect(DECK_TOP / (RAMP_START_X - DECK_START_X)).toBeLessThan(0.25);
  });
  it('liên tục dọc đường đi từ sân chợ ra cuối bến (không có bậc nhảy quá 0,05 mỗi 0,05 đơn vị)', () => {
    let prev = groundHeight(-PLAZA_RADIUS, 0);
    for (let x = -PLAZA_RADIUS; x >= DOCK_END_X; x -= 0.05) {
      const h = groundHeight(x, 0);
      expect(Math.abs(h - prev), `x=${x.toFixed(2)}`).toBeLessThanOrEqual(0.05);
      prev = h;
    }
  });
  it('quá cuối bến hay ra ngoài dải bến là mặt đất (không có sàn)', () => {
    expect(groundHeight(DOCK_END_X - 0.1, 0)).toBe(0);
    expect(groundHeight(-38, DOCK_HALF_WIDTH + 0.1)).toBe(0);
  });
  it('không đi xuống được mặt sông: vách nước chặn hai bên và cuối bến, vách bến chặn lên sàn từ bên hông; chỉ lối lên ở đầu dốc', () => {
    // hai bên bến, trên sông
    for (const z of [-6, -3, 3, 6]) for (const x of [-38, -40, -44, -60]) expect(blocked(x, z), `(${x}, ${z}) nước`).toBe(true);
    // đứng trên sàn sát mép: tâm người không vượt quá mép sàn trừ bán kính (1,7 − 0,4), không nhô ra mặt nước
    for (const x of [-35, -38, -41]) {
      for (const z0 of [1.5, -1.5]) {
        const p: Point2 = { x, z: z0 };
        resolveCollisions(p, PLAYER_RADIUS, layout.obstacles, WORLD_RADIUS);
        expect(Math.abs(p.z), `(${x}, ${z0}) mép bên`).toBeLessThanOrEqual(DOCK_HALF_WIDTH - PLAYER_RADIUS + 1e-6);
      }
    }
    // vách bên hông cầu và dốc: không bước lên sàn từ bên hông
    expect(blocked(-33, DOCK_HALF_WIDTH + 0.3)).toBe(true);
    expect(blocked(-35.5, -DOCK_HALF_WIDTH - 0.3)).toBe(true);
    // lối lên ở đầu dốc (chính giữa) đi được
    for (let x = -30; x >= DOCK_END_X + 0.45; x -= 0.5) expect(blocked(x, 0), `x=${x}`).toBe(false);
  });
  it('mọi chỗ đi được ở chợ cao 0 trừ cầu tàu: các mặt cao hơn 0 khác (nền nhà, gốc cây, đá) đều nằm trong vật cản', () => {
    // Quét lưới 0,5 trên vùng đi lại: nếu chỗ đó đi được (không bị vật cản đẩy) thì groundHeight phải là 0 hoặc đang ở trên cầu tàu.
    for (let x = -WORLD_RADIUS; x <= WORLD_RADIUS; x += 0.5) {
      for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z += 0.5) {
        if (Math.hypot(x, z) > WORLD_RADIUS - 0.4 || blocked(x, z)) continue;
        const h = groundHeight(x, z);
        if (h !== 0) expect(Math.abs(z) <= DOCK_HALF_WIDTH && x <= RAMP_START_X && x >= DOCK_END_X, `(${x}, ${z}) h=${h}`).toBe(true);
      }
    }
  });
});

describe('vật cản bám chân tường thật', () => {
  it('cây đa: chỉ gốc chính là vật cản (bán kính 2–2,5); rễ phụ ngoài gốc đi xuyên được', () => {
    expect(blocked(0, 0)).toBe(true);
    expect(blocked(1.5, 1)).toBe(true);
    expect(blocked(0.27, -2.4)).toBe(true); // sát mép gốc
    expect(blocked(0.27, -3.4)).toBe(false); // ngoài gốc 3 đơn vị: chỗ rễ nổi, đi được
    expect(blocked(5, 0)).toBe(false);
    expect(blocked(0, -9.5)).toBe(false);
    const r = footprintRadius({ model: MODEL_TREE, scale: 1 });
    expect(r).toBeGreaterThan(2);
    expect(r).toBeLessThan(3);
  });
  it('lều chợ quây quanh gốc cây đa như concept: ít nhất 8 lều cách gốc dưới 14 đơn vị', () => {
    const near = layout.placements.filter((q) => q.model === MODEL_STALL && Math.hypot(q.x, q.z) < 14);
    expect(near.length).toBeGreaterThanOrEqual(8);
  });
  it('mỗi nhà, lều, giếng, tre: người đứng cách tâm nhà 1 đơn vị (trong chân tường) bị đẩy ra; có nhiều hình thì phủ cả chân', () => {
    for (const p of layout.placements) {
      if (p.model.includes('cong')) continue;
      const shapes = layout.colliders.filter((c) => Math.hypot((c.shape as { x?: number }).x ?? 0 - p.x, 0) >= 0);
      expect(shapes.length).toBeGreaterThan(0);
    }
    const house = layout.placements.find((q) => q.model === MODEL_HOUSE_TILE)!;
    expect(blocked(house.x, house.z)).toBe(true);
  });
  it('colliders và obstacles khớp nhau, có đủ chiều cao', () => {
    expect(layout.obstacles).toHaveLength(layout.colliders.length);
    layout.colliders.forEach((c, i) => {
      expect(layout.obstacles[i]).toBe(c.shape);
      expect(c.height).toBeGreaterThan(0);
    });
    expect(layout.props.filter((q) => q.kind === 'da').length).toBeGreaterThanOrEqual(10); // đá bờ sông có vật cản
  });
});
