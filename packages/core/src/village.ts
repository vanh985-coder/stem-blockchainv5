import type { RouteObject } from 'react-router';

export type VillageId = 'lang-giay' | 'lang-det' | 'lang-khac-dau' | 'lang-bac';

export interface VillageModule {
  id: VillageId;
  name: string; // "Làng Giấy"
  levels: [number, number, number]; // ví dụ [1, 2, 3]
  routes: RouteObject[]; // route lazy, gắn dưới /lang/<id>
}
