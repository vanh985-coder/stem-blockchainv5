import { describe, expect, it } from 'vitest';
import { fmt } from './characters';
import { VILLAGE_SCENE } from './villageScene';

describe('chữ của cảnh làng 3D', () => {
  it('cả bốn làng có chữ cảnh mở đầu; ba làng đầu có thêm lời trao trang', () => {
    expect(Object.keys(VILLAGE_SCENE)).toEqual(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']);
    for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau'] as const) expect(VILLAGE_SCENE[id]!.award, id).toBeDefined();
  });
  it('Làng Bạc: ảnh truyện 9, người dẫn là thầy Linh, lời mở đầu, và KHÔNG có cảnh trao trang ở thế giới mở (Trang Sổ Vàng thứ tư trao trong cảnh cao trào sau màn 12; WorldPage chỉ chiếu cảnh trao trang cho làng có lời ở đây)', () => {
    const t = VILLAGE_SCENE['lang-bac']!;
    expect(t.storyFrame).toBe(9);
    expect(t.guide).toBe('thayLinh');
    expect(t.award).toBeUndefined();
    expect(t.opening).toContain('cây đa');
    expect(t.guideNext.game1).toContain('{phanDien}');
    expect(t.guideNext.game2).toContain('{phanDien}');
    for (const s of [t.opening, ...Object.values(t.guideNext)]) {
      expect(s).not.toMatch(/(^|[^p{L}])Tí(?![p{L}])/u);
      expect(fmt(s, { ten: 'Lan' })).not.toMatch(/[{}]/);
    }
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
    const t = VILLAGE_SCENE['lang-det']! as Required<(typeof VILLAGE_SCENE)['lang-det'] & object>;
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
  it('Làng Khắc Dấu: ảnh truyện 8, người dẫn là chú Dũng, lời mở đầu theo spec 07, hai lượt trao Trang Sổ Vàng thứ ba, không viết cứng tên phản diện', () => {
    const t = VILLAGE_SCENE['lang-khac-dau']! as Required<(typeof VILLAGE_SCENE)['lang-khac-dau'] & object>;
    expect(t.storyFrame).toBe(8);
    expect(t.guide).toBe('chuDung');
    expect(t.opening).toBe('Mỗi người có một khuôn dấu riêng cất kín, và một mẫu dấu công khai treo ở đình. Từ khuôn tạo ra mẫu thì dễ, nhìn mẫu mà đoán ngược ra khuôn thì chịu.');
    expect(t.award.loi).toHaveLength(2);
    expect(t.award.loi[0]).toContain('Trang Sổ Vàng thứ ba');
    expect(t.award.loi[1]).toContain('Làng Bạc');
    expect(t.guideNext.game1).toContain('{phanDien}');
    expect(t.guideNext.game2).toContain('{phanDien}');
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
