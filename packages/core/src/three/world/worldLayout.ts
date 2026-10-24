/**
 * Bố cục thế giới mở (mốc 2, bước W1): chợ ở giữa + 4 con đường + 4 làng, một cảnh duy nhất ở `/cho`. Hàm thuần, không import three. Ghép:
 *  - chợ (`generateMarket` ở chế độ `world`: không còn cổng ở rìa chợ, có vòng đường quanh cây đa),
 *  - sông ở phía đông có cầu (đường sang Làng Bạc) và đá hai bờ,
 *  - 4 làng (bố cục viết ở hệ làng, đổi sang thế giới bằng `placeVillage`) kèm đồ gợi nghề ngoài cổng,
 *  - 4 biển chỉ đường ở lối ra chợ,
 *  - đồ thị đường cho mũi tên dưới chân.
 */
import { createMulberry32 } from '../../lib/rng';
import type { VillageId } from '../../village';
import type { CameraBlocker } from '../cameraCollision';
import { box, obox, type Obstacle } from '../collision';
import { gateDecorWorld, generateMarket, propCollider, DECK_START_X, DECK_TOP, DOCK_HALF_WIDTH, GATE_DECOR, MODEL_PAPER_RACK, PLAZA_RADIUS, PLAZA_RING_RADIUS, RAMP_START_X, ROAD_WIDTH, type GateDef, type GateId, type MarketDensity, type MarketLayout, type Placement, type PropPlacement, FULL_DENSITY } from '../cho/marketLayout';
import { assembleVillage, type VillageLayout, type VillagePaths } from '../village/villageLayout';
import { buildGraph, type GraphNode, type RoadGraph } from './roadGraph';
import { thinEvenly } from '../cho/marketLayout';
import { LOCAL_VILLAGES } from './villages';
import { GATE_WORLD_DISTANCE, VILLAGE_FRAMES, VILLAGE_RADIUS, insideRadiusOf, localToWorld, placeVillage, worldGate, type VillageFrame } from './worldFrames';
import { scrollNodeId } from '../village/scrollTargets';
import { RIVER_EAST_X, RIVER_WEST_X, riverEdgeDistance, riverRocks, riverWaterColliders } from './river';
import { scatterCollider, scatterRadius, type ScatterPlacement } from '../village/scatter';

export { RIVER_EAST_X, RIVER_WEST_X };

// ---------------------------------------------------------------------------
// Sông và cầu (đường sang Làng Bạc)

/** Mặt cầu cao `DECK_TOP`, từ `DECK_START_X` (trên bờ chợ, sau dốc lên) tới `BRIDGE_DECK_END_X` (trên bờ bên kia, trước dốc xuống); dốc xuống tới `BRIDGE_RAMP_END_X` là mặt đất. */
export const BRIDGE_DECK_END_X = -54;
export const BRIDGE_RAMP_END_X = -56;
export const BRIDGE_HALF_WIDTH = DOCK_HALF_WIDTH;

/**
 * Độ cao mặt đi được tại (x, z): mặt đất là 0; mặt cầu `DECK_TOP` từ `DECK_START_X` tới `BRIDGE_DECK_END_X`; hai đầu cầu có dốc ngắn (tuyến tính). Ngoài dải cầu (|z| > nửa bề rộng cầu) là 0.
 */
export function worldGroundHeight(x: number, z: number): number {
  if (Math.abs(z) > BRIDGE_HALF_WIDTH) return 0;
  if (x >= RAMP_START_X || x <= BRIDGE_RAMP_END_X) return 0;
  if (x >= DECK_START_X) return (DECK_TOP * (RAMP_START_X - x)) / (RAMP_START_X - DECK_START_X);
  if (x >= BRIDGE_DECK_END_X) return DECK_TOP;
  return (DECK_TOP * (x - BRIDGE_RAMP_END_X)) / (BRIDGE_DECK_END_X - BRIDGE_RAMP_END_X);
}

/**
 * Vật cản của sông: hai khối nước hai bên cầu ở đoạn thân và chuỗi hộp phủ hai nhánh (xem `river.ts`; người chơi không xuống nước), cùng vách hai bên hai đầu dốc cầu (không bước lên cầu từ bên hông).
 */
