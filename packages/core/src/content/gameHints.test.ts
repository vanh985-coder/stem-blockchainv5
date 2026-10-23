import { describe, expect, it } from 'vitest';
import { CHARACTER_IDS, EXTRA_VARS, fmt } from './characters';
import { gameHints } from './gameHints';

const ALLOWED = new Set<string>(['ten', 'Ten', ...CHARACTER_IDS.filter((id) => id !== 'hocSinh'), ...EXTRA_VARS]);
const texts: [string, string][] = (['man2', 'man3', 'man8', 'man12'] as const).flatMap((g) => Object.entries(gameHints[g]).map(([k, v]): [string, string] => [`${g}.${k}`, v]));

describe('gameHints (nút "?")', () => {
  it('không câu nào rỗng; chỉ dùng chỗ giữ tên hợp lệ; không viết cứng tên phản diện', () => {
    expect(texts.length).toBeGreaterThanOrEqual(30);
    for (const [name, text] of texts) {
      expect(text.trim(), name).not.toBe('');
      for (const m of text.matchAll(/\{([^}]*)\}/g)) expect(ALLOWED.has(m[1]), `${name}: {${m[1]}}`).toBe(true);
      expect(text, name).not.toMatch(/(^|[^\p{L}])Tí(?![\p{L}])/u);
    }
  });
  it('câu nhắc ngắn (tối đa 3 câu, dưới 200 ký tự) và dòng đầu hộp đổi {nd}', () => {
    for (const [name, text] of texts) {
      expect(text.length, name).toBeLessThan(200);
      expect(text.split(/(?<=[.!?])\s+/).length, name).toBeLessThanOrEqual(3);
    }
    expect(fmt(gameHints.viecCuaEm, { nd: 'Lật 2 thẻ.' })).toBe('Việc của em lúc này: Lật 2 thẻ.');
  });
  it('hai nút của hộp: "Xem hướng dẫn đầy đủ" và "Chơi tiếp"', () => {
    expect(gameHints.xemDayDu).toBe('Xem hướng dẫn đầy đủ');
    expect(gameHints.tiepTuc).toBe('Chơi tiếp');
  });
});
