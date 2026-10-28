import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { VILLAGE_IDS, levelsOfVillage } from '@so-chung/core';
import { VILLAGE_LOADERS, villageChildRoutes, villageRouteObjects } from './villageRoutes';

/** Gộp 4 làng vào hub (bước G1): route `/lang/<id>/*` lười, đúng đường dẫn đang dùng ở vỏ làng riêng. */
describe('route bốn làng ở hub đã gộp', () => {
  it('chưa gộp (VITE_MERGED=false): không có route làng nào (hub chạy như cũ, vỏ apps/lang-* vẫn dùng được)', () => {
    expect(villageRouteObjects(false)).toEqual([]);
  });

  it('đã gộp: mỗi làng một route /lang/<id>/*, đủ 4 làng theo thứ tự', () => {
    const routes = villageRouteObjects(true);
    expect(routes.map((r) => r.path)).toEqual(VILLAGE_IDS.map((id) => `/lang/${id}/*`));
  });

  it('các đường dẫn cũ /lang/<id>/man/<n> khớp đúng route làng đó', () => {
    const routes = villageRouteObjects(true);
    for (const id of VILLAGE_IDS) for (const l of levelsOfVillage(id)) {
      const m = matchRoutes(routes, `/lang/${id}/man/${l.id}`);
      expect(m?.[0]?.route.path, `${id} màn ${l.id}`).toBe(`/lang/${id}/*`);
    }
    // làng này không nhận đường dẫn của làng khác
    expect(matchRoutes(routes, '/lang/lang-bac/man/2')?.[0]?.route.path).toBe('/lang/lang-bac/*');
    expect(matchRoutes(routes, '/ban-do')).toBeNull();
    expect(matchRoutes(routes, '/cho')).toBeNull();
  });

  it('mỗi gói làng tải được (nhập lười), đúng id, đủ route cho mọi màn của làng, và đường dẫn lạ về thế giới mở của làng đó', async () => {
    for (const id of VILLAGE_IDS) {
      const village = (await VILLAGE_LOADERS[id]()).default;
      expect(village.id).toBe(id);
      expect(village.levels).toEqual(levelsOfVillage(id).map((l) => l.id));
      const children = villageChildRoutes(village);
      for (const l of village.levels) expect(matchRoutes(children, `/man/${l}`)?.[0]?.route.path, `${id} màn ${l}`).toBe(`man/${l}`);
      // chính /lang/<id> và đường dẫn lạ: về thế giới mở, vào thẳng làng (như vỏ làng riêng)
      for (const p of ['/', '/khong-co']) expect(matchRoutes(children, p)?.[0]?.route.path, `${id} ${p}`).toBe('*');
    }
  });
});
