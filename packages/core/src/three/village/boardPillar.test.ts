import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../content/levels';
import { ui } from '../../content/ui';
import { createEmblemGeometry } from './boardEmblems';
import { PILLAR, PILLAR_RADIUS_BASE, emblemMotion, pillarKindOf } from './boardPillar';

describe('dáng cột sáng theo trạng thái màn', () => {
  it('mở → open, xong (thật hay tự hoàn thành) → done, mọi trạng thái còn lại → locked', () => {
    expect(pillarKindOf('open')).toBe('open');
    expect(pillarKindOf('done')).toBe('done');
    expect(pillarKindOf('locked')).toBe('locked');
    expect(pillarKindOf('coming-soon')).toBe('locked');
    expect(pillarKindOf(undefined)).toBe('locked');
  });
  it('ba dáng khác nhau về chiều cao cột (không chỉ khác màu) và màu', () => {
    const h = [PILLAR.open.height, PILLAR.done.height, PILLAR.locked.height];
    expect(new Set(h).size).toBe(3);
    expect(h[0]).toBeGreaterThan(h[1]);
    expect(h[1]).toBeGreaterThan(h[2]);
    expect(new Set([PILLAR.open.glow, PILLAR.done.glow, PILLAR.locked.glow]).size).toBe(3);
  });
  it('hai cột cạnh nhau (cách 4,6) không chạm nhau và cột khóa đủ thấp để không che tầm nhìn', () => {
    expect(PILLAR_RADIUS_BASE * 2).toBeLessThan(4.6);
    expect(PILLAR.locked.height).toBeLessThan(3);
  });
  it('mỗi màn (12 màn) có đúng một dáng và có chữ trạng thái trong content (mở, xong, khóa, sắp ra mắt)', () => {
    expect(LEVELS).toHaveLength(12);
    expect(ui.langScene.bienMo).toBeTruthy();
    expect(ui.langScene.bienDaXong).toBeTruthy();
    expect(ui.langScene.bienKhoa).toBeTruthy();
    expect(ui.langScene.bienSapRaMat2).toBeTruthy();
    const names = new Set([ui.langScene.bienMo, ui.langScene.bienDaXong, ui.langScene.bienKhoa, ui.langScene.bienSapRaMat2]);
    expect(names.size).toBe(4);
  });
});

describe('chuyển động vật nổi', () => {
  it('mở thì quay và nhấp nhô; xong chỉ lắc nhẹ; khóa đứng yên', () => {
    const a = emblemMotion('open', 1, 0);
    const b = emblemMotion('open', 2, 0);
    expect(a.yaw).not.toBe(b.yaw);
    expect(a.bob).not.toBe(b.bob);
    expect(emblemMotion('done', 1, 0).bob).toBe(0);
    expect(Math.abs(emblemMotion('done', 3, 1).yaw)).toBeLessThanOrEqual(0.4);
    expect(emblemMotion('locked', 5, 2)).toEqual({ yaw: 0, bob: 0 });
  });
});

describe('hình học vật nổi', () => {
  it('ba hình khác nhau, nhẹ (dưới 400 tam giác), màu theo đỉnh, không uv', () => {
    const tris: number[] = [];
    for (const k of ['open', 'done', 'locked'] as const) {
      const g = createEmblemGeometry(k);
      expect(g.getAttribute('color')).toBeDefined();
      expect(g.getAttribute('uv')).toBeUndefined();
      const t = g.getAttribute('position').count / 3;
      expect(t).toBeLessThan(400);
      tris.push(t);
      g.dispose();
    }
    expect(new Set(tris).size).toBe(3);
  });
});
