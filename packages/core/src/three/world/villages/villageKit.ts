/**
 * Bộ dụng cụ dùng chung để xếp một làng lớn (bán kính 125, mốc 3 bước L1): hàm dựng nhà, đồ nhỏ, đồ rải; khoảng cách tới đường và lối đi; và bộ rải đồ phụ có hạt giống (`createFiller`): lũy tre, bụi tre ở cổng
 * và đồi, vườn cây ăn quả, khóm tre, hoa quanh nhà, đại lộ, ao và sân. Tách từ `giay.ts` (bố cục Làng Giấy không đổi một vị trí nào: xem test "bố cục không đổi" ở `giay.test.ts`) để Làng Dệt và các làng sau dùng lại.
 * Chỉ là dữ liệu và hàm thuần (không import three). Thứ tự gọi `rng` trong từng hàm giữ NGUYÊN như bản gốc: đổi thứ tự là đổi cả làng.
 */
import type { createMulberry32 } from '../../../lib/rng';
import { footprintRadiusOf } from '../../cho/footprints';
import { MODEL_HOUSE_THATCH, MODEL_HOUSE_TILE, PROP_SIZES, type Placement, type PropKind, type PropPlacement } from '../../cho/marketLayout';
import { scatterRadius, type ScatterPlacement } from '../../village/scatter';
import type { VillageField, VillagePaths, VillagePond, VillageRoad, VillagerLoop } from '../../village/villageLayout';

export type Rng = ReturnType<typeof createMulberry32>;
export type Tint = readonly [number, number, number];

// ---------------------------------------------------------------------------
// Hàm dựng

/** Nhà đặt ở (x, z), mặt trước (+Z của model) quay về điểm `face`, xoay thêm `twist`. */
export function house(model: string, x: number, z: number, face: readonly [number, number], scale: number, tint: Tint, twist: number): Placement {
  return { model, x, z, yaw: Math.atan2(face[0] - x, face[1] - z) + twist, scale, tint };
}

export const tile = (x: number, z: number, face: readonly [number, number], scale: number, tint: Tint, twist = 0): Placement => house(MODEL_HOUSE_TILE, x, z, face, scale, tint, twist);
export const thatch = (x: number, z: number, face: readonly [number, number], scale: number, tint: Tint, twist = 0): Placement => house(MODEL_HOUSE_THATCH, x, z, face, scale, tint, twist);

export const prop = (kind: PropKind, x: number, z: number, yaw = 0, scale = 1, tint: Tint = [1, 1, 1]): PropPlacement => ({ kind, x, z, yaw, scale, tint });
export const scatter = (kind: ScatterPlacement['kind'], x: number, z: number, scale = 1, yaw = 0, tint: Tint = [1, 1, 1], extra: Partial<ScatterPlacement> = {}): ScatterPlacement => ({ kind, x, z, yaw, scale, tint, ...extra });

// ---------------------------------------------------------------------------
// Chỗ chiếm (vòng tròn bao chân) và khoảng cách

export interface Spot {
  x: number;
  z: number;
  r: number;
}

/** Vòng tròn bao chân của các model đặt (nhà, cây, giếng, lều...). */
export const placementSpots = (list: readonly Placement[]): Spot[] => list.map((p) => ({ x: p.x, z: p.z, r: footprintRadiusOf(p.model) * p.scale }));

/** Vòng tròn bao chân của đồ nhỏ do code dựng; bỏ chân giá và mặt nước (nằm dưới/trên vật khác) cùng các loại `skip`. */
export function propSpots(list: readonly PropPlacement[], skip: readonly PropKind[] = ['chan', 'nuoc']): Spot[] {
  const out: Spot[] = [];
  for (const p of list) {
    if (skip.includes(p.kind)) continue;
    out.push({ x: p.x, z: p.z, r: PROP_SIZES[p.kind].r * p.scale });
  }
  return out;
}

export const scatterSpots = (list: readonly ScatterPlacement[]): Spot[] => list.map((s) => ({ x: s.x, z: s.z, r: scatterRadius(s) }));

/** Khoảng cách từ (x, z) tới đoạn thẳng (ax, az)-(bx, bz). */
export function distToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
  return Math.hypot(x - (ax + dx * t), z - (az + dz * t));
}

