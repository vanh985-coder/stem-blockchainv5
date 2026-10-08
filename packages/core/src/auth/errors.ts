import { ui } from '../content/ui';

/** Lỗi xảy ra ở đâu, để chọn câu thông báo hợp lý. */
export type AuthErrorContext = 'signUp' | 'signIn' | 'joinClass' | 'other';

interface ErrorLike {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Hàm thuần: đổi lỗi của Supabase (hoặc của trình duyệt) sang câu thông báo cho học sinh.
 * Không bao giờ để lộ chữ tiếng Anh hay chi tiết kỹ thuật ra màn hình.
 */
export function mapAuthError(error: unknown, context: AuthErrorContext = 'other'): string {
  const e: ErrorLike = error && typeof error === 'object' ? (error as ErrorLike) : { message: str(error) };
  const name = str(e.name);
  const code = str(e.code);
  const message = str(e.message);
  const status = typeof e.status === 'number' ? e.status : undefined;

  // Lỗi mạng: trình duyệt báo "Failed to fetch", hoặc thư viện báo AuthRetryableFetchError.
  if (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)
  ) {
    return ui.auth.loi.mang;
  }

  // Mã lớp sai, chưa đăng nhập (lỗi do hàm join_class ném ra)
  if (message.includes(ui.auth.loiMayChu.maLopSai)) return ui.auth.loi.maLopSai;
  if (message.includes(ui.auth.loiMayChu.canDangNhap)) return ui.auth.loi.canDangNhap;

  // Tên đăng nhập đã có người dùng
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    /already registered|already been registered|already exists/i.test(message) ||
    // Trigger tạo hồ sơ vi phạm tên đăng nhập duy nhất thì Supabase báo lỗi chung này
    (context === 'signUp' && /database error saving new user/i.test(message))
  ) {
    return ui.auth.loi.tenDaCo;
  }

  // Sai tên đăng nhập hoặc mật khẩu
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return ui.auth.loi.saiDangNhap;
  }

  return ui.auth.loi.chung;
}
