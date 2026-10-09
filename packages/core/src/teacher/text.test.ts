import { describe, expect, it } from 'vitest';
import { fill } from './text';

describe('fill', () => {
  it('điền biến, giữ nguyên biến thiếu', () => {
    expect(fill('Xóa {ten} khỏi lớp {lop}', { ten: 'An', lop: '10A1' })).toBe('Xóa An khỏi lớp 10A1');
    expect(fill('{so} học sinh', { so: 3 })).toBe('3 học sinh');
    expect(fill('Chào {ten}', {})).toBe('Chào {ten}');
  });
});
