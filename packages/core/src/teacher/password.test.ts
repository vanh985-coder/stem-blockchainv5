import { describe, expect, it } from 'vitest';
import { PASSWORD_ALPHABET, PASSWORD_LENGTH, generatePassword, isValidNewPassword, secureRandomInt } from './password';

describe('generatePassword', () => {
  it('dài 8 ký tự, không có 0/O, 1/l/I', () => {
    for (let i = 0; i < 2000; i++) {
      const pw = generatePassword();
      expect(pw).toHaveLength(PASSWORD_LENGTH);
      expect(pw).not.toMatch(/[0O1lI]/);
      expect(pw).toMatch(/^[A-Za-z2-9]+$/);
    }
  });

  it('luôn có ít nhất một chữ cái và một chữ số', () => {
    // Bộ sinh giả chỉ ra toàn chữ cái, rồi mới ra chữ số ở lần thử sau.
    const letters = [0, 0, 0, 0, 0, 0, 0, 0];
    const digits = PASSWORD_ALPHABET.length - 1;
    const seq = [...letters, 1, 1, 1, 1, 1, 1, 1, digits];
    let i = 0;
    const pw = generatePassword(() => seq[i++ % seq.length]);
    expect(pw).toMatch(/[A-Za-z]/);
    expect(pw).toMatch(/[2-9]/);
  });

  it('dùng bộ sinh được truyền vào (kết quả xác định)', () => {
    let i = 0;
    expect(generatePassword(() => i++ % PASSWORD_ALPHABET.length)).toBe(generatePassword(((j) => () => j++ % PASSWORD_ALPHABET.length)(0)));
  });

  it('hai lần tạo bằng bộ sinh thật thường khác nhau', () => {
    const set = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(set.size).toBeGreaterThan(45);
  });

  it('bảng ký tự không có ký tự dễ lẫn', () => {
    expect(PASSWORD_ALPHABET).not.toMatch(/[0O1lI]/);
  });

  it('secureRandomInt nằm trong [0, n)', () => {
    for (let i = 0; i < 500; i++) {
      const v = secureRandomInt(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
});

describe('isValidNewPassword', () => {
  it('cần ít nhất 8 ký tự', () => {
    expect(isValidNewPassword('1234567')).toBe(false);
    expect(isValidNewPassword('12345678')).toBe(true);
    expect(isValidNewPassword('')).toBe(false);
  });
});
