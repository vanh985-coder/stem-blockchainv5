import { Link, Navigate } from 'react-router';
import { Panel, canSeeTeacherPage, ui, useAuth } from '@so-chung/core';

/** Trang tạm /giao-vien (làm ở bước sau). Chưa đăng nhập hoặc là học sinh thì về trang chủ. */
export default function Teacher() {
  const { loading, profileLoading, session, profile } = useAuth();
  if (loading || (session && profileLoading)) return <p className="p-6">{ui.chung.dangTai}</p>;
  if (!session || !canSeeTeacherPage(profile?.role)) return <Navigate to="/" replace />;
  return (
    <main className="grid min-h-screen place-items-center p-4 text-center">
      <Panel className="w-full max-w-md space-y-4">
        <h1 className="text-3xl">{ui.giaoVien.tieuDe}</h1>
        <p className="text-xl font-semibold">{ui.giaoVien.dangLam}</p>
        <Link to="/" className="inline-flex min-h-11 items-center underline">
          {ui.giaoVien.veTrangChu}
        </Link>
      </Panel>
    </main>
  );
}
