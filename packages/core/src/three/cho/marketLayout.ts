/**
 * Bố cục chợ phiên 3D (spec 04 mục 3, bản ĐƠN GIẢN của mốc 2; chợ đông đồ vật để mốc 4). Hàm thuần, không import three:
 * sinh vị trí mọi đồ vật bằng bộ ngẫu nhiên có seed (cùng seed thì cùng chợ), kèm vật cản va chạm và vật chắn camera.
 *
 * Hệ tọa độ: người chơi xuất hiện ở phía nam cây đa và nhìn về phía bắc (+Z), nên **Bắc = +Z, Nam = −Z, Tây = +X, Đông = −X**
 * (bên phải màn hình khi nhìn về bắc là −X). Cây đa ở gốc tọa độ.
 */
import { createMulberry32 } from '../../lib/rng';
import type { CameraBlocker } from '../cameraCollision';
import { box, circle, type Obstacle } from '../collision';
import { sizeInScene } from '../modelSizes';
import { footprintObstacles, footprintRadiusOf, gateLintel } from './footprints';

/** Vùng đi lại: hình tròn bán kính 42 quanh cây đa (cổng ở cách tâm 30, bến sông ở cuối đường phía đông). */
export const WORLD_RADIUS = 42;
export const GATE_DISTANCE = 30;
/** Sân chợ quanh cây đa (đất nện) và bề rộng các con đường tới 4 cổng. */
export const PLAZA_RADIUS = 14;
export const ROAD_WIDTH = 6;
/** Nửa bề rộng dải đường không được xây gì (đường + lề), trước khi cộng bán kính vật. */
export const ROAD_HALF_CLEAR = ROAD_WIDTH / 2 + 1.4;
/** Lều chợ được sát đường hơn nhà một chút. */
const STALL_HALF_CLEAR = ROAD_WIDTH / 2 + 0.9;
/** Phía đông (−X) từ x = RIVER_X trở ra là sông. Bến tàu nhô ra sông ở cuối đường phía đông. */
export const RIVER_X = -37;
/** Bến tàu: dải ngang ra sông, rộng 3,4 (chỉ đi được trong dải này khi ra tới nước). */
export const DOCK_HALF_WIDTH = 1.7;
export const DOCK_END_X = -41.4;
/** Mặt sàn cầu tàu cao 0,45; dốc lên dài 2 (mặt đất ở x = −32, mặt sàn từ x = −34); sàn kéo dài tới cuối bến. */
export const DECK_TOP = 0.45;
export const RAMP_START_X = -32;
export const DECK_START_X = -34;

/**
 * Độ cao mặt đi được tại (x, z): mặt đất là 0; mặt cầu tàu đúng bằng độ cao sàn (`DECK_TOP`) từ đầu sàn tới cuối bến; ở đầu cầu có dốc lên
 * ngắn (tuyến tính). Chỉ cầu tàu cao hơn 0 (nhà, lều, giếng, cây có vật cản bao hết phần chân cao hơn 0,1; xem footprints.ts). Liên tục theo x
 * trong dải cầu; ngoài dải (|z| > nửa bề rộng bến) hoặc quá cuối bến là 0 (mép sàn là vách đứng, bờ sông có vật cản).
 */
export function groundHeight(x: number, z: number): number {
  if (Math.abs(z) > DOCK_HALF_WIDTH || x < DOCK_END_X) return 0;
  if (x >= RAMP_START_X) return 0;
  if (x >= DECK_START_X) return (DECK_TOP * (RAMP_START_X - x)) / (RAMP_START_X - DECK_START_X);
  return DECK_TOP;
}
/** Chỗ người chơi xuất hiện: phía nam cây đa, mặt về cổng Làng Giấy ở phía bắc. */
export const PLAYER_START: readonly [number, number] = [0, -10];

export type GateId = 'giay' | 'det' | 'khac-dau' | 'bac';
export type Direction = 'bac' | 'nam' | 'tay' | 'dong';

