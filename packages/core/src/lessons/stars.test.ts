import { describe, expect, it } from 'vitest';
import { starsFromHearts, starsFromMistakes } from './stars';

describe('starsFromMistakes (chấm sao các trạm Dễ và Trung bình, giữ nguyên giai đoạn 1)', () => {
  it('0 lỗi 3 sao; 1–2 lỗi 2 sao; từ 3 lỗi 1 sao', () => {
    expect(starsFromMistakes(0)).toBe(3);
    expect(starsFromMistakes(1)).toBe(2);
    expect(starsFromMistakes(2)).toBe(2);
    expect(starsFromMistakes(3)).toBe(1);
    expect(starsFromMistakes(50)).toBe(1);
  });
});

describe('starsFromHearts (chấm sao Bài 2: 0 lỗi 3 sao, 1 lỗi 2 sao, 2 lỗi 1 sao)', () => {
  it('khác starsFromMistakes ở chỗ 2 lỗi chỉ được 1 sao', () => {
    expect(starsFromHearts(0)).toBe(3);
    expect(starsFromHearts(1)).toBe(2);
    expect(starsFromHearts(2)).toBe(1);
    expect(starsFromHearts(3)).toBe(1);
  });
});
