import { getSupabase } from '../auth/client';
import { teacherTexts } from '../content/teacher';
import type { ClassProgressRow } from './progress';
import type { QuizStatRow } from './quiz';

/**
 * Nói chuyện với Supabase cho trang giáo viên. Chỉ dùng khóa công khai (anon) của người đang đăng nhập;
 * quyền xem dữ liệu do RLS và các hàm Postgres ở supabase/migrations quyết định. Không có service role ở đây:
 * việc đặt lại mật khẩu đi qua Edge Function teacher-reset-password.
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

const ok = <T>(data: T): ApiResult<T> => ({ ok: true, data });
const fail = (message: string): ApiResult<never> => ({ ok: false, message });

export interface ClassInfo {
  id: string;
  name: string;
  joinCode: string;
  createdAt: string;
  /** Số học sinh trong lớp (0 nếu chưa đếm được) */
  studentCount: number;
}

export interface StudentAccount {
  id: string;
  /** Tên đăng nhập; null = tài khoản Google (không có mật khẩu để đặt lại). Email không bao giờ được đọc. */
  username: string | null;
}

async function client() {
  return getSupabase();
}

type ClassRow = { id: string; name: string; join_code: string; created_at: string };

/** Các lớp của giáo viên (admin thấy tất cả), kèm số học sinh. */
export async function listClasses(teacherId: string | null): Promise<ApiResult<ClassInfo[]>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    let q = sb.from('classes').select('id, name, join_code, created_at').order('created_at', { ascending: false });
    if (teacherId) q = q.eq('teacher_id', teacherId);
    const { data, error } = await q;
    if (error) return fail(teacherTexts.loiTai);
    const classes = (data ?? []) as ClassRow[];
    const counts = new Map<string, number>();
    if (classes.length > 0) {
      const { data: members } = await sb
        .from('class_members')
        .select('class_id')
        .in('class_id', classes.map((c) => c.id));
      for (const m of (members ?? []) as { class_id: string }[]) counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1);
    }
    return ok(
      classes.map((c) => ({ id: c.id, name: c.name, joinCode: c.join_code, createdAt: c.created_at, studentCount: counts.get(c.id) ?? 0 })),
    );
  } catch {
    return fail(teacherTexts.loiTai);
  }
}

export async function getClass(classId: string): Promise<ApiResult<ClassInfo | null>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.from('classes').select('id, name, join_code, created_at').eq('id', classId).maybeSingle();
    if (error) return fail(teacherTexts.loiTai);
    if (!data) return ok(null);
    const c = data as ClassRow;
    return ok({ id: c.id, name: c.name, joinCode: c.join_code, createdAt: c.created_at, studentCount: 0 });
  } catch {
    return fail(teacherTexts.loiTai);
  }
}

/** Tạo lớp bằng hàm Postgres create_class. */
export async function createClass(name: string): Promise<ApiResult<ClassInfo>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.rpc('create_class', { class_name: name });
    if (error || !data) return fail(teacherTexts.lop.loiTao);
    const c = data as ClassRow;
    return ok({ id: c.id, name: c.name, joinCode: c.join_code, createdAt: c.created_at, studentCount: 0 });
  } catch {
    return fail(teacherTexts.lop.loiTao);
  }
}

export async function fetchClassProgress(classId: string): Promise<ApiResult<ClassProgressRow[]>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.rpc('class_progress', { cid: classId });
    return error ? fail(teacherTexts.loiTai) : ok((data ?? []) as ClassProgressRow[]);
  } catch {
    return fail(teacherTexts.loiTai);
  }
}

export async function fetchClassQuizStats(classId: string): Promise<ApiResult<QuizStatRow[]>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.rpc('class_quiz_stats', { cid: classId });
    return error ? fail(teacherTexts.loiTai) : ok((data ?? []) as QuizStatRow[]);
  } catch {
    return fail(teacherTexts.loiTai);
  }
}

/** Tên đăng nhập của các học sinh (để biết ai là tài khoản Google). Chỉ đọc id và username, không đọc email. */
export async function fetchStudentAccounts(studentIds: readonly string[]): Promise<ApiResult<StudentAccount[]>> {
  if (studentIds.length === 0) return ok([]);
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.from('profiles').select('id, username').in('id', [...studentIds]);
    return error ? fail(teacherTexts.loiTai) : ok((data ?? []) as StudentAccount[]);
  } catch {
    return fail(teacherTexts.loiTai);
  }
}

/** Các câu trả lời của một học sinh (chỉ cột correct), để tính tỉ lệ đúng. */
export async function fetchStudentAnswers(studentId: string): Promise<ApiResult<{ correct: boolean }[]>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.from('quiz_answers').select('correct').eq('user_id', studentId).limit(5000);
    return error ? fail(teacherTexts.chiTiet.loi) : ok((data ?? []) as { correct: boolean }[]);
  } catch {
    return fail(teacherTexts.chiTiet.loi);
  }
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<ApiResult<void>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId).select('student_id');
    // RLS không cho xóa thì không lỗi nhưng cũng không có dòng nào bị xóa.
    return error || !data || data.length === 0 ? fail(teacherTexts.xoa.loi) : ok(undefined);
  } catch {
    return fail(teacherTexts.xoa.loi);
  }
}

/** Lấy mã lỗi `code` trong thân phản hồi lỗi của Edge Function (nếu có). */
async function resetErrorCode(error: unknown): Promise<string> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = (await (ctx as Response).json()) as { code?: unknown };
      if (typeof body.code === 'string') return body.code;
    } catch {
      /* không đọc được thân phản hồi */
    }
  }
  return '';
}

const RESET_ERRORS = teacherTexts.datLai.loi as Record<string, string>;

/**
 * Đặt lại mật khẩu cho học sinh qua Edge Function teacher-reset-password (kèm token của giáo viên).
 * Mật khẩu chỉ nằm trong thân yêu cầu; không ghi vào log, không lưu ở đâu.
 */
export async function resetStudentPassword(studentId: string, newPassword: string): Promise<ApiResult<void>> {
  const sb = await client();
  if (!sb) return fail(teacherTexts.chuaCauHinh);
  try {
    const { data, error } = await sb.functions.invoke('teacher-reset-password', { body: { studentId, newPassword } });
    if (error) {
      const code = await resetErrorCode(error);
      return fail(RESET_ERRORS[code] ?? RESET_ERRORS.mac_dinh);
    }
    return (data as { ok?: boolean } | null)?.ok ? ok(undefined) : fail(RESET_ERRORS.mac_dinh);
  } catch {
    return fail(RESET_ERRORS.mac_dinh);
  }
}
