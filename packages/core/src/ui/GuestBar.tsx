import { Link, useLocation } from 'react-router';
import { loginPathFor } from '../auth/redirect';
import { ui } from '../content/ui';
import { useProgress } from '../progress/ProgressProvider';

/** Thanh trên cùng khi chơi thử (chưa đăng nhập): báo tiến độ chỉ lưu trên máy này, kèm nút "Đăng nhập để lưu". */
export function GuestBar() {
  const { mode } = useProgress();
  const here = useLocation();
  if (mode !== 'guest') return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b-4 border-nau-go bg-vang/30 px-4 py-2 text-center font-semibold"
    >
      <span>
        <span aria-hidden="true">⚠ </span>
        {ui.tienDo.choiThu}
      </span>
      <Link
        to={loginPathFor(here.pathname + here.search)}
        className="inline-flex min-h-11 items-center rounded-nut border-2 border-nau-go bg-giay px-3 font-display font-extrabold"
      >
        {ui.tienDo.dangNhapDeLuu}
      </Link>
    </div>
  );
}
