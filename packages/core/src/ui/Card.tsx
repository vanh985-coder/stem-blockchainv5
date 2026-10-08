import type { ComponentProps } from 'react';

export interface CardProps extends ComponentProps<'div'> {
  variant?: 'default' | 'paper' | 'elevated' | 'outlined' | 'interactive';
  radius?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const RADIUS = { sm: 'rounded-[14px]', md: 'rounded-[18px]', lg: 'rounded-[20px]' } as const;

const VARIANT = {
  default: 'bg-white/70 border-2 border-nau-go/40',
  paper: 'bg-o-ly-grid border-2 border-muc-tim/30',
  elevated: 'bg-white/80 border-2 border-nau-go/50 shadow-[0_3px_0_0_var(--color-nau-go)]',
  outlined: 'bg-transparent border-2 border-nau-go/40',
  interactive:
    'bg-white/70 border-2 border-nau-go/40 hover:border-muc-tim hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer',
} as const;

/** Thẻ nội dung nhỏ nằm trong bảng bài học (nền trắng mờ trên giấy dó, hoặc nền ô li). */
export function Card({ children, variant = 'default', radius = 'md', active = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[RADIUS[radius], VARIANT[variant], active ? 'border-muc-tim ring-2 ring-muc-tim/30' : '', 'p-4 sm:p-5', className].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