export interface GateDef {
  id: GateId;
  model: string;
  direction: Direction;
  x: number;
  z: number;
  /** Mặt trước của cổng (+Z trong file) quay về sân chợ */
  yaw: number;
}

const G = GATE_DISTANCE;
/** 4 cổng ở 4 hướng: Bắc Giấy, Nam Dệt, Tây Khắc Dấu, Đông Bạc (spec 04 mục 3). */
export const GATES: readonly GateDef[] = [
  { id: 'giay', model: 'env/cong-lang-giay', direction: 'bac', x: 0, z: G, yaw: Math.PI },
  { id: 'det', model: 'env/cong-lang-det', direction: 'nam', x: 0, z: -G, yaw: 0 },
  { id: 'khac-dau', model: 'env/cong-lang-khac-dau', direction: 'tay', x: G, z: 0, yaw: -Math.PI / 2 },
  { id: 'bac', model: 'env/cong-lang-bac', direction: 'dong', x: -G, z: 0, yaw: Math.PI / 2 },
];

/**
 * Dân làng đi lại trên các con đường (dải đường luôn trống): bốn vòng, mỗi con đường một vòng (bắc, nam, tây, đông). Người thứ 0 và 3 là bà cụ, 1 và 2 là chú
 * nông dân (xem MarketScene).
 */
export const VILLAGER_PATHS: readonly (readonly (readonly [number, number])[])[] = [
  [[1.6, 17], [-1.6, 21], [1.4, 26], [-1.4, 22]],
  [[-1.6, -17], [1.6, -22], [-1.4, -26], [1.2, -21]],
  [[18, 1.5], [22, -1.5], [27, 1.2], [23, 1.4]],
  [[-18, -1.5], [-22, 1.5], [-27, -1.2], [-24, -1.5]],
];
/** Lái buôn đứng gần bến sông, mặt quay vào chợ. */
export const MERCHANT = { x: RIVER_X + 2.4, z: 4.2, yaw: Math.PI / 2 + 0.5 };

export const MODEL_TREE = 'env/cay-da';
export const MODEL_STALL = 'env/leu-cho';
export const MODEL_WELL = 'env/gieng-lang';
export const MODEL_HOUSE_TILE = 'env/nha-mai-ngoi';
export const MODEL_HOUSE_THATCH = 'env/nha-mai-tranh';
export const MODEL_BAMBOO = 'env/bui-tre';
/** Mọi model dùng ở chợ (bản chính; bản xa là "<id>-xa"). */
export const MARKET_MODELS: readonly string[] = [MODEL_TREE, ...GATES.map((g) => g.model), MODEL_STALL, MODEL_WELL, MODEL_HOUSE_TILE, MODEL_HOUSE_THATCH, MODEL_BAMBOO];

export interface Placement {
  model: string;
  x: number;
  z: number;
  /** Góc xoay quanh trục đứng (radian, như rotation.y của three) */
  yaw: number;
  /** Nhân thêm vào cỡ chuẩn của model (xem modelSizes) */
  scale: number;
  /** Nhân màu: đổi màu nhẹ giữa các bản nhân bản */
  tint: readonly [number, number, number];
}

/** Đồ vật nhỏ do code dựng (chum vại, đống rơm, khóm hoa). */
export type PropKind = 'chum' | 'rom' | 'hoa' | 'da';
export interface PropPlacement {
  kind: PropKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
  tint: readonly [number, number, number];
}

export interface Road {
  /** Từ (x0, z0) tới (x1, z1), bề rộng `width` */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  width: number;
}

