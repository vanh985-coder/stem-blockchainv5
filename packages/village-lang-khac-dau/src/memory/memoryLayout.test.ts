import { describe, expect, it } from 'vitest';
import { fitFrame } from '@so-chung/core/three/scene25d/layout25d';
import { MEMORY_ROUNDS } from './memoryConfig';
import { GRID_AREA, HUD_AREA, VILLAIN_SPOT, WORLD, cardFonts, frameOf, gridLayout, pxPerUnit, type MemoryFrame } from './memoryLayout';

/** Ba cỡ màn hình phải vừa một màn hình, không cuộn. */
const SCREENS = [
  { w: 360, h: 640 },
  { w: 844, h: 390 },
  { w: 1366, h: 768 },
];

function cardPx(w: number, h: number, cols: number, rows: number) {
  const frame = frameOf(w, h);
  const world = WORLD[frame];
  const box = fitFrame({ width: w, height: h }, world.width / world.height);
  return { frame, px: gridLayout(frame, cols, rows).card * pxPerUnit(frame, box.width), box };
}

describe('bố cục màn 8', () => {
  it('lưới 4 × 2, 4 × 3, 4 × 4 nằm gọn trong vùng bàn thẻ, các thẻ không chồng nhau', () => {
    for (const frame of ['landscape', 'portrait'] as MemoryFrame[]) {
      const a = GRID_AREA[frame];
      for (const r of MEMORY_ROUNDS) {
        const g = gridLayout(frame, r.cols, r.rows);
        expect(g.slots).toHaveLength(r.pairs * 2);
        for (const s of g.slots) {
          expect(s.x - g.card / 2).toBeGreaterThanOrEqual(a.x0 - 1e-9);
          expect(s.x + g.card / 2).toBeLessThanOrEqual(a.x1 + 1e-9);
          expect(s.y - g.card / 2).toBeGreaterThanOrEqual(a.y0 - 1e-9);
          expect(s.y + g.card / 2).toBeLessThanOrEqual(a.y1 + 1e-9);
        }
        for (let i = 0; i < g.slots.length; i++) {
          for (let j = i + 1; j < g.slots.length; j++) {
            const d = Math.max(Math.abs(g.slots[i].x - g.slots[j].x), Math.abs(g.slots[i].y - g.slots[j].y));
            expect(d).toBeGreaterThanOrEqual(g.card);
          }
        }
      }
    }
  });

  it('vùng bàn thẻ, thanh trên và chỗ {phanDien} nằm trong khung và không đè lên nhau', () => {
    for (const frame of ['landscape', 'portrait'] as MemoryFrame[]) {
      const w = WORLD[frame];
      for (const b of [GRID_AREA[frame], HUD_AREA[frame]]) {
        expect(b.x0).toBeGreaterThanOrEqual(-w.width / 2);
        expect(b.x1).toBeLessThanOrEqual(w.width / 2);
        expect(b.y0).toBeGreaterThanOrEqual(-w.height / 2);
        expect(b.y1).toBeLessThanOrEqual(w.height / 2);
      }
      const g = GRID_AREA[frame];
      const h = HUD_AREA[frame];
      const apart = h.x1 <= g.x0 || h.y0 >= g.y1;
      expect(apart).toBe(true);
      const v = VILLAIN_SPOT[frame];
      // {phanDien} rộng chừng 1,5 đơn vị: đứng ngoài bàn thẻ (bên phải hoặc bên dưới)
      expect(v.x - 0.75 >= g.x1 || v.y + v.height * 0.8 <= g.y0).toBe(true);
      expect(v.hiddenX - 0.75).toBeGreaterThan(w.width / 2);
    }
  });

  it('ở 360 × 640, 844 × 390 và 1366 × 768, chữ trên thẻ ≥ 14 px và vừa trong thẻ', () => {
    for (const s of SCREENS) {
      for (const r of MEMORY_ROUNDS) {
        const { px } = cardPx(s.w, s.h, r.cols, r.rows);
        expect(px, `${s.w}x${s.h} ${r.cols}x${r.rows}`).toBeGreaterThanOrEqual(72);
        for (const large of [false, true]) {
          const f = cardFonts(px, large);
          expect(f.label).toBeGreaterThanOrEqual(14);
          // Nhãn tối đa 2 dòng cộng một dòng số phải lọt khoảng 80% chiều cao thẻ
          expect(f.label * 1.2 * 2 + f.number).toBeLessThanOrEqual(px * 0.8 + 1);
        }
      }
    }
  });

  it('chọn khung dọc khi màn hình cao hơn rộng', () => {
    expect(frameOf(360, 640)).toBe('portrait');
    expect(frameOf(844, 390)).toBe('landscape');
    expect(frameOf(1366, 768)).toBe('landscape');
  });
});
