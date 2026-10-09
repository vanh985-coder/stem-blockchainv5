/**
 * Mật khẩu ngẫu nhiên dễ đọc cho học sinh (spec 09 mục 3): 8 ký tự, không có 0/O, 1/l (và cả I cho khỏi lẫn với l).
 */

export const PASSWORD_LENGTH = 8;
export const MIN_PASSWORD_LENGTH = 8;

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'; // bỏ I, O, l
const DIGITS = '23456789'; // bỏ 0, 1
export const PASSWORD_ALPHABET = LETTERS + DIGITS;

/** Số nguyên ngẫu nhiên trong [0, n), dùng bộ sinh số an toàn của trình duyệt (loại bỏ lệch bằng rejection sampling). */
export function secureRandomInt(n: number): number {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/**
 * Tạo mật khẩu. `randomInt(n)` trả số nguyên trong [0, n); mặc định là bộ sinh an toàn. Truyền hàm khác khi test.
 * Luôn có ít nhất một chữ cái và một chữ số.
 */
export function generatePassword(randomInt: (n: number) => number = secureRandomInt, length: number = PASSWORD_LENGTH): string {
  for (;;) {
    let pw = '';
    for (let i = 0; i < length; i++) pw += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
    if (/[A-Za-z]/.test(pw) && /[2-9]/.test(pw)) return pw;
  }
}

export function isValidNewPassword(pw: string): boolean {
  return pw.length >= MIN_PASSWORD_LENGTH;
}
