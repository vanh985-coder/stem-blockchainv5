/**
 * Hệ số thời gian chung của demo (chế độ "video hướng dẫn"). Ngoài demo luôn là 1: mỗi game nhân `dt` với `timeScale()` và hệ số này chỉ khác 1 khi demo bật VÀ đang tua.
 * Câu hỏi và lượt đáp án KHÔNG bị tua: game báo `setDemoQuestion(true)` khi đang ở pha câu hỏi, lúc đó hệ số về 1 để người xem đọc kịp.
 */
import { DEMO_ACTIVE } from './config';

/** Hệ số tua nhanh khi quay video hướng dẫn */
export const FF_FACTOR = 2.5;

/** Hàm thuần: hệ số thời gian từ trạng thái. Không demo = 1; demo đang tua = `FF_FACTOR`; đang ở pha câu hỏi = 1. */
export function computeTimeScale(demoActive: boolean, fastForward: boolean, question: boolean): number {
  return demoActive && fastForward && !question ? FF_FACTOR : 1;
}

/** Hàm thuần: `dt` sau khi nhân hệ số. */
export function scaleDt(dt: number, scale: number): number {
  return dt * scale;
}

let ff = false;
let question = false;
let last = 1;
const listeners = new Set<(scale: number) => void>();

/** Hệ số đang dùng: 1 ngoài demo. */
export function timeScale(): number {
  return computeTimeScale(DEMO_ACTIVE, ff, question);
}

function notify(): void {
  const s = timeScale();
  if (s === last) return;
  last = s;
  for (const fn of listeners) fn(s);
}

/** Bật/tắt tua nhanh (bot gọi). Ngoài demo không có tác dụng. */
export function setFastForward(on: boolean): void {
  if (!DEMO_ACTIVE) return;
  ff = on;
  notify();
}

export const isFastForward = (): boolean => ff;

/** Game báo đang ở pha câu hỏi / lượt đáp án (không tua). Gọi mỗi khung cũng được: chỉ đổi khi giá trị khác. */
export function setDemoQuestion(on: boolean): void {
  if (!DEMO_ACTIVE || question === on) return;
  question = on;
  notify();
}

/** Nghe thay đổi của hệ số (biểu tượng tua). Trả hàm hủy. */
export function onTimeScale(fn: (scale: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Dựng lại trạng thái đầu (đầu mỗi lần chạy demo). */
export function resetTimeScale(): void {
  ff = false;
  question = false;
  notify();
}
