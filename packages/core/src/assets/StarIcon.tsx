import { AssetImage } from './AssetImage';
import { hasAsset } from './manifest';
import { useManifest } from './store';
import { ui } from '../content/ui';

/** Tên file thực tế của icon sao là ui/icons/ngoi-sao (spec 03 ghi "sao" là sai tên). */
export const STAR_ICON_PATH = 'ui/icons/ngoi-sao';

export interface StarIconProps {
  size?: number;
  /** false: sao chưa đạt, hiện xám mờ */
  filled?: boolean;
}

/** Icon sao; chưa có ảnh trong manifest thì vẽ sao SVG cùng màu `vang`. */
export function StarIcon({ size = 32, filled = true }: StarIconProps) {
  const manifest = useManifest();
  const dim = filled ? '' : 'grayscale opacity-40';
  if (hasAsset(manifest, STAR_ICON_PATH)) {
    return (
      <AssetImage
        path={STAR_ICON_PATH}
        alt={ui.sao.tenIcon}
        className={['object-contain', dim].join(' ')}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={ui.sao.tenIcon} className={dim}>
      <polygon
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
        fill="var(--color-vang)"
        stroke="var(--color-vang-dam)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
