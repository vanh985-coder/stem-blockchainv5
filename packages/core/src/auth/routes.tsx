import type { RouteObject } from 'react-router';
import { lazyRoute } from '../ui/lazyRoute';

/**
 * 4 trang tài khoản. Hub và cả 4 vỏ làng đều gắn các route này (đăng nhập dùng chung nhờ cookie trên tên miền cha).
 * Mỗi trang nằm trong chunk riêng, chỉ tải khi em mở trang.
 */
export const accountRoutes: RouteObject[] = [
  lazyRoute('/dang-nhap', () => import('./pages/LoginPage')),
  lazyRoute('/dang-ky', () => import('./pages/RegisterPage')),
  lazyRoute('/ho-so', () => import('./pages/ProfilePage')),
  lazyRoute('/quyen-rieng-tu', () => import('./pages/PrivacyPage')),
];
