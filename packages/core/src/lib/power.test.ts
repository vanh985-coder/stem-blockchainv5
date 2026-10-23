import { describe, expect, it } from 'vitest';
import { fmt } from '../content/characters';
import { memoryUi, modCalcUi } from '../content/games';
import { publicKey } from '../lessons/bai-3/logic';
import { parseRich } from '../ui/rich';
import { POWER_NAMES, formatPower, plainPower } from './power';

describe('cách viết lũy thừa chung (chỉ số trên, như trang bài học 3)', () => {
  it('formatPower dựng "5^^3^^"; qua rich() thành chỉ số trên (như 5^^x^^ trong bài học 3), plainPower đổi về "5^3" cho nhãn đọc màn hình', () => {
    expect(formatPower(5, 3)).toBe('5^^3^^');
    expect(formatPower(5, 'x')).toBe('5^^x^^');
    expect(parseRich(formatPower(5, 'x') + ' mod 23')).toEqual(['5', { mark: 'sup', children: ['x'] }, ' mod 23']);
    expect(plainPower('Khớp rồi! 5^^3^^ mod 23 = 10')).toBe('Khớp rồi! 5^3 mod 23 = 10');
    expect(plainPower('không có số mũ')).toBe('không có số mũ');
  });

  it('thẻ (dòng "Khớp rồi!"), máy tính mod, câu nhắc và hướng dẫn đều dùng cùng một cách viết', () => {
    expect(memoryUi.khop).toBe(`${formatPower(5, '{x}')} mod 23 = {y}`);
    expect(modCalcUi.ketQua).toBe(`${formatPower(5, '{x}')} mod 23 = {y}`);
    expect(fmt(memoryUi.khop, { x: 3, y: 10 })).toBe('5^^3^^ mod 23 = 10');
    expect(fmt(modCalcUi.ketQua, { x: 12, y: 18 })).toBe('5^^12^^ mod 23 = 18');
    // chỗ điền tự động {congThuc}, {viDu}… (hướng dẫn, luật, câu nhắc)
    expect(fmt('{congThuc}')).toBe('5^^x^^ mod 23');
    expect(fmt('{viDu}')).toBe('5^^3^^ mod 23 = 10');
    expect(POWER_NAMES.congThuc).toBe(`${formatPower(5, 'x')} mod 23`);
  });

  it('ví dụ 3 ↔ 10 đúng theo publicKey của Bài 3', () => {
    expect(publicKey(Number(POWER_NAMES.viDuX))).toBe(Number(POWER_NAMES.viDuY));
    expect(POWER_NAMES.viDu).toBe(`${formatPower(5, POWER_NAMES.viDuX)} mod 23 = ${POWER_NAMES.viDuY}`);
  });
});
