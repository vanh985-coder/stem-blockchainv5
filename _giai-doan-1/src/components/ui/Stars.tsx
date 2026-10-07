import React from 'react';

export interface StarsProps {
  earned: number; // 0..3
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export const Stars: React.FC<StarsProps> = ({
  earned,
  max = 3,
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 18,
    md: 26,
    lg: 38,
  };

  const dim = sizeMap[size];

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={`${earned} trên ${max} sao`}
    >
      {Array.from({ length: max }).map((_, index) => {
        const isFilled = index < earned;
        return (
          <svg
            key={index}
            width={dim}
            height={dim}
            viewBox="0 0 24 24"
            fill={isFilled ? '#FFC21A' : '#E3E0EE'}
            stroke={isFilled ? '#D9A000' : '#D0CCE0'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-200 ${isFilled ? 'scale-105' : 'scale-95 opacity-60'}`}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
};