export interface MarketLayout {
  seed: number;
  placements: Placement[];
  props: PropPlacement[];
  roads: Road[];
  /** Mọi vật cản kèm chiều cao (để vẽ khung xem va chạm `?debug=colliders`); `obstacles` là các hình của chúng */
  colliders: CameraBlocker[];
  /** Vật cản tĩnh (đồ vật, sông, hàng rào…) cho `resolveCollisions` */
  obstacles: Obstacle[];
  /** Vật cao chắn camera (nhà, cổng, cây, lều, tre, giếng) */
  blockers: CameraBlocker[];
  /** Đường đi lại của dân làng: mỗi đường là một vòng các điểm [x, z] */
  villagerPaths: [number, number][][];
  /** Chỗ lái buôn đứng (gần bến sông) và hướng mặt */
  merchant: { x: number; z: number; yaw: number };
}

// ---------------------------------------------------------------------------
// Vật cản của từng loại đồ vật

/** Bán kính quanh chân dùng để giữ khoảng cách giữa các đồ vật khi xếp: bán kính hình tròn bao hết chân tường thật (xem footprints.ts). */
export function footprintRadius(p: Pick<Placement, 'model' | 'scale'>): number {
  const r = footprintRadiusOf(p.model);
  return r > 0 ? r * p.scale : 1;
}

/** Vật cản và vật chắn camera của một đồ vật đã đặt: các hình của chân tường thật (cổng: hai bên, chừa lối đi giữa), cao bằng chiều cao đồ vật. */
export function collidersFor(p: Placement): CameraBlocker[] {
  const size = sizeInScene(p.model, p.scale);
  if (!size) return [];
  return footprintObstacles(p.model, p.x, p.z, p.yaw, p.scale).map((shape) => ({ shape, height: size[1] }));
}

/** Cỡ thật của đồ nhỏ do code dựng: bán kính chân (bằng đúng hình dựng: chum phình 0,52, rơm 1,0, bụi 0,5, đá 0,72) và chiều cao, ở tỉ lệ 1. */
export const PROP_SIZES: Readonly<Record<PropKind, { r: number; h: number }>> = {
  chum: { r: 0.52, h: 1.05 },
  rom: { r: 1.0, h: 2.0 },
  hoa: { r: 0.5, h: 0.8 },
  da: { r: 0.72, h: 0.8 },
};

/** Vật cản của đồ vật nhỏ do code dựng. */
export function propCollider(p: PropPlacement): CameraBlocker | null {
  const k = PROP_SIZES[p.kind];
  return { shape: circle(p.x, p.z, k.r * p.scale), height: k.h * p.scale };
}

// ---------------------------------------------------------------------------
// Sinh bố cục

interface Spot {
  x: number;
  z: number;
  r: number;
}

/** Điểm (x, z) cách trục đường bấy nhiêu thì còn nằm trong dải đường của một trong 4 hướng. */
function inRoadStrip(x: number, z: number, r: number, halfClear: number): boolean {
  const limit = halfClear + r;
  return Math.abs(x) < limit || Math.abs(z) < limit;
}

/** Phía đông (−X) là sông: vật phải nằm hẳn bên bờ. */
function onBank(x: number, r: number): boolean {
  return x - r > RIVER_X + 0.8;
}

/** Mật độ theo mức chất lượng: tỉ lệ lều chợ và bụi tre được giữ lại (1 là đủ). */
export interface MarketDensity {
  stalls: number;
  bamboo: number;
}
export const FULL_DENSITY: MarketDensity = { stalls: 1, bamboo: 1 };

/** Mức Thấp bớt lều và bụi tre để giữ dưới 300.000 tam giác mỗi khung hình; Vừa và Cao đủ đồ vật. */
export function densityFor(level: 'low' | 'medium' | 'high'): MarketDensity {
  return level === 'low' ? { stalls: 0.75, bamboo: 0.6 } : FULL_DENSITY;
}

/** Giữ lại khoảng `keep` (0 đến 1) số phần tử, rải đều theo thứ tự (không dồn vào một chỗ). Hàm thuần, cùng đầu vào cùng kết quả. */
export function thinEvenly<T>(items: readonly T[], keep: number): T[] {
  if (keep >= 1) return [...items];
  const out: T[] = [];
  for (let i = 0; i < items.length; i++) if (Math.floor((i + 1) * keep) > Math.floor(i * keep)) out.push(items[i]);
  return out;
}

