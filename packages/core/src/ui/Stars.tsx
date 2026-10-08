import { StarIcon } from '../assets/StarIcon';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';

export interface StarsProps {
  earned: number; // 0..3
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX = { sm: 20, md: 28, lg: 40 } as const;

/** Hàng sao. Số sao đạt được còn có trong nhãn đọc cho người dùng đọc màn hình, không chỉ dựa vào màu. */
export function Stars({ earned, max = 3, size = 'md', className = '' }: StarsProps) {
  return (
    <div
      role="img"
      aria-label={fmt(ui.sao.nhan, { earned, max })}
      className={['inline-flex items-center gap-1', className].join(' ')}
    >
      {Array.from({ length: max }, (_, i) => (
        <StarIcon key={i} size={SIZE_PX[size]} filled={i < earned} />
      ))}
    </div>
  );
}
