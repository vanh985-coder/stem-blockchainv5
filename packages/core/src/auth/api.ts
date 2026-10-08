import { ui } from '../content/ui';
import { AUTH_CONFIG } from './config';
import { getSupabase } from './client';
import { mapAuthError } from './errors';
import { cleanDisplayName, usernameToEmail } from './validate';

export type AuthResult<T = void> = { ok: true; data: T } | { ok: false; message: string };

const okEmpty: AuthResult = { ok: true, data: undefined };
const fail = (message: string): AuthResult<never> => ({ ok: false, message });

/** Hook chạy TRƯỚC khi thoát phiên. userId là tài khoản sắp đăng xuất (null nếu không biết). */
export type BeforeSignOutHook = (userId: string | null) => void | Promise<void>;

// Lúc này rỗng. Bước 6 (đồng bộ tiến độ) sẽ đăng ký hook để xóa dữ liệu chơi trên máy (sochung.v3.u.<userId>)
// trước khi thoát phiên, như spec 02 mục 4. Hook lỗi thì vẫn thoát phiên.
let beforeSignOut: BeforeSignOutHook = () => {};

export function setBeforeSignOut(hook: BeforeSignOutHook): void {
  beforeSignOut = hook;
}

/** Đăng ký bằng tên đăng nhập. Email nội bộ = <ten>@<VITE_USERNAME_EMAIL_DOMAIN>; metadata { username, display_name }. */
export async function signUpUsername(input: { username: string; displayName: string; password: string }): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase || !AUTH_CONFIG.usernameEnabled) return fail(ui.auth.chuaCauHinh);
  const email = usernameToEmail(input.username, AUTH_CONFIG.emailDomain);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { username: input.username, display_name: cleanDisplayName(input.displayName) } },
    });
    if (error) return fail(mapAuthError(error, 'signUp'));
    if (!data.session) {
      // Dự phòng: nếu dự án còn bật "Confirm email" thì không có phiên ngay; thử đăng nhập luôn.
      return signInUsername({ username: input.username, password: input.password });
    }
    return okEmpty;
  } catch (e) {
    return fail(mapAuthError(e, 'signUp'));
  }
}

export async function signInUsername(input: { username: string; password: string }): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase || !AUTH_CONFIG.usernameEnabled) return fail(ui.auth.chuaCauHinh);
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(input.username, AUTH_CONFIG.emailDomain),
      password: input.password,
    });
    return error ? fail(mapAuthError(error, 'signIn')) : okEmpty;
  } catch (e) {
    return fail(mapAuthError(e, 'signIn'));
  }
}

/** Đăng nhập Google. Trình duyệt chuyển sang Google rồi quay lại đúng trang này (redirectTo = location.href). */
export async function signInGoogle(): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return fail(ui.auth.chuaCauHinh);
  try {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href } });
    return error ? fail(mapAuthError(error, 'signIn')) : okEmpty;
  } catch (e) {
    return fail(mapAuthError(e, 'signIn'));
  }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await getSupabase();
  if (!supabase) return fail(ui.auth.chuaCauHinh);
  try {
    const { data } = await supabase.auth.getSession();
    try {
      await beforeSignOut(data.session?.user.id ?? null);
    } catch {
      // Không để lỗi dọn dẹp chặn việc đăng xuất.
    }
    const { error } = await supabase.auth.signOut();
    return error ? fail(mapAuthError(error, 'other')) : okEmpty;
  } catch (e) {
    return fail(mapAuthError(e, 'other'));
  }
}

/** Đổi tên hiển thị của chính mình (bảng profiles, RLS chỉ cho sửa hàng của mình). */
export async function updateDisplayName(userId: string, displayName: string): Promise<AuthResult<string>> {
  const supabase = await getSupabase();
  if (!supabase) return fail(ui.auth.chuaCauHinh);
  const name = cleanDisplayName(displayName);
  try {
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', userId);
    return error ? fail(mapAuthError(error, 'other')) : { ok: true, data: name };
  } catch (e) {
    return fail(mapAuthError(e, 'other'));
  }
}

/** Vào lớp bằng mã (rpc join_class). Trả về id lớp. */
export async function joinClass(code: string): Promise<AuthResult<string>> {
  const supabase = await getSupabase();
  if (!supabase) return fail(ui.auth.chuaCauHinh);
  try {
    const { data, error } = await supabase.rpc('join_class', { code });
    return error ? fail(mapAuthError(error, 'joinClass')) : { ok: true, data: String(data) };
  } catch (e) {
    return fail(mapAuthError(e, 'joinClass'));
  }
}