/**
 * Sinh bố cục chợ. Cùng `seed` thì cùng kết quả. Không có vật nào nằm trên đường, đè lên vật khác, ra ngoài vùng đi lại hay
 * xuống sông; người chơi, dân làng và đường tới 4 cổng luôn đi được (có test).
 */
export function generateMarket(seed = 20260101, density: MarketDensity = FULL_DENSITY): MarketLayout {
  const rng = createMulberry32(seed);
  const rand = (a: number, b: number) => a + rng() * (b - a);
  const placements: Placement[] = [];
  const props: PropPlacement[] = [];
  const spots: Spot[] = []; // chỗ đã chiếm (để giữ khoảng cách)

  const tint = (spread: number, warm = 0): [number, number, number] => {
    const v = 1 - rng() * spread;
    return [Math.min(1.04, v + warm * (rng() - 0.3)), v, Math.min(1.04, v - warm * (rng() - 0.3))];
  };
  const free = (x: number, z: number, r: number, gap: number) => spots.every((s) => Math.hypot(s.x - x, s.z - z) >= s.r + r + gap);
  const place = (p: Placement) => {
    placements.push(p);
    spots.push({ x: p.x, z: p.z, r: footprintRadius(p) });
  };

  // Cố định: cây đa ở giữa, giếng ở góc đông nam sân chợ, 4 cổng.
  place({ model: MODEL_TREE, x: 0, z: 0, yaw: 0.35, scale: 1, tint: [1, 1, 1] });
  place({ model: MODEL_WELL, x: -6.4, z: -7.2, yaw: 0.6, scale: 1, tint: [1, 1, 1] });
  for (const g of GATES) placements.push({ model: g.model, x: g.x, z: g.z, yaw: g.yaw, scale: 1, tint: [1, 1, 1] });
  // Chỗ người chơi xuất hiện, và lối thẳng tới cây đa: để trống.
  spots.push({ x: PLAYER_START[0], z: PLAYER_START[1], r: 2.2 });

  // Lều chợ quanh cây đa trong sân chợ: tám lều trong, vài lều ngoài. Quay mặt vào giữa (±), đổi màu, đổi cỡ.
  const stallR = footprintRadius({ model: MODEL_STALL, scale: 1 });
  let stalls = 0;
  for (let attempt = 0; attempt < 3000 && stalls < 15; attempt++) {
    const ring = attempt < 1500 ? [5.5, 14] : [13, 22];
    const rho = rand(ring[0], ring[1]);
    const ang = rand(0, Math.PI * 2);
    const x = Math.cos(ang) * rho;
    const z = Math.sin(ang) * rho;
    const scale = rand(0.92, 1.1);
    const r = stallR * scale;
    if (inRoadStrip(x, z, r, STALL_HALF_CLEAR) || !free(x, z, r, 0.9)) continue;
    place({ model: MODEL_STALL, x, z, yaw: Math.atan2(-x, -z) + rand(-0.45, 0.45), scale, tint: tint(0.16, 0.12) });
    stalls++;
  }

  // Nhà mái ngói và mái tranh bao quanh, theo từng phần tư; đổi màu, tỉ lệ, góc xoay.
  const quadrants: [number, number][] = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  const houseWanted = [5, 5, 4, 5];
  quadrants.forEach(([sx, sz], q) => {
    let n = 0;
    for (let attempt = 0; attempt < 1500 && n < houseWanted[q]; attempt++) {
      const rho = rand(19, 36);
      const ang = rand(0.2, Math.PI / 2 - 0.2);
      const x = sx * Math.cos(ang) * rho;
      const z = sz * Math.sin(ang) * rho;
      const model = (n + q) % 2 === 0 ? MODEL_HOUSE_TILE : MODEL_HOUSE_THATCH;
      const scale = rand(0.9, 1.15);
      const r = footprintRadius({ model, scale });
      if (inRoadStrip(x, z, r, ROAD_HALF_CLEAR) || !onBank(x, r) || Math.hypot(x, z) + r > WORLD_RADIUS - 2.5 || !free(x, z, r, 1.6)) continue;
      place({ model, x, z, yaw: Math.atan2(-x, -z) + rand(-0.5, 0.5), scale, tint: tint(0.14, 0.1) });
      n++;
    }
  });

  // Bụi tre bao quanh phía ngoài và xen giữa các nhà.
  const bambooR = footprintRadius({ model: MODEL_BAMBOO, scale: 1 });
  let bamboo = 0;
  for (let attempt = 0; attempt < 3000 && bamboo < 20; attempt++) {
    const rho = rand(22, 39);
    const ang = rand(0, Math.PI * 2);
    const x = Math.cos(ang) * rho;
    const z = Math.sin(ang) * rho;
    const scale = rand(0.8, 1.25);
    const r = bambooR * scale;
    if (inRoadStrip(x, z, r, ROAD_HALF_CLEAR) || !onBank(x, r) || Math.hypot(x, z) + r > WORLD_RADIUS - 1.5 || !free(x, z, r, 0.4)) continue;
    place({ model: MODEL_BAMBOO, x, z, yaw: rand(0, Math.PI * 2), scale, tint: tint(0.2, 0.08) });
    bamboo++;
  }

  // Mức chất lượng thấp: bớt lều và bụi tre (vật cản, vật chắn camera và đồ nhỏ đều tính sau bước này nên luôn khớp).
  if (density.stalls < 1 || density.bamboo < 1) {
    const keepStalls = new Set(thinEvenly(placements.filter((p) => p.model === MODEL_STALL), density.stalls));
    const keepBamboo = new Set(thinEvenly(placements.filter((p) => p.model === MODEL_BAMBOO), density.bamboo));
    const kept = placements.filter((p) => (p.model === MODEL_STALL ? keepStalls.has(p) : p.model === MODEL_BAMBOO ? keepBamboo.has(p) : true));
    placements.length = 0;
    placements.push(...kept);
  }

  // Đồ vật nhỏ do code dựng: đống rơm cạnh nhà, chum vại cạnh lều và nhà, khóm hoa quanh nhà.
  const houses = placements.filter((p) => p.model === MODEL_HOUSE_TILE || p.model === MODEL_HOUSE_THATCH);
  const stallsPlaced = placements.filter((p) => p.model === MODEL_STALL);
  const addProp = (kind: PropKind, near: Placement, radiusMin: number, radiusMax: number, scaleRange: [number, number], count: number, gap: number) => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const ang = rand(0, Math.PI * 2);
      const rho = footprintRadius(near) + rand(radiusMin, radiusMax);
      const x = near.x + Math.cos(ang) * rho;
      const z = near.z + Math.sin(ang) * rho;
      const scale = rand(scaleRange[0], scaleRange[1]);
      const probe: PropPlacement = { kind, x, z, yaw: rand(0, Math.PI * 2), scale, tint: tint(0.25, kind === 'hoa' ? 0.2 : 0.1) };
      const r = (propCollider(probe)?.shape as { r: number }).r;
      if (inRoadStrip(x, z, r, ROAD_HALF_CLEAR - 0.6) || !onBank(x, r) || Math.hypot(x, z) + r > WORLD_RADIUS - 2 || !free(x, z, r, gap)) continue;
      props.push(probe);
      spots.push({ x, z, r });
      if (--count <= 0) break;
    }
  };
  houses.forEach((h, i) => {
    if (i % 3 === 0) addProp('rom', h, 0.9, 2.2, [0.9, 1.25], 1, 0.6);
    addProp('hoa', h, 0.5, 2.5, [0.8, 1.2], 2, 0.4);
    if (i % 2 === 1) addProp('chum', h, 0.7, 1.8, [0.8, 1.15], 2, 0.3);
  });
  stallsPlaced.forEach((s, i) => {
    if (i % 2 === 0) addProp('chum', s, 0.8, 1.8, [0.85, 1.2], 2, 0.3);
  });

  // Đường đất từ sân chợ tới 4 cổng (và qua cổng tới rìa; phía đông tới bến tàu).
  const roads: Road[] = [
    { x0: 0, z0: PLAZA_RADIUS - 1, x1: 0, z1: WORLD_RADIUS + 4, width: ROAD_WIDTH },
    { x0: 0, z0: -(PLAZA_RADIUS - 1), x1: 0, z1: -(WORLD_RADIUS + 4), width: ROAD_WIDTH },
    { x0: PLAZA_RADIUS - 1, z0: 0, x1: WORLD_RADIUS + 4, z1: 0, width: ROAD_WIDTH },
    { x0: -(PLAZA_RADIUS - 1), z0: 0, x1: RIVER_X + 0.5, z1: 0, width: ROAD_WIDTH },
  ];

  // Đá bờ sông (vật cản thật, không đi xuyên được)
  const rockRng = createMulberry32(seed ^ 0x2545f491);
  for (let i = 0; i < 24; i++) {
    const z = -60 + (i / 23) * 120;
    if (Math.abs(z) < DOCK_HALF_WIDTH + 2.5) continue;
    const scale = 0.6 + rockRng() * 0.9;
    const grey = 0.8 + rockRng() * 0.2;
    props.push({ kind: 'da', x: RIVER_X + 0.9 + rockRng() * 0.8, z: z + (rockRng() - 0.5) * 3, yaw: rockRng() * 6, scale, tint: [grey, grey, grey] });
  }

  // Vật cản và vật chắn camera
  const colliders: CameraBlocker[] = [];
  const blockers: CameraBlocker[] = [];
  for (const p of placements) {
    for (const c of collidersFor(p)) {
      colliders.push(c);
      blockers.push(c);
    }
    // xà ngang của cổng chỉ chắn camera (người đi được dưới xà)
    const lintel = gateLintel(p.model, p.x, p.z, p.yaw, p.scale);
    if (lintel) blockers.push(lintel);
  }
  for (const p of props) {
    const c = propCollider(p);
    if (!c) continue;
    colliders.push(c);
    if (p.kind === 'rom') blockers.push(c);
  }
  // Sông: hai khối nước hai bên bến tàu, khối chắn cuối bến, và vách hai bên cầu tàu (dốc và sàn) để không bước lên sàn từ bên hông;
  // chỉ chừa lối lên cầu ở đầu dốc.
  const waterH = 0.3;
  const rail = (x0: number, x1: number, z0: number, z1: number) => ({ shape: box(x0, x1, z0, z1), height: DECK_TOP });
  colliders.push(
    { shape: box(-130, RIVER_X, DOCK_HALF_WIDTH, 130), height: waterH },
    { shape: box(-130, RIVER_X, -130, -DOCK_HALF_WIDTH), height: waterH },
    { shape: box(-130, DOCK_END_X, -DOCK_HALF_WIDTH, DOCK_HALF_WIDTH), height: waterH },
    rail(RIVER_X, RAMP_START_X, DOCK_HALF_WIDTH, DOCK_HALF_WIDTH + 0.5),
    rail(RIVER_X, RAMP_START_X, -DOCK_HALF_WIDTH - 0.5, -DOCK_HALF_WIDTH),
  );

  const villagerPaths = VILLAGER_PATHS.map((p) => p.map((q) => [q[0], q[1]] as [number, number]));
  const merchant = { ...MERCHANT };
  colliders.push({ shape: circle(merchant.x, merchant.z, 0.45), height: 1.7 });
  const obstacles = colliders.map((c) => c.shape);
  return { seed, placements, props, roads, colliders, obstacles, blockers, villagerPaths, merchant };
}
