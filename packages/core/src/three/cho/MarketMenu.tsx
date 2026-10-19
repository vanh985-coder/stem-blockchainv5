import { useState } from 'react';
import { useNavigate } from 'react-router';
import { huongDan } from '../../content/huongDan';
import { ui } from '../../content/ui';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import { SettingsPanel } from '../../ui/SettingsPanel';
import type { WalkSession } from '../useWalkSession';

/**
 * Menu thật của chợ phiên (spec 04 mục 3 "Menu"; thay hộp Menu tạm): Tiếp tục; Hồ sơ; Cài đặt (chất lượng, âm thanh, giảm chuyển động, chữ to, độ nhạy chuột);
 * Đọc lại truyện; Bản đồ; Về trang chủ. Hiện khi nhả khóa chuột (Esc, chuyển cửa sổ), khi bấm nút menu ở HUD, hoặc (điện thoại) khi bấm nút menu.
 * Cảnh làng dùng lại với `onGo` (điều hướng sang hub khi đang ở vỏ riêng của làng) và `extraItems` ("Về chợ"). "Tiếp tục" khóa chuột lại ngay trong sự kiện bấm. Bấm vào nền ngoài hộp cũng là tiếp tục (máy tính).
 */
export function MarketMenu({ session, onGo, extraItems = [], onGuide }: { session: WalkSession; onGo?: (path: string) => void; extraItems?: { label: string; onClick: () => void }[]; onGuide?: () => void }) {
  const navigate = useNavigate();
  const [view, setView] = useState<'main' | 'settings'>('main');
  const { lockMode, menuOpen, lock, closeMenu } = session;
  if (!menuOpen) return null;

  const resume = () => {
    setView('main');
    if (lockMode) lock();
    else closeMenu();
  };
  const go = (path: string) => {
    closeMenu();
    if (onGo) onGo(path);
    else navigate(path);
  };

  return (
    // Bấm vào nền (ngoài hộp) thì tiếp tục: ở máy tính xin khóa chuột lại ngay trong chính sự kiện bấm này.
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4" onClick={view === 'main' ? resume : undefined}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm">
        {view === 'main' ? (
          <Panel role="dialog" aria-labelledby="cho-menu" className="space-y-3 text-center">
            <h2 id="cho-menu" className="text-2xl">
              {ui.dungDi.menuTieuDe}
            </h2>
            <div className="flex flex-col gap-2.5">
              <Button autoFocus fullWidth onClick={resume}>
                {ui.cho.menu.tiepTuc}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => go('/ho-so')}>
                {ui.cho.menu.hoSo}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setView('settings')}>
                {ui.cho.menu.caiDat}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => go('/truyen')}>
                {ui.cho.menu.docLaiTruyen}
              </Button>
              <Button variant="secondary" fullWidth onClick={() => go('/ban-do')}>
                {ui.cho.menu.banDo}
              </Button>
              {onGuide && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    closeMenu();
                    onGuide();
                  }}
                >
                  {huongDan.nut}
                </Button>
              )}
              {extraItems.map((it) => (
                <Button key={it.label} variant="secondary" fullWidth onClick={() => { closeMenu(); it.onClick(); }}>
                  {it.label}
                </Button>
              ))}
              <Button variant="secondary" fullWidth onClick={() => go('/')}>
                {ui.cho.menu.veTrangChu}
              </Button>
            </div>
          </Panel>
        ) : (
          <div className="space-y-3">
            <SettingsPanel className="max-w-none" />
            <Button variant="secondary" fullWidth onClick={() => setView('main')}>
              {ui.cho.menu.quayLai}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
