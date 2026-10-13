import { describe, expect, it } from 'vitest';
import { fmt } from './characters';
import { hasVillageScene, VILLAGE_SCENE } from './villageScene';

describe('chữ của cảnh làng 3D', () => {
  it('chỉ Làng Giấy có cảnh ở mốc 2', () => {
    expect(hasVillageScene('lang-giay')).toBe(true);
    for (const id of ['lang-det', 'lang-khac-dau', 'lang-bac'] as const) expect(hasVillageScene(id)).toBe(false);
  });
  it('không viết cứng tên phản diện; tên lấy qua {phanDien}', () => {
    const t = VILLAGE_SCENE['lang-giay']!;
    const all = [t.opening, ...Object.values(t.guideNext)];
    expect(t.guideNext.game1).toContain('{phanDien}');
    const phanDien = fmt('{phanDien}');
    for (const s of all) {
      expect(s).not.toContain(phanDien);
      expect(fmt(s, { ten: 'Lan' })).not.toMatch(/[{}]/);
    }
  });
  it('ảnh truyện 6 và người dẫn là bác An', () => {
    const t = VILLAGE_SCENE['lang-giay']!;
    expect(t.storyFrame).toBe(6);
    expect(t.guide).toBe('bacAn');
  });
});
