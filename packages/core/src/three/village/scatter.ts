/**
 * Đồ rải của làng lớn (mốc 2, bước X3): bụi tre dựng bằng code (lũy tre quanh làng, đồi tre), cây ăn quả ở vườn, phên phơi giấy của sân phơi lớn, đồi nhỏ, cầu ao. Làng bán kính 125 cần hàng trăm món
 * nhưng nhẹ (mỗi món vài chục đến vài trăm tam giác) nên không dùng model có sẵn (bụi tre model nặng 41.700 tam giác ở gần và 7.900 ở xa, nhà 8.000 ở xa). Hàm thuần, không import three: dữ liệu đặt, cỡ thật,
 * vật cản và cách chia mảnh để chỉ vẽ phần ở gần người chơi (xem `chunkScatter`).
 */
import type { CameraBlocker } from '../cameraCollision';
import { circle, obox } from '../collision';

export type ScatterKind = 'tre' | 'cay-qua' | 'phen' | 'cau-ao' | 'doi';

export const SCATTER_KINDS: readonly ScatterKind[] = ['tre', 'cay-qua', 'phen', 'cau-ao', 'doi'];

export interface ScatterPlacement {
  kind: ScatterKind;
  x: number;
  z: number;
  yaw: number;
  /** Nhân vào cỡ chuẩn của loại (đồi: bán kính chân của đồi) */
  scale: number;
  /** Nhân thêm theo chiều cao (đồi: cao = scale × sy); bỏ trống là 1 */
  sy?: number;
  tint: readonly [number, number, number];
  /** Có vật cản không (mặc định theo loại: xem `SCATTER_SIZES`); lũy tre quanh làng có vật cản riêng (`ringColliders`) nên đặt false từng bụi */
  collide?: boolean;
}

export interface ScatterSize {
  /** Bán kính hình tròn bao chân ở tỉ lệ 1 (giữ khoảng cách khi xếp, làm vật cản tròn) */
  r: number;
  /** Chiều cao ở tỉ lệ 1 */
  h: number;
  /** Vật cản hộp xoay (nửa rộng hx, nửa sâu hz) thay cho vật cản tròn */
  box?: { hx: number; hz: number };
  /** Mặc định có vật cản hay không */
  collide: boolean;
  /** Vật cản tròn chỉ ở thân (bán kính thân), nhỏ hơn bán kính bao tán (cây ăn quả) */
  trunk?: number;
}

/**
 * Cỡ thật của từng loại, khớp hình dựng (scatterGeometry.ts, có test). Bụi tre: 5 thân, tán rộng 3,6; cây ăn quả: thân 0,35 và tán tròn 2,2; phên: giá 2,4 × 1,6 cao 0,9 (mỏng, đi qua được giữa các phên
 * nhưng có vật cản hộp để không đi xuyên giá); cầu ao: sàn ván 3 × 5 cao 0,35 (đi lên được: không có vật cản); đồi: nửa quả cầu dẹt (scale là bán kính chân, cao scale × sy).
 */
export const SCATTER_SIZES: Readonly<Record<ScatterKind, ScatterSize>> = {
  tre: { r: 1.8, h: 7, collide: true, trunk: 0.9 },
  'cay-qua': { r: 2.2, h: 3.95, collide: true, trunk: 0.4 },
  phen: { r: Math.hypot(1.2, 0.8), h: 0.92, box: { hx: 1.2, hz: 0.8 }, collide: true },
  'cau-ao': { r: Math.hypot(1.5, 2.5), h: 0.35, collide: false },
  doi: { r: 1, h: 1, collide: true },
};

/** Vật cản của một món rải, hoặc null nếu không có. Đồi: hình tròn bằng chân đồi, cao bằng đồi; cây và bụi tre: hình tròn ở thân. */
export function scatterCollider(p: ScatterPlacement): CameraBlocker | null {
  const s = SCATTER_SIZES[p.kind];
  if (!(p.collide ?? s.collide)) return null;
  if (p.kind === 'doi') return { shape: circle(p.x, p.z, p.scale), height: p.scale * (p.sy ?? 1) };
  if (s.box) return { shape: obox(p.x, p.z, s.box.hx * p.scale, s.box.hz * p.scale, p.yaw), height: s.h * p.scale };
  return { shape: circle(p.x, p.z, (s.trunk ?? s.r) * p.scale), height: s.h * p.scale };
}

/** Bán kính bao chân của một món (giữ khoảng cách khi xếp): đồi là bán kính chân; còn lại theo loại nhân tỉ lệ. */
export function scatterRadius(p: Pick<ScatterPlacement, 'kind' | 'scale'>): number {
  return p.kind === 'doi' ? p.scale : SCATTER_SIZES[p.kind].r * p.scale;
}

/**
 * Lũy tre quanh làng: vật cản là chuỗi hộp xoay dài dọc theo vòng bán kính `radius` quanh `center`, bỏ những đoạn ở trong `gap` quanh điểm `gate` (lối vào). Mỗi hộp dày `thickness` (nửa bề dày
 * `thickness / 2`) và dài vừa đủ nối tiếp, cao `height`. Số đoạn: 64 cho cả vòng (đoạn dài ~12 ở bán kính 122).
 */
