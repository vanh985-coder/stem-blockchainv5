import type { Role } from './AuthProvider';

/**
 * Hàm thuần: ai được thấy "Trang giáo viên" (liên kết ở trang chủ, và vào /giao-vien)?
 * Giáo viên và admin. Học sinh, khách chưa đăng nhập, hoặc chưa tải xong hồ sơ (null/undefined) thì không.
 * Mở khóa mọi màn cho giáo viên/admin cũng dùng đúng điều kiện này.
 */
export function canSeeTeacherPage(role: Role | string | null | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}
