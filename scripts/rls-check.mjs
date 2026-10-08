// Kiểm tra nhanh quyền (RLS) trên Supabase thật, chỉ dùng khóa công khai (publishable/anon). Chạy: pnpm rls:check
// Tự đăng ký 2 tài khoản thử, kiểm tra 3 điều, in ✅/❌ từng điều. Cần đã chạy migration 0001_init.sql.
// Kiểm tra quyền giáo viên để bước 12 (khi đã có tài khoản giáo viên).
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

const env = { ...(await readEnvLocal()), ...Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('VITE_'))) };
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

await Promise.allSettled([a.client.auth.signOut(), b.client.auth.signOut()]);
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} đạt.`);
console.log(`Hai tài khoản thử còn lại trong Authentication → Users (${a.username}, ${b.username}). Anh xóa tay khi không cần nữa.`);
process.exit(results.every(Boolean) ? 0 : 1);
