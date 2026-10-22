import { describe, expect, it } from 'vitest';
import { villageProgress } from './mapProgress';

describe('tóm tắt tiến độ từng làng cho bản đồ lớn', () => {
  it('chưa chơi: 0/3 màn mỗi làng, làng Giấy có thẻ 0/4, chưa có Trang Sổ Vàng', () => {
    const p = villageProgress({ levelStates: {}, knowMasks: {}, scrollTotals: { 'lang-giay': 4, 'lang-det': 0, 'lang-khac-dau': 0, 'lang-bac': 0 }, goldenPages: 0 });
    expect(p.map((x) => x.id)).toEqual(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']);
    expect(p.every((x) => x.levelsDone === 0 && x.levelsTotal === 3 && !x.page)).toBe(true);
    expect(p[0].cards).toEqual({ got: 0, total: 4 });
    expect(p[1].cards).toBeNull();
  });

  it('đếm màn đã xong theo từng làng, thẻ theo bit, Trang Sổ Vàng thứ i thuộc làng thứ i', () => {
    const p = villageProgress({
      levelStates: { 1: 'done', 2: 'done', 3: 'open', 4: 'open', 5: 'coming-soon', 6: 'coming-soon' },
      knowMasks: { 'lang-giay': 0b1010 },
      scrollTotals: { 'lang-giay': 4 },
      goldenPages: 1,
    });
    expect(p[0].levelsDone).toBe(2);
    expect(p[1].levelsDone).toBe(0);
    expect(p[0].cards).toEqual({ got: 2, total: 4 });
    expect(p.map((x) => x.page)).toEqual([true, false, false, false]);
    expect(villageProgress({ levelStates: {}, knowMasks: {}, scrollTotals: {}, goldenPages: 4 }).every((x) => x.page)).toBe(true);
  });

  it('đủ thẻ (mặt nạ đầy) thì 4/4', () => {
    const p = villageProgress({ levelStates: {}, knowMasks: { 'lang-giay': 15 }, scrollTotals: { 'lang-giay': 4 }, goldenPages: 0 });
    expect(p[0].cards).toEqual({ got: 4, total: 4 });
  });
});
