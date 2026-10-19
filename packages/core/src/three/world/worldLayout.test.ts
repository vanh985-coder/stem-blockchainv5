import { describe, expect, it } from 'vitest';
import { VILLAGE_ORDER } from '../../content/levels';
import { PLAYER_RADIUS, resolveCollisions, type Obstacle, type Point2 } from '../collision';
import { densityFor, DECK_TOP, ROAD_WIDTH, WORLD_RADIUS } from '../cho/marketLayout';
import { sampleEdges } from './roadGraph';
import {
  BRIDGE_DECK_END_X,
  BRIDGE_RAMP_END_X,
  RIVER_EAST_X,
  RIVER_WEST_X,
  SIGNPOST_LATERAL,
  assembleWorld,
  gateApproachSpawn,
  signposts,
  villageSpawn,
  worldGroundHeight,
  worldRoads,
} from './worldLayout';
import { GATE_WORLD_DISTANCE, VILLAGE_FRAMES, VILLAGE_INSIDE_RADIUS, frameOf, localToWorld, placeVillage, rotateToWorld } from './worldFrames';
import { LOCAL_VILLAGES } from './villages';

const FULL = assembleWorld();
const LOW = assembleWorld(densityFor('low'));
const blocked = (obstacles: readonly Obstacle[], x: number, z: number, r = PLAYER_RADIUS): boolean => resolveCollisions({ x, z } as Point2, r, obstacles);

describe('hệ tọa độ làng và thế giới', () => {
  it('4 làng theo thứ tự Giấy (bắc), Dệt (nam), Khắc Dấu (tây +X), Bạc (đông −X); cổng cách tâm chợ 72 (từ rìa chợ 42 tới cổng dài 30)', () => {
    expect(VILLAGE_FRAMES.map((f) => f.village)).toEqual(VILLAGE_ORDER);
    const at = (v: (typeof VILLAGE_ORDER)[number]) => frameOf(v);
    expect([at('lang-giay').gateX, at('lang-giay').gateZ].map(Math.round)).toEqual([0, 72]);
    expect([at('lang-det').gateX, at('lang-det').gateZ].map(Math.round)).toEqual([0, -72]);
    expect([at('lang-khac-dau').gateX, at('lang-khac-dau').gateZ].map(Math.round)).toEqual([72, 0]);
    expect([at('lang-bac').gateX, at('lang-bac').gateZ].map(Math.round)).toEqual([-72, 0]);
    for (const f of VILLAGE_FRAMES) {
      expect(Math.hypot(f.gateX, f.gateZ)).toBeCloseTo(GATE_WORLD_DISTANCE, 9);
      expect(Math.hypot(f.dirX, f.dirZ)).toBeCloseTo(1, 9);
      const len = GATE_WORLD_DISTANCE - WORLD_RADIUS;
      expect(len).toBeGreaterThanOrEqual(25);
      expect(len).toBeLessThanOrEqual(30);
    }
  });
  it('xoay như rotation.y của three: yaw π/2 đưa +Z của làng thành +X thế giới', () => {
    const p = rotateToWorld(Math.PI / 2, 0, 1);
    expect(p.x).toBeCloseTo(1, 9);
    expect(p.z).toBeCloseTo(0, 9);
  });
  it('cổng của bố cục làng rơi đúng chỗ cổng thế giới; tâm làng nằm sâu trong làng (Làng Giấy ở (0; 89,5))', () => {
    for (const f of VILLAGE_FRAMES) {
      const local = LOCAL_VILLAGES[f.village];
      const g = localToWorld(local, f, local.gate.x, local.gate.z);
      expect(g.x).toBeCloseTo(f.gateX, 9);
      expect(g.z).toBeCloseTo(f.gateZ, 9);
      const w = placeVillage(local, f);
      expect(w.gate.x).toBeCloseTo(f.gateX, 9);
    }
    const giay = FULL.villages[0];
    expect(giay.center.x).toBeCloseTo(0, 9);
    expect(giay.center.z).toBeCloseTo(89.5, 9);
  });
  it('mọi biển gỗ quay mặt về phía chợ (mặt trước hướng về tâm chợ), ở cả 4 làng', () => {
    for (const v of FULL.villages) {
      for (const b of v.layout.boards) {
        const fx = Math.sin(b.yaw);
        const fz = Math.cos(b.yaw);
        const towardMarket = -(fx * v.frame.dirX + fz * v.frame.dirZ);
        expect(towardMarket, `${v.id} màn ${b.level}`).toBeGreaterThan(0.9);
      }
    }
  });
  it('chỗ xuất hiện ?tu=: trong làng, cạnh biển, nhìn vào làng; làng lạ thì null', () => {
    for (const v of FULL.villages) {
      const s = villageSpawn(FULL, v.id);
      expect(s).not.toBeNull();
      expect(Math.hypot(s!.x - v.center.x, s!.z - v.center.z)).toBeLessThan(VILLAGE_INSIDE_RADIUS);
      expect(Math.sin(s!.yaw)).toBeCloseTo(v.frame.dirX, 6);
      expect(Math.cos(s!.yaw)).toBeCloseTo(v.frame.dirZ, 6);
      const b = v.layout.boards[0];
      expect(Math.hypot(s!.x - b.x, s!.z - b.z)).toBeLessThan(8);
    }
    expect(villageSpawn(FULL, 'khac')).toBeNull();
    expect(villageSpawn(FULL, null)).toBeNull();
  });
  it('chỗ đứng trước cổng (?mo=): cách cổng 8,5 về phía chợ, nhìn thẳng vào cổng', () => {
    const s = gateApproachSpawn(FULL, 'det')!;
    expect(Math.hypot(s.x - 0, s.z - -72)).toBeCloseTo(8.5, 6);
    expect(s.z).toBeGreaterThan(-72);
    expect(Math.cos(s.yaw)).toBeCloseTo(-1, 6); // nhìn về −Z, vào làng Dệt
  });
});

