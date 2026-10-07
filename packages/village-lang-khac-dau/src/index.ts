import { lazyRoute, type VillageModule } from '@so-chung/core';

// Mốc 1: chỉ có route màn bài học. Cảnh làng và các game khác thêm ở mốc 2–3.
export const langKhacDau: VillageModule = {
  id: 'lang-khac-dau',
  name: 'Làng Khắc Dấu',
  levels: [7, 8, 9],
  routes: [lazyRoute('man/7', () => import('./pages/Man7'))],
};

export default langKhacDau;
