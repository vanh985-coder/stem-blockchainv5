import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { Navigate, useRoutes, type RouteObject } from 'react-router';
import { ui, VILLAGE_IDS, villageWorldUrl, URLS, type VillageId, type VillageModule } from '@so-chung/core';

/**
 * Web đã gộp (spec 10 mục 2, `VITE_MERGED=true`): bốn gói làng là route LƯỜI của hub dưới `/lang/<id>`, cùng đường dẫn với vỏ làng riêng (`/lang/lang-giay/man/2`...). Mỗi làng chỉ tải khi vào làng đó (một chunk
 * nhỏ cho gói làng, mỗi màn lại một chunk riêng như cũ), nên trang đầu của hub không nặng thêm. Chưa gộp thì không có route nào ở đây và mọi đường dẫn `/lang/...` về trang chủ như trước (các vỏ `apps/lang-*` chạy riêng).
 */
export const VILLAGE_LOADERS: Readonly<Record<VillageId, () => Promise<{ default: VillageModule }>>> = {
  'lang-giay': () => import('@so-chung/village-lang-giay'),
  'lang-det': () => import('@so-chung/village-lang-det'),
  'lang-khac-dau': () => import('@so-chung/village-lang-khac-dau'),
  'lang-bac': () => import('@so-chung/village-lang-bac'),
};

/** Route con của một làng (tương đối so với `/lang/<id>`): các màn của gói làng; đường dẫn khác (kể cả chính `/lang/<id>`) về thế giới mở, vào thẳng làng đó (như vỏ làng riêng). */
export function villageChildRoutes(village: Pick<VillageModule, 'id' | 'routes'>): RouteObject[] {
  return [...village.routes, { path: '*', element: <Navigate to={villageWorldUrl(URLS, village.id, true)} replace /> }];
}

function VillageRoutes({ village }: { village: VillageModule }) {
  return useRoutes(villageChildRoutes(village));
}

const LAZY_VILLAGES = Object.fromEntries(
  VILLAGE_IDS.map((id) => [id, lazy(() => VILLAGE_LOADERS[id]().then((m) => ({ default: (() => <VillageRoutes village={m.default} />) as ComponentType })))]),
) as unknown as Record<VillageId, ComponentType>;

/** Route `/lang/<id>/*` của 4 làng khi đã gộp web; mảng rỗng khi chưa gộp. */
export function villageRouteObjects(merged: boolean): { path: string; element: ReactElement }[] {
  if (!merged) return [];
  return VILLAGE_IDS.map((id) => {
    const Village = LAZY_VILLAGES[id];
    return {
      path: `/lang/${id}/*`,
      element: (
        <Suspense fallback={<p className="grid min-h-screen place-items-center p-6 text-center">{ui.chung.dangTai}</p>}>
          <Village />
        </Suspense>
      ),
    };
  });
}
