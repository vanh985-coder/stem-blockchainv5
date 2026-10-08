import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { sound } from '../audio/sound';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Không phát tiếng bấm */
  silent?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// Cao tối thiểu 52px (cỡ nhỏ vẫn giữ vùng bấm 44px). Mọi cỡ dùng chữ đậm từ 19px trở lên để được tính là chữ lớn
// (WCAG: ngưỡng tương phản 3:1), vì chữ trắng trên xanh-la #3FA34D chỉ đạt khoảng 3,1:1.
const SIZE: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-[1.1875rem]',
  md: 'min-h-[52px] px-6 text-xl',
  lg: 'min-h-[60px] px-8 text-2xl',
};

// Kiểu "3D": mặt nút nổi lên trên một dải màu tối hơn; khi bấm thì lún xuống.
const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-xanh-la text-white border-2 border-xanh-la-dam shadow-[0_4px_0_0_var(--color-xanh-la-dam)] hover:brightness-105',
  secondary:
    'bg-giay text-chu border-2 border-nau-go shadow-[0_4px_0_0_var(--color-nau-go)] hover:brightness-105',
  danger:
    'bg-do-son text-white border-2 border-do-son-dam shadow-[0_4px_0_0_var(--color-do-son-dam)] hover:brightness-105',
};

export function Button({
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
  type = 'button',
  ...rest
}: ButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!silent) sound.playClick();
    onClick?.(e);
  };

  const state = disabled
    ? 'opacity-60 cursor-not-allowed shadow-none translate-y-[3px]'
    : 'cursor-pointer active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--color-chu)]';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-nut font-display font-extrabold leading-none select-none',
        'transition-[transform,box-shadow,filter] duration-100 mb-1',
        'focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim',
        SIZE[size],
        VARIANT[variant],
        state,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
