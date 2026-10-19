import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

export const langGiay: VillageModule = {
  id: 'lang-giay',
  name: ui.lang['lang-giay'],
  levels: [1, 2, 3],
  routes: [
    guardedRoute('man/1', 1, () => import('./pages/Man1')),
    guardedRoute('man/2', 2, () => import('./pages/Man2')),
    guardedRoute('man/3', 3, () => import('./pages/Man3')),
  ],
};

export default langGiay;
