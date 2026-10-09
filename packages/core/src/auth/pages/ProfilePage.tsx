import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../../ui/Button';
import { PortraitFrame } from '../../ui/PortraitFrame';
import { joinClass, signOut, updateDisplayName } from '../api';
import { useAuth, type Role } from '../AuthProvider';
import { canSeeTeacherPage } from '../roles';
import { loginPathFor } from '../redirect';
import { validateDisplayName } from '../validate';
import { AccountPage, ErrorNote, Field, InfoNote, goToHub, goToMap, t } from './shared';

const ROLE_TEXT: Record<Role, string> = {
  student: t.hoSo.vaiTroHocSinh,
  teacher: t.hoSo.vaiTroGiaoVien,
  admin: t.hoSo.vaiTroQuanTri,
};

export default function ProfilePage() {
  const { session, profile, loading, profileLoading, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile) setName(profile.display_name);
  }, [profile]);

  if (loading) return <AccountPage>{t.dangKiemTra}</AccountPage>;
  // Phải đăng nhập mới vào được: chuyển sang đăng nhập, xong quay lại đây.
  if (!session) return <Navigate to={loginPathFor(location.pathname + location.search)} replace />;
  if (profileLoading) return <AccountPage>{t.dangKiemTra}</AccountPage>;

  const doSignOut = async () => {
    setBusy(true);
    const r = await signOut();
    setBusy(false);
    if (!r.ok) setError(r.message);
  };

  if (!profile) {
    return (
      <AccountPage>
        <ErrorNote message={t.hoSo.khongTaiDuocHoSo} />
        <Button variant="secondary" disabled={busy} onClick={doSignOut}>
          {t.hoSo.dangXuat}
        </Button>
      </AccountPage>
    );
  }

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setInfo(null);
    const v = validateDisplayName(name);
    if (!v.ok) return setError(v.message);
    setBusy(true);
    setError(null);
    const r = await updateDisplayName(profile.id, name);
    if (r.ok) {
      await refreshProfile();
      setInfo(t.hoSo.daLuuTen);
    } else setError(r.message);
    setBusy(false);
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    setInfo(null);
    if (code.trim() === '') return setError(t.kiemTra.maLopRong);
    setBusy(true);
    setError(null);
    const r = await joinClass(code);
    setBusy(false);
    if (r.ok) {
      setCode('');
      setInfo(t.hoSo.daVaoLop);
    } else setError(r.message);
  };

  return (
    <AccountPage>
      <div className="flex items-center gap-4">
        <PortraitFrame portrait="hoc-sinh-nam" size={88} />
        <div className="min-w-0">
          <h1 className="text-2xl">{t.hoSo.tieuDe}</h1>
          {profile.username && (
            <p className="break-words">
              {t.hoSo.tenDangNhap} <strong>{profile.username}</strong>
            </p>
          )}
          <p>
            {t.hoSo.vaiTro} <strong>{ROLE_TEXT[profile.role]}</strong>
          </p>
        </div>
      </div>

      <ErrorNote message={error} />
      <InfoNote message={info} />

      <form onSubmit={saveName} className="space-y-3" noValidate>
        <Field label={t.hoSo.tenHienThi} value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={60} />
        <Button type="submit" size="sm" disabled={busy}>
          {t.hoSo.luuTen}
        </Button>
      </form>

      <form onSubmit={join} className="space-y-3" noValidate>
        <Field
          label={t.hoSo.maLop}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          {t.hoSo.vaoLop}
        </Button>
      </form>

      <div className="flex flex-wrap gap-3 border-t-2 border-nau-go/40 pt-4">
        <Button variant="secondary" size="sm" onClick={() => goToMap(navigate)}>
          {t.veBanDo}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => goToHub(navigate, '/')}>
          {t.veTrangChu}
        </Button>
        {canSeeTeacherPage(profile.role) && (
          <Button variant="secondary" size="sm" onClick={() => goToHub(navigate, '/giao-vien')}>
            {t.trangGiaoVien}
          </Button>
        )}
        <Button variant="danger" size="sm" disabled={busy} onClick={doSignOut}>
          {t.hoSo.dangXuat}
        </Button>
      </div>
    </AccountPage>
  );
}