/** Khoảng cách từ (x, z) tới mép con đường (bằng 0 nếu nằm trên đường). */
export function distToRoad(x: number, z: number, r: VillageRoad): number {
  return Math.max(0, distToSegment(x, z, r.x0, r.z0, r.x1, r.z1) - r.width / 2);
}

/** Khoảng cách tới lối đi của dân làng và tới các đoạn đường nhỏ của mũi tên: đồ rải không được chắn các lối này. */
export function distToLanes(x: number, z: number, villagers: readonly VillagerLoop[], paths: VillagePaths): number {
  let best = Infinity;
  for (const loop of villagers)
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      best = Math.min(best, distToSegment(x, z, a[0], a[1], b[0], b[1]));
    }
  const byId = new Map(paths.nodes.map((n) => [n.id, n]));
  for (const [p, q] of paths.links) {
    const a = byId.get(p)!;
    const b = byId.get(q)!;
    best = Math.min(best, distToSegment(x, z, a.x, a.z, b.x, b.z));
  }
  for (const s of paths.scrollStands ?? []) {
    const j = byId.get(s.join)!;
    best = Math.min(best, distToSegment(x, z, j.x, j.z, s.x, s.z));
  }
  const g = paths.guideStand;
  if (!g) return best;
  const j = byId.get(g.join)!;
  return Math.min(best, distToSegment(x, z, j.x, j.z, g.x, g.z));
}

// ---------------------------------------------------------------------------
// Bộ rải đồ phụ

export interface FillerEnv {
  /** Bán kính lũy tre (tâm các bụi) và z của tâm cổng (hệ làng) */
  wallRadius: number;
  gateZ: number;
  /** Đồ không được vượt qua bán kính này (tính cả cỡ chân): còn chừa chỗ cho lũy tre */
  keepInside: number;
  /** Chỗ đã có đồ (neo): nhà, đồ nhỏ, biển, ao, thẻ... Hàm rải thêm vào đây khi đặt món mới. */
  taken: Spot[];
  roads: readonly VillageRoad[];
  fields: readonly VillageField[];
  yards: readonly { x: number; z: number; r: number }[];
  villagers: readonly VillagerLoop[];
  paths: VillagePaths;
}

export interface Filler {
  scatter: ScatterPlacement[];
  props: PropPlacement[];
  placements: Placement[];
  /** Có chỗ trống cho món bán kính r ở (x, z) không (trong `limit`, ngoài lối quanh cổng, không đè đồ đã đặt, đường, lối đi, ruộng, sân nhỏ). */
  onGround(x: number, z: number, r: number, limit?: number): boolean;
  putScatter(p: ScatterPlacement, limit?: number): boolean;
  putProp(p: PropPlacement, r: number): boolean;
  /** Thêm đồi (không kiểm chỗ, chỉ giữ chỗ cho các món sau). */
  addHills(list: readonly ScatterPlacement[]): void;
  /** Lũy tre quanh làng: hai hàng so le, chừa lối quanh cổng (vật cản của lũy là chuỗi hộp nên từng bụi không có vật cản). */
  wallRing(rng: Rng): void;
  /** Bụi tre hai bên đại lộ gần cổng. */
  gateBamboo(rng: Rng): void;
  /** Đồi tre: hai vòng bụi quanh chân mỗi đồi. */
  hillBamboo(rng: Rng, hills: readonly ScatterPlacement[]): void;
  /** Vườn cây ăn quả: lưới có xô lệch. */
  orchard(rng: Rng, x0: number, x1: number, z0: number, z1: number, step: number): void;
  /** Tre rải trong làng (khóm nhỏ ở góc trống), tâm làng là gốc tọa độ. */
  scatterBamboo(rng: Rng, count: number, radiusMin: number, radiusSpan: number): void;
  /** Quanh mỗi nhà ở: khóm hoa, chum vại, đôi khi đống rơm. */
  houseFlora(rng: Rng, houses: readonly Placement[]): void;
  /** Khóm hoa dọc đại lộ (hai bên, theo z từ cổng). */
  avenueFlora(rng: Rng, count: number): void;
  /** Khóm hoa quanh bờ các ao (lần lượt từng ao). */
  pondFlora(rng: Rng, ponds: readonly VillagePond[], count: number): void;
  /** Khóm hoa rải quanh một tâm (sân đình...). */
  circleFlora(rng: Rng, cx: number, cz: number, count: number, dMin: number, dSpan: number): void;
  /** Đá ven bờ ao (khối đá nhỏ nằm ngay trên bờ cỏ, sát mép nước): khác khóm hoa ở chỗ được đặt sát ao (ao chỉ giữ chỗ trống quanh nó cho hoa và cây). Không đè đồ đã đặt, đường, lối đi, các vũng khác. */
  pondStones(rng: Rng, ponds: readonly VillagePond[], count: number): void;
}

