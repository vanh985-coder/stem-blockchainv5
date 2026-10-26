import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS } from './characters';
import { LEVELS, VILLAGE_ORDER, levelById, levelsOfVillage, nextReadyLevel } from './levels';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

describe('levels', () => {
  it('đủ 12 màn, số màn 1 đến 12, mỗi làng 3 màn: bài học rồi 2 game', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const v of VILLAGE_ORDER) {
      expect(levelsOfVillage(v).map((l) => l.kind)).toEqual(['lesson', 'game', 'game']);
    }
    expect(VILLAGE_ORDER).toEqual(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']);
  });

  it('mốc 3 bước B13: cả 12 màn là ready (4 làng trọn vẹn: màn 11 ra mắt ở bước B13), không còn màn coming-soon', () => {
    expect(LEVELS.filter((l) => l.status === 'ready').map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(LEVELS.filter((l) => l.status === 'coming-soon').map((l) => l.id)).toEqual([]);
  });

  it('có tên màn và tên biển gỗ, chỗ giữ tên hợp lệ', () => {
    for (const l of LEVELS) {
      expect(l.ten.trim(), `màn ${l.id}`).not.toBe('');
      expect(l.bien.trim(), `màn ${l.id}`).not.toBe('');
      for (const s of [l.ten, l.bien]) {
        for (const m of s.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1])).toBe(true);
      }
    }
    expect(levelById(2)!.bien).toBe('Đuổi theo {phanDien}');
    expect(levelById(10)!.bien).toBe('Học cùng thầy Linh');
  });
});

describe('nextReadyLevel (nút "Chơi tiếp" ở màn kết quả và ở trang bài học)', () => {
  it('màn 2 sang màn 3, màn 5 sang màn 6, màn 8 sang màn 9; màn 3, 6, 9, 12 không còn màn nào trong làng nên chỉ còn "Về làng"; màn 11 sang màn 12', () => {
    expect(nextReadyLevel(2)?.id).toBe(3);
    expect(nextReadyLevel(3)).toBeUndefined();
    expect(nextReadyLevel(5)?.id).toBe(6);
    expect(nextReadyLevel(6)).toBeUndefined(); // màn cuối của làng Dệt (bước B9)
    expect(nextReadyLevel(8)?.id).toBe(9);
    expect(nextReadyLevel(9)).toBeUndefined(); // màn cuối của làng Khắc Dấu (bước B11)
    expect(nextReadyLevel(11)?.id).toBe(12); // màn 11 đã ra mắt (bước B13)
    expect(nextReadyLevel(12)).toBeUndefined();
  });
  it('bài học trỏ tới game đầu của làng: sau bài học 10 là màn 11 (màn 11 đã ra mắt ở bước B13), sau bài học 7 là màn 8, sau bài học 4 là màn 5, sau bài học 1 là màn 2', () => {
    expect(nextReadyLevel(10)?.id).toBe(11);
    expect(nextReadyLevel(7)?.id).toBe(8);
    expect(nextReadyLevel(1)?.id).toBe(2);
    expect(nextReadyLevel(4)?.id).toBe(5);
  });
  it('chỉ trong cùng làng; số màn lạ thì không có', () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const next = nextReadyLevel(id);
      if (next) expect(next.lang).toBe(levelById(id)?.lang);
    }
    expect(nextReadyLevel(99)).toBeUndefined();
  });
});
