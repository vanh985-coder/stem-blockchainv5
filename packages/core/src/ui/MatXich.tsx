import { ui } from '../content/ui';

export interface MatXichProps {
  status?: 'valid' | 'broken' | 'neutral';
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animateOnChange?: boolean;
}

const SIZE = {
  sm: { width: 40, height: 28, stroke: 3.5 },
  md: { width: 56, height: 36, stroke: 4.5 },
  lg: { width: 72, height: 44, stroke: 5.5 },
} as const;

/**
 * Mắt xích nối hai trang. Trạng thái không chỉ dùng màu: gãy thì có hai nửa tách rời và vết nứt,
 * hợp lệ thì hai vòng lồng nhau, bình thường thì nét xám.
 */
export function MatXich({
  status = 'valid',
  orientation = 'horizontal',
  size = 'md',
  className = '',
  animateOnChange = true,
}: MatXichProps) {
  const { width, height, stroke } = SIZE[size];
  const vertical = orientation === 'vertical';
  const w = vertical ? height : width;
  const h = vertical ? width : height;
  const color =
    status === 'valid' ? 'var(--color-xanh-la-dam)' : status === 'broken' ? 'var(--color-do-son)' : 'var(--color-nau-go)';
  const label = status === 'valid' ? ui.matXich.hopLe : status === 'broken' ? ui.matXich.gay : ui.matXich.binhThuong;

  return (
    <div role="img" aria-label={label} className={`inline-flex select-none items-center justify-center ${className}`}>
      {status === 'broken' ? (
        <div className={`relative flex items-center justify-center ${animateOnChange ? 'animate-chain-shake' : ''}`}>
          <svg width={w} height={h} viewBox="0 0 56 36" fill="none" className={vertical ? 'rotate-90' : ''}>
            <path
              d="M 22 10 L 14 10 C 9.5 10 6 13.5 6 18 C 6 22.5 9.5 26 14 26 L 20 26"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              className={animateOnChange ? 'animate-chain-break-left' : ''}
              style={{ transformOrigin: '22px 18px', transform: 'translate(-3px, 0) rotate(-4deg)' }}
            />
            <path
              d="M 34 10 L 42 10 C 46.5 10 50 13.5 50 18 C 50 22.5 46.5 26 42 26 L 36 26"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              className={animateOnChange ? 'animate-chain-break-right' : ''}
              style={{ transformOrigin: '34px 18px', transform: 'translate(3px, 0) rotate(4deg)' }}
            />
            <path d="M 24 8 L 29 18 L 26 22 L 31 30" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <div className={`flex items-center justify-center ${animateOnChange && status === 'valid' ? 'animate-chain-snap' : ''}`}>
          <svg width={w} height={h} viewBox="0 0 56 36" fill="none" className={vertical ? 'rotate-90' : ''}>
            <rect x="6" y="9" width="28" height="18" rx="9" stroke={color} strokeWidth={stroke} />
            <rect x="22" y="9" width="28" height="18" rx="9" stroke={color} strokeWidth={stroke} />
            <path d="M 26 14 L 30 14 M 26 22 L 30 22" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
