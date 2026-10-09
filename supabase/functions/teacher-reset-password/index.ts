// Edge Function (Deno): giáo viên đặt lại mật khẩu cho học sinh trong lớp của mình (spec 09 mục 3).
// Khóa service role CHỈ có ở đây (biến môi trường do Supabase cấp), không bao giờ nằm trong apps/ hay packages/.
// Cần secret: USERNAME_EMAIL_DOMAIN (cùng giá trị với VITE_USERNAME_EMAIL_DOMAIN, ví dụ hs.ten-mien.vn).
// Triển khai: supabase functions deploy teacher-reset-password
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MIN_PASSWORD = 8;

// `code` để giao diện tự chọn câu báo lỗi (chữ hiển thị nằm trong content/); `error` là câu mô tả cho người viết code.
function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
const fail = (status: number, code: string, error: string) => reply(status, { ok: false, code, error });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'method', 'Chỉ nhận POST.');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const domain = (Deno.env.get('USERNAME_EMAIL_DOMAIN') ?? '').trim().replace(/^@+/, '').toLowerCase();
  if (!url || !serviceKey || !domain) return fail(500, 'config', 'Máy chủ chưa được cấu hình.');

  // 1. Người gọi: đọc từ token. Không đăng nhập thì 401.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return fail(401, 'unauthenticated', 'Cần đăng nhập.');

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: caller, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !caller.user) return fail(401, 'unauthenticated', 'Cần đăng nhập.');
  const callerId = caller.user.id;

  let studentId = '';
  let newPassword = '';
  try {
    const body = await req.json();
    studentId = typeof body?.studentId === 'string' ? body.studentId : '';
    newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
  } catch {
    return fail(400, 'bad_request', 'Yêu cầu không hợp lệ.');
  }
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return fail(400, 'bad_request', 'Yêu cầu không hợp lệ.');

  // 2. Người gọi là admin, hoặc là giáo viên của một lớp có học sinh này. Không thì 403.
  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerId).maybeSingle();
  const callerRole = callerProfile?.role;
  let allowed = callerRole === 'admin';
  if (!allowed && callerRole === 'teacher') {
    const { data: classes } = await admin.from('classes').select('id').eq('teacher_id', callerId);
    const classIds = (classes ?? []).map((c: { id: string }) => c.id);
    if (classIds.length > 0) {
      const { data: member } = await admin
        .from('class_members')
        .select('student_id')
        .eq('student_id', studentId)
        .in('class_id', classIds)
        .limit(1);
      allowed = (member ?? []).length > 0;
    }
  }
  if (!allowed) return fail(403, 'forbidden', 'Học sinh không thuộc lớp của người gọi.');

  // 3. Chỉ tài khoản tên đăng nhập (email nội bộ <ten>@USERNAME_EMAIL_DOMAIN) mới có mật khẩu để đặt lại.
  const { data: target, error: targetError } = await admin.auth.admin.getUserById(studentId);
  if (targetError || !target.user) return fail(404, 'not_found', 'Không tìm thấy tài khoản.');
  const email = (target.user.email ?? '').toLowerCase();
  if (!email.endsWith(`@${domain}`)) return fail(400, 'google_account', 'Tài khoản Google không có mật khẩu để đặt lại.');

  // 4. Mật khẩu mới ít nhất 8 ký tự.
  if (newPassword.length < MIN_PASSWORD) return fail(400, 'weak_password', 'Mật khẩu mới cần ít nhất 8 ký tự.');

  // 5. Đặt lại. Không ghi mật khẩu vào log (kể cả khi lỗi: chỉ ghi mã lỗi chung).
  const { error: updateError } = await admin.auth.admin.updateUserById(studentId, { password: newPassword });
  if (updateError) {
    console.error('teacher-reset-password: cập nhật thất bại', updateError.status ?? '');
    return fail(400, 'update_failed', 'Không đặt lại được mật khẩu.');
  }

  // 6. Thành công.
  return reply(200, { ok: true });
});
