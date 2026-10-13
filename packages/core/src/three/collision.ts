/**
 * Va chạm ở cảnh đi lại (spec 03 mục 3.7). Hàm thuần trên mặt phẳng đất (x, z); không import three, không cấp phát khi chạy.
 * Nhân vật là hình tròn bán kính `radius`; vật cản là hình tròn hoặc hình hộp (chữ nhật trên mặt đất); cảnh có một biên
 * hình tròn quanh gốc tọa độ. Bị chạm thì được đẩy ra đúng chỗ vừa chạm, phần chuyển động dọc theo vật cản được giữ lại
 * nên đi xéo vào vật là trượt dọc theo nó, không bị kẹt.
 */

/** Điểm trên mặt đất; được sửa tại chỗ. */
export interface Point2 {
  x: number;
  z: number;
}

export interface CircleObstacle {
  type: 'circle';
  x: number;
  z: number;
  r: number;
}

/** Hộp theo trục: x ∈ [minX, maxX], z ∈ [minZ, maxZ]. */
export interface BoxObstacle {
  type: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Hộp xoay quanh trục đứng (nhà, cổng đặt chéo): tâm (x, z), nửa kích thước hx (theo trục x của hộp) và hz (theo trục z),
 * xoay `yaw` radian giống `rotation.y` của three (yaw 0 thì trùng hộp theo trục).
 */
export interface OrientedBoxObstacle {
  type: 'obox';
  x: number;
  z: number;
  hx: number;
  hz: number;
  yaw: number;
}

export type Obstacle = CircleObstacle | BoxObstacle | OrientedBoxObstacle;

/** Bán kính nhân vật khi va chạm (đơn vị cảnh). */
export const PLAYER_RADIUS = 0.4;

/** Số lượt giải quyết tối đa mỗi khung hình (nhiều vật cản sát nhau cần vài lượt). */
export const MAX_PASSES = 4;

/** Sai số nhỏ để sau khi đẩy ra, nhân vật không còn bị tính là đang chạm (tránh rung vì làm tròn). */
const EPS = 1e-6;

export const circle = (x: number, z: number, r: number): CircleObstacle => ({ type: 'circle', x, z, r });
export const obox = (x: number, z: number, hx: number, hz: number, yaw: number): OrientedBoxObstacle => ({ type: 'obox', x, z, hx, hz, yaw });
export const box = (minX: number, maxX: number, minZ: number, maxZ: number): BoxObstacle => ({ type: 'box', minX, maxX, minZ, maxZ });

/** Đẩy `p` ra khỏi vật tròn. Trả về true nếu có đẩy. */
export function pushOutOfCircle(p: Point2, radius: number, c: CircleObstacle): boolean {
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  const min = radius + c.r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2);
  if (d < 1e-9) {
    // trùng tâm: đẩy theo +x
    p.x = c.x + min + EPS;
    return true;
  }
  const k = (min + EPS) / d;
  p.x = c.x + dx * k;
  p.z = c.z + dz * k;
  return true;
}

/**
 * Đẩy `p` ra khỏi hộp: điểm gần nhất của hộp tới `p` là điểm chạm; cách nó dưới `radius` thì bị đẩy theo hướng từ điểm
 * đó tới `p`. Ở góc hộp, hướng đẩy là hướng chéo nên người chơi trượt vòng quanh góc. Tâm nằm trong hộp thì đẩy ra
 * mặt gần nhất.
 */
export function pushOutOfBox(p: Point2, radius: number, b: BoxObstacle): boolean {
  const cx = p.x < b.minX ? b.minX : p.x > b.maxX ? b.maxX : p.x;
  const cz = p.z < b.minZ ? b.minZ : p.z > b.maxZ ? b.maxZ : p.z;
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= radius * radius) return false;
  if (d2 > 1e-12) {
    const k = (radius + EPS) / Math.sqrt(d2);
    p.x = cx + dx * k;
    p.z = cz + dz * k;
    return true;
  }
  // tâm trong hộp (hoặc đúng trên mép): đẩy ra mặt gần nhất
  const toMinX = p.x - b.minX;
  const toMaxX = b.maxX - p.x;
  const toMinZ = p.z - b.minZ;
  const toMaxZ = b.maxZ - p.z;
  const m = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
  if (m === toMinX) p.x = b.minX - radius - EPS;
  else if (m === toMaxX) p.x = b.maxX + radius + EPS;
  else if (m === toMinZ) p.z = b.minZ - radius - EPS;
  else p.z = b.maxZ + radius + EPS;
  return true;
}

const local: Point2 = { x: 0, z: 0 };

/**
 * Đẩy `p` ra khỏi hộp xoay: đưa `p` về hệ tọa độ của hộp (xoay ngược `yaw`), đẩy ra khỏi hộp theo trục như `pushOutOfBox`, rồi đưa
 * kết quả về lại hệ tọa độ cảnh. Không cấp phát.
 */
export function pushOutOfOrientedBox(p: Point2, radius: number, o: OrientedBoxObstacle): boolean {
  const cos = Math.cos(o.yaw);
  const sin = Math.sin(o.yaw);
  const dx = p.x - o.x;
  const dz = p.z - o.z;
  const reach = Math.hypot(o.hx, o.hz) + radius;
  if (dx * dx + dz * dz > reach * reach) return false; // xa quá tầm với: bỏ qua sớm (tiết kiệm sin/cos khi có hàng trăm hộp)
  // three: xoay yaw quanh Y đưa (lx, lz) tới (lx cos + lz sin, −lx sin + lz cos); đây là phép xoay ngược
  local.x = dx * cos - dz * sin;
  local.z = dx * sin + dz * cos;
  if (!pushOutOfBox(local, radius, { type: 'box', minX: -o.hx, maxX: o.hx, minZ: -o.hz, maxZ: o.hz })) return false;
  p.x = o.x + local.x * cos + local.z * sin;
  p.z = o.z - local.x * sin + local.z * cos;
  return true;
}

/** Kéo `p` về trong biên hình tròn bán kính `boundsRadius` quanh gốc (tâm nhân vật tối đa cách gốc boundsRadius − radius). */
export function pullIntoBounds(p: Point2, radius: number, boundsRadius: number): boolean {
  const max = boundsRadius - radius;
  const d2 = p.x * p.x + p.z * p.z;
  if (d2 <= max * max) return false;
  const k = max / Math.sqrt(d2);
  p.x *= k;
  p.z *= k;
  return true;
}

/**
 * Giải quyết mọi va chạm của nhân vật tại `p` (sửa `p` tại chỗ): đẩy ra khỏi từng vật cản, rồi kéo về trong biên; lặp vài lượt
 * cho tới khi không còn gì phải sửa. Biên được kiểm tra cuối cùng nên nhân vật không bao giờ ra ngoài biên.
 * Trả về true nếu `p` đã bị dịch.
 */
export function resolveCollisions(p: Point2, radius: number, obstacles: readonly Obstacle[], boundsRadius: number = Infinity): boolean {
  let moved = false;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.type === 'circle' ? pushOutOfCircle(p, radius, o) : o.type === 'box' ? pushOutOfBox(p, radius, o) : pushOutOfOrientedBox(p, radius, o)) changed = true;
    }
    if (boundsRadius !== Infinity && pullIntoBounds(p, radius, boundsRadius)) changed = true;
    if (!changed) break;
    moved = true;
  }
  return moved;
}
