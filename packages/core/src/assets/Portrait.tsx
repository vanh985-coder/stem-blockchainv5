import { AssetImage } from './AssetImage';
import { BiAvatar } from './BiAvatar';
import { hasAsset } from './manifest';
import { useManifest } from './store';

/** 10 chân dung cắt từ ảnh gốc (mốc 1) + Bi. Tên file theo spec 03 mục 3.6. */
export const PORTRAIT_IDS = [
  'hoc-sinh-nam',
  'ti',
  'bac-an',
  'cu-binh',
  'co-chi',
  'chu-dung',
  'thay-linh',
  'lai-buon',
  'ba-cu',
  'nong-dan',
  'bi',
] as const;

export type PortraitId = (typeof PORTRAIT_IDS)[number] | (string & {});

export interface PortraitProps {
  id: PortraitId;
  size?: number;
  className?: string;
}

/** Chân dung nhân vật: lấy ui/portraits/<id>. Riêng "bi" nếu manifest không có thì vẽ BiAvatar bằng SVG. */
export function Portrait({ id, size = 96, className = 'rounded-2xl object-cover' }: PortraitProps) {
  const path = `ui/portraits/${id}`;
  const manifest = useManifest();
  if (id === 'bi' && !hasAsset(manifest, path)) return <BiAvatar size={size} />;
  return <AssetImage path={path} alt={id} className={className} style={{ width: size, height: size }} />;
}
