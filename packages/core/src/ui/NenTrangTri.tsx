import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { asset, useManifest } from '../assets/store';
import type { NenTheme } from '../content/nenTrangTri';
import { useSettings } from '../settings/SettingsProvider';
import type { Variant } from './nenTrangTriLayout';

// Icon SVG gom trong một chunk dùng chung, tải sau khi trang đã hiện.
const Icons = lazy(() => import('./nenTrangTriIcons'));

/** Lỗi tải chunk icon (mất mạng…) không được làm hỏng trang: bỏ trống phần icon. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface NenTrangTriProps {
  /** Bộ icon (bảng gán theo trang nằm ở content/nenTrangTri.ts) */
  theme?: NenTheme;
  /**
   * 'full': icon rải ở rìa cả màn hình, trôi chậm.
   * 'sides': chỉ ở 2 khoảng trống hai bên bảng bài học (màn từ 1296px), tối đa 4 icon mỗi bên, trôi rất chậm.
   * 'still': như 'full' nhưng đứng yên và rất mờ (trang giáo viên).
   */
  variant?: Variant;
  /** Ảnh nền mờ (đường dẫn manifest); null thì không có ảnh nền (chỉ icon). */
  image?: string | null;
  /** Thêm vài tia sáng lấp lánh (cảnh trao Trang Sổ Vàng, giới thiệu làng). */
  sparkle?: boolean;
}

/**
 * Nền trang trí: ảnh mờ và icon SVG tự vẽ trôi chậm bằng CSS (transform, opacity). aria-hidden, không nhận bấm,
 * nằm dưới mọi bảng; không làm giảm tương phản chữ (bảng nội dung vẫn đặc). Tắt chuyển động và ẩn icon khi bật
 * "Giảm chuyển động" hoặc prefers-reduced-motion (riêng 'still' không chuyển động nên vẫn hiện). Màn dưới 640px: tối đa 5 icon.
 */
export function NenTrangTri({ theme = 'lang', variant = 'full', image = 'ui/man-hinh-tai', sparkle = false }: NenTrangTriProps) {
  useManifest(); // để vẽ lại khi manifest tải xong
  const { settings } = useSettings();
  const url = image ? asset(image) : null;
  const calm = variant === 'still';
  const showIcons = calm || !settings.reducedMotion;

  // Chỉ tải icon sau khi trang đã hiện (rảnh tay hoặc sau 400ms).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!showIcons) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 800 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, [showIcons]);

  return (
    <div aria-hidden="true" className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${image === null ? '' : 'bg-giay'}`}>
      {image !== null && (
        <>
          {url && (
            <div
              className="absolute inset-[-8px] bg-cover bg-center opacity-60 blur-[3px]"
              style={{ backgroundImage: `url("${url}")` }}
            />
          )}
          <div className={`absolute inset-0 ${calm ? 'bg-giay/65' : 'bg-giay/40'}`} />
        </>
      )}
      {showIcons && ready && (
        <Quiet>
          <Suspense fallback={null}>
            <Icons theme={theme} variant={variant} sparkle={sparkle} />
          </Suspense>
        </Quiet>
      )}
    </div>
  );
}
