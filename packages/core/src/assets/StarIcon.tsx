import { AssetImage } from './AssetImage';

/** Tên file thực tế của icon sao là ui/icons/ngoi-sao (spec 03 ghi "sao" là sai tên). */
export const STAR_ICON_PATH = 'ui/icons/ngoi-sao';

export function StarIcon({ size = 32 }: { size?: number }) {
  return <AssetImage path={STAR_ICON_PATH} alt="Sao" style={{ width: size, height: size, objectFit: 'contain' }} />;
}
