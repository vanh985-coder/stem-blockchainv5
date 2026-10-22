import type { VillageId } from '../../../village';
import type { VillageLayoutInput } from '../../village/villageLayout';
import { LANG_GIAY_LAYOUT } from './giay';
import { minimalVillage } from './minimal';

/** Bố cục 4 làng ở hệ tọa độ của làng (cổng phía nam, người vào làng nhìn về +Z). Làng Giấy đủ cảnh; 3 làng kia chỉ có cổng, vài nhà, bụi tre và 3 biển (bài học, 2 game) (bước W2 và mốc 3 làm tiếp). */
export const LOCAL_VILLAGES: Readonly<Record<VillageId, VillageLayoutInput>> = {
  'lang-giay': LANG_GIAY_LAYOUT,
  'lang-det': minimalVillage({ id: 'lang-det', gateModel: 'env/cong-lang-det', roofs: ['ngoi', 'tranh', 'ngoi'], seed: 20260107 }),
  'lang-khac-dau': minimalVillage({ id: 'lang-khac-dau', gateModel: 'env/cong-lang-khac-dau', mirror: true, roofs: ['tranh', 'ngoi', 'tranh'], seed: 20260108 }),
  'lang-bac': minimalVillage({ id: 'lang-bac', gateModel: 'env/cong-lang-bac', roofs: ['ngoi', 'ngoi', 'tranh'], seed: 20260109 }),
};

export { LANG_GIAY_LAYOUT };
