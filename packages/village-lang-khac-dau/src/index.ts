import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

export const langKhacDau: VillageModule = {
  id: 'lang-khac-dau',
  name: ui.lang['lang-khac-dau'],
  levels: [7, 8, 9],
  routes: [guardedRoute('man/7', 7, () => import('./pages/Man7')), guardedRoute('man/8', 8, () => import('./pages/Man8')), guardedRoute('man/9', 9, () => import('./pages/Man9'))],
};

export default langKhacDau;
