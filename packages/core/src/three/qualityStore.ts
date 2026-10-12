import { useSyncExternalStore } from 'react';
import { lowerQuality, type QualityLevel } from './quality';

/**
 * Mức trần của phiên: khi một cảnh đo thấy FPS thấp và tự hạ mức, các cảnh sau trong cùng lần mở trang không
 * quay lại mức cao hơn. Không lưu vào cài đặt (lựa chọn của người dùng giữ nguyên).
 */
let cap: QualityLevel | undefined;
const listeners = new Set<() => void>();

export function getSessionCap(): QualityLevel | undefined {
  return cap;
}

/** Hạ trần xuống một mức so với `current`. Trả về mức trần mới. */
export function lowerSessionCap(current: QualityLevel): QualityLevel {
  cap = lowerQuality(current);
  listeners.forEach((l) => l());
  return cap;
}

/** Chỉ dùng trong test. */
export function resetSessionCap(): void {
  cap = undefined;
  listeners.forEach((l) => l());
}

export function useSessionCap(): QualityLevel | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSessionCap,
    () => undefined,
  );
}
