import type { CSSProperties, HTMLAttributes } from 'react';
import { asset, useManifest } from '../assets/store';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Thêm đệm bên trong (mặc định có) */
  padded?: boolean;
}

/** Bảng nền giấy dó (ui/textures/giay-do), viền gỗ nâu, bo góc mềm. Thiếu ảnh thì dùng màu giấy. */
export function Panel({ padded = true, className = '', style, children, ...rest }: PanelProps) {
  useManifest(); // để vẽ lại khi manifest tải xong
  const url = asset('ui/textures/giay-do');
  const bg: CSSProperties = {
    backgroundColor: 'var(--color-giay)',
    // Phủ nhẹ màu giấy lên texture để chữ dễ đọc.
    ...(url
      ? {
          backgroundImage: `linear-gradient(rgba(246, 235, 211, 0.55), rgba(246, 235, 211, 0.55)), url("${url}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
    ...style,
  };
  return (
    <div
      className={[
        'rounded-bang border-4 border-nau-go shadow-[0_4px_0_0_var(--color-nau-go-dam)] text-chu',
        padded ? 'p-4 sm:p-6' : '',
        className,
      ].join(' ')}
      style={bg}
      {...rest}
    >
      {children}
    </div>
  );
}
