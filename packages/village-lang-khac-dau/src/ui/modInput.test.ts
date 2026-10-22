import { describe, expect, it } from 'vitest';
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { parseModInput } from './modInput';

describe('Máy tính mod: ô nhập x', () => {
  it('nhận số nguyên 1 đến 22', () => {
    for (let x = 1; x <= 22; x++) expect(parseModInput(String(x))).toBe(x);
    expect(parseModInput(' 7 ')).toBe(7);
    expect(parseModInput('07')).toBe(7);
  });

  it('không nhận 0, 23, số âm, số thập phân, chữ hay ô trống', () => {
    for (const t of ['', ' ', '0', '00', '23', '99', '-3', '3.5', '3,5', 'x', '1e1', '+4', '123']) expect(parseModInput(t), t).toBeNull();
  });

  it('kết quả hiện ra là publicKey của Bài 3 (ví dụ 5^3 mod 23 = 10, 5^14 mod 23 = 13)', () => {
    expect(publicKey(parseModInput('3')!)).toBe(10);
    expect(publicKey(parseModInput('14')!)).toBe(13);
  });
});
