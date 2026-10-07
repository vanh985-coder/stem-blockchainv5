import React from 'react';

export interface HeartsProps {
  current: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const Hearts: React.FC<HeartsProps> = ({
  current,
  max = 3,
  className = '',
  size = 'md',
}) => {
  const iconSize = size === 'sm' ? 20 : 26;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={`${current} trên ${max} tim`}
    >
      {Array.from({ length: max }).map((_, index) => {
        const isAlive = index < current;
        return (
          <svg
            key={index}
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill={isAlive ? '#E5484D' : '#E3E0EE'}
            stroke={isAlive ? '#B8363A' : '#D0CCE0'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isAlive ? 'scale-100' : 'scale-90 opacity-70'}`}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        );
      })}
    </div>
  );
};
