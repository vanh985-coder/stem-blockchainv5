import type { ReactNode } from 'react';
import { ui } from '../content/ui';
import { Panel } from '../ui/Panel';
import type { WalkSession } from './useWalkSession';

/**
 * Lớp phủ của cảnh đi lại (máy tính):
 * - chưa chơi lần nào: chỉ một dòng nhắc nhỏ "Bấm để điều khiển" giữa màn hình, không che cảnh (bấm đâu trên khung cũng khóa chuột);
 * - đã chơi rồi nhả khóa: hộp Menu tạm dừng có dòng "Bấm để chơi tiếp" (điện thoại: nút "Tiếp tục").
 * `hideMenu`: nơi dùng tự vẽ menu riêng (chợ phiên: `MarketMenu`), chỉ giữ dòng nhắc.
 * `children` là các điều khiển thêm trong menu (ví dụ độ nhạy chuột); bấm vào chúng không khóa chuột.
 */
export function WalkLockOverlay({ session, children, title = ui.dungDi.menuTieuDe, description = ui.dungDi.menuMoTa, hideMenu = false }: { session: WalkSession; children?: ReactNode; title?: string; description?: string; hideMenu?: boolean }) {
  const { lockMode, showHint, menuOpen, lock, closeMenu } = session;
  return (
    <>
      {showHint && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-40 flex -translate-y-1/2 justify-center">
          <span className="rounded-nut bg-black/55 px-4 py-2 font-display text-base font-extrabold text-white" role="status">
            {ui.dungDi.baiDeDieuKhien}
          </span>
        </div>
      )}
      {menuOpen && !hideMenu && (
        // Bấm vào đâu ngoài các điều khiển thì khóa chuột lại (trong chính sự kiện bấm này).
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={lockMode ? lock : undefined}>
          <Panel role="dialog" aria-labelledby="walk-menu" className="w-full max-w-sm space-y-3 text-center">
            <h2 id="walk-menu" className="text-2xl">
              {title}
            </h2>
            <p>{description}</p>
            {lockMode ? (
              <button
                type="button"
                autoFocus
                onClick={(e) => {
                  e.stopPropagation();
                  lock();
                }}
                className="min-h-11 w-full cursor-pointer rounded-nut border-2 border-xanh-la-dam bg-xanh-la px-4 font-display text-lg font-extrabold text-white"
              >
                {ui.dungDi.baiDeChoiTiep}
              </button>
            ) : (
              <button type="button" autoFocus onClick={closeMenu} className="min-h-11 cursor-pointer rounded-nut border-2 border-xanh-la-dam bg-xanh-la px-4 font-bold text-white">
                {ui.dungDi.menuTiepTuc}
              </button>
            )}
            {children && (
              <div className="space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                {children}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
