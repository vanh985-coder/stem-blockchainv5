import { useRoutes } from 'react-router';
import type { VillageModule } from '../village';
import { HUB_MAP_URL } from '../config/urls';
import { ExternalRedirect } from './ExternalRedirect';

/** Vỏ chạy riêng của một làng: gắn gói làng dưới /lang/<id>; "/" và "/lang/<id>" chuyển về bản đồ ở hub (mốc 1). */
export function VillageApp({ village }: { village: VillageModule }) {
  return useRoutes([
    { path: '/', element: <ExternalRedirect to={HUB_MAP_URL} /> },
    {
      path: `/lang/${village.id}`,
      children: [{ index: true, element: <ExternalRedirect to={HUB_MAP_URL} /> }, ...village.routes],
    },
    { path: '*', element: <ExternalRedirect to={HUB_MAP_URL} /> },
  ]);
}