export function ringColliders(center: { x: number; z: number }, radius: number, gate: { x: number; z: number }, gap: number, segments = 64, thickness = 2.4, height = 6): CameraBlocker[] {
  const out: CameraBlocker[] = [];
  const half = (Math.PI * radius) / segments + 0.2;
  for (let i = 0; i < segments; i++) {
    const a = ((i + 0.5) / segments) * Math.PI * 2;
    const x = center.x + Math.cos(a) * radius;
    const z = center.z + Math.sin(a) * radius;
    if (Math.hypot(x - gate.x, z - gate.z) < gap + half) continue;
    // trục x của hộp là tiếp tuyến của vòng: (−sin a, cos a); rotation.y đưa trục x về (cos yaw, −sin yaw) nên yaw = a + π/2... (cos(a+π/2), −sin(a+π/2)) = (−sin a, −cos a): lấy yaw = −(a + π/2) = hướng (cos, sin)
    out.push({ shape: obox(x, z, half, thickness / 2, -(a + Math.PI / 2)), height });
  }
  return out;
}

export interface ScatterChunk<T> {
  /** Chỉ số ô lưới */
  cx: number;
  cz: number;
  /** Tâm và bán kính hình cầu bao (trên mặt phẳng ngang) của mọi món trong mảnh, tính cả bán kính từng món */
  x: number;
  z: number;
  r: number;
  items: T[];
}

/**
 * Chia các món thành mảnh theo ô lưới vuông cạnh `cell`: mỗi mảnh vẽ bằng một InstancedMesh riêng nên three tự cắt những mảnh ngoài khung nhìn, và nơi dùng ẩn cả mảnh khi xa người chơi.
 * Thứ tự mảnh và thứ tự món trong mảnh theo thứ tự gặp (cùng đầu vào cùng kết quả).
 */
export function chunkScatter<T extends { x: number; z: number }>(items: readonly T[], cell: number, radiusOf: (item: T) => number): ScatterChunk<T>[] {
  const map = new Map<string, ScatterChunk<T>>();
  for (const it of items) {
    const cx = Math.floor(it.x / cell);
    const cz = Math.floor(it.z / cell);
    const key = `${cx},${cz}`;
    let c = map.get(key);
    if (!c) {
      c = { cx, cz, x: 0, z: 0, r: 0, items: [] };
      map.set(key, c);
    }
    c.items.push(it);
  }
  const chunks = [...map.values()];
  for (const c of chunks) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let rad = 0;
    for (const it of c.items) {
      const r = radiusOf(it);
      rad = Math.max(rad, r);
      minX = Math.min(minX, it.x);
      maxX = Math.max(maxX, it.x);
      minZ = Math.min(minZ, it.z);
      maxZ = Math.max(maxZ, it.z);
    }
    c.x = (minX + maxX) / 2;
    c.z = (minZ + maxZ) / 2;
    c.r = Math.hypot(maxX - minX, maxZ - minZ) / 2 + rad;
  }
  return chunks;
}

/** Tầm vẽ xa nhất (tính tới mặt mảnh) của từng loại ở từng mức chất lượng; Thấp ngắn nhất để giữ dưới 270.000 tam giác. */
export const SCATTER_MAX_DISTANCE: Readonly<Record<'low' | 'medium' | 'high', Readonly<Record<ScatterKind, number>>>> = {
  low: { tre: 60, 'cay-qua': 55, phen: 42, 'cau-ao': 70, doi: 120 },
  medium: { tre: 100, 'cay-qua': 85, phen: 70, 'cau-ao': 120, doi: 240 },
  high: { tre: 160, 'cay-qua': 140, phen: 115, 'cau-ao': 180, doi: 300 },
};

/** Tầm vẽ xa nhất (tính tới mặt mảnh) của đồ nhỏ do `MarketProps` vẽ trong làng lớn (hoa, chum, rơm, bể ngâm, đình...): Thấp 55, Vừa 90, Cao 130. */
export const PROPS_MAX_DISTANCE: Readonly<Record<'low' | 'medium' | 'high', number>> = { low: 55, medium: 90, high: 130 };

/**
 * Tầm vẽ xa nhất của các model nhà, lều, cây, giếng trong vùng làng lớn (bước X3) ở mức Vừa và Cao: sương ở 90 đến 300 nên xa hơn thế gần như chỉ còn là màu sương. Mức Thấp giữ tầm của chợ (38).
 * Giữ làng bán kính 125 dưới 1.000.000 tam giác ở mức Vừa (nhà ở xa vẫn là bản xa 8.000 tam giác mỗi nhà).
 */
export const VILLAGE_MODEL_MAX_DISTANCE: Readonly<Record<'medium' | 'high', number>> = { medium: 170, high: 240 };

/** Mảnh có nằm trong tầm vẽ không: khoảng cách từ người chơi tới mặt hình cầu bao dưới `maxDistance`. Không cấp phát. */
export function chunkInRange(chunkX: number, chunkZ: number, chunkR: number, px: number, pz: number, maxDistance: number): boolean {
  return Math.hypot(chunkX - px, chunkZ - pz) - chunkR < maxDistance;
}
