import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { createFpsTracker, shouldDowngrade } from './quality';

export interface FpsGuardProps {
  /** Gọi một lần nếu FPS trung bình của cửa sổ đo đầu tiên là thấp (mặc định dưới 40, spec 03 mục 2) */
  onLow: (fps: number) => void;
  /** Thay ngưỡng "thấp" (khung 3D ở trang bài học dùng dưới 30) */
  isLow?: (fps: number) => boolean;
}

/**
 * Đo FPS ở 3 giây đầu của cảnh (sau 0,5 giây khởi động). Đặt bên trong <Canvas> và bên trong Suspense để chỉ bắt đầu đo
 * khi model đã tải xong. Không cấp phát trong useFrame.
 */
export function FpsGuard({ onLow, isLow = shouldDowngrade }: FpsGuardProps) {
  const tracker = useMemo(() => createFpsTracker(), []);
  useFrame(() => {
    if (tracker.done) return;
    const fps = tracker.tick(performance.now());
    if (fps !== null && isLow(fps)) onLow(fps);
  });
  return null;
}
