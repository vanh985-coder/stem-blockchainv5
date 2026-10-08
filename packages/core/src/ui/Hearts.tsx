import { fmt } from '../content/characters';
import { ui } from '../content/ui';

export interface HeartsProps {
  current: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

/** Hàng tim còn lại. Số tim còn lại có trong nhãn đọc cho người dùng đọc màn hình, không chỉ dựa vào màu. */
export function Hearts({ current, max = 3, className = '', size = 'md' }: HeartsProps) {
  const iconSize = size === 'sm' ? 20 : 26;
  return (
    <div role="img" aria-label={fmt(ui.tim.nhan, { so: current, max })} className={`inline-flex items-center gap-1.5 ${className}`}>
      {Array.from({ length: max }).map((_, index) => {
        const alive = index < current;
        return (
          <svg
            key={index}
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill={alive ? 'var(--color-do-son)' : 'color-mix(in oklab, var(--color-giay) 75%, var(--color-nau-go))'}
            stroke={alive ? 'var(--color-do-son-dam)' : 'var(--color-nau-go)'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={alive ? '' : 'opacity-60'}
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        );
      })}
    </div>
  );
}
