import { PortraitFrame } from './PortraitFrame';

export interface AvatarProps {
  /** Tên file chân dung trong ui/portraits/, ví dụ "bac-an", "giang" */
  portrait: string;
  /** Tên hiển thị dưới chân dung */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const PX = { sm: 40, md: 52, lg: 72 } as const;

/** Chân dung vuông bo góc, có thể kèm tên bên dưới. */
export function Avatar({ portrait, name, size = 'md', showName = false, className = '' }: AvatarProps) {
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <PortraitFrame portrait={portrait} size={PX[size]} />
      {showName && name && <span className="font-display text-xs font-extrabold leading-tight">{name}</span>}
    </div>
  );
}
