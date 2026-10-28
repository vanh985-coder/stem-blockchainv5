import { describe, expect, it } from 'vitest';
import { VILLAGE_ORDER } from '../../../content/levels';
import { knowScrollUi } from '../../../content/knowScrolls';
import { assembleWorld } from '../worldLayout';
import { VILLAGE_RADIUS } from '../worldFrames';
import { VILLAGE_MAP_RADIUS, VILLAGE_MAP_SIZE, remainingByVillage, villageMapData, villageScrollSpots, worldScrollSpots } from './banDoScrolls';
import { mapMarkers, type MapMarker } from './mapMarkers';
import { mapScale, staticTransform } from './mapProjection';

const spots = worldScrollSpots();
const world = assembleWorld();
/** Nửa cạnh hình thẻ trong khung vùng bản đồ (hub vẽ bán kính 11 trên khung 300). */
const GLYPH_R = 11;

describe('vùng bản đồ làng trên /ban-do', () => {
  it('lấy đúng dữ liệu vị trí thật: 16 thẻ, trùng từng tọa độ với bố cục thế giới đã dựng cảnh', () => {
    expect(spots).toHaveLength(16);
    for (const s of spots) {
      const v = world.villages.find((q) => q.id === s.village)!;
      const real = v.layout.scrolls!.find((q) => q.index === s.index)!;
      expect([s.x, s.z, s.zone]).toEqual([real.x, real.z, real.zone]);
      expect([s.cx, s.cz]).toEqual([v.center.x, v.center.z]);
    }
    for (const id of VILLAGE_ORDER) expect(villageScrollSpots(id).map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });

  it('mọi thẻ nằm trong vùng nhìn và có tên khu bằng chữ', () => {
    for (const id of VILLAGE_ORDER) {
      for (const s of villageMapData(id, 0).scrolls) {
        expect(Math.hypot(s.x - s.cx, s.z - s.cz)).toBeLessThan(VILLAGE_RADIUS);
        expect(s.px).toBeGreaterThan(GLYPH_R);
        expect(s.px).toBeLessThan(VILLAGE_MAP_SIZE - GLYPH_R);
        expect(s.py).toBeGreaterThan(GLYPH_R);
        expect(s.py).toBeLessThan(VILLAGE_MAP_SIZE - GLYPH_R);
        expect((knowScrollUi.khu as Record<string, string>)[s.zone]).toBeTruthy();
      }
    }
  });

  it('chiếu bằng đúng công thức bản đồ trong game: tâm làng ở giữa khung, bắc ở trên, đông (−X) bên phải', () => {
    const k = VILLAGE_MAP_SIZE / 2 / VILLAGE_MAP_RADIUS;
    for (const id of VILLAGE_ORDER) {
      const d = villageMapData(id, 0);
      expect(mapScale(d.view)).toBeCloseTo(k, 9);
      for (const s of d.scrolls) {
        expect(s.px).toBeCloseTo(VILLAGE_MAP_SIZE / 2 - (s.x - s.cx) * k, 6);
        expect(s.py).toBeCloseTo(VILLAGE_MAP_SIZE / 2 - (s.z - s.cz) * k, 6);
      }
      // phép đưa tọa độ thế giới của lớp tĩnh khớp vị trí thẻ (cùng phép với bản đồ nhỏ và lớn)
      expect(staticTransform(d.view)).toContain(`scale(${-Math.round(k * 1e5) / 1e5} ${-Math.round(k * 1e5) / 1e5})`);
    }
  });

  it('khớp từng thẻ với ký hiệu của bản đồ lớn (cùng tọa độ thế giới)', () => {
    const input = { villages: world.villages, gateOpen: {}, levelStates: {}, inside: null, knowMasks: {}, target: null } as const;
    const big = mapMarkers(input, 'big').filter((m): m is Extract<MapMarker, { kind: 'scroll' }> => m.kind === 'scroll');
    expect(big).toHaveLength(16);
    for (const s of spots) {
      const m = big.find((q) => q.id === `scroll:${s.village}:${s.index}`)!;
      expect([m.x, m.z]).toEqual([s.x, s.z]);
    }
  });

  it('hai thẻ cùng làng không chồng nhau (kể cả kèm số thứ tự): không phải dời hay đổi nhãn', () => {
    for (const id of VILLAGE_ORDER) {
      const p = villageMapData(id, 0).scrolls;
      for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) expect(Math.hypot(p[i].px - p[j].px, p[i].py - p[j].py)).toBeGreaterThan(GLYPH_R * 4);
    }
  });

  it('đánh dấu thẻ đã nhặt theo mặt nạ; đếm số còn lại theo làng', () => {
    const d = villageMapData('lang-giay', 0b0101);
    expect(d.scrolls.map((s) => s.got)).toEqual([true, false, true, false]);
    expect(remainingByVillage({})).toEqual({ 'lang-giay': 4, 'lang-det': 4, 'lang-khac-dau': 4, 'lang-bac': 4 });
    expect(remainingByVillage({ 'lang-giay': 0b0101, 'lang-det': 15, 'lang-bac': 0b1000 })).toEqual({ 'lang-giay': 2, 'lang-det': 0, 'lang-khac-dau': 4, 'lang-bac': 3 });
  });

  it('hình học làng dùng chung với bản đồ lớn: cùng đường, nhà, ao, viền', () => {
    for (const id of VILLAGE_ORDER) {
      const g = villageMapData(id, 0).geo;
      const v = world.villages.find((q) => q.id === id)!;
      expect(g.outlines).toHaveLength(1);
      expect([g.outlines[0].cx, g.outlines[0].cz]).toEqual([v.center.x, v.center.z]);
      expect(g.ponds).toHaveLength((v.layout.ponds ?? []).length);
      expect(g.roads.length).toBeGreaterThan(0);
    }
  });
});
