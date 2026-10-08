import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS } from './characters';
import { LEVELS, VILLAGE_ORDER, levelById, levelsOfVillage } from './levels';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);

describe('levels', () => {
  it('đủ 12 màn, số màn 1 đến 12, mỗi làng 3 màn: bài học rồi 2 game', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const v of VILLAGE_ORDER) {
      expect(levelsOfVillage(v).map((l) => l.kind)).toEqual(['lesson', 'game', 'game']);
    }
    expect(VILLAGE_ORDER).toEqual(['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac']);
  });

  it('mốc 1: màn 1, 4, 7, 10 là ready; 8 màn còn lại là coming-soon', () => {
    expect(LEVELS.filter((l) => l.status === 'ready').map((l) => l.id)).toEqual([1, 4, 7, 10]);
    expect(LEVELS.filter((l) => l.status === 'coming-soon')).toHaveLength(8);
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
