import { isValidElement } from 'react';
import { matchRoutes, type RouteObject } from 'react-router';
import { describe, expect, it } from 'vitest';
import { HUB_MAP_URL, URLS, villageWorldUrl } from '../config/urls';
import { VILLAGE_IDS } from '../config/urls';
import { ExternalRedirect } from './ExternalRedirect';
import { shellRoutes } from './VillageApp';

/** Địa chỉ mà route `path` của vỏ làng chuyển tới (null nếu không phải chuyển hướng ngoài). */
function redirectOf(routes: RouteObject[], path: string): string | null {
  const m = matchRoutes(routes, path);
  const el = m?.[m.length - 1]?.route.element;
  return isValidElement(el) && el.type === ExternalRedirect ? (el.props as { to: string }).to : null;
}

describe('vỏ chạy riêng của làng (bước W1: thế giới mở)', () => {
  for (const id of VILLAGE_IDS) {
    const routes = shellRoutes({ id, routes: [{ path: 'man/:n', element: null }] });
    it(`${id}: / và /lang/${id} chuyển sang thế giới mở ở hub, vào thẳng làng`, () => {
      const world = villageWorldUrl(URLS, id, false);
      expect(world).toBe(`${URLS.hub}/cho?tu=${id}`);
      expect(redirectOf(routes, '/')).toBe(world);
      expect(redirectOf(routes, `/lang/${id}`)).toBe(world);
    });
    it(`${id}: trang bài học /lang/${id}/man/<n> vẫn do gói làng xử lý (không chuyển hướng)`, () => {
      expect(redirectOf(routes, `/lang/${id}/man/1`)).toBeNull();
      expect(matchRoutes(routes, `/lang/${id}/man/1`)).not.toBeNull();
    });
    it(`${id}: đường dẫn lạ về bản đồ ở hub`, () => {
      expect(redirectOf(routes, '/khong-co-trang-nay')).toBe(HUB_MAP_URL);
    });
  }
});
