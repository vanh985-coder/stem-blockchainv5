/**
 * Bố cục chợ phiên 3D (spec 04 mục 3, bản ĐƠN GIẢN của mốc 2; chợ đông đồ vật để mốc 4). Hàm thuần, không import three:
 * sinh vị trí mọi đồ vật bằng bộ ngẫu nhiên có seed (cùng seed thì cùng chợ), kèm vật cản va chạm và vật chắn camera.
 *
 * Hệ tọa độ: người chơi xuất hiện ở phía nam cây đa và nhìn về phía bắc (+Z), nên **Bắc = +Z, Nam = −Z, Tây = +X, Đông = −X**
 * (bên phải màn hình khi nhìn về bắc là −X). Cây đa ở gốc tọa độ.
 */
import { createMulberry32 } from '../../lib/rng';
import type { CameraBlocker } from '../cameraCollision';
import { box, circle, obox, type Obstacle } from '../collision';
import { sizeInScene, topInScene } from '../modelSizes';
import { TREE_MOUND_HEIGHT, footprintObstacles, footprintRadiusOf, gateLintel, treeTrunkObstacle } from './footprints';

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
/** Đồ gợi nghề quanh cổng (bước 8d): phên phơi giấy (Làng Giấy, nằm trên giá) và khung cửi (Làng Dệt). */
export const MODEL_PAPER_RACK = 'env/phen-phoi-giay';
export const MODEL_LOOM = 'env/khung-cui';
export const MARKET_MODELS: readonly string[] = [MODEL_TREE, ...GATES.map((g) => g.model), MODEL_STALL, MODEL_WELL, MODEL_HOUSE_TILE, MODEL_HOUSE_THATCH, MODEL_BAMBOO, MODEL_PAPER_RACK, MODEL_LOOM];

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
export type PropKind = 'chum' | 'rom' | 'hoa' | 'da' | 'giay' | 'vai' | 'khoi-da' | 'ban-da' | 'hom' | 'thung' | 'chan' | 'ban-chep' | 'so-chung' | 'be-ngam' | 'nuoc' | 'coi-gia' | 'bep-do' | 'dinh';
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

/**
 * Vật cản của một đồ vật đã đặt: các hình của chân tường thật (cổng: hai bên, chừa lối đi giữa), cao bằng đỉnh đồ vật (kể cả phần nhấc lên của phên phơi giấy). Cây đa: các hình của nền rễ
 * to, cao `TREE_MOUND_HEIGHT` (thân chỉ chắn camera, xem `cameraBlockersFor`).
 */
export function collidersFor(p: Placement): CameraBlocker[] {
  const top = topInScene(p.model, p.scale);
  if (top === undefined) return [];
  const height = p.model === MODEL_TREE ? TREE_MOUND_HEIGHT * p.scale : top;
  return footprintObstacles(p.model, p.x, p.z, p.yaw, p.scale).map((shape) => ({ shape, height }));
}

/**
 * Vật chắn camera của một đồ vật đã đặt: như vật cản, trừ cây đa (chỉ thân chính cao 12, không phải cả nền rễ rộng) và có thêm xà ngang của cổng (chỉ chắn camera, người đi được
 * dưới xà).
 */
export function cameraBlockersFor(p: Placement): CameraBlocker[] {
  if (p.model === MODEL_TREE) {
    const size = sizeInScene(p.model, p.scale);
    return size ? [{ shape: treeTrunkObstacle(p.x, p.z, p.yaw, p.scale), height: size[1] }] : [];
  }
  const out = collidersFor(p);
  const lintel = gateLintel(p.model, p.x, p.z, p.yaw, p.scale);
  return lintel ? [...out, lintel] : out;
}

/**
 * Cỡ thật của đồ nhỏ do code dựng, ở tỉ lệ 1: `r` là bán kính hình tròn bao chân (dùng giữ khoảng cách và làm vật cản tròn), `box` (nửa rộng hx, nửa sâu hz) nếu vật cản là hộp xoay, `h`
 * là chiều cao. Vật cao hơn 0,3 có vật cản sát hình (spec 04 mục 3, bước 8d); `collide: false` là vật thấp đi qua được (khóm hoa) hoặc chi tiết nằm dưới vật khác (chân giá).
 * Khớp đúng hình dựng (marketGeometry.ts, có test).
 */
