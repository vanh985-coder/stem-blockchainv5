/**
 * Điều khiển game chạy (spec 05 Màn 2), hàm thuần: phím máy tính và vuốt điện thoại thành lệnh, hàng đợi lệnh không cấp phát, và bước thời gian cố định.
 *
 * Camera đặt sau lưng nhìn về +z nên bên PHẢI màn hình là phía x nhỏ (như ở chợ và làng). Làn 0 ứng với x = −2 (bên phải màn hình), làn 2 ứng với x = +2 (bên trái màn hình).
 * Vì vậy phím trái hay vuốt trái là đổi làn +1, phím phải hay vuốt phải là đổi làn −1.
 */
import type { RunnerInput } from './runnerLogic';

export type RunnerCommand = 'left' | 'right' | 'jump' | 'slide';

/** Phím (KeyboardEvent.code) thành lệnh: ←/→ hoặc A/D đổi làn; ↑, W, Space nhảy; ↓, S trượt. */
export function keyToCommand(code: string): RunnerCommand | null {
  switch (code) {
    case 'ArrowLeft':
    case 'KeyA':
      return 'left';
    case 'ArrowRight':
    case 'KeyD':
      return 'right';
    case 'ArrowUp':
    case 'KeyW':
    case 'Space':
      return 'jump';
    case 'ArrowDown':
    case 'KeyS':
      return 'slide';
    default:
      return null;
  }
}

/** Khoảng vuốt tối thiểu (điểm ảnh) để tính là một cú vuốt. */
export const SWIPE_MIN_PX = 28;

/**
 * Vuốt (độ dời dx, dy tính bằng điểm ảnh màn hình, y hướng xuống) thành lệnh: hướng nào dài hơn thì thắng; ngắn hơn `min` thì không phải vuốt (chạm).
 * Vuốt trái là 'left', phải là 'right', lên là 'jump', xuống là 'slide'.
 */
export function swipeToCommand(dx: number, dy: number, min: number = SWIPE_MIN_PX): RunnerCommand | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < min) return null;
  if (ax >= ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'jump' : 'slide';
}

/** Lệnh trên màn hình thành lệnh cho `stepRunner`: trái màn hình = chỉ số làn +1 (xem đầu file). */
export function commandToInput(c: RunnerCommand, out: RunnerInput): RunnerInput {
  switch (c) {
    case 'left':
      out.move = 1;
      break;
    case 'right':
      out.move = -1;
      break;
    case 'jump':
      out.jump = true;
      break;
    case 'slide':
      out.slide = true;
      break;
  }
  return out;
}

/**
 * Hàng đợi lệnh cỡ cố định (vòng tròn, không cấp phát). Phím bấm giữa hai bước mô phỏng được giữ lại để bước sau dùng, mỗi bước dùng đúng một lệnh;
 * đầy thì bỏ lệnh mới (người chơi bấm quá nhanh).
 */
export class CommandQueue {
  private readonly buf: (RunnerCommand | null)[];
  private head = 0;
  private size = 0;

  constructor(capacity = 4) {
    this.buf = new Array<RunnerCommand | null>(capacity).fill(null);
  }

  get length(): number {
    return this.size;
  }

  push(c: RunnerCommand): boolean {
    if (this.size >= this.buf.length) return false;
    this.buf[(this.head + this.size) % this.buf.length] = c;
    this.size++;
    return true;
  }

  /** Lấy lệnh đầu hàng đợi (null nếu rỗng). */
  shift(): RunnerCommand | null {
    if (this.size === 0) return null;
    const c = this.buf[this.head];
    this.buf[this.head] = null;
    this.head = (this.head + 1) % this.buf.length;
    this.size--;
    return c;
  }

  clear(): void {
    this.buf.fill(null);
    this.head = 0;
    this.size = 0;
  }
}

/** Bước thời gian cố định của mô phỏng: 1/60 giây (spec bước 11). */
export const FIXED_STEP = 1 / 60;
/** Mỗi khung hình chạy tối đa bấy nhiêu bước (máy chậm thì chậm đi chứ không "xoắn ốc" tụt hậu). */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Cộng dồn thời gian thật để chạy mô phỏng theo bước cố định, và cho hệ số nội suy `alpha` (0 đến 1) để vẽ mượt giữa hai bước.
 * Dùng: `n = stepper.add(dt)`; chạy `n` lần `stepRunner(…, FIXED_STEP)`; vẽ ở vị trí nội suy theo `stepper.alpha`.
 */
export class FixedStepper {
  private acc = 0;

  constructor(
    readonly step: number = FIXED_STEP,
    readonly maxSteps: number = MAX_STEPS_PER_FRAME,
  ) {}

  /** Thêm `dt` giây (giới hạn để không nhảy vọt sau khi tab bị ẩn) và trả về số bước cần chạy. */
  add(dt: number): number {
    this.acc += Math.min(Math.max(dt, 0), this.step * this.maxSteps);
    const n = Math.min(this.maxSteps, Math.floor(this.acc / this.step + 1e-9));
    this.acc -= n * this.step;
    if (this.acc < 0) this.acc = 0;
    return n;
  }

  /** Phần của bước hiện tại đã trôi qua, 0 đến 1. */
  get alpha(): number {
    return Math.min(1, Math.max(0, this.acc / this.step));
  }

  reset(): void {
    this.acc = 0;
  }
}
