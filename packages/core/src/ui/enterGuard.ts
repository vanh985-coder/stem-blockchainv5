/** Lần nhấn Enter đang theo dõi: `down` từ keydown tới keyup, `fresh` là lần nhấn mới chưa dùng */
export interface EnterTracker {
  down: boolean;
  fresh: boolean;
  /** Lúc (cùng gốc với `event.timeStamp`) của keydown Enter gần nhất */
  at: number;
}

/** Click do Enter sinh ra đến ngay sau keydown; quá ngưỡng này (ms) thì coi là click độc lập */
const CLICK_AFTER_KEYDOWN_MS = 150;

export function createEnterTracker(): EnterTracker {
  return { down: false, fresh: false, at: -Infinity };
}

/**
 * Ghi một keydown Enter. Là lần nhấn mới khi không `repeat` và đã có keyup của lần trước
 * (chặn cả bàn phím báo `repeat` sai); phím đang giữ từ trước khi nghe cũng chỉ cho ra các keydown `repeat`.
 */
export function trackEnterDown(t: EnterTracker, e: { repeat: boolean; timeStamp: number }): void {
  t.fresh = !e.repeat && !t.down;
  t.down = true;
  t.at = e.timeStamp;
}

export function trackEnterUp(t: EnterTracker): void {
  t.down = false;
}

/**
 * Click này có được nhận không? Click chuột, chạm, đọc màn hình hay `.click()` (không đi sau keydown Enter) luôn được nhận.
 * Click do Enter (focus đang ở nút) chỉ được nhận một lần cho mỗi lần nhấn mới; Enter lặp khi giữ phím bị bỏ.
 */
export function allowKeyboardClick(t: EnterTracker, e: { detail: number; timeStamp: number }): boolean {
  if (e.detail !== 0 || !t.down || e.timeStamp - t.at > CLICK_AFTER_KEYDOWN_MS || e.timeStamp < t.at) return true;
  if (!t.fresh) return false;
  t.fresh = false;
  return true;
}