export interface PropSize {
  r: number;
  h: number;
  box?: { hx: number; hz: number };
  collide?: boolean;
  /** Nhấc vật lên cao bấy nhiêu so với mặt đất (cuốn sổ đặt trên bàn, mặt nước trong bể); mặc định 0. `h` là bề dày. */
  lift?: number;
}
export const PROP_SIZES: Readonly<Record<PropKind, PropSize>> = {
  chum: { r: 0.52, h: 1.05 },
  rom: { r: 1.0, h: 2.0 },
  hoa: { r: 0.5, h: 0.8, collide: false },
  da: { r: 0.72, h: 0.8 },
  giay: { r: Math.hypot(0.5, 0.35), h: 0.7, box: { hx: 0.5, hz: 0.35 } },
  vai: { r: 0.24, h: 1.2 },
  'khoi-da': { r: Math.hypot(0.6, 0.45), h: 0.85, box: { hx: 0.6, hz: 0.45 } },
  'ban-da': { r: Math.hypot(0.85, 0.5), h: 0.8, box: { hx: 0.85, hz: 0.5 } },
  hom: { r: Math.hypot(0.55, 0.35), h: 0.7, box: { hx: 0.55, hz: 0.35 } },
  thung: { r: 0.45, h: 0.5 },
  chan: { r: 0.07, h: 0.85, collide: false },
  // cảnh làng (bước 9): bàn chép sổ và cuốn Sổ Chung đặt trên bàn, bể ngâm giấy và mặt nước trong bể
  'ban-chep': { r: Math.hypot(1.1, 0.55), h: 0.85, box: { hx: 1.1, hz: 0.55 } },
  'so-chung': { r: 0.36, h: 0.12, box: { hx: 0.3, hz: 0.22 }, collide: false, lift: 0.85 },
  'be-ngam': { r: Math.hypot(1.4, 0.8), h: 0.75, box: { hx: 1.4, hz: 0.8 } },
  nuoc: { r: 1.4, h: 0.04, box: { hx: 1.2, hz: 0.6 }, collide: false, lift: 0.6 },
  // xưởng làm giấy (bước W2): cối giã dó (cối đá và đòn gánh gỗ), bếp nấu dó (bệ đá, nồi lớn, ống khói) và đình làng nhỏ (nền đá, bốn cột, mái ngói). Đình: vật cản là nền đá (hộp 6,2 × 5,0); mái vươn ra ngoài nền.
  'coi-gia': { r: Math.hypot(1.1, 0.45), h: 1.15, box: { hx: 1.1, hz: 0.45 } },
  'bep-do': { r: Math.hypot(1.0, 0.6), h: 1.9, box: { hx: 1.0, hz: 0.6 } },
  dinh: { r: Math.hypot(3.1, 2.5), h: 6, box: { hx: 3.1, hz: 2.5 } },
};

/** Vật cản của đồ nhỏ do code dựng: hình tròn hoặc hộp xoay sát hình; vật thấp (khóm hoa) và chi tiết dưới vật khác (chân giá) thì không có. */
export function propCollider(p: PropPlacement): CameraBlocker | null {
  const k = PROP_SIZES[p.kind];
  if (k.collide === false || k.h <= PROP_COLLIDE_MIN_HEIGHT) return null;
  const shape: Obstacle = k.box ? obox(p.x, p.z, k.box.hx * p.scale, k.box.hz * p.scale, p.yaw) : circle(p.x, p.z, k.r * p.scale);
  return { shape, height: k.h * p.scale };
}
/** Đồ nhỏ cao hơn mức này (đơn vị) mới có vật cản. */
export const PROP_COLLIDE_MIN_HEIGHT = 0.3;

// ---------------------------------------------------------------------------
// Quanh cổng làng: đồ gợi nghề của làng (bước 8d)

/** Trong khoảng này quanh tâm mỗi cổng không có nhà và bụi tre (tính từ tâm cổng tới tâm vật). */
export const GATE_CLEAR_RADIUS = 8;

/**
 * Một món đồ gợi nghề đặt theo khung của cổng: `u` lệch ngang so với trục đường (cùng chiều trục x của model cổng), `w` tiến về phía sân chợ tính từ tâm cổng; `yaw` xoay thêm so
 * với hướng cổng. Hoặc là model (`model`) hoặc là đồ nhỏ do code dựng (`kind`).
 */
