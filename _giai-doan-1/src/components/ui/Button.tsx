import React from 'react';
import { sound } from '../../lib/sound';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'purple' | 'yellow' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  silent?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  silent = false,
  disabled = false,
  className = '',
  onClick,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!silent) {
      sound.playClick();
    }
    onClick?.(e);
  };

  // Kích thước chuẩn: chiều cao tối thiểu 52px (sm: 44px tap target)
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'min-h-[44px] px-4 text-xs',
    md: 'min-h-[52px] px-6 text-sm',
    lg: 'min-h-[56px] px-8 text-base',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    // Chính: xanh-dung
    primary:
      'bg-[#1FAF5A] text-white border-b-4 border-[#178A46] active:border-b-2 active:translate-y-[2px] hover:bg-[#23be64]',
    // Phụ: nền trắng viền xám nhạt
    secondary:
      'bg-white text-[#2A2340] border-2 border-[#E3E0EE] border-b-4 border-b-[#D0CCE0] active:border-b-2 active:translate-y-[2px] hover:bg-[#F6F5FB]',
    // Nguy hiểm: but-do
    danger:
      'bg-[#E5484D] text-white border-b-4 border-[#B8363A] active:border-b-2 active:translate-y-[2px] hover:bg-[#ef585d]',
    // Màu tím thương hiệu: muc-tim
    purple:
      'bg-[#5B3FD6] text-white border-b-4 border-[#4430A8] active:border-b-2 active:translate-y-[2px] hover:bg-[#684be3]',
    // Vàng sao: chữ tối trên nền vàng
    yellow:
      'bg-[#FFC21A] text-[#2A2340] border-b-4 border-[#D9A000] active:border-b-2 active:translate-y-[2px] hover:bg-[#ffca36]',
    // Ghost: nút phụ tối giản
    ghost:
      'bg-transparent text-[#2A2340] hover:bg-[#E9E4FF]/40 border-0 active:translate-y-0 min-h-[44px]',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center gap-2 font-display font-bold rounded-[16px]
        transition-all duration-100 select-none cursor-pointer
        focus-visible:outline-3 focus-visible:outline-[#5B3FD6] focus-visible:outline-offset-2
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed transform-none active:transform-none border-b-2' : ''}
        ${className}
      `}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
