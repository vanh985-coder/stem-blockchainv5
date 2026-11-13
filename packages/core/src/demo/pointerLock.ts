/**
 * Khóa chuột giả cho demo: trình duyệt chỉ cho khóa chuột khi người dùng bấm thật, còn demo điều khiển bằng sự kiện giả. Ghi đè `requestPointerLock` và `exitPointerLock`
 * để trang tin là đã khóa (đi lại được, hộp thoại nhả khóa như bình thường). Con trỏ thật của hệ điều hành vẫn hiện; OBS có thể tắt "ghi con trỏ".
 */
let lockedEl: Element | null = null;

export function installFakePointerLock(): void {
  if (typeof document === 'undefined') return;
  // Sự kiện con trỏ do demo gửi không phải con trỏ thật: bắt/thả con trỏ (pointer capture) báo lỗi với mã con trỏ giả, nên bỏ qua lỗi đó
  for (const name of ['setPointerCapture', 'releasePointerCapture'] as const) {
    const orig = Element.prototype[name];
    Element.prototype[name] = function patched(this: Element, id: number) {
      try {
        orig.call(this, id);
      } catch {
        // con trỏ giả
      }
    };
  }
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => lockedEl });
  Element.prototype.requestPointerLock = function requestPointerLock(this: Element) {
    lockedEl = this;
    queueMicrotask(() => document.dispatchEvent(new Event('pointerlockchange')));
    return Promise.resolve();
  } as unknown as Element['requestPointerLock'];
  document.exitPointerLock = () => {
    if (lockedEl === null) return;
    lockedEl = null;
    queueMicrotask(() => document.dispatchEvent(new Event('pointerlockchange')));
  };
}