export interface DecorItem {
  u: number;
  w: number;
  yaw: number;
  scale?: number;
  model?: string;
  kind?: PropKind;
  tint?: readonly [number, number, number];
}

const PAPER: readonly [number, number, number] = [1, 1, 1];
const roll = (u: number, w: number, tint: readonly [number, number, number]): DecorItem => ({ kind: 'vai', u, w, yaw: 0, tint });

/**
 * Đồ gợi nghề quanh 4 cổng, nằm hai bên đường (|u| ≥ 5,6, ngoài dải đường rộng 4,4 mỗi bên) và phía sân chợ của tường cổng (w ≥ 2,6), để không chắn đường đất tới cổng:
 * Giấy: 3 phên phơi giấy trên giá và chồng giấy; Dệt: 1 khung cửi và cuộn vải màu; Khắc Dấu: khối đá và bàn đá khắc; Bạc: hòm gỗ, thúng, chum.
 */
export const GATE_DECOR: Readonly<Record<GateId, readonly DecorItem[]>> = {
  giay: [
    { model: MODEL_PAPER_RACK, u: -6.5, w: 4.0, yaw: Math.PI / 2 },
    { model: MODEL_PAPER_RACK, u: 6.7, w: 6.0, yaw: Math.PI / 2 + 0.12 },
    { model: MODEL_PAPER_RACK, u: -6.8, w: 8.2, yaw: Math.PI / 2 - 0.1 },
    { kind: 'giay', u: 5.8, w: 3.0, yaw: 0.3, tint: PAPER },
    { kind: 'giay', u: -8.6, w: 5.8, yaw: -0.2, tint: PAPER },
    { kind: 'giay', u: 8.6, w: 3.6, yaw: 0.5, tint: PAPER },
    { kind: 'giay', u: 6.0, w: 8.8, yaw: 0, tint: PAPER },
  ],
  det: [
    { model: MODEL_LOOM, u: -6.6, w: 4.4, yaw: 0.3 },
    roll(6.0, 3.3, [0.86, 0.27, 0.27]),
    roll(6.6, 4.0, [0.24, 0.43, 0.82]),
    roll(7.2, 3.2, [0.3, 0.65, 0.36]),
    roll(6.2, 4.9, [0.9, 0.72, 0.23]),
    roll(7.1, 4.7, [0.54, 0.33, 0.76]),
    roll(-8.9, 3.4, [0.86, 0.27, 0.27]),
    roll(-9.4, 4.2, [0.24, 0.43, 0.82]),
  ],
  'khac-dau': [
    { kind: 'khoi-da', u: -6.2, w: 3.2, yaw: 0.4, scale: 1 },
    { kind: 'khoi-da', u: -7.9, w: 5.0, yaw: -0.3, scale: 1.1 },
    { kind: 'khoi-da', u: 6.5, w: 3.6, yaw: 0.1, scale: 0.9 },
    { kind: 'khoi-da', u: 7.7, w: 6.3, yaw: 0.7, scale: 1 },
    { kind: 'ban-da', u: -6.7, w: 7.7, yaw: 0.2 },
    { kind: 'ban-da', u: 6.9, w: 8.9, yaw: -0.15 },
  ],
  bac: [
    { kind: 'hom', u: -6.1, w: 3.3, yaw: 0.3 },
    { kind: 'hom', u: -7.1, w: 5.3, yaw: -0.4 },
    { kind: 'hom', u: 6.4, w: 4.2, yaw: 0.5 },
    { kind: 'thung', u: -8.4, w: 3.4, yaw: 0 },
    { kind: 'thung', u: 6.0, w: 6.2, yaw: 0 },
    { kind: 'thung', u: 7.3, w: 6.9, yaw: 0 },
    { kind: 'chum', u: -6.0, w: 6.6, yaw: 0 },
    { kind: 'chum', u: 7.7, w: 3.0, yaw: 0 },
    { kind: 'chum', u: 6.9, w: 8.4, yaw: 0 },
  ],
};

