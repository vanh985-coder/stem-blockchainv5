import { useRoutes, type RouteObject } from 'react-router';
import type { VillageModule } from '../village';
import { HUB_MAP_URL, URLS, villageWorldUrl } from '../config/urls';
import { accountRoutes } from '../auth/routes';
import { ExternalRedirect } from './ExternalRedirect';

/**
 * Các route của vỏ chạy riêng một làng: chỉ còn trang bài học và game (gói làng gắn dưới /lang/<id>/man/<n>). Từ bước W1 (thế giới mở) chợ và 4 làng nằm trong một cảnh ở hub: `/` và `/lang/<id>` chuyển sang
 * thế giới mở ở hub, vào thẳng làng này (`/cho?tu=<id>`, cạnh các biển gỗ). Tách ra để kiểm tra được bằng `matchRoutes`.
 */
export function shellRoutes(village: Pick<VillageModule, 'id' | 'routes'>): RouteObject[] {
  const toWorld = <ExternalRedirect to={villageWorldUrl(URLS, village.id, false)} />;
  return [
    { path: '/', element: toWorld },
    {
      path: `/lang/${village.id}`,
      children: [{ index: true, element: toWorld }, ...village.routes],
    },
    ...accountRoutes,
    { path: '*', element: <ExternalRedirect to={HUB_MAP_URL} /> },
  ];
}

export function VillageApp({ village }: { village: VillageModule }) {
  return useRoutes(shellRoutes(village));
}
