import { describe, expect, it } from 'vitest';
import { chooseTooltipPlacement, TOOLTIP_MIN_HEIGHT, type PlacementHole } from './tutorialPlacement';

const vp = (width: number, height: number) => ({ width, height, offsetLeft: 0, offsetTop: 0 });

function boxOf(r: ReturnType<typeof chooseTooltipPlacement>, h: number) {
  return { x1: r.left, y1: r.top, x2: r.left + r.width, y2: r.top + Math.min(h, r.maxHeight) };
}
function overlap(a: PlacementHole, b: PlacementHole) {
  return Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
}

describe('chooseTooltipPlacement', () => {
  it('đủ chỗ phía dưới: đặt dưới, không giao', () => {
    const hole = { x1: 20, y1: 100, x2: 340, y2: 220 };
    const r = chooseTooltipPlacement({ vp: vp(360, 800), hole, width: 336, height: 200 });
    expect(r.placement).toBe('bottom');
    expect(overlap(boxOf(r, 200), hole)).toBe(0);
  });

  it('thiếu chỗ dưới, đủ chỗ trên: đặt trên', () => {
    const hole = { x1: 20, y1: 500, x2: 340, y2: 700 };
    const r = chooseTooltipPlacement({ vp: vp(360, 800), hole, width: 336, height: 220 });
    expect(r.placement).toBe('top');
    expect(overlap(boxOf(r, 220), hole)).toBe(0);
  });

  it('không đủ chỗ cho cả thân: thu gọn thân (maxHeight nhỏ hơn) mà vẫn không giao', () => {
    const hole = { x1: 20, y1: 150, x2: 340, y2: 560 };
    const r = chooseTooltipPlacement({ vp: vp(360, 800), hole, width: 336, height: 300 });
    expect(r.clear).toBe(true);
    expect(r.maxHeight).toBeGreaterThanOrEqual(TOOLTIP_MIN_HEIGHT);
    expect(r.maxHeight).toBeLessThan(300);
    expect(overlap(boxOf(r, 300), hole)).toBe(0);
  });

  it('màn ngang thấp: đặt cạnh bên, thu hẹp rộng khi cần, không giao', () => {
    const hole = { x1: 300, y1: 60, x2: 560, y2: 330 };
    const r = chooseTooltipPlacement({ vp: vp(844, 390), hole, width: 440, height: 260 });
    expect(['right', 'left']).toContain(r.placement);
    expect(overlap(boxOf(r, 260), hole)).toBe(0);
    expect(r.top).toBeGreaterThanOrEqual(12);
    expect(r.top + r.maxHeight).toBeLessThanOrEqual(390);
  });

  it('vùng sáng gần kín khung: dán mép, cao tối thiểu, nút trong khung nhìn', () => {
    const hole = { x1: 4, y1: 4, x2: 356, y2: 796 };
    const r = chooseTooltipPlacement({ vp: vp(360, 800), hole, width: 336, height: 220 });
    expect(r.clear).toBe(false);
    expect(r.top).toBeGreaterThanOrEqual(12);
    expect(r.top + r.maxHeight).toBeLessThanOrEqual(800);
  });

  it('không có vùng sáng: đặt giữa khung', () => {
    const r = chooseTooltipPlacement({ vp: vp(1366, 768), hole: null, width: 440, height: 200 });
    expect(r.left).toBeCloseTo((1366 - 440) / 2);
  });
});