/** Vị trí và góc xoay trong cảnh của món đồ `d` đặt theo khung của cổng `g` (như rotation.y của three). */
export function gateDecorWorld(g: Pick<GateDef, 'x' | 'z' | 'yaw'>, d: Pick<DecorItem, 'u' | 'w' | 'yaw'>): { x: number; z: number; yaw: number } {
  const c = Math.cos(g.yaw);
  const s = Math.sin(g.yaw);
  return { x: g.x + d.u * c + d.w * s, z: g.z - d.u * s + d.w * c, yaw: g.yaw + d.yaw };
}

/** Tâm vật ở (x, z) cách tâm một cổng dưới `GATE_CLEAR_RADIUS` thì không đặt nhà và bụi tre. */
function nearGate(x: number, z: number): boolean {
  return GATES.some((g) => Math.hypot(x - g.x, z - g.z) < GATE_CLEAR_RADIUS);
}

/** Chân giá của phên phơi giấy: 4 chân ở bốn góc (so với tâm, hệ model, tỉ lệ 1), cao 0,85. */
const RACK_LEGS: readonly (readonly [number, number])[] = [
  [-1.0, -0.6],
  [-1.0, 0.6],
  [1.0, -0.6],
  [1.0, 0.6],
];

// ---------------------------------------------------------------------------
// Hàng rào tre quanh rìa vùng đi lại

/** Hàng rào tre: cột cách nhau khoảng 2,2 dọc theo vòng bán kính `WORLD_RADIUS − 0,7`, hai thanh ngang mỗi đoạn; chừa 4 con đường và bến sông. */
export const FENCE_POST_HEIGHT = 1.35;
export const FENCE_RAIL_LENGTH = 2.3;
/** Bề dày vật cản của mỗi đoạn hàng rào (nửa bề dày): mỏng, sát thanh ngang. */
export const FENCE_HALF_THICKNESS = 0.08;
export interface FenceLayout {
  posts: { x: number; z: number; yaw: number }[];
  /** Mỗi đoạn một mục (giữa hai cột liên tiếp); thanh ngang vẽ ở hai độ cao tại đó */
  segments: { x: number; z: number; yaw: number }[];
}
/** Hàng rào của chợ: chừa 4 con đường (dải giữa rộng 2 × (ROAD_WIDTH/2 + 1,2)) và bến sông. */
function marketFenceGap(x: number, z: number): boolean {
  const gap = ROAD_WIDTH / 2 + 1.2;
  return Math.abs(x) < gap || Math.abs(z) < gap || x < RIVER_X + 2;
}

/** Bố cục hàng rào tròn bán kính radius quanh `center` (mặc định chợ: tâm gốc, WORLD_RADIUS − 0,7), bỏ những đoạn mà skip(x, z) đúng (chừa lối đi). Cảnh làng dùng lại với bán kính, tâm và lối riêng. */
export function fenceLayout(radius: number = WORLD_RADIUS - 0.7, skip: (x: number, z: number) => boolean = marketFenceGap, center: { x: number; z: number } = { x: 0, z: 0 }): FenceLayout {
  const R = radius;
  const step = 2.2 / R;
  const posts: FenceLayout['posts'] = [];
  const segments: FenceLayout['segments'] = [];
  for (let a = 0; a < Math.PI * 2; a += step) {
    const x = center.x + Math.cos(a) * R;
    const z = center.z + Math.sin(a) * R;
    if (skip(x, z)) continue;
    posts.push({ x, z, yaw: -a });
    segments.push({ x: center.x + Math.cos(a + step / 2) * R, z: center.z + Math.sin(a + step / 2) * R, yaw: -(a + step / 2) - Math.PI / 2 }); // thanh ngang nằm theo tiếp tuyến vòng (rotation.y của three: trục x của thanh quay về (cos yaw, −sin yaw))
  }
  return { posts, segments };
}

/**
 * Hàng rào tre thẳng từ (x0, z0) tới (x1, z1): cột cách đều (không quá 2,2), mỗi đoạn giữa hai cột có hai thanh ngang. Rào quanh sân nhà, ranh ruộng trong làng; ghép với `fenceLayout` thành một bố cục.
 */
export function fenceRun(x0: number, z0: number, x1: number, z1: number): FenceLayout {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(len / 2.2));
  const yaw = -Math.atan2(z1 - z0, x1 - x0); // trục x của thanh quay về (cos yaw, −sin yaw): dọc theo đường rào
  const posts: FenceLayout['posts'] = [];
  const segments: FenceLayout['segments'] = [];
  for (let i = 0; i <= n; i++) posts.push({ x: x0 + ((x1 - x0) * i) / n, z: z0 + ((z1 - z0) * i) / n, yaw });
  for (let i = 0; i < n; i++) segments.push({ x: x0 + ((x1 - x0) * (i + 0.5)) / n, z: z0 + ((z1 - z0) * (i + 0.5)) / n, yaw });
  return { posts, segments };
}

