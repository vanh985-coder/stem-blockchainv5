import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { LOAD_DELAY_MS } from './frames';
import type { LessonFramesPlan } from './useLessonFrames';

// Lõi 3D (three, R3F, drei) và 2 model chỉ tải sau khi trang bài học đã hiện (spec 03 mục 9).
const Stage3D = lazy(() => import('../three/LessonStage3D'));

/** Lỗi tải chunk hoặc lỗi dựng khung: ẩn khung, không báo gì cho học sinh, bài học vẫn chơi được. */
class Quiet extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Chờ chút rồi chờ lúc rảnh, để việc tải 3D không tranh với lúc trang bài học vừa hiện. */
function useLoadLater(enabled: boolean): boolean {
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setLoad(false);
      return;
    }
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let idle: number | undefined;
    const t = setTimeout(() => {
      if (w.requestIdleCallback) idle = w.requestIdleCallback(() => setLoad(true), { timeout: 2000 });
      else setLoad(true);
    }, LOAD_DELAY_MS);
    return () => {
      clearTimeout(t);
      if (idle !== undefined) w.cancelIdleCallback?.(idle);
    };
  }, [enabled]);
  return load;
}

/**
 * Hai khung 3D ở hai bên bảng bài học (spec 03 mục 4): học sinh bên trái, {phanDien} bên phải, nền trong suốt.
 * Trang không import three: chỉ một `import()` chạy sau khi trang đã hiện (hai ô khung do chính chunk 3D vẽ). Khung bị ẩn
 * (màn hẹp, giảm chuyển động, máy yếu, tải lỗi, FPS thấp) thì không tải gì cả, hoặc gỡ hết (Canvas và model) nếu đã tải.
 */
export function LessonCharacters({ plan }: { plan: LessonFramesPlan }) {
  const { visible, layout, onFail, onSlow } = plan;
  const load = useLoadLater(visible && !!layout);
  if (!visible || !layout || !load) return null;
  return (
    <Quiet onError={onFail}>
      <Suspense fallback={null}>
        <Stage3D layout={layout} onFail={onFail} onSlow={onSlow} />
      </Suspense>
    </Quiet>
  );
}
