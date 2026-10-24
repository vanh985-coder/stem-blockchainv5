import type { VillageId } from '../../../village';
import type { VillageLayoutInput } from '../../village/villageLayout';
import { LANG_DET_LAYOUT } from './det';
import { LANG_GIAY_LAYOUT } from './giay';
import { minimalVillage } from './minimal';

/** Bố cục 4 làng ở hệ tọa độ của làng (cổng phía nam, người vào làng nhìn về +Z). Làng Giấy (X3) và Làng Dệt (mốc 3, bước L1) đủ cảnh; 2 làng kia chỉ có cổng, vài nhà, bụi tre và 3 biển (bài học, 2 game) (mốc 3 làm tiếp). */
export const LOCAL_VILLAGES: Readonly<Record<VillageId, VillageLayoutInput>> = {
  'lang-giay': LANG_GIAY_LAYOUT,
  'lang-det': LANG_DET_LAYOUT,
  'lang-khac-dau': minimalVillage({ id: 'lang-khac-dau', gateModel: 'env/cong-lang-khac-dau', mirror: true, roofs: ['tranh', 'ngoi', 'tranh'], seed: 20260108 }),
  'lang-bac': minimalVillage({ id: 'lang-bac', gateModel: 'env/cong-lang-bac', roofs: ['ngoi', 'ngoi', 'tranh'], seed: 20260109 }),
};

export { LANG_DET_LAYOUT, LANG_GIAY_LAYOUT };
