import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AssetImage } from '../../assets/AssetImage';
import { fmt } from '../../content/characters';
import { huongDan } from '../../content/huongDan';
import { ui } from '../../content/ui';
import { MAX_PAGES } from './marketQuest';

export interface MarketHudProps {
  /** Dòng nhiệm vụ đã qua fmt (không kèm chữ "Nhiệm vụ:") */
  quest: string;
  /** Số Trang Sổ Vàng đã có (0 đến 4) */
  pages: number;
  /** Chỉ số ô trang (từ 0) vừa nhận, sáng lên một lúc; bỏ trống thì không có ô nào sáng */
  glow?: number;
  /** Bấm nút menu (máy tính: nhả khóa chuột rồi menu hiện ra; điện thoại: bật menu) */
  onMenu: () => void;
  /** Bấm nút "Hướng dẫn chơi" (dấu ?) cạnh nút menu; bỏ trống thì không có nút */
  onGuide?: () => void;
  /** Bản đồ nhỏ (bước X4): đặt ở góc trên trái, dòng nhiệm vụ nằm ngay dưới */
  map?: ReactNode;
  /** Tự động thu gọn khi đang đứng gần biển chọn màn để không che tên biển */
  nearBoard?: boolean;
}

/**
 * HUD của chợ phiên (spec 04 mục 3 "HUD"): góc trên trái dòng "Nhiệm vụ: …", góc trên phải 4 ô Trang Sổ Vàng (icon \`trang-vang\`; trang chưa có thì mờ) và nút menu. Các phần
 * tử có \`data-walk-ui\` nên bấm vào không bắt đầu kéo camera hay cần điều khiển. Lớp phủ không bắt chuột ngoài các phần tử này.
 */
export function MarketHud({ quest, pages, glow, onMenu, onGuide, map, nearBoard = false }: MarketHudProps) {
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null);

  // Nhiệm vụ mới hoặc vừa lại gần/rời biển: bỏ lựa chọn tay, để cờ nearBoard quyết định
  // (lại gần biển thì tự thu gọn cho khỏi che tên biển, đi xa thì mở lại)
  const prevQuest = useRef(quest);
  const prevNear = useRef(nearBoard);
  useEffect(() => {
    if (prevQuest.current !== quest || prevNear.current !== nearBoard) {
      prevQuest.current = quest;
      prevNear.current = nearBoard;
      setUserCollapsed(null);
    }
  }, [quest, nearBoard]);

  // Trạng thái thu gọn thực tế: ưu tiên lựa chọn của người dùng nếu đã bấm;
  // nếu chưa bấm thì tự thu gọn khi đứng gần biển (nearBoard)
  const isCollapsed = userCollapsed !== null ? userCollapsed : nearBoard;

  return (
    <div data-hud className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2">
      <div className="flex flex-col items-start gap-2">
        {map}
        {isCollapsed ? (
          <button
            type="button"
            data-walk-ui
            data-testid="nut-mo-nhiem-vu"
            onClick={() => setUserCollapsed(false)}
            aria-label={fmt(ui.cho.nhiemVu, { nd: quest })}
            title={ui.cho.moRongNhiemVu}
            className="pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-bang border-2 border-nau-go/60 bg-giay/95 px-3 py-1.5 font-display text-xs font-extrabold text-nau-dam transition-transform hover:bg-vang/30 active:scale-95 focus-visible:outline-2 focus-visible:outline-muc-tim sm:text-sm"
          >
            <span aria-hidden="true" className="pointer-events-none">📜</span>
            <span className="pointer-events-none">{ui.cho.nhiemVuRutGon}</span>
            <span aria-hidden="true" className="pointer-events-none text-[10px] text-nau-go">▼</span>
          </button>
        ) : (
          <div
            data-walk-ui
            data-testid="hud-nhiem-vu"
            className="pointer-events-auto max-w-[min(22rem,54vw)] rounded-bang border-2 border-nau-go/60 bg-giay/95 p-2 sm:p-2.5"
          >
            <div className="mb-1 flex items-center justify-between gap-2 border-b border-nau-go/20 pb-1">
              <span className="flex items-center gap-1 font-display text-xs font-black uppercase tracking-wider text-nau-go">
                <span aria-hidden="true">📜</span>
                {ui.cho.nhiemVuRutGon}
              </span>
              <button
                type="button"
                data-testid="nut-thu-gon-nhiem-vu"
                onClick={() => setUserCollapsed(true)}
                aria-label={ui.cho.thuGonNhiemVu}
                title={ui.cho.thuGonNhiemVu}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-nut border border-nau-go/40 bg-giay px-2 py-0.5 font-display text-xs font-bold text-nau-dam hover:bg-vang/30 active:scale-95 focus-visible:outline-2 focus-visible:outline-muc-tim"
              >
                <span aria-hidden="true" className="pointer-events-none text-[9px]">▲</span>
                <span className="pointer-events-none">{ui.cho.thuGonNhiemVu}</span>
              </button>
            </div>
            <p data-testid="dong-nhiem-vu" role="status" className="font-display text-xs font-extrabold leading-snug text-nau-dam sm:text-sm">
              {quest}
            </p>
          </div>
        )}
      </div>
      <div data-walk-ui className="pointer-events-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 rounded-bang border-2 border-nau-go/60 bg-giay/90 p-1.5 shadow-md">
        <ul className="flex items-center gap-1" aria-label={fmt(ui.moKhoa.trangSoVang, { so: pages, max: MAX_PAGES })}>
          {Array.from({ length: MAX_PAGES }, (_, i) => {
            const got = i < pages;
            return (
              <li
                key={i}
                title={got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
                className={`grid size-9 place-items-center rounded-lg border-2 sm:size-10 ${got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'} ${glow === i ? 'animate-golden-glow' : ''}`}
                data-glow={glow === i ? '1' : undefined}
              >
                <AssetImage path="ui/icons/trang-vang" alt="" className={`size-7 object-contain sm:size-8 ${got ? '' : 'opacity-30 grayscale'}`} />
                <span className="sr-only">
                  {fmt(ui.banDo.trangSo, { so: i + 1 })}: {got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
                </span>
              </li>
            );
          })}
        </ul>
        {onGuide && (
          <button
            type="button"
            onClick={onGuide}
            aria-label={huongDan.nutHud}
            title={huongDan.nutHud}
            data-testid="nut-huong-dan"
            className="min-h-11 min-w-11 cursor-pointer rounded-nut border-2 border-nau-go bg-giay px-2 font-display text-base font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
          >
            {huongDan.kyHieuHud}
          </button>
        )}
        <button
          type="button"
          onClick={onMenu}
          aria-label={ui.cho.nutMenuNhan}
          className="min-h-11 min-w-11 cursor-pointer rounded-nut border-2 border-nau-go bg-giay px-2 font-display text-sm font-extrabold focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-muc-tim"
        >
          {ui.cho.nutMenu}
        </button>
      </div>
    </div>
  );
}
