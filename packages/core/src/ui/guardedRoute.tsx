import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { LevelGuard } from './LevelGuard';
import { lazyRoute } from './lazyRoute';

/** Route tải chậm của một màn, có chặn khi màn đang khóa (gõ thẳng đường dẫn cũng không vào được). */
export function guardedRoute(path: string, levelId: number, loader: () => Promise<{ default: ComponentType }>): RouteObject {
  const inner = lazyRoute(path, loader);
  return { path, element: <LevelGuard levelId={levelId}>{inner.element}</LevelGuard> };
}