describe('bố cục thế giới', () => {
  it('có 4 làng không đè lên nhau, không đè lên chợ, đủ bố cục: nhà, bụi tre, biển, cổng đúng model', () => {
    expect(FULL.villages).toHaveLength(4);
    for (let i = 0; i < 4; i++) {
      const v = FULL.villages[i];
      expect(Math.hypot(v.center.x, v.center.z) - v.radius, v.id).toBeGreaterThan(WORLD_RADIUS + 5);
      for (let j = i + 1; j < 4; j++) expect(Math.hypot(v.center.x - FULL.villages[j].center.x, v.center.z - FULL.villages[j].center.z)).toBeGreaterThan(v.radius * 2 + 10);
      expect(v.layout.placements.length, v.id).toBeGreaterThanOrEqual(8);
      expect(v.layout.boards.length, v.id).toBeGreaterThanOrEqual(1);
      expect(v.gate.model, v.id).toMatch(/^env\/cong-lang-/);
    }
  });
  it('ba làng chưa dựng chỉ có MỘT biển: bài học (màn 4, 7, 10); Làng Giấy có 3 biển (màn 1, 2, 3)', () => {
    expect(FULL.villages.map((v) => v.layout.boards.map((b) => b.level))).toEqual([[1, 2, 3], [4], [7], [10]]);
  });
  it('chợ không còn cổng ở rìa: không có model cổng nào trong chợ; 4 cổng ở đầu làng', () => {
    expect(FULL.market.placements.some((p) => p.model.startsWith('env/cong-lang-'))).toBe(false);
    expect(FULL.gates.map((g) => g.id)).toEqual(['giay', 'det', 'khac-dau', 'bac']);
    for (const v of FULL.villages) expect(Math.hypot(v.gate.x - v.frame.gateX, v.gate.z - v.frame.gateZ)).toBe(0);
  });
  it('đường từ chợ ra cổng: bắc, nam, tây rộng 6 từ mép sân chợ tới cổng; đường đông chia hai đoạn trên hai bờ sông (cầu ở giữa)', () => {
    const roads = worldRoads();
    expect(roads).toHaveLength(5);
    for (const r of roads) expect(r.width).toBe(ROAD_WIDTH);
    const east = roads.filter((r) => r.z0 === 0 && r.z1 === 0 && r.x0 < 0);
    expect(east).toHaveLength(2);
  });
  it('bình thường mọi chỗ trên các con đường đều đi được từ chợ tới 4 cổng (đồ thị đường: không đoạn nào xuyên vật cản)', () => {
    for (const [name, w] of [['đủ đồ', FULL], ['mức Thấp', LOW]] as const) {
      const obstacles = [...w.baseObstacles, ...w.villages.flatMap((v) => v.layout.obstacles)];
      const bad: string[] = [];
      for (const s of sampleEdges(w.graph, 0.5)) {
        const [a, b] = w.graph.edges[s.edge];
        // lúc đi qua cổng: vật cản của cổng là hai bên, chừa lối giữa; sàn cầu cao hơn 0 nhưng đi được
        if (blocked(obstacles, s.x, s.z)) bad.push(`${name}: ${w.graph.nodes[a].id} → ${w.graph.nodes[b].id} tại (${s.x.toFixed(1)}, ${s.z.toFixed(1)})`);
      }
      expect([...new Set(bad)]).toEqual([]);
    }
  });
  it('mọi nút đích (cổng, biển gỗ) nối được với vòng đường quanh cây đa', () => {
    const ids = new Set(FULL.graph.nodes.map((n) => n.id));
    for (const id of ['gate:giay', 'gate:det', 'gate:khac-dau', 'gate:bac', 'board:1', 'board:2', 'board:3', 'board:4', 'board:7', 'board:10']) expect(ids.has(id), id).toBe(true);
    // liên thông: loang từ nút đầu
    const adj = new Map<number, number[]>();
    for (const [a, b] of FULL.graph.edges) {
      (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
      (adj.get(b) ?? adj.set(b, []).get(b)!).push(a);
    }
    const seen = new Set<number>([0]);
    for (const q = [0]; q.length; ) for (const v of adj.get(q.pop()!) ?? []) if (!seen.has(v)) (seen.add(v), q.push(v));
    expect(seen.size).toBe(FULL.graph.nodes.length);
  });
  it('vật cản của làng (nhà, biển, người dẫn, hàng rào, cổng) ở trong làng hoặc sát cổng; biển gỗ chặn được', () => {
    for (const v of FULL.villages) {
      expect(v.layout.colliders.length, v.id).toBeGreaterThan(20);
      for (const b of v.layout.boards) expect(blocked(v.layout.obstacles, b.x, b.z, 0.05), `${v.id} biển ${b.level}`).toBe(true);
    }
  });
});

describe('sông và cầu', () => {
  it('độ cao mặt đi: 0 ngoài cầu, DECK_TOP trên mặt cầu, dốc liên tục ở hai đầu', () => {
    expect(worldGroundHeight(-20, 0)).toBe(0);
    expect(worldGroundHeight(-45, 0)).toBe(DECK_TOP);
    expect(worldGroundHeight(-45, 3)).toBe(0); // ngoài bề rộng cầu
    expect(worldGroundHeight(BRIDGE_DECK_END_X, 0)).toBeCloseTo(DECK_TOP, 9);
    expect(worldGroundHeight(BRIDGE_RAMP_END_X, 0)).toBeCloseTo(0, 9);
    expect(worldGroundHeight(-60, 0)).toBe(0);
    let prev = worldGroundHeight(-28, 0);
    for (let x = -28; x >= -62; x -= 0.05) {
      const h = worldGroundHeight(x, 0);
      expect(Math.abs(h - prev)).toBeLessThan(0.03);
      prev = h;
    }
  });
  it('cầu bắc qua hết dải nước: nước từ bờ chợ (−37) tới bờ kia (−52), mặt cầu ở hai bờ; người chơi không xuống nước ngoài cầu', () => {
    expect(RIVER_WEST_X).toBe(-37);
    expect(RIVER_EAST_X).toBeLessThan(RIVER_WEST_X);
    expect(worldGroundHeight(RIVER_WEST_X, 0)).toBe(DECK_TOP);
    expect(worldGroundHeight(RIVER_EAST_X, 0)).toBe(DECK_TOP);
    expect(blocked(FULL.baseObstacles, -45, 4)).toBe(true);
    expect(blocked(FULL.baseObstacles, -45, -4)).toBe(true);
    expect(blocked(FULL.baseObstacles, -45, 0)).toBe(false); // đi trên cầu
  });
});

describe('biển chỉ đường ở lối ra chợ', () => {
  it('mỗi làng một biển, nằm ngoài lòng đường, mặt trước quay về chợ, có vật cản', () => {
    const list = signposts();
    expect(list.map((s) => s.village)).toEqual(VILLAGE_ORDER);
    for (const s of list) {
      const f = frameOf(s.village);
      const along = s.x * f.dirX + s.z * f.dirZ;
      const lateral = Math.abs(s.x * f.dirZ - s.z * f.dirX);
      expect(lateral).toBeCloseTo(SIGNPOST_LATERAL, 6);
      expect(lateral - 0.95 * Math.abs(Math.cos(0))).toBeGreaterThan(ROAD_WIDTH / 2); // mép biển không chắn đường
      expect(along).toBeGreaterThan(WORLD_RADIUS - 15);
      const toMarket = -(Math.sin(s.yaw) * f.dirX + Math.cos(s.yaw) * f.dirZ);
      expect(toMarket).toBeGreaterThan(0.99);
      expect(blocked(FULL.baseObstacles, s.x, s.z, 0.05)).toBe(true);
    }
  });
  it('biển không đè lên vật nào của chợ, cả ở mức Thấp', () => {
    for (const w of [FULL, LOW]) {
      for (const s of signposts()) {
        const others = w.market.obstacles;
        for (let dx = -0.9; dx <= 0.9; dx += 0.3) {
          const c = Math.cos(s.yaw);
          const sn = Math.sin(s.yaw);
          expect(blocked(others, s.x + dx * c, s.z - dx * sn, 0.05), `${s.village}`).toBe(false);
        }
      }
    }
  });
});
