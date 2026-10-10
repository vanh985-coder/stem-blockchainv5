import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../../ui/Button';
import { signUpUsername } from '../api';
import { useAuth } from '../AuthProvider';
import { safeNext } from '../redirect';
import { cleanDisplayName, normalizeUsername, validateDisplayName, validatePassword, validateUsername } from '../validate';
import { AccountPage, ErrorNote, Field, t, useGoAfterLogin } from './shared';

export default function RegisterPage() {
  const { session, loading, configured } = useAuth();
  const goAfterLogin = useGoAfterLogin();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(configured ? null : t.chuaCauHinh);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session && !loading) goAfterLogin();
  }, [session, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!agreed) return setError(t.kiemTra.chuaDocQuyenRiengTu);
    const name = normalizeUsername(username);
    for (const r of [validateUsername(name), validateDisplayName(displayName), validatePassword(password)]) {
      if (!r.ok) return setError(r.message);
    }
    if (password !== again) return setError(t.kiemTra.matKhauKhongKhop);
    setBusy(true);
    setError(null);
    const r = await signUpUsername({ username: name, displayName: cleanDisplayName(displayName), password });
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  return (
    <AccountPage page="dangKy">
      <h1 className="text-3xl">{t.dangKy.tieuDe}</h1>
      <ErrorNote message={error} />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field
          label={t.dangKy.tenDangNhap}
          hint={t.dangKy.tenDangNhapGoiY}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <Field
          label={t.dangKy.tenHienThi}
          hint={t.dangKy.tenHienThiGoiY}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="nickname"
          maxLength={60}
        />
        <Field
          label={t.dangKy.matKhau}
          hint={t.dangKy.matKhauGoiY}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <Field
          label={t.dangKy.nhapLai}
          type="password"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          autoComplete="new-password"
        />

        <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" className="size-6 shrink-0" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            {t.dangKy.daDoc}
            <Link to="/quyen-rieng-tu" className="underline">
              {t.dangKy.quyenRiengTu}
            </Link>
          </span>
        </label>

        <Button type="submit" fullWidth disabled={busy || !agreed}>
          {busy ? t.dangXuLy : t.dangKy.nut}
        </Button>
      </form>

      <p className="font-semibold">
        {t.dangKy.daCoTaiKhoan}{' '}
        <Link to={next ? `/dang-nhap?next=${encodeURIComponent(next)}` : '/dang-nhap'} className="inline-flex min-h-11 items-center underline">
          {t.dangKy.dangNhap}
        </Link>
      </p>
    </AccountPage>
  );
}
