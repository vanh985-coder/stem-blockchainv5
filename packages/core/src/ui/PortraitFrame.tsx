import { BiAvatar } from '../assets/BiAvatar';
import { Portrait } from '../assets/Portrait';
import { hasAsset } from '../assets/manifest';
import { useManifest } from '../assets/store';
import { portraitAlt } from '../content/characters';

export interface PortraitFrameProps {
  /** Tên file chân dung, ví dụ "bac-an", "ba-cu", "bi" */
  portrait: string;
  /** Cạnh ngoài của khung, px */
  size?: number;
  className?: string;
}

/**
 * Khung chân dung: VUÔNG BO GÓC, viền gỗ, nền màu giấy.
 * Không dùng khung tròn vì nón lá, khăn, búi tóc sát mép trên sẽ bị cắt.
 */
export function PortraitFrame({ portrait, size = 96, className = '' }: PortraitFrameProps) {
  const manifest = useManifest();
  const border = 4;
  const inner = size - border * 2;
  const isBi = portrait === 'bi' && !hasAsset(manifest, 'ui/portraits/bi');
  return (
    <div
      className={['shrink-0 overflow-hidden rounded-2xl border-4 border-nau-go bg-giay grid place-items-center', className].join(' ')}
      style={{ width: size, height: size }}
    >
      {isBi ? (
        <BiAvatar size={Math.round(inner * 0.78)} />
      ) : (
        <Portrait id={portrait} size={inner} className="block object-cover" alt={portraitAlt(portrait)} />
      )}
    </div>
  );
}
