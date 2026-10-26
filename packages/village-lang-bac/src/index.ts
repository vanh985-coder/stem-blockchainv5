import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

export const langBac: VillageModule = {
  id: 'lang-bac',
  name: ui.lang['lang-bac'],
  levels: [10, 11, 12],
  routes: [guardedRoute('man/10', 10, () => import('./pages/Man10')), guardedRoute('man/11', 11, () => import('./pages/Man11')), guardedRoute('man/12', 12, () => import('./pages/Man12'))],
};

export default langBac;