/** Vật cản của hàng rào: một hộp xoay mỏng cho mỗi đoạn (chuỗi hộp theo đường cong), cao bằng cột. */
export function fenceColliders(f: FenceLayout = fenceLayout()): CameraBlocker[] {
  return f.segments.map((s) => ({ shape: obox(s.x, s.z, FENCE_RAIL_LENGTH / 2, FENCE_HALF_THICKNESS, s.yaw), height: FENCE_POST_HEIGHT }));
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
  /** Phên phơi giấy của các làng (thế giới mở); bỏ trống là giữ hết */
  racks?: number;
}
export const FULL_DENSITY: MarketDensity = { stalls: 1, bamboo: 1 };

/** Mức Thấp bớt lều, bụi tre và phên phơi giấy để giữ dưới 300.000 tam giác ở mọi chỗ đứng (chợ, đường, làng); mức Vừa bớt một phần bụi tre và phên (làng Giấy ở bước W2 đông đồ vật, giữ dưới 1.000.000); Cao đủ đồ vật. */
export function densityFor(level: 'low' | 'medium' | 'high'): MarketDensity {
  if (level === 'medium') return { stalls: 1, bamboo: 0.75, racks: 0.8 };
  return level === 'low' ? { stalls: 0.6, bamboo: 0.45, racks: 0.5 } : FULL_DENSITY;
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
/**
 * Tùy chọn cho "thế giới mở" (mốc 2, bước W1: chợ và 4 làng trong một cảnh `/cho`). `world: true`: cổng làng không còn ở rìa chợ (mỗi cổng dời ra đầu làng của nó, kèm đồ gợi nghề), nên không có cổng, đồ
 * gợi nghề và vùng trống quanh cổng ở chợ; chợ chừa một vòng đường đi quanh cây đa (`PLAZA_RING_RADIUS`, để mũi tên chỉ đường đi vòng giữa các lối ra); sông, cầu và vật cản nước do lớp thế giới dựng
 * (`worldLayout.ts`) nên không có bến tàu ở đây.
 */
export interface MarketOptions {
  world?: boolean;
}

/** Vòng đường đi quanh cây đa trong sân chợ (thế giới mở): lều và nhà tránh dải này, mũi tên chỉ đường đi vòng theo đó giữa 4 lối ra. */
export const PLAZA_RING_RADIUS = 12.5;
/** Nửa bề rộng dải vòng đường không đặt vật (tính tới mép vật). */
export const PLAZA_RING_CLEAR = 1.7;

export function generateMarket(seed = 20260101, density: MarketDensity = FULL_DENSITY, options: MarketOptions = {}): MarketLayout {
  const world = options.world === true;
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
  if (!world) for (const g of GATES) placements.push({ model: g.model, x: g.x, z: g.z, yaw: g.yaw, scale: 1, tint: [1, 1, 1] });
  // Chỗ người chơi xuất hiện, và lối thẳng tới cây đa: để trống.
  spots.push({ x: PLAYER_START[0], z: PLAYER_START[1], r: 2.2 });
  // Thế giới mở: vòng đường đi quanh cây đa (dải trống cho mũi tên chỉ đường)
  if (world) {
    const n = 32;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      spots.push({ x: Math.cos(a) * PLAZA_RING_RADIUS, z: Math.sin(a) * PLAZA_RING_RADIUS, r: PLAZA_RING_CLEAR });
    }
  }

  // Đồ gợi nghề của làng quanh mỗi cổng (đặt trước lều, nhà, tre để chúng tránh ra): model và đồ nhỏ do code dựng, hai bên đường.
  const decorRng = createMulberry32(seed ^ 0x9e3779b1);
  for (const g of world ? [] : GATES) {
    for (const d of GATE_DECOR[g.id]) {
      const w = gateDecorWorld(g, d);
      const scale = d.scale ?? 1;
      if (d.model) {
        const p: Placement = { model: d.model, x: w.x, z: w.z, yaw: w.yaw, scale, tint: [1, 1, 1] };
        place(p);
        if (d.model === MODEL_PAPER_RACK) {
          // chân giá dưới phên (chỉ để nhìn; vật cản của phên đã bao cả giá)
          for (const [lx, lz] of RACK_LEGS) {
            const c = Math.cos(w.yaw);
            const sn = Math.sin(w.yaw);
            props.push({ kind: 'chan', x: w.x + (lx * c + lz * sn) * scale, z: w.z + (-lx * sn + lz * c) * scale, yaw: 0, scale, tint: [1, 1, 1] });
          }
        }
      } else if (d.kind) {
        const shade = 1 - decorRng() * 0.12;
        const tint = d.tint ?? ([shade, shade, shade] as const);
        props.push({ kind: d.kind, x: w.x, z: w.z, yaw: w.yaw, scale, tint });
        spots.push({ x: w.x, z: w.z, r: PROP_SIZES[d.kind].r * scale });
      }
    }
  }

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
      if (inRoadStrip(x, z, r, ROAD_HALF_CLEAR) || !onBank(x, r) || Math.hypot(x, z) + r > WORLD_RADIUS - 2.5 || (!world && nearGate(x, z)) || !free(x, z, r, 1.6)) continue;
      place({ model, x, z, yaw: Math.atan2(-x, -z) + rand(-0.5, 0.5), scale, tint: tint(0.14, 0.1) });
      n++;
    }
  });

  // Bụi tre bao quanh phía ngoài và xen giữa các nhà.
  const bambooR = footprintRadius({ model: MODEL_BAMBOO, scale: 1 });
  let bamboo = 0;
  for (let attempt = 0; attempt < 8000 && bamboo < 20; attempt++) {
    const rho = rand(19, 40);
    const ang = rand(0, Math.PI * 2);
    const x = Math.cos(ang) * rho;
    const z = Math.sin(ang) * rho;
    const scale = rand(0.8, 1.25);
    const r = bambooR * scale;
    if (inRoadStrip(x, z, r, ROAD_HALF_CLEAR) || !onBank(x, r) || Math.hypot(x, z) + r > WORLD_RADIUS - 1.5 || (!world && nearGate(x, z)) || !free(x, z, r, 0.4)) continue;
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
      const r = PROP_SIZES[kind].r * scale;
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
    for (const c of collidersFor(p)) colliders.push(c);
    for (const c of cameraBlockersFor(p)) blockers.push(c);
  }
  for (const p of props) {
    const c = propCollider(p);
    if (!c) continue;
    colliders.push(c);
    if (p.kind === 'rom') blockers.push(c);
  }
  // Hàng rào tre quanh rìa: chuỗi hộp mỏng theo từng đoạn
  for (const c of fenceColliders()) colliders.push(c);
  // Sông: hai khối nước hai bên bến tàu, khối chắn cuối bến, và vách hai bên cầu tàu (dốc và sàn) để không bước lên sàn từ bên hông;
  // chỉ chừa lối lên cầu ở đầu dốc.
  if (!world) {
    const waterH = 0.3;
    const rail = (x0: number, x1: number, z0: number, z1: number) => ({ shape: box(x0, x1, z0, z1), height: DECK_TOP });
    colliders.push(
      { shape: box(-130, RIVER_X, DOCK_HALF_WIDTH, 130), height: waterH },
      { shape: box(-130, RIVER_X, -130, -DOCK_HALF_WIDTH), height: waterH },
      { shape: box(-130, DOCK_END_X, -DOCK_HALF_WIDTH, DOCK_HALF_WIDTH), height: waterH },
      rail(RIVER_X, RAMP_START_X, DOCK_HALF_WIDTH, DOCK_HALF_WIDTH + 0.5),
      rail(RIVER_X, RAMP_START_X, -DOCK_HALF_WIDTH - 0.5, -DOCK_HALF_WIDTH),
    );
  }

  const villagerPaths = VILLAGER_PATHS.map((p) => p.map((q) => [q[0], q[1]] as [number, number]));
  const merchant = { ...MERCHANT };
  colliders.push({ shape: circle(merchant.x, merchant.z, 0.45), height: 1.7 });
  const obstacles = colliders.map((c) => c.shape);
  return { seed, placements, props, roads, colliders, obstacles, blockers, villagerPaths, merchant };
}
