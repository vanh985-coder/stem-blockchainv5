import { describe, expect, it } from 'vitest';
import { EASY_PAGES, easyRound, pageCode } from './logic';

describe('Bài 1, trạm Dễ: nội dung do máy chọn', () => {
  it('luôn có 5 trang, nội dung nguyên trong 0–99, mã bìa trong khoảng cấu hình', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const { genesisCode, contents } = easyRound(seed * 7919);
      expect(contents).toHaveLength(EASY_PAGES);
      for (const c of contents) {
        expect(Number.isInteger(c)).toBe(true);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(99);
      }
      expect(genesisCode).toBeGreaterThanOrEqual(10);
      expect(genesisCode).toBeLessThanOrEqual(89);
    }
  });

  it('cùng seed thì cùng nội dung; khác seed thì thường khác', () => {
    expect(easyRound(12345)).toEqual(easyRound(12345));
    const seen = new Set(Array.from({ length: 50 }, (_, i) => easyRound(i + 1).contents.join(',')));
    expect(seen.size).toBeGreaterThan(40);
  });

  it('công thức pageCode giữ nguyên: (mã trước × 2 + nội dung) mod 100', () => {
    const { genesisCode, contents } = easyRound(2024);
    let prev = genesisCode;
    for (const c of contents) {
      const code = pageCode(prev, c);
      expect(code).toBe((prev * 2 + c) % 100);
      prev = code;
    }
  });
});
