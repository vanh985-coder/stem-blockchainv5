import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'paper' | 'elevated' | 'outlined' | 'interactive';
  radius?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  radius = 'md',
  active = false,
  className = '',
  ...rest
}) => {
  const radiusMap = {
    sm: 'rounded-[14px]',
    md: 'rounded-[18px]',
    lg: 'rounded-[20px]',
  };

  const variantMap = {
    default: 'bg-white border-2 border-[#E3E0EE] shadow-sticker',
    paper: 'bg-o-ly-grid border-2 border-[#D5CBFF] shadow-sticker',
    elevated: 'bg-white border-2 border-[#D0CCE0] shadow-sticker-lg',
    outlined: 'bg-transparent border-2 border-[#E3E0EE]',
    interactive:
      'bg-white border-2 border-[#E3E0EE] shadow-sticker hover:border-[#5B3FD6] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sticker-sm transition-all duration-150 cursor-pointer',
  };

  return (
    <div
      className={`
        ${radiusMap[radius]}
        ${variantMap[variant]}
        ${active ? 'border-[#5B3FD6] ring-2 ring-[#5B3FD6]/30' : ''}
        p-4 sm:p-5
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
};