export function riverColliders(): CameraBlocker[] {
  const rail = (x0: number, x1: number, z0: number, z1: number) => ({ shape: box(Math.min(x0, x1), Math.max(x0, x1), z0, z1), height: DECK_TOP });
  return [
    ...riverWaterColliders(),
    rail(RIVER_WEST_X, RAMP_START_X, BRIDGE_HALF_WIDTH, BRIDGE_HALF_WIDTH + 0.5),
    rail(RIVER_WEST_X, RAMP_START_X, -BRIDGE_HALF_WIDTH - 0.5, -BRIDGE_HALF_WIDTH),
    rail(RIVER_EAST_X, BRIDGE_RAMP_END_X, BRIDGE_HALF_WIDTH, BRIDGE_HALF_WIDTH + 0.5),
    rail(RIVER_EAST_X, BRIDGE_RAMP_END_X, -BRIDGE_HALF_WIDTH - 0.5, -BRIDGE_HALF_WIDTH),
  ];
}


// ---------------------------------------------------------------------------
// Đường đất từ chợ ra cổng làng

export interface WorldRoad {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
}

/** Đường từ mép sân chợ tới cổng từng làng (đường sang Bạc đi qua cầu nên chỉ vẽ hai đoạn trên bờ). */
export function worldRoads(): WorldRoad[] {
  const out: WorldRoad[] = [];
  for (const f of VILLAGE_FRAMES) {
    const a = PLAZA_RADIUS - 1;
    if (f.gate === 'bac') {
      out.push({ x0: -a, z0: 0, x1: RIVER_WEST_X + 0.5, z1: 0, width: ROAD_WIDTH });
      out.push({ x0: RIVER_EAST_X - 0.5, z0: 0, x1: f.gateX, z1: f.gateZ, width: ROAD_WIDTH });
    } else out.push({ x0: f.dirX * a, z0: f.dirZ * a, x1: f.gateX, z1: f.gateZ, width: ROAD_WIDTH });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Biển chỉ đường ở lối ra chợ

export interface SignpostDef {
  gate: GateId;
  village: VillageId;
  x: number;
  z: number;
  /** Mặt trước (chữ tên làng) quay về chợ: người đi ra đọc được; mặt sau ghi "Chợ phiên" cho người đi về */
  yaw: number;
}

/** Biển ở cách tâm chợ bấy nhiêu trên trục đường (đường sang Bạc: trước cầu, trên bờ chợ) và lệch khỏi tim đường bấy nhiêu (ngoài lòng đường rộng 6). */
export const SIGNPOST_DISTANCE: Readonly<Record<GateId, number>> = { giay: 45, det: 45, 'khac-dau': 45, bac: 30 };
export const SIGNPOST_LATERAL = 4.7;
export const SIGNPOST_HALF_WIDTH = 0.95;
export const SIGNPOST_HEIGHT = 2.1;

export function signposts(): SignpostDef[] {
  return VILLAGE_FRAMES.map((f) => {
    const d = SIGNPOST_DISTANCE[f.gate];
    const lateral = SIGNPOST_LATERAL;
    // trục x của hệ làng ở thế giới: (cos yaw, −sin yaw)
    return { gate: f.gate, village: f.village, x: f.dirX * d + Math.cos(f.yaw) * lateral, z: f.dirZ * d - Math.sin(f.yaw) * lateral, yaw: f.yaw + Math.PI };
  });
}

/** Vật cản của một biển chỉ đường: tấm biển (hộp xoay mỏng) và cột chống. */
export function signpostColliders(s: SignpostDef): CameraBlocker[] {
  return [{ shape: obox(s.x, s.z, SIGNPOST_HALF_WIDTH, 0.14, s.yaw), height: SIGNPOST_HEIGHT }];
}

// ---------------------------------------------------------------------------
// Đồ gợi nghề ngoài cổng làng

const RACK_LEGS: readonly (readonly [number, number])[] = [
  [-1.0, -0.6],
  [-1.0, 0.6],
  [1.0, -0.6],
  [1.0, 0.6],
];

/**
 * Đồ gợi nghề của làng đặt hai bên đường ngay ngoài cổng (như ở rìa chợ ở các bước trước; `GATE_DECOR`), tính theo khung cổng có mặt trước quay về chợ. Trả về model (phên phơi giấy,
 * khung cửi) và đồ nhỏ do code dựng, ở tọa độ thế giới.
 */
export function gateDecor(f: VillageFrame, seed: number): { placements: Placement[]; props: PropPlacement[] } {
  const rng = createMulberry32(seed ^ 0x9e3779b1 ^ Math.round(f.yaw * 1000));
  const g = { x: f.gateX, z: f.gateZ, yaw: f.yaw + Math.PI };
  const placements: Placement[] = [];
  const props: PropPlacement[] = [];
  for (const d of GATE_DECOR[f.gate]) {
    const w = gateDecorWorld(g, d);
    const scale = d.scale ?? 1;
    if (d.model) {
      placements.push({ model: d.model, x: w.x, z: w.z, yaw: w.yaw, scale, tint: [1, 1, 1] });
      if (d.model === MODEL_PAPER_RACK) {
        for (const [lx, lz] of RACK_LEGS) {
          const c = Math.cos(w.yaw);
          const sn = Math.sin(w.yaw);
          props.push({ kind: 'chan', x: w.x + (lx * c + lz * sn) * scale, z: w.z + (-lx * sn + lz * c) * scale, yaw: 0, scale, tint: [1, 1, 1] });
        }
      }
    } else if (d.kind) {
      const shade = 1 - rng() * 0.12;
      props.push({ kind: d.kind, x: w.x, z: w.z, yaw: w.yaw, scale, tint: d.tint ?? [shade, shade, shade] });
    }
  }
  return { placements, props };
}

// ---------------------------------------------------------------------------
// Làng ngoài thế giới

export interface WorldVillage {
  id: VillageId;
  frame: VillageFrame;
  /** Cổng ngoài thế giới (mặt trước quay về chợ) */
  gate: GateDef;
  center: { x: number; z: number };
  radius: number;
  /** Bố cục đã đổi sang tọa độ thế giới, kèm vật cản và vật chắn camera (cổng cũng có vật cản ở đây) */
  layout: VillageLayout;
  /** Chỗ xuất hiện khi từ bài học về (`?tu=`): cạnh các biển gỗ, nhìn về phía biển */
  start: { x: number; z: number; yaw: number };
  /** Hình dáng nhìn từ xa: nhà và vài bụi tre (chỉ bản xa), vẽ khi vùng này chưa tải */
  silhouette: Placement[];
  /** Chỗ đứng trước từng biển gỗ (nút đồ thị đường) */
  boardStands: { level: number; x: number; z: number }[];
  /** Người chơi đã vào làng khi cách tâm làng dưới bán kính này (xem `insideRadiusOf`) */
  insideRadius: number;
  /** Đường đất nhỏ trong làng ở tọa độ thế giới (nút và đoạn nối, nút nối cổng, nút nối các biển, chỗ đứng trước người dẫn); làng chưa dựng thì một nút ở sân trước */
  nav: VillagePaths;
}

/** Làng không khai báo đường nhỏ (3 làng chưa dựng): từ cổng tới một ngã ở sân trước (hệ làng), đi dọc con đường đất vào. */
const JUNCTION_LOCAL: readonly [number, number] = [0, -12];
const FALLBACK_PATHS: VillagePaths = { nodes: [{ id: 'in', x: JUNCTION_LOCAL[0], z: JUNCTION_LOCAL[1] }], links: [], entry: 'in', boardJoin: 'in' };
/** Đứng cách biển bấy nhiêu về phía mặt trước của biển. */
const BOARD_STAND_DISTANCE = 1.2;

const SILHOUETTE_MODELS = new Set(['env/nha-mai-ngoi', 'env/nha-mai-tranh']);

function silhouetteOf(placements: readonly Placement[]): Placement[] {
  const out: Placement[] = [];
  let bamboo = 0;
  for (const p of placements) {
    if (SILHOUETTE_MODELS.has(p.model)) out.push(p);
    else if (p.model === 'env/bui-tre' && bamboo++ % 2 === 0) out.push(p);
  }
  return out;
}

/**
 * Bớt bụi tre và phên phơi giấy của làng theo mật độ của mức chất lượng (mức Thấp giữ dưới 300.000 tam giác; chợ cũng bớt lều và bụi tre): rải đều theo thứ tự, và bỏ luôn chân giá của phên bị bớt.
 * Vật cản làm sau bước này nên luôn khớp. Mật độ đủ (Vừa và Cao) thì giữ nguyên.
 */
export function thinVillage<T extends { placements: Placement[]; props: PropPlacement[] }>(v: T, density: MarketDensity): T {
  const racks = v.placements.filter((p) => p.model === MODEL_PAPER_RACK);
  const keepRacks = new Set(thinEvenly(racks, density.racks ?? 1));
  const keepBamboo = new Set(thinEvenly(v.placements.filter((p) => p.model === 'env/bui-tre'), density.bamboo));
  const removedRacks = racks.filter((r) => !keepRacks.has(r));
  const placements = v.placements.filter((p) => (p.model === MODEL_PAPER_RACK ? keepRacks.has(p) : p.model === 'env/bui-tre' ? keepBamboo.has(p) : true));
  const props = v.props.filter((q) => !(q.kind === 'chan' && removedRacks.some((r) => Math.hypot(q.x - r.x, q.z - r.z) < 1.4)));
  return { ...v, placements, props };
}

export function assembleWorldVillage(f: VillageFrame, seed: number, density: MarketDensity = FULL_DENSITY): WorldVillage {
  const local = LOCAL_VILLAGES[f.village];
  const placed = placeVillage(local, f);
  const decor = gateDecor(f, seed);
  const input = thinVillage({ ...placed, placements: [...placed.placements, ...decor.placements], props: [...placed.props, ...decor.props] }, density);
  const layout = assembleVillage(input);
  const at = (lx: number, lz: number) => localToWorld(local, f, lx, lz);
  const nav = placed.paths ?? placeVillage({ ...local, paths: FALLBACK_PATHS }, f).paths!;
  const stands = local.boards.map((b) => {
    const p = at(b.x + Math.sin(b.yaw) * BOARD_STAND_DISTANCE, b.z + Math.cos(b.yaw) * BOARD_STAND_DISTANCE);
    return { level: b.level, x: p.x, z: p.z };
  });
  return {
    id: f.village,
    frame: f,
    gate: worldGate(f),
    center: placed.center,
    radius: local.radius,
    layout,
    start: placed.start,
    silhouette: silhouetteOf(input.placements),
    boardStands: stands,
    insideRadius: insideRadiusOf(local),
    nav,
  };
}

// ---------------------------------------------------------------------------
// Đất hoang quanh ba làng chưa dựng (bước X3)

/** Tâm chỗ dành riêng (bán kính 125) của một làng: cách tâm chợ `GATE_WORLD_DISTANCE + VILLAGE_RADIUS` về phía làng. */
export function reservedCenter(f: Pick<VillageFrame, 'dirX' | 'dirZ'>): { x: number; z: number } {
  return { x: f.dirX * (GATE_WORLD_DISTANCE + VILLAGE_RADIUS), z: f.dirZ * (GATE_WORLD_DISTANCE + VILLAGE_RADIUS) };
}

/**
 * Hai làng chưa dựng (Khắc Dấu, Bạc; Làng Dệt đã dựng đủ từ mốc 3, bước L1) giữ phần tạm như bước W1 ở sát cổng (cổng, vài nhà, biển "Học cùng…"); phần còn lại của chỗ dành riêng bán kính 125 là ruộng lúa (mặt đất phủ rộng), đồi và tre:
 * mỗi làng 5 đồi nhỏ và 40 bụi tre rải ở phía xa cổng (cách hướng ra cổng từ 60° trở lên, tránh sông), dựng bằng đồ rải nhẹ (xem `scatter.ts`). Cùng `seed` cùng kết quả. Làng Giấy không có phần này
 * (đã dựng đủ, có đồi tre riêng).
 */
export function wildlands(seed: number): ScatterPlacement[] {
  const out: ScatterPlacement[] = [];
  for (const f of VILLAGE_FRAMES) {
    if (f.village === 'lang-giay' || f.village === 'lang-det') continue; // đã dựng đủ (có đồi tre riêng)
    const rng = createMulberry32(seed ^ 0x3c6ef372 ^ Math.round(f.yaw * 1000));
    const c = reservedCenter(f);
    const toGate = Math.atan2(-f.dirZ, -f.dirX);
    const angle = () => toGate + ((60 + rng() * 240) * Math.PI) / 180;
    const free = (x: number, z: number, r: number) => riverEdgeDistance(x, z) > r + 6 && out.every((o) => Math.hypot(o.x - x, o.z - z) > scatterRadius(o) * (o.kind === 'tre' ? 0.7 : 1) + r + 0.5);
    for (let k = 0; k < 5; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = toGate + ((70 + (k + rng() * 0.6) * 44) * Math.PI) / 180;
        const R = 8 + rng() * 5;
        const d = 62 + rng() * (104 - R - 62);
        const x = c.x + Math.cos(a) * d;
        const z = c.z + Math.sin(a) * d;
        if (!free(x, z, R)) continue;
        const g = 0.12 + rng() * 0.06;
        out.push({ kind: 'doi', x, z, yaw: rng() * 3, scale: R, sy: 0.42 + rng() * 0.16, tint: [g, 0.38 + rng() * 0.06, 0.08 + rng() * 0.04] });
        break;
      }
    }
    for (let k = 0; k < 40; k++) {
      for (let tries = 0; tries < 30; tries++) {
        const a = angle();
        const d = 50 + rng() * 64;
        const x = c.x + Math.cos(a) * d;
        const z = c.z + Math.sin(a) * d;
        const s = 0.85 + rng() * 0.5;
        if (!free(x, z, 1.4 * s)) continue;
        out.push({ kind: 'tre', x, z, yaw: rng() * 6.28, scale: s, tint: [0.94 + rng() * 0.06, 1, 0.94 + rng() * 0.06] });
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Đồ thị đường

/** Chỗ cổng thế giới: nút `gate:<id cổng>`. Nút biển gỗ: `board:<số màn>`. */
export const gateNodeId = (id: GateId): string => `gate:${id}`;
export const boardNodeId = (level: number): string => `board:${level}`;
/** Nút trên đường nhỏ trong làng: `in:<id làng>:<id nút>`; chỗ đứng trước người dẫn: `guide:<id làng>`. */
export const villageNodeId = (village: VillageId, id: string): string => `in:${village}:${id}`;
export const guideNodeId = (village: VillageId): string => `guide:${village}`;

const RING_NODES = 8;
const ringId = (k: number) => `ring:${k}`;
/** Nút trên vòng ở hướng của một cổng: vòng đặt nút ở các góc bội của 45° (0 là +X: phía tây, 2 là +Z: phía bắc, 4 là −X: phía đông, 6 là −Z: phía nam). */
function ringIndexFor(f: VillageFrame): number {
  return Math.round((Math.atan2(f.dirZ, f.dirX) / (Math.PI / 4) + RING_NODES) % RING_NODES);
}

export function buildWorldGraph(villages: readonly WorldVillage[]): RoadGraph {
  const nodes: GraphNode[] = [];
  const links: [string, string][] = [];
  const R = PLAZA_RING_RADIUS;
  for (let k = 0; k < RING_NODES; k++) {
    const a = (k / RING_NODES) * Math.PI * 2;
    nodes.push({ id: ringId(k), x: Math.cos(a) * R, z: Math.sin(a) * R });
    links.push([ringId(k), ringId((k + 1) % RING_NODES)]);
  }
  for (const v of villages) {
    const f = v.frame;
    const exit = SIGNPOST_DISTANCE[f.gate] - 1; // lối ra chợ, ngay trước biển chỉ đường
    const exitId = `exit:${f.gate}`;
    nodes.push({ id: exitId, x: f.dirX * exit, z: f.dirZ * exit });
    links.push([ringId(ringIndexFor(f)), exitId]);
    const gateId = gateNodeId(f.gate);
    nodes.push({ id: gateId, x: f.gateX, z: f.gateZ });
    if (f.gate === 'bac') {
      // qua cầu: đầu cầu bên chợ và bên kia
      nodes.push({ id: 'bridge:west', x: RAMP_START_X - 1, z: 0 }, { id: 'bridge:east', x: BRIDGE_RAMP_END_X - 0.5, z: 0 });
      links.push([exitId, 'bridge:west'], ['bridge:west', 'bridge:east'], ['bridge:east', gateId]);
    } else links.push([exitId, gateId]);
    // đường đất nhỏ trong làng: cổng → nút vào → các nút khác; chỗ đứng trước từng biển; chỗ đứng trước người dẫn
    for (const n of v.nav.nodes) nodes.push({ id: villageNodeId(f.village, n.id), x: n.x, z: n.z });
    for (const [a, b] of v.nav.links) links.push([villageNodeId(f.village, a), villageNodeId(f.village, b)]);
    links.push([gateId, villageNodeId(f.village, v.nav.entry)]);
    const join = villageNodeId(f.village, v.nav.boardJoin);
    for (const s of v.boardStands) {
      nodes.push({ id: boardNodeId(s.level), x: s.x, z: s.z });
      links.push([join, boardNodeId(s.level)]);
    }
    if (v.nav.guideStand) {
      nodes.push({ id: guideNodeId(f.village), x: v.nav.guideStand.x, z: v.nav.guideStand.z });
      links.push([villageNodeId(f.village, v.nav.guideStand.join), guideNodeId(f.village)]);
    }
    // chỗ đứng cạnh từng thẻ "Em có biết?" (bước X3)
    (v.nav.scrollStands ?? []).forEach((s, i) => {
      const index = v.layout.scrolls?.[i]?.index ?? i;
      nodes.push({ id: scrollNodeId(f.village, index), x: s.x, z: s.z });
      links.push([villageNodeId(f.village, s.join), scrollNodeId(f.village, index)]);
    });
  }
  return buildGraph(nodes, links);
}

// ---------------------------------------------------------------------------
// Cả thế giới

export interface WorldLayout {
  market: MarketLayout;
  villages: WorldVillage[];
  gates: GateDef[];
  roads: WorldRoad[];
  signposts: SignpostDef[];
  graph: RoadGraph;
  /** Đồ rải ở đất hoang của ba làng chưa dựng (đồi, tre; bước X3), luôn có, có vật cản */
  wild: ScatterPlacement[];
  /** Đá hai bờ sông, dọc theo đường tim (đồ nhỏ do code dựng, có vật cản) */
  riverRocks: PropPlacement[];
  /** Vật cản luôn có (chợ, sông và cầu, biển chỉ đường); vật cản của làng thuộc về làng (chỉ tính khi vùng đó đã tải) */
  baseColliders: CameraBlocker[];
  baseObstacles: Obstacle[];
  /** Vật chắn camera luôn có */
  baseBlockers: CameraBlocker[];
}

export const WORLD_SEED = 20260101;

/** Dựng cả thế giới. `density` là mật độ lều và bụi tre của chợ theo mức chất lượng. Cùng đầu vào cùng kết quả. */
export function assembleWorld(density: MarketDensity = FULL_DENSITY, seed: number = WORLD_SEED): WorldLayout {
  const market = generateMarket(seed, density, { world: true, noBankRocks: true });
  const villages = VILLAGE_FRAMES.map((f) => assembleWorldVillage(f, seed, density));
  const gates = villages.map((v) => v.gate);
  const rocks = riverRocks(seed);
  const wild = wildlands(seed);
  const sp = signposts();
  const baseColliders: CameraBlocker[] = [...market.colliders, ...riverColliders()];
  const baseBlockers: CameraBlocker[] = [...market.blockers];
  for (const p of rocks) {
    const c = propCollider(p);
    if (c) baseColliders.push(c);
  }
  for (const p of wild) {
    const c = scatterCollider(p);
    if (!c) continue;
    baseColliders.push(c);
    if (p.kind === 'doi') baseBlockers.push(c);
  }
  for (const s of sp) {
    const cs = signpostColliders(s);
    baseColliders.push(...cs);
    baseBlockers.push(...cs);
  }
  return {
    market,
    villages,
    gates,
    roads: worldRoads(),
    signposts: sp,
    graph: buildWorldGraph(villages),
    riverRocks: rocks,
    wild,
    baseColliders,
    baseObstacles: baseColliders.map((c) => c.shape),
    baseBlockers,
  };
}

// ---------------------------------------------------------------------------
// Chỗ xuất hiện

export type Spawn = { x: number; z: number; yaw: number };

/** `?tu=<làng>`: người chơi xuất hiện trong làng đó, cạnh các biển gỗ. Làng lạ thì null (chỗ mặc định ở chợ). */
export function villageSpawn(world: Pick<WorldLayout, 'villages'>, tu: string | null | undefined): Spawn | null {
  const v = world.villages.find((q) => q.id === tu);
  return v ? { ...v.start } : null;
}

/** Cách cổng bấy nhiêu khi chiếu hiệu ứng mở cổng (xuất hiện bằng `?mo=`, chỉ để kiểm tra). */
export const OPENING_DISTANCE = 8.5;

/** Chỗ đứng cách cổng của làng `gate` bấy nhiêu về phía chợ, nhìn thẳng vào cổng. */
export function gateApproachSpawn(world: Pick<WorldLayout, 'villages'>, gate: GateId, distance: number = OPENING_DISTANCE): Spawn | null {
  const v = world.villages.find((q) => q.frame.gate === gate);
  if (!v) return null;
  const f = v.frame;
  return { x: f.gateX - f.dirX * distance, z: f.gateZ - f.dirZ * distance, yaw: f.yaw };
}

