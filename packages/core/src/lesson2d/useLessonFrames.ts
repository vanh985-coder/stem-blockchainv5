import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSettings } from '../settings/SettingsProvider';
import type { QualityLevel } from '../three/quality';
import { lowerSessionCap } from '../three/qualityStore';
import { useQuality } from '../three/useQuality';
import { MIN_VIEWPORT_WIDTH, lessonFrameLayout, shouldReserveFrameLayout, type FrameLayout } from './frames';

interface Viewport {
  w: number;
  h: number;
  /** Thanh cuộn dọc (innerWidth − clientWidth) */
  sb: number;
}

function viewport(): Viewport {
  if (typeof window === 'undefined') return { w: 0, h: 0, sb: 0 };
  const w = window.innerWidth;
  // clientWidth không tính phần giữ chỗ của scrollbar-gutter khi chưa có thanh cuộn; bề rộng bố cục của <html> thì có tính.
  const root = document.documentElement;
  const layoutW = Math.min(root.clientWidth, Math.round(root.getBoundingClientRect().width));
  return { w, h: window.innerHeight, sb: layoutW > 0 ? Math.max(0, w - layoutW) : 0 };
}

/**
 * Kích thước cửa sổ, cập nhật khi đổi cỡ (chỉ vẽ lại khi số đổi). Từ 1280px, trang giữ chỗ cho thanh cuộn
 * (`scrollbar-gutter: stable`): thanh cuộn hiện hay mất khi trang dài ra hay ngắn đi cũng không làm bề rộng thay đổi
 * (sự kiện resize không báo việc đó), nên bảng và khung không xê dịch.
 */
function useViewportSize(): Viewport {
  const [size, setSize] = useState(viewport);
  const update = useCallback(
    () =>
      setSize((s) => {
        const n = viewport();
        return n.w === s.w && n.h === s.h && n.sb === s.sb ? s : n;
      }),
    [],
  );
  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);
  const wide = size.w >= MIN_VIEWPORT_WIDTH;
  useLayoutEffect(() => {
    if (!wide) return;
    const root = document.documentElement;
    const before = root.style.scrollbarGutter;
    root.style.scrollbarGutter = 'stable';
    update();
    return () => {
      root.style.scrollbarGutter = before;
    };
  }, [wide, update]);
  return size;
}

export interface LessonFramesPlan {
  /** Có hiện hai khung 3D không (đã dành chỗ và chưa bị ẩn vì lỗi, FPS thấp hay cảnh trao trang) */
  visible: boolean;
  /**
   * Bố cục khi dành chỗ cho khung (cỡ khung, chỗ đặt, hệ số phóng bảng), hoặc null (bố cục cũ). Quyết định lúc mở trang và
   * GIỮ NGUYÊN khi khung bị ẩn về sau (tải lỗi, FPS thấp): bảng không nhảy.
   */
  layout: FrameLayout | null;
  /** Hệ số phóng của bảng khi dành chỗ cho khung; null thì bảng phóng như cũ (1,35 từ 1280px) */
  zoom: number | null;
  /** Tải chunk hoặc model lỗi: ẩn khung (không báo lỗi cho học sinh) */
  onFail: () => void;
  /** FPS thấp trong 3 giây đầu: ẩn khung và nhớ cho các trang sau (mức trần của phiên) */
  onSlow: (fps: number) => void;
}

/**
 * Kế hoạch bố cục và hiện/ẩn hai khung 3D ở trang bài học. Chỉ dùng cài đặt, kích thước cửa sổ và mức chất lượng (không
 * import three), nên trang đầu không phải tải lõi 3D khi khung bị ẩn.
 * @param suspended đang ở màn không dùng khung (ví dụ cảnh trao Trang Sổ Vàng)
 */
export function useLessonFrames(suspended = false): LessonFramesPlan {
  const { settings } = useSettings();
  const { level } = useQuality();
  const { w, h, sb } = useViewportSize();
  const [failed, setFailed] = useState(false);
  const [tooSlow, setTooSlow] = useState(false);
  // Khi FPS thấp thì mức trần của phiên tụt về Thấp; bố cục vẫn tính theo mức lúc đó để không nhảy.
  const levelRef = useRef<QualityLevel>(level);
  const [frozenLevel, setFrozenLevel] = useState<QualityLevel | null>(null);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  const input = { viewportWidth: w, viewportHeight: h, scrollbar: sb, reducedMotion: settings.reducedMotion, largeText: settings.largeText, level: frozenLevel ?? level };
  const reserved = shouldReserveFrameLayout(input);
  const layout = reserved ? lessonFrameLayout(w, h, sb) : null;
  const visible = layout !== null && !suspended && !failed && !tooSlow;

  const onFail = useCallback(() => setFailed(true), []);
  const onSlow = useCallback(() => {
    setFrozenLevel(levelRef.current);
    setTooSlow(true);
    lowerSessionCap('medium'); // mức trần của phiên về Thấp: các trang bài học sau không thử lại
  }, []);
  return { visible, layout, zoom: layout?.zoom ?? null, onFail, onSlow };
}
