/**
 * Lỗi khi ghi cờ "tự hoàn thành" (P3b), phân theo nguyên nhân để không gây lỗi dây chuyền cho đồng bộ tiến độ:
 * - 'missing-column': máy chủ chưa chạy migration 0003 (Postgres 42703 hay PostgREST PGRST204 "Could not find the 'auto_completed' column");
 * - 'forbidden': máy chủ từ chối người này (trigger `protect_auto_completed` báo "Chỉ giáo viên…", hay RLS 42501);
 * - 'other': mất mạng, hết hạn đăng nhập… (thử lại sau).
 */
export type AutoErrorKind = 'missing-column' | 'forbidden' | 'other';
export function classifyAutoError(err: unknown): AutoErrorKind {
  const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const text = [e.message, e.details, e.hint].filter((x): x is string => typeof x === 'string').join(' ');
  if (code === '42703' || code === 'PGRST204' || (/auto_completed/.test(text) && /(does not exist|schema cache|could not find)/i.test(text))) return 'missing-column';
  if (code === '42501' || /Ch\u1EC9 gi\u00E1o vi\u00EAn m\u1EDBi d\u00F9ng/.test(text) || /row-level security/i.test(text)) return 'forbidden';
  return 'other';
}
