import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  }[position];

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute ${positionClasses} z-40 whitespace-nowrap bg-[#2A2340] text-white text-xs font-semibold
            px-3 py-1.5 rounded-[10px] shadow-sticker-sm pointer-events-none transition-all duration-150 animate-in fade-in
          `}
        >
          {content}
          <div
            className={`
              absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent
              ${
                position === 'top'
                  ? 'top-full border-t-4 border-t-[#2A2340]'
                  : 'bottom-full border-b-4 border-b-[#2A2340]'
              }
            `}
          />
        </div>
      )}
    </div>
  );
};
