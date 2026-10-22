/**
 * Cầu nối giữa phần DOM (`WalkControls`: phím, chạm, chuột) và phần 3D (`WalkWorld`, đọc mỗi khung hình trong useFrame).
 * Chỉ là các đối tượng thường (không import React hay three) nên hai bên, dù chạy ở hai bộ dựng hình khác nhau, dùng chung được.
 */
import { createCameraAngles, type CameraAngles } from './cameraRig';
import { clearKeys, createKeyState, runFromStick, type Axis, type KeyState } from './walkInput';
import type { MoveInput } from './playerMotion';

export interface WalkInput {
  /** Vectơ đi từ phím (đã chuẩn hóa) */
  keyAxis: Axis;
  /** Đang giữ Shift */
  keyRun: boolean;
  /** Vectơ từ cần điều khiển trên điện thoại (độ lớn tối đa 1) */
  stick: Axis;
  /** Độ lớn đẩy cần (0 là không đẩy) */
  stickMag: number;
  /** Vừa bấm nhảy; được tiêu thụ (đặt về false) khi đọc */
  jump: boolean;
}

/** Khóa chuột (pointer lock). `WalkControls` gán hai hàm này; trước đó là hàm rỗng. `request` phải được gọi ngay trong sự kiện bấm. */
export interface WalkLock {
  request: () => void;
  exit: () => void;
}

export interface WalkApi {
  lock: WalkLock;
  input: WalkInput;
  keys: KeyState;
  /** Các phím đang giữ (để bỏ qua sự kiện lặp) */
  held: Set<string>;
  camera: CameraAngles;
  /** Vị trí và hướng mặt của người chơi (`WalkWorld` gán đối tượng trạng thái có sẵn; null khi chưa có cảnh): bản đồ nhỏ ở phần DOM đọc để vẽ, không cần render lại React */
  player: { x: number; z: number; yaw: number } | null;
}

export function createWalkApi(cameraYaw = 0): WalkApi {
  return {
    lock: { request: () => undefined, exit: () => undefined },
    input: { keyAxis: { x: 0, y: 0 }, keyRun: false, stick: { x: 0, y: 0 }, stickMag: 0, jump: false },
    keys: createKeyState(),
    held: new Set(),
    camera: createCameraAngles(cameraYaw),
    player: null,
  };
}

/** Thả hết: phím, cần điều khiển, lệnh nhảy chờ (khi tạm dừng hoặc mất focus). Không đụng tới camera. */
export function resetWalkInput(api: WalkApi): void {
  clearKeys(api.keys);
  api.held.clear();
  const i = api.input;
  i.keyAxis.x = 0;
  i.keyAxis.y = 0;
  i.keyRun = false;
  i.stick.x = 0;
  i.stick.y = 0;
  i.stickMag = 0;
  i.jump = false;
}

/**
 * Gộp lệnh của một khung hình vào `out`: đang đẩy cần điều khiển thì theo cần (chạy khi quá 80%), không thì theo phím.
 * Giữ Shift luôn là chạy. Lệnh nhảy chờ được tiêu thụ. Không cấp phát.
 */
export function combineInput(w: WalkInput, out: MoveInput): void {
  if (w.stickMag > 0) {
    out.x = w.stick.x;
    out.y = w.stick.y;
    out.run = w.keyRun || runFromStick(w.stickMag);
  } else {
    out.x = w.keyAxis.x;
    out.y = w.keyAxis.y;
    out.run = w.keyRun;
  }
  out.jump = w.jump;
  w.jump = false;
}
