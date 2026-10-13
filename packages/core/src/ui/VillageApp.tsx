import { Navigate, useLocation, useRoutes } from 'react-router';
import type { VillageModule } from '../village';
import { HUB_MAP_URL } from '../config/urls';
import { accountRoutes } from '../auth/routes';
import { ExternalRedirect } from './ExternalRedirect';

/** Vỏ chạy riêng của một làng: gắn gói làng dưới /lang/<id>; "/" và "/lang/<id>" chuyển về bản đồ ở hub (mốc 1). */
export function VillageApp({ village }: { village: VillageModule }) {
  const { search } = useLocation();
  return useRoutes([
    // Mốc 1: cả `/` và `/lang/<id>` về bản đồ ở hub. Từ mốc 2 (làng có cảnh 3D): `/` chuyển sang `/lang/<id>` và gói làng tự cung cấp route `index` (cảnh làng).
    { path: '/', element: village.hasScene ? <Navigate to={{ pathname: `/lang/${village.id}`, search }} replace /> : <ExternalRedirect to={HUB_MAP_URL} /> },
    {
      path: `/lang/${village.id}`,
      children: village.hasScene ? village.routes : [{ index: true, element: <ExternalRedirect to={HUB_MAP_URL} /> }, ...village.routes],
    },
    ...accountRoutes,
    { path: '*', element: <ExternalRedirect to={HUB_MAP_URL} /> },
  ]);
}
