/**
 * Phần tính toán để vẽ game chạy (hàm thuần, không import three, ghi vào đối tượng có sẵn nên không cấp phát mỗi khung hình): chọn bậc model theo mức chất lượng,
 * tầm nhìn, nội suy giữa hai bước mô phỏng, camera đi sau lưng, nhấp nháy khi bị va.
 */
import { SEGMENT_LENGTH } from './runnerScenery';

export type Level = 'low' | 'medium' | 'high';

/**
 * Khoảng cách (mét, tính tới camera) đổi bậc model: dưới `near` dùng bản chính, dưới `mid` bản vừa (nếu có; 0 là không dùng), còn lại bản xa.
 * Chướng ngại (bản chính 30.000 tam giác) và cảnh hai bên (nhà bản chính 50.000) nặng nên bản chính chỉ ở rất gần; mức Thấp gần như chỉ dùng bản xa.
 */
export const OBSTACLE_LOD: Readonly<Record<Level, { near: number; mid: number }>> = {
  low: { near: 6, mid: 0 },
  medium: { near: 18, mid: 34 },
  high: { near: 26, mid: 48 },
};
export const SCENERY_LOD: Readonly<Record<Level, { near: number; mid: number }>> = {
  low: { near: 0, mid: 0 },
  medium: { near: 9, mid: 22 },
  high: { near: 14, mid: 32 },
};

/** Tầm nhìn phía trước (mét; sương che phần xa) và phía sau (còn thấy khi quay lại). Mức Thấp ngắn hơn cho nhẹ. */
export const VIEW_AHEAD: Readonly<Record<Level, number>> = { low: 60, medium: 90, high: 120 };
export const VIEW_BEHIND = 18;

/** Số đoạn đường (40 mét) cần giữ cùng lúc ở mức này (spec 05: khoảng 5 đoạn). */
export function segmentsKept(level: Level): number {
  return Math.ceil((VIEW_AHEAD[level] + VIEW_BEHIND) / SEGMENT_LENGTH) + 1;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Camera đi sau lưng, hơi cao, nhìn về phía trước; rung nhẹ khi bị va. */
export const CAMERA = {
  back: 7.2,
  height: 3.3,
  lookAhead: 7,
  lookHeight: 1.1,
  /** Camera theo x của nhân vật một phần (nhân vật đổi làn thì camera hơi lệch theo) */
  followX: 0.55,
  /** Camera nhích lên theo độ cao nhân vật khi nhảy */
  followY: 0.3,
  fov: 62,
  shakeAmplitude: 0.16,
} as const;

export interface CameraPose {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
}

/**
 * Tư thế camera từ vị trí nhân vật (z, x, y đã nội suy). `shake` từ 0 đến 1 (1 = vừa bị va, giảm dần); `t` là giờ để rung. Ghi vào `out`.
 */
export function chaseCamera(out: CameraPose, z: number, x: number, y: number, shake: number, t: number): CameraPose {
  const a = CAMERA.shakeAmplitude * shake * shake;
  out.px = x * CAMERA.followX + Math.sin(t * 61) * a;
  out.py = CAMERA.height + y * CAMERA.followY + Math.cos(t * 47) * a;
  out.pz = z - CAMERA.back;
  out.tx = x * CAMERA.followX * 0.6;
  out.ty = CAMERA.lookHeight + y * CAMERA.followY * 0.5;
  out.tz = z + CAMERA.lookAhead;
  return out;
}

/** Mức rung (0 đến 1) theo số giây còn nhấp nháy sau khi mất tim: vừa bị va thì 1, giảm về 0 trong nửa giây đầu. */
export function shakeAmount(invulnLeft: number, invulnTotal: number): number {
  const since = invulnTotal - invulnLeft;
  if (invulnLeft <= 0 || since < 0) return 0;
  return Math.max(0, 1 - since / 0.5);
}

/** Nhân vật hiện hay ẩn ở thời điểm `t` khi đang nhấp nháy (`invulnLeft` > 0): 10 lần mỗi giây. Không nhấp nháy thì luôn hiện. */
export function blinkVisible(invulnLeft: number, t: number): boolean {
  if (invulnLeft <= 0) return true;
  return Math.floor(t * 10) % 2 === 0;
}

/**
 * Chọn bậc theo khoảng cách tới camera, trả về 0 (chính), 1 (vừa), 2 (xa): cùng quy tắc với `DynamicModel` (dùng để kiểm tra và để tính trước).
 * `mid` = 0 nghĩa là không có bậc vừa.
 */
export function lodTier(dist: number, near: number, mid: number): 0 | 1 | 2 {
  if (dist < near) return 0;
  if (mid > near && dist < mid) return 1;
  return 2;
}
