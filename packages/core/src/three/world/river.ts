/**
 * Dòng sông của thế giới mở (mốc 2, bước X3). Hàm thuần, không import three.
 *
 * Từ bước X3 mỗi làng có chỗ bán kính 125 sau cổng (tâm làng cách tâm chợ 197), nên sông không còn chạy thẳng bắc nam cắt qua Làng Giấy và Làng Dệt. Sông vẫn chạy phía đông chợ: một
 * đoạn thân thẳng rộng 15 ở x = −44,5 (bờ chợ −37, bờ kia −52, cầu gỗ ở giữa, đúng như trước), dài tới z = ±40, rồi uốn ra hai nhánh: nhánh đông bắc đi qua khe giữa Làng Giấy và Làng Bạc, nhánh
 * đông nam đi qua khe giữa Làng Dệt và Làng Bạc (đối xứng qua trục x), thu hẹp còn 9 và chạy ra tới rìa thế giới. Khe giữa hai làng chỉ rộng chừng 28 (hai vòng bán kính 125 cách nhau 28,6 ở điểm gần nhất),
 * nên đường tim sông đi đúng qua điểm giữa khe (−98,5; ±98,5).
 */
import type { CameraBlocker } from '../cameraCollision';
import { box, obox } from '../collision';
import { createMulberry32 } from '../../lib/rng';
import type { PropPlacement } from '../cho/marketLayout';
import { DOCK_HALF_WIDTH } from '../cho/marketLayout';

/** Bờ sông phía chợ (như bến tàu cũ) và bờ bên kia ở đoạn thân thẳng; giữa hai bờ là nước. */
export const RIVER_WEST_X = -37;
export const RIVER_EAST_X = -52;
export const RIVER_CENTER_X = (RIVER_WEST_X + RIVER_EAST_X) / 2;
export const RIVER_TRUNK_WIDTH = RIVER_WEST_X - RIVER_EAST_X;
/** Đoạn thân thẳng chạy tới z = ±bấy nhiêu; từ đó sông uốn ra hai nhánh. */
export const RIVER_TRUNK_HALF = 40;
/** Nửa bề rộng cầu (xem worldLayout): nước chừa lối cho cầu ở đoạn thân. */
export const RIVER_BRIDGE_HALF = DOCK_HALF_WIDTH;

export interface RiverPoint {
  x: number;
  z: number;
  /** Bề rộng đầy đủ của nước tại điểm này */
  w: number;
}

/** Điểm điều khiển nhánh đông bắc (z > 0), từ cuối đoạn thân ra tới rìa thế giới. Nhánh đông nam là ảnh qua trục x (z → −z). */
const NE_CONTROL: readonly RiverPoint[] = [
  { x: RIVER_CENTER_X, z: 24, w: RIVER_TRUNK_WIDTH },
  { x: RIVER_CENTER_X, z: RIVER_TRUNK_HALF, w: RIVER_TRUNK_WIDTH },
  { x: -48, z: 60, w: 12 },
  { x: -58, z: 75, w: 10 },
  { x: -75, z: 84, w: 9.5 },
  { x: -90, z: 94, w: 9 },
  { x: -98.5, z: 98.5, w: 9 },
  { x: -130, z: 130, w: 9 },
  { x: -200, z: 200, w: 9 },
  { x: -268, z: 268, w: 9 },
];

/** Khoảng cách giữa hai mẫu liên tiếp trên đường tim đã làm mượt. */
export const RIVER_SAMPLE_SPACING = 4;

/** Nội suy Catmull-Rom hướng tâm (alpha 0,5) giữa p1 và p2; p0, p3 là hai điểm hai bên. */
function centripetal(p0: RiverPoint, p1: RiverPoint, p2: RiverPoint, p3: RiverPoint, t: number): RiverPoint {
  const d = (a: RiverPoint, b: RiverPoint) => Math.max(1e-6, Math.hypot(a.x - b.x, a.z - b.z) ** 0.5);
  const t0 = 0;
  const t1 = t0 + d(p0, p1);
  const t2 = t1 + d(p1, p2);
  const t3 = t2 + d(p2, p3);
  const u = t1 + (t2 - t1) * t;
  const lerp = (a: RiverPoint, b: RiverPoint, ta: number, tb: number): RiverPoint => {
    const k = (u - ta) / (tb - ta);
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, w: a.w + (b.w - a.w) * k };
  };
  const a1 = lerp(p0, p1, t0, t1);
  const a2 = lerp(p1, p2, t1, t2);
  const a3 = lerp(p2, p3, t2, t3);
  const b1 = lerp(a1, a2, t0, t2);
  const b2 = lerp(a2, a3, t1, t3);
  return lerp(b1, b2, t1, t2);
}

