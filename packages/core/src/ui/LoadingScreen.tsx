import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { lookupAsset } from '../assets/manifest';
import { ASSETS_URL, useManifest } from '../assets/store';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { useSettings } from '../settings/SettingsProvider';
import { easePercent, targetPercent } from './loadingProgress';

/** Ảnh nền của mọi màn chờ */
export const LOADING_IMAGE = 'ui/man-hinh-tai';
/** Thời gian mờ dần khi ẩn màn chờ (ms) */
export const LOADING_FADE_MS = 400;

/** Tên màn đang tải (để màn chờ ở các chỗ không biết tên, như khung 3D, vẫn ghi được tên màn). Không có thì chỉ hiện dòng nhỏ. */
const LoadingTitleContext = createContext<string | undefined>(undefined);
export function LoadingTitleProvider({ title, children }: { title: string; children: ReactNode }) {
  return <LoadingTitleContext.Provider value={title}>{children}</LoadingTitleContext.Provider>;
}
export function useLoadingTitle(): string | undefined {
  return useContext(LoadingTitleContext);
}

/**
 * Khung màn chơi (`MiniGameLevel`) cung cấp hàm này để biết khung 3D hay 2.5D bên trong còn đang hiện màn chờ không, rồi ẩn các nút của khung (nút "?") cho tới khi tải xong.
 * Ngoài khung màn chơi thì không có (undefined).
 */
export const SceneLoadingReportContext = createContext<((loading: boolean) => void) | undefined>(undefined);

export interface LoadingScreenProps {
  /** Còn hiện không (false thì lên 100% rồi mờ dần 0,4 giây và nhường chuột). Mặc định true: dùng làm fallback của Suspense thì không cần truyền. */
  shown?: boolean;
  /** true (mặc định): phủ kín cả màn hình; false: phủ khung cha (đặt trong khung `relative`, ví dụ khung 3D) */
  fullScreen?: boolean;
  /** Dòng nhỏ trên cùng (mặc định "Đang tải") */
  subtitle?: string;
  /** Dòng lớn: tên nơi sắp vào hoặc tên màn (bỏ trống thì lấy từ `LoadingTitleProvider`, không có thì không hiện) */
  title?: string;
  /** Tiến độ đo được, 0 đến 100. null hoặc bỏ trống: không đo được, thanh chạy chậm dần tới 90% rồi chờ. */
  percent?: number | null;
  testId?: string;
  /** Thuộc tính data-* thêm vào khung ngoài (ví dụ `{ place: 'lang-det' }`) */
  data?: Readonly<Record<string, string>>;
}

/**
 * Màn chờ CHUNG của cả game (một kiểu dáng): ảnh nền tranh phủ kín trên nền kem, lớp phủ kem sáng mờ, chữ nâu đậm ở giữa (dòng nhỏ, tên nơi hoặc tên màn), thanh tiến độ mảnh xanh lá và phần trăm.
 * Dùng viền và nền phẳng, không bóng, không lọc (phủ lên cảnh WebGL). Ảnh nền chưa tải thì thấy nền kem trơn.
 * Phần trăm tăng dần theo từng khung hình, không nhảy; chỉ lên 100% khi `shown` chuyển sang false.
 */
export function LoadingScreen({ shown = true, fullScreen = true, subtitle, title, percent = null, testId = 'man-cho-tai', data }: LoadingScreenProps) {
  const manifest = useManifest();
  const { settings } = useSettings();
  const ctxTitle = useLoadingTitle();
  const heading = title ?? ctxTitle;
  const shownPercent = useLoadingPercent(shown, percent);
  const [imgFailed, setImgFailed] = useState(false);
  const src = imgFailed ? null : lookupAsset(manifest, ASSETS_URL, LOADING_IMAGE);
  const dataAttrs = Object.fromEntries(Object.entries(data ?? {}).map(([k, v]) => [`data-${k}`, v]));
  return (
    <div
      data-testid={testId}
      data-shown={shown ? 'true' : 'false'}
      {...dataAttrs}
      aria-hidden={!shown}
      className={`${fullScreen ? 'fixed inset-0 z-[60]' : 'absolute inset-0 z-10'} grid place-items-center overflow-hidden bg-giay p-6 ${shown ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      style={{ transition: shown || settings.reducedMotion ? 'none' : `opacity ${LOADING_FADE_MS}ms ease-out` }}
    >
      {src && <img src={src} alt="" draggable={false} onError={() => setImgFailed(true)} className="absolute inset-0 size-full object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 bg-giay/60" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-3 text-center text-nau-go-dam">
        <p className="font-display text-lg font-bold">{subtitle ?? ui.manCho.dangTai}</p>
        {heading && (
          <h2 data-testid={`${testId}-ten`} className="font-display text-3xl font-extrabold text-nau-dam">
            {heading}
          </h2>
        )}
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shownPercent} className="h-2 w-full overflow-hidden rounded-full bg-nau-go/25">
          <div className="h-full rounded-full bg-xanh-la" style={{ width: `${shownPercent}%` }} />
        </div>
        <p role="status" className="font-display text-xl font-bold">
          {fmt(ui.tai3d.phanTram, { so: shownPercent })}
        </p>
      </div>
    </div>
  );
}

/**
 * Chuỗi màn chờ nối tiếp nhau (tải mã của route rồi tới tải cảnh: hai màn chờ lần lượt hiện): màn sau tiếp tục từ số và thời gian của màn trước thay vì về 0,
 * miễn là màn trước vừa biến mất chưa quá `CHAIN_GAP_MS`.
 */
const CHAIN_GAP_MS = 1500;
const chain = { t0: 0, value: 0, endedAt: -Infinity };

/** Số phần trăm hiển thị: đuổi theo mục tiêu mỗi khung hình (không lùi, không nhảy); mỗi chuỗi màn chờ mới tính lại từ 0; ẩn thì 100. */
function useLoadingPercent(shown: boolean, measured: number | null): number {
  const [value, setValue] = useState(0);
  const live = useRef(measured);
  live.current = measured;
  useEffect(() => {
    if (!shown) {
      setValue(100);
      return undefined;
    }
    const start = performance.now();
    const continuing = start - chain.endedAt < CHAIN_GAP_MS;
    const t0 = continuing ? chain.t0 : start;
    let current = continuing ? chain.value : 0;
    chain.t0 = t0;
    setValue(Math.round(current));
    let last = start;
    let id = 0;
    const tick = (now: number) => {
      current = easePercent(current, targetPercent(live.current, now - t0), now - last);
      last = now;
      chain.value = current;
      const rounded = Math.round(current);
      setValue((prev) => (prev === rounded ? prev : rounded));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(id);
      chain.endedAt = performance.now();
    };
  }, [shown]);
  return value;
}
