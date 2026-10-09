import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_CONFIG, sessionCookieOptions } from './config';

let clientPromise: Promise<SupabaseClient | null> | null = null;
let created: SupabaseClient | null = null;
const createdListeners = new Set<(c: SupabaseClient) => void>();

/** Client đã tạo xong (nếu có), không tạo mới. */
export function getCreatedClient(): SupabaseClient | null {
  return created;
}

/** Được gọi khi client vừa được tạo (để AuthProvider bắt đầu theo dõi phiên). Trả về hàm hủy. */
export function onClientCreated(listener: (c: SupabaseClient) => void): () => void {
  createdListeners.add(listener);
  return () => createdListeners.delete(listener);
}

/**
 * Client Supabase dùng chung, tạo một lần. Thư viện Supabase được nạp bằng import() nên nằm trong chunk riêng,
 * không làm nặng trang đầu. Thiếu cấu hình thì trả null (app vẫn chạy).
 * Phiên đăng nhập lưu bằng cookie trên tên miền cha để dùng chung giữa hub và các làng (spec 02 mục 2).
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!AUTH_CONFIG.configured) return Promise.resolve(null);
  clientPromise ??= import('@supabase/ssr').then(({ createBrowserClient }) =>
    {
      const c = createBrowserClient(AUTH_CONFIG.url, AUTH_CONFIG.anonKey, {
        cookieOptions: sessionCookieOptions(AUTH_CONFIG.cookieDomain, location.protocol),
      });
      created = c;
      createdListeners.forEach((l) => l(c));
      return c;
    },
  );
  return clientPromise;
}

/**
 * Có dấu hiệu đang đăng nhập (cookie phiên) hoặc đang quay về từ Google (?code=…) không.
 * Dùng để chỉ nạp thư viện Supabase khi cần: khách chưa đăng nhập không phải tải nó ở trang đầu.
 */
export function mayHaveSession(): boolean {
  if (typeof document === 'undefined') return false;
  return /(^|;\s*)sb-[^=]*-auth-token/.test(document.cookie) || /[?&]code=/.test(location.search) || /access_token=/.test(location.hash);
}