/** Làm mượt đường điều khiển bằng Catmull-Rom hướng tâm, lấy mẫu cách nhau khoảng `spacing`. Đi qua mọi điểm điều khiển. */
export function smoothPath(control: readonly RiverPoint[], spacing: number = RIVER_SAMPLE_SPACING): RiverPoint[] {
  const out: RiverPoint[] = [control[0]];
  for (let i = 0; i < control.length - 1; i++) {
    const p1 = control[i];
    const p2 = control[i + 1];
    const p0 = control[i - 1] ?? { x: 2 * p1.x - p2.x, z: 2 * p1.z - p2.z, w: p1.w };
    const p3 = control[i + 2] ?? { x: 2 * p2.x - p1.x, z: 2 * p2.z - p1.z, w: p2.w };
    const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / spacing));
    for (let k = 1; k <= n; k++) out.push(k === n ? p2 : centripetal(p0, p1, p2, p3, k / n));
  }
  return out;
}

/** Đường tim đã làm mượt của một nhánh: 'ne' (z > 0, đi qua khe Giấy–Bạc) hay 'se' (z < 0, khe Dệt–Bạc). Bắt đầu từ z = ±24, gối lên đoạn thân (đoạn thân kết thúc ở z = ±40) cho liền nét. */
export function riverBranch(side: 'ne' | 'se'): RiverPoint[] {
  const pts = smoothPath(NE_CONTROL);
  return side === 'ne' ? pts : pts.map((p) => ({ x: p.x, z: -p.z, w: p.w }));
}

/** Khoảng cách từ (x, z) tới đoạn thẳng a–b. */
function distToSegment(x: number, z: number, a: RiverPoint, b: RiverPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2));
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

/**
 * Khoảng cách từ (x, z) tới mép nước gần nhất: âm hoặc 0 khi đang ở trong nước (đoạn thân và hai nhánh), dương khi ở trên bờ. Đoạn thân chỉ tính trong |z| ≤ `RIVER_TRUNK_HALF`.
 */
export function riverEdgeDistance(x: number, z: number): number {
  let best = Infinity;
  if (Math.abs(z) <= RIVER_TRUNK_HALF) best = Math.abs(x - RIVER_CENTER_X) - RIVER_TRUNK_WIDTH / 2;
  for (const side of ['ne', 'se'] as const) {
    const pts = riverBranch(side);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      best = Math.min(best, distToSegment(x, z, a, b) - (a.w + b.w) / 4);
    }
  }
  return best;
}

/** Hộp xoay phủ đoạn a–b của dòng nước (nửa dài dư một chút để các hộp liên tiếp gối nhau), nửa rộng bằng nửa bề rộng nước. */
function segmentBox(a: RiverPoint, b: RiverPoint, height: number): CameraBlocker {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const yaw = Math.atan2(b.x - a.x, b.z - a.z); // trục z của hộp dọc theo đoạn
  // obox(x, z, hx, hz, yaw): hx theo trục x của hộp, hz theo trục z; quay yaw (như rotation.y) đưa trục z của hộp về hướng (sin yaw, cos yaw)
  return { shape: obox((a.x + b.x) / 2, (a.z + b.z) / 2, (a.w + b.w) / 4, len / 2 + 0.6, yaw), height };
}

/**
 * Vật cản của sông: ở đoạn thân là hai khối nước hai bên cầu (người chơi không xuống nước; chừa lối cho cầu ở |z| ≤ nửa bề rộng cầu), ở hai nhánh là chuỗi hộp xoay phủ dòng nước.
 * Vách hai bên hai đầu dốc cầu (không bước lên cầu từ bên hông) do `worldLayout` thêm vào.
 */
