import { describe, expect, it } from 'vitest';
import { fmt } from './characters';
import { VILLAGE_SCENE } from './villageScene';

describe('chữ của cảnh làng 3D', () => {
  it('Làng Giấy (mốc 2) và Làng Dệt (mốc 3, bước L1) có chữ cảnh mở đầu và trao trang; Khắc Dấu và Bạc điền sau', () => {
    expect(Object.keys(VILLAGE_SCENE)).toEqual(['lang-giay', 'lang-det']);
  });
  it('Làng Bạc không có cảnh trao trang riêng ở thế giới mở (bước B5): Trang Sổ Vàng thứ tư đã trao trong cảnh cao trào sau màn 12 (WorldPage chỉ chiếu cảnh trao trang cho làng có chữ ở đây)', () => {
    expect(VILLAGE_SCENE['lang-bac']).toBeUndefined();
  });
  it('không viết cứng tên phản diện; tên lấy qua {phanDien}', () => {
    const t = VILLAGE_SCENE['lang-giay']!;
    const all = [t.opening, ...Object.values(t.guideNext)];
    expect(t.guideNext.game1).toContain('{phanDien}');
    for (const s of all) {
      expect(s).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(fmt(s, { ten: 'Lan' })).not.toMatch(/[{}]/);
    }
  });
  it('Làng Dệt: ảnh truyện 7, người dẫn là cụ Bình, lời mở đầu theo spec 06, hai lượt trao Trang Sổ Vàng thứ hai, không viết cứng tên phản diện', () => {
    const t = VILLAGE_SCENE['lang-det']!;
    expect(t.storyFrame).toBe(7);
    expect(t.guide).toBe('cuBinh');
    expect(t.opening).toBe('Ở làng này, nhà nào cũng giữ một cuốn sổ giống hệt nhau. Có trang mới là cả làng kéo về đình kiểm.');
    expect(t.award.loi).toHaveLength(2);
    expect(t.award.loi[0]).toContain('Trang Sổ Vàng thứ hai');
    expect(t.award.loi[1]).toContain('Làng Khắc Dấu');
    expect(t.guideNext.game1).toContain('{phanDien}');
    for (const s of [t.opening, ...Object.values(t.guideNext), ...t.award.loi]) {
      expect(s).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
      expect(fmt(s, { ten: 'Lan' })).not.toMatch(/[{}]/);
    }
  });
  it('ảnh truyện 6 và người dẫn là bác An', () => {
    const t = VILLAGE_SCENE['lang-giay']!;
    expect(t.storyFrame).toBe(6);
    expect(t.guide).toBe('bacAn');
  });
});
