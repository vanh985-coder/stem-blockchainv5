import type { CSSProperties, ReactElement } from 'react';
import { asset, useManifest } from '../assets/store';
import { useSettings } from '../settings/SettingsProvider';

type IconKind = 'giay' | 'la' | 'xu';

/** Tờ giấy dó, lá tre, đồng xu: vẽ bằng SVG, không cần file ảnh. */
function Icon({ kind }: { kind: IconKind }): ReactElement {
  const stroke = '#8a5a3b';
  if (kind === 'giay') {
    return (
      <svg viewBox="0 0 48 48" className="size-full" fill="none">
        <path d="M10 4h20l10 10v30H10z" fill="#fff8e6" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M30 4v10h10" fill="#efe0bd" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M16 24h18M16 31h18M16 38h12" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'la') {
    return (
      <svg viewBox="0 0 48 48" className="size-full" fill="none">
        <path d="M6 40C14 14 30 6 44 6c-2 16-12 32-38 34z" fill="#7bbf6a" stroke="#2f6b3a" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M8 38C20 26 30 18 40 10" stroke="#2f6b3a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="size-full" fill="none">
      <path
        fillRule="evenodd"
        d="M24 4a20 20 0 1 0 0.01 0zM18 18h12v12H18z"
        fill="#f2b33d"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Floater {
  kind: IconKind;
  /** Vị trí theo % màn hình */
  x: number;
  y: number;
  /** Cạnh icon, px */
  size: number;
  /** Quãng trôi (px), thời gian một vòng (giây), trễ (giây), góc nghiêng (độ) */
  dx: number;
  dy: number;
  dur: number;
  delay: number;
  r0: number;
  r1: number;
}

/** 7 icon, đặt rải ở rìa để không che giữa trang; mỗi cái trôi một kiểu và một nhịp. */
export const FLOATERS: readonly Floater[] = [
  { kind: 'giay', x: 6, y: 12, size: 56, dx: 16, dy: -24, dur: 24, delay: 0, r0: -10, r1: 8 },
  { kind: 'la', x: 88, y: 10, size: 48, dx: -18, dy: 20, dur: 20, delay: -6, r0: 12, r1: -14 },
  { kind: 'xu', x: 12, y: 70, size: 44, dx: 14, dy: -18, dur: 26, delay: -11, r0: -6, r1: 14 },
  { kind: 'giay', x: 90, y: 66, size: 52, dx: -14, dy: -26, dur: 28, delay: -3, r0: 8, r1: -10 },
  { kind: 'la', x: 22, y: 38, size: 38, dx: 20, dy: 16, dur: 22, delay: -15, r0: -16, r1: 10 },
  { kind: 'xu', x: 80, y: 38, size: 40, dx: -16, dy: 22, dur: 25, delay: -9, r0: 10, r1: -8 },
  { kind: 'la', x: 52, y: 88, size: 44, dx: 18, dy: -14, dur: 23, delay: -18, r0: -8, r1: 16 },
];

export interface NenTrangTriProps {
  /** Ảnh nền mờ (đường dẫn manifest): ui/man-hinh-tai hoặc story/03-cho-phien. */
  image?: string;
}

/**
 * Nền trang trí cho trang chủ và các trang tài khoản (không dùng ở trang bài học và trang giáo viên):
 * ảnh mờ và vài icon SVG trôi chậm bằng CSS animation. aria-hidden, không nhận bấm, nằm dưới mọi bảng.
 * Icon tắt khi bật "Giảm chuyển động" (hoặc prefers-reduced-motion của máy); chỉ còn ảnh mờ.
 */
export function NenTrangTri({ image = 'ui/man-hinh-tai' }: NenTrangTriProps) {
  useManifest(); // để vẽ lại khi manifest tải xong
  const { settings } = useSettings();
  const url = asset(image);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-giay">
      {url && (
        <div
          className="absolute inset-[-8px] bg-cover bg-center opacity-60 blur-[3px]"
          style={{ backgroundImage: `url("${url}")` }}
        />
      )}
      <div className="absolute inset-0 bg-giay/40" />
      {!settings.reducedMotion &&
        FLOATERS.map((f, i) => (
          <span
            key={i}
            className="animate-trang-tri-troi absolute block opacity-45 motion-reduce:hidden"
            style={
              {
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                '--dx': `${f.dx}px`,
                '--dy': `${f.dy}px`,
                '--dur': `${f.dur}s`,
                '--r0': `${f.r0}deg`,
                '--r1': `${f.r1}deg`,
                animationDelay: `${f.delay}s`,
              } as CSSProperties
            }
          >
            <Icon kind={f.kind} />
          </span>
        ))}
    </div>
  );
}
