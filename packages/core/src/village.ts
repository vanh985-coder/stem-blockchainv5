import type { RouteObject } from 'react-router';

export type VillageId = 'lang-giay' | 'lang-det' | 'lang-khac-dau' | 'lang-bac';

export interface VillageModule {
  id: VillageId;
  name: string; // "Làng Giấy"
  levels: [number, number, number]; // ví dụ [1, 2, 3]
  routes: RouteObject[]; // route lazy, gắn dưới /lang/<id>
  /**
   * Từ mốc 2: làng đã có cảnh 3D (route `index` trong `routes`). Vỏ chạy riêng chuyển `/` sang `/lang/<id>` (cảnh làng) thay vì về bản đồ ở hub; làng chưa có cảnh (mặc định)
   * thì `/` và `/lang/<id>` vẫn chuyển về bản đồ (mốc 1).
   */
  hasScene?: boolean;
}
