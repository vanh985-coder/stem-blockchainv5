import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

// Màn 4 (bài học) và màn 5 (game phụ 1). Màn 6 thêm khi làm xong; cảnh làng nằm ở thế giới mở của hub.
export const langDet: VillageModule = {
  id: 'lang-det',
  name: ui.lang['lang-det'],
  levels: [4, 5, 6],
  routes: [guardedRoute('man/4', 4, () => import('./pages/Man4')), guardedRoute('man/5', 5, () => import('./pages/Man5'))],
};

export default langDet;