export function createFiller(env: FillerEnv): Filler {
  const scat: ScatterPlacement[] = [];
  const props: PropPlacement[] = [];
  const placements: Placement[] = [];
  const taken = env.taken;
  const onGround = (x: number, z: number, r: number, limit: number = env.keepInside): boolean => {
    if (Math.hypot(x, z) + r > limit) return false;
    if (Math.hypot(x, z - env.gateZ) < 10) return false; // lối quanh cổng
    for (const t of taken) if (Math.hypot(x - t.x, z - t.z) < t.r + r + 0.4) return false;
    for (const rd of env.roads) if (distToRoad(x, z, rd) < r + 0.5) return false;
    if (distToLanes(x, z, env.villagers, env.paths) < r + 1.0) return false;
    for (const f of env.fields) if (Math.abs(x - f.x) < f.hx + r && Math.abs(z - f.z) < f.hz + r) return false;
    for (const y of env.yards) if (Math.hypot(x - y.x, z - y.z) < y.r - 1 && y.r < 12) return false; // sân nhỏ để trống
    return true;
  };
  const putScatter = (p: ScatterPlacement, limit: number = env.keepInside): boolean => {
    const r = scatterRadius(p) * (p.kind === 'tre' ? 0.7 : 1);
    if (!onGround(p.x, p.z, r, limit)) return false;
    scat.push(p);
    taken.push({ x: p.x, z: p.z, r });
    return true;
  };
  const putProp = (p: PropPlacement, r: number): boolean => {
    if (!onGround(p.x, p.z, r)) return false;
    props.push(p);
    taken.push({ x: p.x, z: p.z, r });
    return true;
  };
  return {
    scatter: scat,
    props,
    placements,
    onGround,
    putScatter,
    putProp,
    addHills(list) {
      for (const h of list) {
        scat.push(h);
        taken.push({ x: h.x, z: h.z, r: h.scale + 0.3 });
      }
    },
    wallRing(rng) {
      const ringN = Math.round((2 * Math.PI * env.wallRadius) / 3.3);
      for (let i = 0; i < ringN; i++) {
        for (const row of [0, 1]) {
          const a = ((i + row * 0.5 + (rng() - 0.5) * 0.3) / ringN) * Math.PI * 2;
          const rad = env.wallRadius + (row ? 1.3 : -0.5) + (rng() - 0.5) * 0.8;
          const x = Math.cos(a) * rad;
          const z = Math.sin(a) * rad;
          if (Math.hypot(x, z - env.gateZ) < 9.5) continue;
          const s = 1.15 + rng() * 0.35;
          scat.push(scatter('tre', x, z, s, rng() * 6.28, [0.94 + rng() * 0.06, 1, 0.94 + rng() * 0.06], { collide: false }));
        }
      }
    },
    gateBamboo(rng) {
      for (let k = 0; k < 8; k++) {
        for (const side of [-1, 1]) {
          putScatter(scatter('tre', side * (7.5 + rng() * 1.5), env.gateZ - 1 + k * 3.2 + (rng() - 0.5) * 1.2, 0.95 + rng() * 0.3, rng() * 6.28, [0.96, 1, 0.94]));
        }
      }
    },
    hillBamboo(rng, hills) {
      for (const h of hills) {
        for (const [ring, n] of [
          [h.scale + 2.6, 11],
          [h.scale + 5.4, 15],
        ] as const) {
          for (let k = 0; k < n; k++) {
            const a = ((k + rng() * 0.6) / n) * Math.PI * 2;
            const s = 0.9 + rng() * 0.45;
            putScatter(scatter('tre', h.x + Math.cos(a) * ring, h.z + Math.sin(a) * ring, s, rng() * 6.28, [0.95, 1, 0.94]));
          }
        }
      }
    },
    orchard(rng, x0, x1, z0, z1, step) {
      for (let z = z0; z <= z1; z += step) {
        for (let x = x0; x <= x1; x += step) {
          const k = 0.85 + rng() * 0.4;
          putScatter(scatter('cay-qua', x + (rng() - 0.5) * 1.6, z + (rng() - 0.5) * 1.6, k, rng() * 6.28, [0.9 + rng() * 0.1, 1, 0.9 + rng() * 0.1]), env.keepInside - 1);
        }
      }
    },
    scatterBamboo(rng, count, radiusMin, radiusSpan) {
      for (let k = 0; k < count; k++) {
        const a = rng() * Math.PI * 2;
        const rad = radiusMin + rng() * radiusSpan;
        putScatter(scatter('tre', Math.cos(a) * rad, Math.sin(a) * rad, 0.8 + rng() * 0.45, rng() * 6.28, [0.95, 1, 0.94]));
      }
    },
    houseFlora(rng, houses) {
      for (const h of houses) {
        const hr = footprintRadiusOf(h.model) * h.scale;
        for (let k = 0; k < 3; k++) {
          for (let tries = 0; tries < 12; tries++) {
            const a = rng() * Math.PI * 2;
            const d = hr + 0.9 + rng() * 1.3;
            const x = h.x + Math.cos(a) * d;
            const z = h.z + Math.sin(a) * d;
            const shade = 0.9 + rng() * 0.1;
            if (k === 0 && putProp(prop('hoa', x, z, 0, 0.95 + rng() * 0.3, [shade, shade - 0.02, shade]), 0.5)) break;
            if (k === 1 && putProp(prop('chum', x, z, 0, 0.9 + rng() * 0.2), PROP_SIZES.chum.r)) break;
            if (k === 2 && rng() < 0.45 && putProp(prop('rom', x, z, rng() * 3, 0.85 + rng() * 0.2), PROP_SIZES.rom.r * 0.9)) break;
            if (k === 2 && rng() >= 0.45) break;
          }
        }
      }
    },
    avenueFlora(rng, count) {
      for (let i = 0; i < count; i++) {
        const z = env.gateZ - 1 + i * 3;
        const side = i % 2 ? 1 : -1;
        putProp(prop('hoa', side * (3.8 + rng() * 0.8), z, 0, 0.95 + rng() * 0.25, [0.93, 0.93, 0.9]), 0.5);
      }
    },
    pondFlora(rng, ponds, count) {
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const p = ponds[i % ponds.length];
        putProp(prop('hoa', p.x + Math.cos(a) * (p.r + 1.9), p.z + Math.sin(a) * (p.r + 1.9), 0, 1, [0.92, 0.94, 0.9]), 0.5);
      }
    },
    pondStones(rng, ponds, count) {
      const isPond = (s: Spot) => ponds.some((q) => q.x === s.x && q.z === s.z);
      for (let i = 0; i < count; i++) {
        const p = ponds[i % ponds.length];
        const a = rng() * Math.PI * 2;
        const s = 0.55 + rng() * 0.4;
        const g = 0.9 + rng() * 0.1;
        const x = p.x + Math.cos(a) * (p.r + 1.15);
        const z = p.z + Math.sin(a) * (p.r + 1.15);
        const yaw = rng() * 3;
        const r = PROP_SIZES['khoi-da'].r * s;
        if (Math.hypot(x, z) + r > env.keepInside) continue;
        if (ponds.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + r + 0.3)) continue;
        if (taken.some((t) => !isPond(t) && Math.hypot(x - t.x, z - t.z) < t.r + r + 0.3)) continue;
        if (env.roads.some((rd) => distToRoad(x, z, rd) < r + 0.5)) continue;
        if (distToLanes(x, z, env.villagers, env.paths) < r + 1.0) continue;
        props.push(prop('khoi-da', x, z, yaw, s, [g, g, g]));
        taken.push({ x, z, r });
      }
    },
    circleFlora(rng, cx, cz, count, dMin, dSpan) {
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const d = dMin + rng() * dSpan;
        putProp(prop('hoa', cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0, 1, [0.93, 0.94, 0.9]), 0.5);
      }
    },
  };
}
