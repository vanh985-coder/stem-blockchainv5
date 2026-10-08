import { Link, useNavigate } from 'react-router';
import {
  AssetImage,
  Button,
  Panel,
  VILLAGE_ORDER,
  asset,
  fmt,
  loginPathFor,
  ui,
  useAuth,
  useManifest,
  useProgress,
} from '@so-chung/core';

const linkCls =
  'inline-flex min-h-11 items-center rounded-nut px-2 font-semibold underline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim';

/** Nền ui/man-hinh-tai, hơi mờ, nằm sau nội dung. */
function Background() {
  useManifest();
  const url = asset('ui/man-hinh-tai');
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 bg-giay">
      {url && (
        <div
          className="absolute inset-[-8px] bg-cover bg-center opacity-60 blur-[3px]"
          style={{ backgroundImage: `url("${url}")` }}
        />
      )}
      <div className="absolute inset-0 bg-giay/40" />
    </div>
  );
}

/** Trang chủ "/" (spec 04 mục 1): nhẹ, tải nhanh; nút đổi theo trạng thái đăng nhập. */
export function Home() {
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();
  const { startGuest, goldenPages } = useProgress();
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  return (
    <>
      <Background />
      <main className="grid min-h-screen place-items-center p-4 text-center">
        <Panel className="w-full max-w-md space-y-5">
          <AssetImage path="ui/logo-art" alt="" className="mx-auto h-40 w-auto max-w-full object-contain" />
          <h1 className="text-4xl">{ui.trangChu.tenGame}</h1>
          <p className="text-lg leading-relaxed">{ui.trangChu.gioiThieu}</p>

          <div className="flex min-h-[7.5rem] flex-col items-stretch gap-3" aria-live="polite">
            {!loading && !session && (
              <>
                <Button size="lg" onClick={() => navigate(loginPathFor('/ban-do'))}>
                  {ui.trangChu.dangNhapDeChoi}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    startGuest();
                    navigate('/ban-do');
                  }}
                >
                  {ui.trangChu.choiThu}
                </Button>
              </>
            )}
            {!loading && session && (
              <>
                <p className="font-display text-xl font-extrabold">
                  {fmt(ui.trangChu.chao, { ten: profile?.display_name })}
                </p>
                <p className="flex items-center justify-center gap-2 font-semibold">
                  <AssetImage path="ui/icons/trang-vang" alt="" className="size-8 object-contain" />
                  {fmt(ui.moKhoa.trangSoVang, { so: goldenPages, max: VILLAGE_ORDER.length })}
                </p>
                <Button size="lg" onClick={() => navigate('/ban-do')}>
                  {ui.trangChu.choiTiep}
                </Button>
              </>
            )}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-3">
            <Link to="/truyen" className={linkCls}>
              {ui.trangChu.docTruyen}
            </Link>
            <Link to="/ho-so" className={linkCls}>
              {ui.trangChu.hoSo}
            </Link>
            {isTeacher && (
              <Link to="/giao-vien" className={linkCls}>
                {ui.trangChu.trangGiaoVien}
              </Link>
            )}
            <Link to="/quyen-rieng-tu" className={linkCls}>
              {ui.trangChu.quyenRiengTu}
            </Link>
          </nav>
        </Panel>
      </main>
    </>
  );
}
