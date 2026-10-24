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

  it('mốc 3 bước B9: màn 1, 2, 3 (làng Giấy trọn vẹn), 4, 5, 6 (làng Dệt trọn vẹn), 7, 8, 10, 12 là ready; 2 màn còn lại (9, 11) là coming-soon', () => {
    expect(LEVELS.filter((l) => l.status === 'ready').map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 10, 12]);
    expect(LEVELS.filter((l) => l.status === 'coming-soon').map((l) => l.id)).toEqual([9, 11]);
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
  it('màn 2 sang màn 3, màn 5 sang màn 6; màn 3, 6, 8, 12 không còn màn nào trong làng nên chỉ còn "Về làng"', () => {
    expect(nextReadyLevel(2)?.id).toBe(3);
    expect(nextReadyLevel(3)).toBeUndefined();
    expect(nextReadyLevel(5)?.id).toBe(6);
    expect(nextReadyLevel(6)).toBeUndefined(); // màn cuối của làng Dệt (bước B9)
    expect(nextReadyLevel(8)).toBeUndefined();
    expect(nextReadyLevel(12)).toBeUndefined();
  });
  it('bỏ qua màn "sắp ra mắt": sau bài học 10 là màn 12 (màn 11 chưa có), sau bài học 7 là màn 8, sau bài học 4 là màn 5, sau bài học 1 là màn 2', () => {
    expect(nextReadyLevel(10)?.id).toBe(12);
    expect(nextReadyLevel(7)?.id).toBe(8);
    expect(nextReadyLevel(1)?.id).toBe(2);
    expect(nextReadyLevel(4)?.id).toBe(5);
  });
  it('chỉ trong cùng làng; số màn lạ thì không có', () => {
    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) {
      const next = nextReadyLevel(id);
      if (next) expect(next.lang).toBe(levelById(id)?.lang);
    }
    expect(nextReadyLevel(99)).toBeUndefined();
  });
});
