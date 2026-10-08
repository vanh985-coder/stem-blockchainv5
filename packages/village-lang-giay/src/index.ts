import { lazyRoute, ui, type VillageModule } from '@so-chung/core';

// Mốc 1: chỉ có route màn bài học. Cảnh làng và các game khác thêm ở mốc 2–3.
export const langGiay: VillageModule = {
  id: 'lang-giay',
  name: ui.lang['lang-giay'],
  levels: [1, 2, 3],
  routes: [lazyRoute('man/1', () => import('./pages/Man1'))],
};

export default langGiay;
