import type { Role } from './AuthProvider';

/**
 * Hàm thuần: ai được thấy "Trang giáo viên" (liên kết ở trang chủ, và vào /giao-vien)?
 * Giáo viên và admin. Học sinh, khách chưa đăng nhập, hoặc chưa tải xong hồ sơ (null/undefined) thì không.
 * Mở khóa mọi màn cho giáo viên/admin cũng dùng đúng điều kiện này.
 */
export function canSeeTeacherPage(role: Role | string | null | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}

/**
 * Ai được thấy và dùng nút "Tự hoàn thành" (P3b)? Giáo viên/admin, và bản dev (chạy `vite` dev, `dev` true). Học sinh và khách ở bản phát hành thì không
 * (kể cả khi chưa tải xong hồ sơ). Đây chỉ là phần giao diện: máy chủ vẫn tự chặn người không phải giáo viên/admin ghi cờ (trigger ở migration 0003).
 */
export function canUseAutoComplete(role: Role | string | null | undefined, dev: boolean): boolean {
  return dev || canSeeTeacherPage(role);
}

/** Bản dev (chạy `vite` dev). Bản build phát hành, kể cả bản đo `VITE_PROBE`, không phải bản dev. */
export const IS_DEV_BUILD: boolean = import.meta.env.DEV === true;
