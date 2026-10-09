// Kiểm tra nhanh quyền (RLS) trên Supabase thật, chỉ dùng khóa công khai (publishable/anon). Chạy: pnpm rls:check
// Tự đăng ký 2 tài khoản học sinh thử, kiểm tra 3 điều, in ✅/❌ từng điều. Cần đã chạy migration 0001_init.sql.
// Phần giáo viên (bước 12, cần thêm 0002_teacher.sql): đọc TEST_TEACHER_A_EMAIL/_PASSWORD và TEST_TEACHER_B_EMAIL/_PASSWORD
// từ .env.local (hai tài khoản giáo viên có thật, đăng nhập bằng mật khẩu). Thiếu thì bỏ qua phần này và báo rõ.
import { randomBytes, randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function readEnvLocal() {
  let text;
  try {
    text = await readFile(path.join(ROOT, '.env.local'), 'utf8');
  } catch {
    return {};
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

const env = { ...(await readEnvLocal()), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_') || k.startsWith('TEST_TEACHER_'))) };
const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
const key = env.VITE_SUPABASE_ANON_KEY ?? '';
const domain = (env.VITE_USERNAME_EMAIL_DOMAIN ?? '').replace(/^@+/, '');
if (!url || !key || !domain) {
  console.error('Thiếu VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY hoặc VITE_USERNAME_EMAIL_DOMAIN trong .env.local.');
  process.exit(2);
}
if (/service_role|sb_secret_/i.test(key)) {
  console.error('Khóa này có vẻ là khóa bí mật (service role/secret). Chỉ dùng khóa công khai (anon/publishable).');
  process.exit(2);
}

const newClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const results = [];
const report = (ok, text, detail) => {
  results.push(ok);
  console.log(`${ok ? '✅' : '❌'} ${text}${detail ? `\n     ${detail}` : ''}`);
};

/** Đăng ký một tài khoản thử, trả về { client, id, username }. */
async function makeUser(tag) {
  const username = `test_rls_${tag}_${randomInt(100000, 999999)}`;
  const client = newClient();
  const { data, error } = await client.auth.signUp({
    email: `${username}@${domain}`,
    password: randomBytes(12).toString('base64url') + 'aA1',
    options: { data: { username, display_name: `Thử ${tag.toUpperCase()}` } },
  });
  if (error) throw new Error(`Không đăng ký được ${username}: ${error.message}`);
  if (!data.session) throw new Error(`Đăng ký ${username} xong nhưng không có phiên (dự án còn bật "Confirm email"?).`);
  return { client, id: data.user.id, username };
}

let a, b;
try {
  [a, b] = [await makeUser('a'), await makeUser('b')];
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exit(1);
}
console.log(`Tài khoản thử: ${a.username} (A), ${b.username} (B)\n`);

// B tự tạo dữ liệu của mình để việc "A không đọc được" có ý nghĩa.
const { error: bInsErr } = await b.client.from('level_progress').insert({ user_id: b.id, level_id: 1, played: true, completed: true });
const { data: bOwnLp } = await b.client.from('level_progress').select('user_id').eq('user_id', b.id);
const { data: bOwnGs, error: bGsErr } = await b.client.from('game_state').select('user_id').eq('user_id', b.id);
if (bInsErr || bGsErr || !bOwnLp?.length || !bOwnGs?.length) {
  report(
    false,
    '(chuẩn bị) B ghi và đọc được dữ liệu của chính mình',
    `Chưa chạy migration 0001_init.sql? ${bInsErr?.message ?? bGsErr?.message ?? 'không đọc lại được hàng vừa tạo'}`,
  );
}

// (1) A không đọc được level_progress và game_state của B.
{
  const lp = await a.client.from('level_progress').select('*').eq('user_id', b.id);
  const gs = await a.client.from('game_state').select('*').eq('user_id', b.id);
  const lpAll = await a.client.from('level_progress').select('user_id');
  const leaked =
    (lp.data?.length ?? 0) > 0 || (gs.data?.length ?? 0) > 0 || (lpAll.data ?? []).some((r) => r.user_id === b.id);
  const aOwn = await a.client.from('game_state').select('user_id').eq('user_id', a.id);
  const selfOk = (aOwn.data?.length ?? 0) === 1;
  report(
    !leaked && selfOk,
    '(1) A không đọc được level_progress và game_state của B',
    leaked ? 'A ĐỌC ĐƯỢC dữ liệu của B!' : selfOk ? undefined : `A cũng không đọc được dữ liệu của chính mình: ${aOwn.error?.message ?? 'không có hàng game_state'}`,
  );
}

// (2) A tự đổi role thành teacher thì bị lỗi, và role vẫn là student.
{
  const { error } = await a.client.from('profiles').update({ role: 'teacher' }).eq('id', a.id);
  const { data } = await a.client.from('profiles').select('role').eq('id', a.id).maybeSingle();
  const stillStudent = data?.role === 'student';
  report(
    !!error && stillStudent,
    "(2) A chạy update profiles set role = 'teacher' thì bị lỗi",
    !error ? 'Lệnh KHÔNG báo lỗi!' : !stillStudent ? `Vai trò của A hiện là ${data?.role}` : `Lỗi nhận được: ${error.message}`,
  );
}

// (3) join_class với mã sai báo "Mã lớp không đúng".
{
  const { error } = await a.client.rpc('join_class', { code: 'ZZZZZ9' });
  report(
    !!error && /Mã lớp không đúng/.test(error.message),
    '(3) join_class với mã sai báo "Mã lớp không đúng"',
    error ? (/Mã lớp không đúng/.test(error.message) ? undefined : `Lỗi nhận được: ${error.message}`) : 'Lệnh KHÔNG báo lỗi!',
  );
}

// ===== Phần giáo viên (bước 12) =====
const tEnv = {
  aEmail: env.TEST_TEACHER_A_EMAIL ?? '',
  aPass: env.TEST_TEACHER_A_PASSWORD ?? '',
  bEmail: env.TEST_TEACHER_B_EMAIL ?? '',
  bPass: env.TEST_TEACHER_B_PASSWORD ?? '',
};
const teacherClients = [];
if (!tEnv.aEmail || !tEnv.aPass || !tEnv.bEmail || !tEnv.bPass) {
  console.log(
    '\nℹ️  Bỏ qua phần giáo viên: chưa có TEST_TEACHER_A_EMAIL, TEST_TEACHER_A_PASSWORD, TEST_TEACHER_B_EMAIL, TEST_TEACHER_B_PASSWORD trong .env.local.',
  );
} else {
  console.log('\n--- Phần giáo viên ---');
  let classId = null;
  let tA = null;
  try {
    const signIn = async (email, password, tag) => {
      const client = newClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error(`Giáo viên ${tag} không đăng nhập được: ${error?.message ?? 'không có phiên'}`);
      teacherClients.push(client);
      const { data: prof } = await client.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      if (!['teacher', 'admin'].includes(prof?.role)) {
        throw new Error(`Tài khoản giáo viên ${tag} có vai trò "${prof?.role ?? 'không đọc được'}", cần là teacher hoặc admin.`);
      }
      return { client, id: data.user.id };
    };
    tA = await signIn(tEnv.aEmail, tEnv.aPass, 'A');
    const tB = await signIn(tEnv.bEmail, tEnv.bPass, 'B');

    // Chuẩn bị: A tạo lớp; học sinh (a) vào lớp bằng mã; học sinh trả lời một câu để có số liệu câu hỏi.
    const created = await tA.client.rpc('create_class', { class_name: `Lớp thử RLS ${randomInt(1000, 9999)}` });
    const cls = created.data;
    if (created.error || !cls?.id || !/^[A-Z0-9]{6}$/.test(cls.join_code ?? '')) {
      report(false, '(4) Giáo viên A tạo lớp và nhận mã lớp 6 ký tự', created.error?.message ?? 'không nhận được lớp');
      throw new Error('stop');
    }
    classId = cls.id;
    report(true, '(4) Giáo viên A tạo lớp và nhận mã lớp 6 ký tự');

    // (5) Học sinh vào lớp bằng mã.
    {
      const j = await a.client.rpc('join_class', { code: cls.join_code });
      const { data: mem } = await tA.client.from('class_members').select('student_id').eq('class_id', classId);
      const inClass = (mem ?? []).some((m) => m.student_id === a.id);
      report(!j.error && j.data === classId && inClass, '(5) Học sinh nhập mã lớp thì vào lớp của A', j.error?.message ?? (inClass ? undefined : 'A không thấy học sinh trong lớp'));
    }
    await a.client.from('quiz_answers').insert({ user_id: a.id, level_id: 1, question_id: 'B1-01', correct: true });

    // (6) Học sinh gọi class_progress / class_quiz_stats của lớp A thì không có gì.
    {
      const p = await a.client.rpc('class_progress', { cid: classId });
      const q = await a.client.rpc('class_quiz_stats', { cid: classId });
      const leaked = (p.data?.length ?? 0) > 0 || (q.data?.length ?? 0) > 0;
      report(!leaked && !p.error && !q.error, '(6) Học sinh gọi class_progress và class_quiz_stats của lớp A thì nhận về rỗng', leaked ? 'HỌC SINH ĐỌC ĐƯỢC dữ liệu lớp!' : (p.error ?? q.error)?.message);
    }

    // (7) Giáo viên B gọi class_progress / class_quiz_stats của lớp A thì rỗng, và không đọc được lớp A.
    {
      const p = await tB.client.rpc('class_progress', { cid: classId });
      const q = await tB.client.rpc('class_quiz_stats', { cid: classId });
      const cl = await tB.client.from('classes').select('id').eq('id', classId);
      const mem = await tB.client.from('class_members').select('student_id').eq('class_id', classId);
      const leaked = (p.data?.length ?? 0) > 0 || (q.data?.length ?? 0) > 0 || (cl.data?.length ?? 0) > 0 || (mem.data?.length ?? 0) > 0;
      report(
        !leaked && !p.error && !q.error,
        '(7) Giáo viên B gọi class_progress, class_quiz_stats của lớp A thì rỗng, và không đọc được classes/class_members của A',
        leaked ? 'GIÁO VIÊN B ĐỌC ĐƯỢC dữ liệu lớp của A!' : (p.error ?? q.error)?.message,
      );
    }

    // (8) Giáo viên A gọi được và chỉ thấy đúng học sinh đó.
    {
      const p = await tA.client.rpc('class_progress', { cid: classId });
      const q = await tA.client.rpc('class_quiz_stats', { cid: classId });
      const ids = new Set((p.data ?? []).map((r) => r.student_id));
      const onlyHim = ids.size === 1 && ids.has(a.id);
      const stat = (q.data ?? []).find((r) => r.question_id === 'B1-01');
      const quizOk = (q.data ?? []).length === 1 && Number(stat?.total) === 1 && Number(stat?.correct) === 1;
      report(
        !p.error && !q.error && onlyHim && quizOk,
        '(8) Giáo viên A gọi class_progress thấy đúng học sinh vào lớp, class_quiz_stats thấy đúng câu trả lời',
        p.error?.message ?? q.error?.message ?? (!onlyHim ? `class_progress trả về ${ids.size} học sinh` : !quizOk ? 'class_quiz_stats không khớp' : undefined),
      );
    }
  } catch (e) {
    if (e.message !== 'stop') report(false, '(giáo viên) Không chạy tiếp được', e.message);
  } finally {
    // Dọn: xóa lớp thử (các thành viên bị xóa theo).
    if (classId && tA) {
      const { error } = await tA.client.from('classes').delete().eq('id', classId);
      if (error) console.log(`ℹ️  Chưa xóa được lớp thử ${classId}: ${error.message}. Thầy/cô xóa tay trong Table Editor.`);
    }
  }
}

await Promise.allSettled([a.client.auth.signOut(), b.client.auth.signOut(), ...teacherClients.map((c) => c.auth.signOut())]);
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} đạt.`);
console.log(`Hai tài khoản thử còn lại trong Authentication → Users (${a.username}, ${b.username}). Anh xóa tay khi không cần nữa.`);
process.exit(results.every(Boolean) ? 0 : 1);
