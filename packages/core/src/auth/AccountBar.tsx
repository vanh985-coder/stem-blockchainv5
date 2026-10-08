import { Link, useLocation } from 'react-router';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { useAuth } from './AuthProvider';
import { loginPathFor } from './redirect';

/** Dòng nhỏ cho các trang tạm: "Đăng nhập" hoặc "Chào <tên>" kèm liên kết Hồ sơ. */
export function AccountBar({ className = '' }: { className?: string }) {
  const { session, profile, loading } = useAuth();
  const here = useLocation();
  if (loading) return null;
  const linkCls = 'inline-flex min-h-11 items-center font-semibold underline';
  return (
    <p className={['flex flex-wrap items-center justify-center gap-x-4', className].join(' ')}>
      {session ? (
        <>
          <span>{fmt(ui.auth.thanh.chao, { ten: profile?.display_name })}</span>
          <Link to="/ho-so" className={linkCls}>
            {ui.auth.thanh.hoSo}
          </Link>
        </>
      ) : (
        <Link to={loginPathFor(here.pathname + here.search)} className={linkCls}>
          {ui.auth.thanh.dangNhap}
        </Link>
      )}
    </p>
  );
}
