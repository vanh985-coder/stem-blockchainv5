import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

// Mốc 1: chỉ có route màn bài học. Cảnh làng và các game khác thêm ở mốc 2–3.
export const langBac: VillageModule = {
  id: 'lang-bac',
  name: ui.lang['lang-bac'],
  levels: [10, 11, 12],
  routes: [guardedRoute('man/10', 10, () => import('./pages/Man10'))],
};

export default langBac;
