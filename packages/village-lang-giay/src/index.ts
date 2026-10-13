import { Suspense, createElement, lazy } from 'react';
import { guardedRoute, ui, type VillageModule } from '@so-chung/core';

// Cảnh làng 3D (mốc 2): trang gốc `/lang/lang-giay` (route index), tải lười cùng lõi 3D (three, R3F) nên màn bài học 2D vẫn nhẹ.
const Scene = lazy(() => import('./scene/LangGiayScene'));

export const langGiay: VillageModule = {
  id: 'lang-giay',
  name: ui.lang['lang-giay'],
  levels: [1, 2, 3],
  hasScene: true,
  routes: [
    { index: true, element: createElement(Suspense, { fallback: createElement('p', { className: 'p-6 text-center' }, ui.chung.dangTai) }, createElement(Scene)) },
    guardedRoute('man/1', 1, () => import('./pages/Man1')),
  ],
};

export default langGiay;
