import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

// Mốc 1: chỉ có route màn bài học. Cảnh làng và các game khác thêm ở mốc 2–3.
export const langBac: VillageModule = {
  id: 'lang-bac',
  name: ui.lang['lang-bac'],
  levels: [10, 11, 12],
  routes: [guardedRoute('man/10', 10, () => import('./pages/Man10'))],
};

/** Trang màn 12 (tải lười): màn còn coming-soon nên chưa có route cho người chơi; vỏ lang-bac gắn vào /dev/man-12 khi chạy dev (bước B4). */
export const loadMan12 = () => import('./pages/Man12');

export default langBac;
