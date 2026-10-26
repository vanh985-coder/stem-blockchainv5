import type { VillageId } from '../../../village';
import type { VillageLayoutInput } from '../../village/villageLayout';
import { LANG_BAC_LAYOUT } from './bac';
import { LANG_DET_LAYOUT } from './det';
import { LANG_GIAY_LAYOUT } from './giay';
import { LANG_KHAC_DAU_LAYOUT } from './khac-dau';

/** Bố cục 4 làng ở hệ tọa độ của làng (cổng phía nam, người vào làng nhìn về +Z). Cả bốn làng đủ cảnh: Làng Giấy (X3), Làng Dệt (mốc 3, bước L1), Làng Khắc Dấu (bước L3) và Làng Bạc (bước L5). */
export const LOCAL_VILLAGES: Readonly<Record<VillageId, VillageLayoutInput>> = {
  'lang-giay': LANG_GIAY_LAYOUT,
  'lang-det': LANG_DET_LAYOUT,
  'lang-khac-dau': LANG_KHAC_DAU_LAYOUT,
  'lang-bac': LANG_BAC_LAYOUT,
};

export { LANG_BAC_LAYOUT, LANG_DET_LAYOUT, LANG_GIAY_LAYOUT, LANG_KHAC_DAU_LAYOUT };
