import { describe, expect, it } from 'vitest';
import { BAN_DO_HOTSPOTS } from '../../../content/banDoHotspots';
import { VILLAGE_ORDER } from '../../../content/levels';
import { assembleWorld } from '../worldLayout';
import { VILLAGE_RADIUS } from '../worldFrames';
import { BAN_DO_EDGE_PCT, BAN_DO_RADIUS_PCT, banDoPoint, banDoScrollPoints, layoutScrollIcons, remainingByVillage, worldScrollSpots } from './banDoScrolls';
import { mapMarkers, type MapMarker } from './mapMarkers';

const RATIO = 1920 / 1047;
const spots = worldScrollSpots();
const world = assembleWorld();

describe('thẻ chưa nhặt trên /ban-do', () => {
  it('lấy đúng dữ liệu vị trí thật: 16 thẻ, trùng từng tọa độ với bố cục thế giới đã dựng cảnh', () => {
    expect(spots).toHaveLength(16);
    for (const s of spots) {
      const v = world.villages.find((q) => q.id === s.village)!;
      const real = v.layout.scrolls!.find((q) => q.index === s.index)!;
      expect([s.x, s.z, s.zone]).toEqual([real.x, real.z, real.zone]);
      expect([s.cx, s.cz]).toEqual([v.center.x, v.center.z]);
    }
  });

  it('khách mới: 16 điểm, mỗi làng 4, không trùng nhau và nằm trong ảnh', () => {
    const pts = banDoScrollPoints({ spots, masks: {}, ratio: RATIO });
    expect(pts).toHaveLength(16);
    expect(remainingByVillage(pts)).toEqual({ 'lang-giay': 4, 'lang-det': 4, 'lang-khac-dau': 4, 'lang-bac': 4 });
    expect(new Set(pts.map((p) => p.id)).size).toBe(16);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(BAN_DO_EDGE_PCT);
      expect(p.x).toBeLessThanOrEqual(100 - BAN_DO_EDGE_PCT);
      expect(p.y).toBeGreaterThanOrEqual(BAN_DO_EDGE_PCT);
      expect(p.y).toBeLessThanOrEqual(100 - BAN_DO_EDGE_PCT);
    }
    const keys = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    expect(new Set(keys).size).toBe(16);
  });

  it('đã nhặt một phần hay tất cả: chỉ còn thẻ chưa nhặt', () => {
    const some = banDoScrollPoints({ spots, masks: { 'lang-giay': 0b0101, 'lang-det': 15, 'lang-bac': 0b1000 }, ratio: RATIO });
    expect(some.map((p) => p.id)).toEqual([
      'scroll:lang-giay:1', 'scroll:lang-giay:3',
      'scroll:lang-khac-dau:0', 'scroll:lang-khac-dau:1', 'scroll:lang-khac-dau:2', 'scroll:lang-khac-dau:3',
      'scroll:lang-bac:0', 'scroll:lang-bac:1', 'scroll:lang-bac:2',
    ]);
    expect(banDoScrollPoints({ spots, masks: { 'lang-giay': 15, 'lang-det': 15, 'lang-khac-dau': 15, 'lang-bac': 15 }, ratio: RATIO })).toEqual([]);
  });

  it('cùng thẻ chưa nhặt với bản đồ lớn và bản đồ nhỏ (cùng bộ thẻ)', () => {
    const masks = { 'lang-giay': 0b0011, 'lang-khac-dau': 0b0100 };
    const ids = (ms: MapMarker[]) => ms.filter((m) => m.kind === 'scroll').map((m) => m.id).sort();
    const input = { villages: world.villages, gateOpen: {}, levelStates: {}, inside: null, knowMasks: masks, target: null } as const;
    const ban = banDoScrollPoints({ spots, masks, ratio: RATIO }).map((p) => p.id).sort();
    expect(ban).toEqual(ids(mapMarkers(input, 'big')));
    expect(ban).toEqual(ids(mapMarkers(input, 'mini')));
  });

  it('hướng giữ như bản đồ trong game: bắc ở trên, đông bên phải; mỗi làng thu nhỏ đều quanh điểm làng', () => {
    const ref = spots.find((s) => s.village === 'lang-giay' && s.index === 0)!;
    const hs = BAN_DO_HOTSPOTS['lang-giay'];
    const north = banDoPoint({ ...ref, x: ref.cx, z: ref.cz + VILLAGE_RADIUS / 2 }, hs, RATIO);
    expect(north.x).toBeCloseTo(hs.x, 6);
    expect(north.y).toBeCloseTo(hs.y - (BAN_DO_RADIUS_PCT / 2) * RATIO, 6); // lên trên
    const west = banDoPoint({ ...ref, x: ref.cx + VILLAGE_RADIUS / 2, z: ref.cz }, hs, RATIO); // +X là tây
    expect(west.x).toBeCloseTo(hs.x - BAN_DO_RADIUS_PCT / 2, 6); // sang trái
    const east = banDoPoint({ ...ref, x: ref.cx - VILLAGE_RADIUS / 2, z: ref.cz }, hs, RATIO);
    expect(east.x).toBeCloseTo(hs.x + BAN_DO_RADIUS_PCT / 2, 6);
    // Làng Dệt ở phía nam, cổng hướng chợ: thẻ gần cổng (phía bắc thế giới của làng) nằm cao hơn thẻ xa cổng
    const det = spots.filter((s) => s.village === 'lang-det');
    const gateSide = det.reduce((a, b) => (b.z > a.z ? b : a));
    const farSide = det.reduce((a, b) => (b.z < a.z ? b : a));
    expect(banDoPoint(gateSide, BAN_DO_HOTSPOTS['lang-det'], RATIO).y).toBeLessThan(banDoPoint(farSide, BAN_DO_HOTSPOTS['lang-det'], RATIO).y);
  });

  it('thứ tự làng trong kết quả theo VILLAGE_ORDER', () => {
    const pts = banDoScrollPoints({ spots, masks: {}, ratio: RATIO });
    const order = [...new Set(pts.map((p) => p.village))];
    expect(order).toEqual([...VILLAGE_ORDER]);
  });

  describe('xếp hình thẻ quanh chữ tên làng', () => {
    const W = 330;
    const H = 180;
    const G = 20;
    // khung chữ tên làng cỡ điện thoại, đặt đúng điểm làng của BAN_DO_HOTSPOTS
    const labels = Object.fromEntries(VILLAGE_ORDER.map((id) => [id, { cx: (BAN_DO_HOTSPOTS[id].x / 100) * W, cy: (BAN_DO_HOTSPOTS[id].y / 100) * H, hw: 52, hh: 28 }])) as Record<(typeof VILLAGE_ORDER)[number], { cx: number; cy: number; hw: number; hh: number }>;
    const icons = banDoScrollPoints({ spots, masks: {}, ratio: W / H }).map((p) => ({ id: p.id, village: p.village, x: (p.x / 100) * W, y: (p.y / 100) * H }));
    const placed = layoutScrollIcons({ icons, labels, w: W, h: H, glyph: G });

    it('đủ 16 hình, tất định, nằm trong bản đồ', () => {
      expect(placed).toHaveLength(16);
      expect(layoutScrollIcons({ icons, labels, w: W, h: H, glyph: G })).toEqual(placed);
      for (const p of placed) {
        expect(p.x).toBeGreaterThanOrEqual(G / 2);
        expect(p.x).toBeLessThanOrEqual(W - G / 2);
        expect(p.y).toBeGreaterThanOrEqual(G / 2);
        expect(p.y).toBeLessThanOrEqual(H - G / 2);
      }
    });
    it('không hình nào đè lên chữ tên của làng nào và không đè lên nhau', () => {
      for (const p of placed) for (const b of Object.values(labels)) expect(Math.abs(p.x - b.cx) < b.hw + G / 2 && Math.abs(p.y - b.cy) < b.hh + G / 2).toBe(false);
      for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) expect(Math.hypot(placed[i].x - placed[j].x, placed[i].y - placed[j].y)).toBeGreaterThanOrEqual(G * 0.95 - 1e-9);
    });
    it('mỗi thẻ vẫn ở gần làng của mình (không bay sang làng khác)', () => {
      for (const ic of icons) {
        const p = placed.find((q) => q.id === ic.id)!;
        const b = labels[ic.village];
        expect(Math.hypot(p.x - b.cx, p.y - b.cy)).toBeLessThan(b.hw + b.hh + 4 * G); // không bay sang làng khác
      }
    });
    it('bản đồ lớn thoáng (khung chữ nhỏ so với bản đồ): mọi hình giữ đúng vị trí theo công thức', () => {
      const bigIcons = banDoScrollPoints({ spots, masks: {}, ratio: RATIO }).map((p) => ({ id: p.id, village: p.village, x: (p.x / 100) * 940, y: (p.y / 100) * 513 }));
      const bigLabels = Object.fromEntries(VILLAGE_ORDER.map((id) => [id, { cx: (BAN_DO_HOTSPOTS[id].x / 100) * 940, cy: (BAN_DO_HOTSPOTS[id].y / 100) * 513, hw: 45, hh: 28 }])) as typeof labels;
      const out = layoutScrollIcons({ icons: bigIcons, labels: bigLabels, w: 940, h: 513, glyph: 26 });
      const moved = out.filter((p, i) => Math.hypot(p.x - bigIcons[i].x, p.y - bigIcons[i].y) > 1e-9).length;
      expect(moved).toBeLessThanOrEqual(8); // phần lớn giữ nguyên, chỉ vài thẻ sát chữ tên làng phải dời
    });
    it('đúng tâm khung chữ: dời lên phía bắc; không có khung chữ thì chỉ kẹp vào trong bản đồ', () => {
      const out = layoutScrollIcons({ icons: [{ id: 'a', village: 'lang-giay', x: 100, y: 100 }], labels: { 'lang-giay': { cx: 100, cy: 100, hw: 40, hh: 20 } }, w: 300, h: 200, glyph: 20 });
      expect(out[0].x).toBeCloseTo(100, 6);
      expect(out[0].y).toBeLessThan(100 - 20);
      const far = layoutScrollIcons({ icons: [{ id: 'b', village: 'lang-det', x: -50, y: 999 }], labels: {}, w: 300, h: 200, glyph: 20 });
      expect(far[0]).toEqual({ id: 'b', x: 14, y: 186 });
    });
  });
});
