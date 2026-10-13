import { AssetImage } from '../../assets/AssetImage';
import { fmt } from '../../content/characters';
import { ui } from '../../content/ui';
import { MAX_PAGES } from './marketQuest';

export interface MarketHudProps {
  /** Dòng nhiệm vụ đã qua fmt (không kèm chữ "Nhiệm vụ:") */
  quest: string;
  /** Số Trang Sổ Vàng đã có (0 đến 4) */
  pages: number;
  /** Bấm nút menu (máy tính: nhả khóa chuột rồi menu hiện ra; điện thoại: bật menu) */
  onMenu: () => void;
}

/**
 * HUD của chợ phiên (spec 04 mục 3 "HUD"): góc trên trái dòng "Nhiệm vụ: …", góc trên phải 4 ô Trang Sổ Vàng (icon \`trang-vang\`; trang chưa có thì mờ) và nút menu. Các phần
 * tử có \`data-walk-ui\` nên bấm vào không bắt đầu kéo camera hay cần điều khiển. Lớp phủ không bắt chuột ngoài các phần tử này.
 */
export function MarketHud({ quest, pages, onMenu }: MarketHudProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2">
      <p data-walk-ui role="status" className="pointer-events-auto max-w-[min(26rem,58vw)] rounded-bang border-2 border-nau-go/60 bg-giay/90 px-3 py-2 font-display text-sm font-extrabold leading-snug shadow-md sm:text-base">
        {fmt(ui.cho.nhiemVu, { nd: quest })}
      </p>
      <div data-walk-ui className="pointer-events-auto flex items-center gap-1.5 rounded-bang border-2 border-nau-go/60 bg-giay/90 p-1.5 shadow-md">
        <ul className="flex items-center gap-1" aria-label={fmt(ui.moKhoa.trangSoVang, { so: pages, max: MAX_PAGES })}>
          {Array.from({ length: MAX_PAGES }, (_, i) => {
            const got = i < pages;
            return (
              <li
                key={i}
                title={got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
                className={`grid size-9 place-items-center rounded-lg border-2 sm:size-10 ${got ? 'border-vang-dam bg-vang/40' : 'border-dashed border-nau-go bg-giay/60'}`}
              >
                <AssetImage path="ui/icons/trang-vang" alt="" className={`size-7 object-contain sm:size-8 ${got ? '' : 'opacity-30 grayscale'}`} />
                <span className="sr-only">
                  {fmt(ui.banDo.trangSo, { so: i + 1 })}: {got ? ui.banDo.trangDaNhan : ui.banDo.trangChuaNhan}
                </span>
              </li>
            );
          })}
        </ul>
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
