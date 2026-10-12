/**
 * Camera đi sau lưng người chơi (spec 03 mục 3.7): cách 7, cao 4; kéo chuột (hoặc vuốt nửa phải màn hình trên điện thoại) để
 * xoay quanh nhân vật. Hàm thuần, không import three.
 */

/** Khoảng cách ngang từ camera tới người chơi và độ cao so với chân (đơn vị cảnh). */
export const CAMERA_DISTANCE = 7;
export const CAMERA_HEIGHT = 4;
/** Camera nhìn vào điểm cao thế này so với chân người chơi (ngang ngực). */
export const CAMERA_LOOK_HEIGHT = 1.3;
/** Độ gắt khi camera bám theo (càng lớn càng sát). */
export const CAMERA_FOLLOW_RATE = 7;
/** Bán kính quỹ đạo: cạnh huyền của (7, 4). */
export const CAMERA_RADIUS = Math.hypot(CAMERA_DISTANCE, CAMERA_HEIGHT);
/** Góc ngẩng mặc định (camera nhìn từ trên xuống) và giới hạn khi kéo, radian. */
export const PITCH_DEFAULT = Math.atan2(CAMERA_HEIGHT, CAMERA_DISTANCE);
export const PITCH_MIN = 0.12;
export const PITCH_MAX = 1.2;
/** Độ nhạy kéo: radian mỗi pixel. */
export const DRAG_SENSITIVITY = 0.0055;
/** Camera không xuống thấp hơn mặt đất bấy nhiêu. */
export const CAMERA_MIN_Y = 0.5;

export interface CameraAngles {
  /** Hướng camera nhìn (radian quanh trục đứng, 0 là +Z): người chơi "tiến lên" theo hướng này */
  yaw: number;
  /** Góc ngẩng của camera so với người chơi (0 là ngang, lớn hơn là nhìn từ trên xuống) */
  pitch: number;
}

export function createCameraAngles(yaw = 0): CameraAngles {
  return { yaw, pitch: PITCH_DEFAULT };
}

export function clampPitch(pitch: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch));
}

/** Đưa góc về (−π, π] để không tăng mãi. */
export function wrapYaw(yaw: number): number {
  const twoPi = Math.PI * 2;
  let y = yaw % twoPi;
  if (y > Math.PI) y -= twoPi;
  else if (y <= -Math.PI) y += twoPi;
  return y;
}

/** Vectơ ba chiều dùng làm kết quả (ghi vào, không cấp phát). */
export interface Vec3Out {
  x: number;
  y: number;
  z: number;
}

/** Vị trí camera so với người chơi (tính từ chân): phía sau lưng theo hướng nhìn `yaw`. Mặc định (yaw 0, pitch mặc định) là (0, 4, −7). */
export function cameraOffset(yaw: number, pitch: number, out: Vec3Out): Vec3Out {
  const horizontal = CAMERA_RADIUS * Math.cos(pitch);
  out.x = -Math.sin(yaw) * horizontal;
  out.y = CAMERA_RADIUS * Math.sin(pitch);
  out.z = -Math.cos(yaw) * horizontal;
  return out;
}

/**
 * Kéo (chuột hoặc vuốt) `dx`, `dy` pixel: kéo sang phải thì cảnh trượt sang phải (camera quay sang trái quanh nhân vật);
 * kéo xuống thì camera nâng lên (nhìn từ trên xuống). Sửa `cam` tại chỗ.
 */
export function dragCamera(cam: CameraAngles, dx: number, dy: number, sensitivity: number = DRAG_SENSITIVITY): void {
  cam.yaw = wrapYaw(cam.yaw + dx * sensitivity);
  cam.pitch = clampPitch(cam.pitch + dy * sensitivity);
}

/** Rê chuột khi đã khóa chuột (máy tính): giới hạn góc ngẩng khoảng 5° đến 60°. */
export const LOOK_PITCH_MIN = (5 * Math.PI) / 180;
export const LOOK_PITCH_MAX = (60 * Math.PI) / 180;
/** Độ nhạy gốc khi rê chuột: radian mỗi pixel, nhân với "Độ nhạy chuột" trong Cài đặt (mặc định 1). */
export const LOOK_RADIANS_PER_PIXEL = 0.0025;
/** Chrome thỉnh thoảng báo một cú nhảy rất lớn của `movementX/Y`: bỏ phần vượt quá mức này mỗi sự kiện (pixel). */
export const LOOK_MAX_STEP = 150;

function clampStep(v: number): number {
  return Math.min(LOOK_MAX_STEP, Math.max(-LOOK_MAX_STEP, v));
}

/**
 * Rê chuột khi đã khóa chuột, kiểu PUBG: `dx`, `dy` là `movementX`, `movementY` (pixel). Rê sang phải thì camera nhìn sang phải
 * (yaw giảm, vì yaw tăng là quay sang trái); rê lên thì ngước (camera hạ xuống), rê xuống thì cúi (camera nâng lên). Góc ngẩng
 * kẹp trong [5°, 60°]. `sensitivity` là hệ số "Độ nhạy chuột" (1 là mặc định). Sửa `cam` tại chỗ.
 */
export function lookCamera(cam: CameraAngles, dx: number, dy: number, sensitivity = 1): void {
  const k = LOOK_RADIANS_PER_PIXEL * sensitivity;
  cam.yaw = wrapYaw(cam.yaw - clampStep(dx) * k);
  cam.pitch = Math.min(LOOK_PITCH_MAX, Math.max(LOOK_PITCH_MIN, cam.pitch + clampStep(dy) * k));
}
