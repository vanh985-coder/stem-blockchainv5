import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Button } from '../../ui/Button';
import { signInGoogle, signInUsername } from '../api';
import { useProgress } from '../../progress/ProgressProvider';
import { useAuth } from '../AuthProvider';
import { safeNext } from '../redirect';
import { normalizeUsername, validatePassword, validateUsername } from '../validate';
import { AccountPage, ErrorNote, Field, goToMap, t, useGoAfterLogin } from './shared';

export default function LoginPage() {
  const { session, loading, configured } = useAuth();
  const goAfterLogin = useGoAfterLogin();
  const navigate = useNavigate();
  const { startGuest } = useProgress();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(configured ? null : t.chuaCauHinh);
  const [busy, setBusy] = useState(false);

  // Đã đăng nhập (kể cả vừa quay về từ Google) thì quay lại trang trước đó.
  useEffect(() => {
    if (session && !loading) goAfterLogin();
  }, [session, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const name = normalizeUsername(username);
    const bad = validateUsername(name);
    if (!bad.ok) return setError(bad.message);
    const badPw = validatePassword(password);
    if (!badPw.ok) return setError(badPw.message);
    setBusy(true);
    setError(null);
    const r = await signInUsername({ username: name, password });
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    const r = await signInGoogle();
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <AccountPage page="dangNhap">
      <h1 className="text-3xl">{t.dangNhap.tieuDe}</h1>
      <ErrorNote message={error} />

      <Button size="lg" fullWidth disabled={busy} onClick={google}>
        {busy ? t.dangXuLy : t.dangNhap.google}
      </Button>

      <p className="text-center font-semibold text-nau-go-dam">{t.dangNhap.hoac}</p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label={t.dangNhap.tenDangNhap}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Field
          label={t.dangNhap.matKhau}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <Button type="submit" fullWidth disabled={busy}>
          {busy ? t.dangXuLy : t.dangNhap.nut}
        </Button>
      </form>

      <div className="flex flex-col items-start gap-1">
        <Link
          to={next ? `/dang-ky?next=${encodeURIComponent(next)}` : '/dang-ky'}
          className="inline-flex min-h-11 items-center font-semibold underline"
        >
          {t.dangNhap.taoTaiKhoan}
        </Link>
        <button type="button" onClick={() => {
            startGuest();
            goToMap(navigate);
          }}
          className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline">
          {t.dangNhap.choiThu}
        </button>
      </div>
    </AccountPage>
  );
}

