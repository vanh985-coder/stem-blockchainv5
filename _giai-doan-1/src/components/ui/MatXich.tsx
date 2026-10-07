import React from 'react';

export interface MatXichProps {
  status?: 'valid' | 'broken' | 'neutral';
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animateOnChange?: boolean;
}

export const MatXich: React.FC<MatXichProps> = ({
  status = 'valid',
  orientation = 'horizontal',
  size = 'md',
  className = '',
  animateOnChange = true,
}) => {
  const sizeMap = {
    sm: { width: 40, height: 28, stroke: 3.5 },
    md: { width: 56, height: 36, stroke: 4.5 },
    lg: { width: 72, height: 44, stroke: 5.5 },
  };

  const { width, height, stroke } = sizeMap[size];
  const isVertical = orientation === 'vertical';
  const effectiveWidth = isVertical ? height : width;
  const effectiveHeight = isVertical ? width : height;

  const color =
    status === 'valid'
      ? '#1FAF5A'
      : status === 'broken'
        ? '#E5484D'
        : '#6B6485';

  return (
    <div
      className={`inline-flex items-center justify-center select-none ${className}`}
      aria-label={`Mắt xích ${status === 'valid' ? 'hợp lệ' : status === 'broken' ? 'gãy' : 'bình thường'}`}
    >
      {status === 'broken' ? (
        // Mắt xích gãy đôi với hai nửa tách rời và rung nhẹ bằng CSS keyframes
        <div
          className={`relative flex items-center justify-center ${
            animateOnChange ? 'animate-chain-shake' : ''
          }`}
        >
          <svg
            width={effectiveWidth}
            height={effectiveHeight}
            viewBox="0 0 56 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isVertical ? 'rotate-90' : ''}
          >
            {/* Nửa mắt xích trái */}
            <path
              d="M 22 10 L 14 10 C 9.5 10 6 13.5 6 18 C 6 22.5 9.5 26 14 26 L 20 26"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              className={animateOnChange ? 'animate-chain-break-left' : ''}
              style={{
                transformOrigin: '22px 18px',
                transform: 'translate(-3px, 0) rotate(-4deg)',
              }}
            />
            {/* Nửa mắt xích phải */}
            <path
              d="M 34 10 L 42 10 C 46.5 10 50 13.5 50 18 C 50 22.5 46.5 26 42 26 L 36 26"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              className={animateOnChange ? 'animate-chain-break-right' : ''}
              style={{
                transformOrigin: '34px 18px',
                transform: 'translate(3px, 0) rotate(4deg)',
              }}
            />
            {/* Vết nứt đứt gãy ở giữa */}
            <path
              d="M 24 8 L 29 18 L 26 22 L 31 30"
              stroke="#E5484D"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : (
        // Mắt xích liền nguyên vẹn (hợp lệ / kết nối) với hiệu ứng nảy nhẹ khi khớp
        <div
          className={`flex items-center justify-center ${
            animateOnChange && status === 'valid' ? 'animate-chain-snap' : ''
          }`}
        >
          <svg
            width={effectiveWidth}
            height={effectiveHeight}
            viewBox="0 0 56 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={isVertical ? 'rotate-90' : ''}
          >
            {/* Vòng xích trái */}
            <rect
              x="6"
              y="9"
              width="28"
              height="18"
              rx="9"
              stroke={color}
              strokeWidth={stroke}
            />
            {/* Vòng xích phải lồng vào vòng trái */}
            <rect
              x="22"
              y="9"
              width="28"
              height="18"
              rx="9"
              stroke={color}
              strokeWidth={stroke}
            />
            {/* Đường nối giao thoa giữa 2 mắt xích */}
            <path
              d="M 26 14 L 30 14 M 26 22 L 30 22"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