export function riverWaterColliders(waterHeight = 0.3): CameraBlocker[] {
  const out: CameraBlocker[] = [
    { shape: box(RIVER_EAST_X, RIVER_WEST_X, RIVER_BRIDGE_HALF, RIVER_TRUNK_HALF + 1), height: waterHeight },
    { shape: box(RIVER_EAST_X, RIVER_WEST_X, -RIVER_TRUNK_HALF - 1, -RIVER_BRIDGE_HALF), height: waterHeight },
  ];
  for (const side of ['ne', 'se'] as const) {
    const pts = riverBranch(side);
    for (let i = 0; i + 1 < pts.length; i++) out.push(segmentBox(pts[i], pts[i + 1], waterHeight));
  }
  return out;
}

/** Dải nước để dựng mặt lưới: mỗi mẫu hai đỉnh (bờ trái, bờ phải), tọa độ uv chạy dọc theo chiều dài (lặp mỗi `uvLength` đơn vị) và ngang từ 0 đến 1. */
export interface Ribbon {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

export function ribbonOf(points: readonly RiverPoint[], uvLength = 24, widthScale = 1): Ribbon {
  const n = points.length;
  const positions = new Float32Array(n * 6);
  const uvs = new Float32Array(n * 4);
  const indices = new Uint32Array((n - 1) * 6);
  let run = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    // pháp tuyến ngang (quay tiếp tuyến 90 độ)
    const nx = -tz / len;
    const nz = tx / len;
    const hw = (p.w * widthScale) / 2;
    positions.set([p.x + nx * hw, 0, p.z + nz * hw, p.x - nx * hw, 0, p.z - nz * hw], i * 6);
    if (i > 0) run += Math.hypot(p.x - points[i - 1].x, p.z - points[i - 1].z);
    uvs.set([0, run / uvLength, 1, run / uvLength], i * 4);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    // hai tam giác hướng lên (+y)
    indices.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], i * 6);
  }
  return { positions, uvs, indices };
}

/**
 * Đá hai bờ sông (vật cản tròn như đá bờ chợ trước đây): rải dọc theo đường tim, hai bên, cách mép nước chừng 0,6 đến 1,6, bỏ chỗ gần cầu. Cùng `seed` cùng kết quả.
 * Đoạn thân (|z| ≤ 40) cũng được rải ở đây (chợ không còn tự rải đá bờ trong thế giới mở).
 */
export function riverRocks(seed: number): PropPlacement[] {
  const rng = createMulberry32(seed ^ 0x68e31da4);
  const out: PropPlacement[] = [];
  const put = (x: number, z: number) => {
    const scale = 0.6 + rng() * 0.9;
    const grey = 0.8 + rng() * 0.2;
    out.push({ kind: 'da', x, z, yaw: rng() * 6, scale, tint: [grey, grey, grey] });
  };
  // đoạn thân: hai bờ (x = −37 và x = −52)
  for (let z = -RIVER_TRUNK_HALF; z <= RIVER_TRUNK_HALF; z += 120 / 23) {
    if (Math.abs(z) < RIVER_BRIDGE_HALF + 2.5) continue;
    put(RIVER_WEST_X + 0.9 + rng() * 0.8, z + (rng() - 0.5) * 3);
    put(RIVER_EAST_X - 0.9 - rng() * 0.8, z + (rng() - 0.5) * 3);
  }
  for (const side of ['ne', 'se'] as const) {
    const pts = riverBranch(side);
    let acc = 0;
    for (let i = 1; i + 1 < pts.length; i++) {
      acc += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
      if (acc < 5.5) continue;
      acc = 0;
      const p = pts[i];
      const tx = pts[i + 1].x - pts[i - 1].x;
      const tz = pts[i + 1].z - pts[i - 1].z;
      const len = Math.hypot(tx, tz) || 1;
      const nx = -tz / len;
      const nz = tx / len;
      for (const s of [-1, 1]) {
        const off = p.w / 2 + 1 + rng() * 0.9;
        const along = (rng() - 0.5) * 2; // xê dịch dọc theo dòng, không làm đá lấn vào nước
        put(p.x + nx * off * s + (tx / len) * along, p.z + nz * off * s + (tz / len) * along);
      }
    }
  }
  return out;
}
