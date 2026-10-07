import { lazy, Suspense, type ComponentType } from 'react';
import type { RouteObject } from 'react-router';

/** Route tải chậm, dùng được với BrowserRouter (thuộc tính `lazy` của RouteObject chỉ chạy với data router). */
export function lazyRoute(path: string, loader: () => Promise<{ default: ComponentType }>): RouteObject {
  const Page = lazy(loader);
  return {
    path,
    element: (
      <Suspense fallback={<p className="p-6 text-center">Đang tải…</p>}>
        <Page />
      </Suspense>
    ),
  };
}
