/**
 * Hoạt cảnh then gỗ và dây đỏ rơi khi cổng làng mở (spec 04 mục 5: "Cổng làng kế tiếp mở ra, kèm hiệu ứng"). Hàm thuần theo thời gian `t` (giây kể từ lúc bắt đầu), không import three:
 * thanh trên và hai sợi dây đỏ bung trước, thanh dưới và chùm tua rơi theo; mỗi vật rơi tự do, chạm đất nảy lên một chút rồi nằm yên. Gọi mỗi khung hình, ghi vào `out` (không cấp phát).
 */

/** Gia tốc rơi (đơn vị/giây²), nhẹ hơn trọng lực thật cho dễ nhìn. */
export const FALL_GRAVITY = 8;
/** Chờ trước khi vật đầu tiên rơi. */
export const FALL_DELAY = 0.3;
/** Mọi vật đã nằm yên (giây). */
export const FALL_END = 1.9;
/** Độ cao nảy lại (đơn vị) và thời gian một lần nảy (giây). */
const BOUNCE_HEIGHT = 0.1;
const BOUNCE_TIME = 0.26;

export interface FallPart {
  y: number;
  /** Góc xoay quanh trục z (hướng nhìn vào cổng); thanh gỗ nghiêng nhẹ, dây đỏ nằm ngang */
  rz: number;
}

export interface BarrierFall {
  high: FallPart;
  low: FallPart;
  ropeA: FallPart;
  ropeB: FallPart;
  tassel: { y: number };
  /** Thanh trên đã chạm đất (để phát tiếng đập một lần) */
  landed: boolean;
}

const ROPE_LYING = Math.PI / 2 - 0.05;

/** Một vật rơi từ y0 xuống `floor`, bắt đầu sau `delay` giây; trả về độ cao, tiến độ rơi 0 đến 1, và đã chạm đất chưa. */
export function dropOne(t: number, y0: number, floor: number, delay: number): { y: number; u: number; landed: boolean } {
  const tau = t - delay;
  if (tau <= 0) return { y: y0, u: 0, landed: false };
  const fall = Math.max(0, y0 - floor);
  const tFall = Math.sqrt((2 * fall) / FALL_GRAVITY);
  if (tau < tFall) return { y: y0 - 0.5 * FALL_GRAVITY * tau * tau, u: tFall > 0 ? tau / tFall : 1, landed: false };
  const b = tau - tFall;
  const bounce = b < BOUNCE_TIME ? BOUNCE_HEIGHT * Math.sin((Math.PI * b) / BOUNCE_TIME) : 0;
  return { y: floor + bounce, u: 1, landed: true };
}

export function barrierFall(t: number, low: number, high: number, ropeAngle: number, out?: BarrierFall): BarrierFall {
  const o: BarrierFall = out ?? { high: { y: 0, rz: 0 }, low: { y: 0, rz: 0 }, ropeA: { y: 0, rz: 0 }, ropeB: { y: 0, rz: 0 }, tassel: { y: 0 }, landed: false };
  const mid = (low + high) / 2;
  const h = dropOne(t, high, 0.26, FALL_DELAY);
  o.high.y = h.y;
  o.high.rz = -0.22 * h.u;
  o.landed = h.landed;
  const l = dropOne(t, low, 0.09, FALL_DELAY + 0.15);
  o.low.y = l.y;
  o.low.rz = 0.15 * l.u;
  const a = dropOne(t, mid, 0.04, FALL_DELAY + 0.02);
  o.ropeA.y = a.y;
  o.ropeA.rz = ropeAngle + (ROPE_LYING - ropeAngle) * a.u;
  const b = dropOne(t, mid, 0.05, FALL_DELAY + 0.08);
  o.ropeB.y = b.y;
  o.ropeB.rz = -ropeAngle - (ROPE_LYING - ropeAngle) * b.u;
  o.tassel.y = dropOne(t, mid, 0.1, FALL_DELAY + 0.1).y;
  return o;
}
