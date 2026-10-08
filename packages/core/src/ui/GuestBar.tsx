import { Link, useLocation } from 'react-router';
import { loginPathFor } from '../auth/redirect';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';

/**
 * Thanh trên cùng khi chơi thử (chưa đăng nhập): báo tiến độ chỉ lưu trên máy này, kèm nút "Đăng nhập để lưu".
 * `compact`: ở màn hình hẹp (dưới 480px) chỉ còn một dòng, chữ ngắn và nút ngắn.
 */
export function GuestBar({ compact = false }: { compact?: boolean }) {
  const { mode } = useProgress();
  const here = useLocation();
  if (mode !== 'guest') return null;
  const wrap = compact
    ? 'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b-4 border-nau-go bg-vang/30 px-4 py-2 text-center font-semibold max-[480px]:flex-nowrap max-[480px]:justify-between max-[480px]:gap-2 max-[480px]:border-b-2 max-[480px]:px-2 max-[480px]:py-0.5 max-[480px]:text-sm'
    : 'flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b-4 border-nau-go bg-vang/30 px-4 py-2 text-center font-semibold';
  return (
    <div role="status" className={wrap}>
      <span>
        <span aria-hidden="true">⚠ </span>
        {compact ? (
          <>
            <span className="max-[480px]:hidden">{ui.tienDo.choiThu}</span>
            <span className="hidden max-[480px]:inline">{ui.tienDo.choiThuNgan}</span>
          </>
        ) : (
          ui.tienDo.choiThu
        )}
      </span>
      <Link
        to={loginPathFor(here.pathname + here.search)}
        className="inline-flex min-h-11 items-center rounded-nut border-2 border-nau-go bg-giay px-3 font-display font-extrabold"
      >
        {compact ? (
          <>
            <span className="max-[480px]:hidden">{ui.tienDo.dangNhapDeLuu}</span>
            <span className="hidden max-[480px]:inline">{ui.tienDo.dangNhapNgan}</span>
          </>
        ) : (
          ui.tienDo.dangNhapDeLuu
        )}
      </Link>
    </div>
  );
}
