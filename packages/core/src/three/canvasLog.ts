import type { ErrorInfo } from 'react';

/** Ghi lỗi 3D ra console (kèm nơi gây lỗi) để còn tìm nguyên nhân. Nhẹ, không kéo three vào trang đầu. */
export function logCanvasError(error: unknown, info?: ErrorInfo): void {
  console.error('[3D] Error in 3D scene:', error, info?.componentStack ?? '');
}
