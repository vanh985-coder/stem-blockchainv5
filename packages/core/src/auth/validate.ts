import { ui } from '../content/ui';

export type ValidationResult = { ok: true } | { ok: false; message: string };

const OK: ValidationResult = { ok: true };
const fail = (message: string): ValidationResult => ({ ok: false, message });

const USERNAME = /^[a-z0-9_]{3,20}$/;

/** Hàm thuần: chuẩn hóa tên đăng nhập em gõ (bỏ khoảng trắng đầu cuối, chữ thường). Nên gọi trước validateUsername. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Tên đăng nhập: 3 đến 20 ký tự, chỉ a-z, 0-9, _ (không tự chuẩn hóa: chữ hoa bị từ chối). */
export function validateUsername(username: string): ValidationResult {
  return USERNAME.test(username) ? OK : fail(ui.auth.kiemTra.tenDangNhap);
}

/** Tên hiển thị đã bỏ khoảng trắng đầu cuối. */
export function cleanDisplayName(raw: string): string {
  return raw.trim();
}

/** Tên hiển thị: 1 đến 40 ký tự sau khi bỏ khoảng trắng đầu cuối (cùng luật với check của bảng profiles). */
export function validateDisplayName(raw: string): ValidationResult {
  const n = cleanDisplayName(raw).length;
  return n >= 1 && n <= 40 ? OK : fail(ui.auth.kiemTra.tenHienThi);
}

/** Mật khẩu: ít nhất 8 ký tự. */
export function validatePassword(password: string): ValidationResult {
  return password.length >= 8 ? OK : fail(ui.auth.kiemTra.matKhau);
}

/** Email nội bộ của tài khoản tên đăng nhập: <ten>@<tên miền cấu hình>. Học sinh không bao giờ thấy email này. */
export function usernameToEmail(username: string, emailDomain: string): string {
  return `${username}@${emailDomain}`;
}
