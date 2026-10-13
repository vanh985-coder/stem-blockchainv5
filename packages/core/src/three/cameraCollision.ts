/**
 * Camera tránh vật cản (mốc 2 bước 7): khi giữa nhân vật và camera có vật cao (nhà, cổng, cây đa, lều) thì kéo camera lại gần,
 * không xuyên tường. Hàm thuần trên đoạn thẳng từ điểm nhìn F (ngang ngực nhân vật) tới vị trí camera mong muốn C; mỗi vật cản là
 * một khối thẳng đứng (hình tròn, hộp hoặc hộp xoay trên mặt đất, cao `height`) nở ra thêm `margin`. Không cấp phát.
 */
import type { Obstacle } from './collision';

export interface CameraBlocker {
  /** Dấu chân trên mặt đất */
  shape: Obstacle;
  /** Chiều cao khối: đoạn thẳng đi phía trên đỉnh thì không bị chặn */
  height: number;
}

/** Camera cách vật cản ít nhất bấy nhiêu. */
export const CAMERA_MARGIN = 0.5;
/** Camera không bao giờ gần nhân vật hơn mức này, dù bị chặn (đơn vị cảnh). */
export const CAMERA_MIN_DISTANCE = 1.8;

/**
 * Khoảng [t0, t1] (theo tham số của đoạn thẳng P0 + t·D, t trong [0, 1]) mà đoạn thẳng nằm trong dấu chân của vật cản nở thêm
 * `margin`, trên mặt phẳng ngang; trả về false nếu không cắt. Ghi kết quả vào `out`.
 */
function horizontalSpan(p0x: number, p0z: number, dx: number, dz: number, shape: Obstacle, margin: number, out: { t0: number; t1: number }): boolean {
  if (shape.type === 'circle') {
    const r = shape.r + margin;
    const ox = p0x - shape.x;
    const oz = p0z - shape.z;
    const a = dx * dx + dz * dz;
    if (a < 1e-12) return false;
    const b = 2 * (ox * dx + oz * dz);
    const c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return false;
    const sq = Math.sqrt(disc);
    const t0 = (-b - sq) / (2 * a);
    const t1 = (-b + sq) / (2 * a);
    if (t1 < 0 || t0 > 1) return false;
    out.t0 = Math.max(0, t0);
    out.t1 = Math.min(1, t1);
    return true;
  }
  // hộp: đưa về hệ tọa độ của hộp (hộp theo trục thì giữ nguyên), rồi cắt theo hai cặp mặt phẳng
  let ox: number;
  let oz: number;
  let ddx: number;
  let ddz: number;
  let minX: number;
  let maxX: number;
  let minZ: number;
  let maxZ: number;
  if (shape.type === 'box') {
    ox = p0x;
    oz = p0z;
    ddx = dx;
    ddz = dz;
    minX = shape.minX - margin;
    maxX = shape.maxX + margin;
    minZ = shape.minZ - margin;
    maxZ = shape.maxZ + margin;
  } else {
    const cos = Math.cos(shape.yaw);
    const sin = Math.sin(shape.yaw);
    const rx = p0x - shape.x;
    const rz = p0z - shape.z;
    ox = rx * cos - rz * sin;
    oz = rx * sin + rz * cos;
    ddx = dx * cos - dz * sin;
    ddz = dx * sin + dz * cos;
    minX = -shape.hx - margin;
    maxX = shape.hx + margin;
    minZ = -shape.hz - margin;
    maxZ = shape.hz + margin;
  }
  let t0 = 0;
  let t1 = 1;
  if (Math.abs(ddx) < 1e-12) {
    if (ox < minX || ox > maxX) return false;
  } else {
    let a = (minX - ox) / ddx;
    let b = (maxX - ox) / ddx;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (Math.abs(ddz) < 1e-12) {
    if (oz < minZ || oz > maxZ) return false;
  } else {
    let a = (minZ - oz) / ddz;
    let b = (maxZ - oz) / ddz;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
  }
  if (t0 > t1) return false;
  out.t0 = t0;
  out.t1 = t1;
  return true;
}

const span = { t0: 0, t1: 0 };

/**
 * Phần của đoạn thẳng F → C mà camera được đi tới (từ 0 đến 1): 1 là không bị chặn. Camera dừng ở mép vật cản đầu tiên (đã nở thêm
 * `margin`) mà đoạn thẳng đi vào thấp hơn đỉnh của nó; không bao giờ gần F hơn `CAMERA_MIN_DISTANCE`.
 */
export function cameraClearance(fx: number, fy: number, fz: number, cx: number, cy: number, cz: number, blockers: readonly CameraBlocker[], margin: number = CAMERA_MARGIN): number {
  const dx = cx - fx;
  const dy = cy - fy;
  const dz = cz - fz;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-9) return 1;
  let hit = 1;
  for (let i = 0; i < blockers.length; i++) {
    const b = blockers[i];
    if (!horizontalSpan(fx, fz, dx, dz, b.shape, margin, span)) continue;
    // chiều đứng: bị chặn nếu trong đoạn [t0, t1] có chỗ thấp hơn đỉnh vật cản
    let tb: number;
    if (Math.abs(dy) < 1e-9) {
      if (fy >= b.height) continue;
      tb = span.t0;
    } else if (dy > 0) {
      if (fy + dy * span.t0 >= b.height) continue; // đi lên: thấp nhất là lúc vào, đã ở trên đỉnh
      tb = span.t0;
    } else {
      if (fy + dy * span.t1 >= b.height) continue; // đi xuống: thấp nhất là lúc ra
      tb = Math.max(span.t0, (b.height - fy) / dy);
    }
    if (tb < hit) hit = tb;
  }
  const min = Math.min(1, CAMERA_MIN_DISTANCE / len);
  return Math.max(min, hit);
}
