import { lazyRoute, type VillageModule } from '@so-chung/core';

// Mốc 1: chỉ có route màn bài học. Cảnh làng và các game khác thêm ở mốc 2–3.
export const langDet: VillageModule = {
  id: 'lang-det',
  name: 'Làng Dệt',
  levels: [4, 5, 6],
  routes: [lazyRoute('man/4', () => import('./pages/Man4'))],
};

export default langDet;
