import type { ReactNode } from 'react';
import { fmt } from '../content/characters';
import { ui } from '../content/ui';
import { formatNumber } from '../lib/format';

export interface TrangSoProps {
  pageNumber: number;
  content: string | number | ReactNode;
  pageCode: string | number;
  prevCode?: string | number;
  isConfirmed?: boolean;
  isInvalid?: boolean;
  isValidating?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isCover?: boolean;
  isDimmed?: boolean;
  willRecalc?: boolean;
  /** Nội dung cũ bị gạch bút đỏ (khi có kẻ sửa trộm) */
  struckContent?: number;
  contentSlot?: ReactNode;
  codeSlot?: ReactNode;
  invalidBadgeText?: string;
}

const SIZE_CLASS = {
  xs: 'w-[148px] sm:w-[176px] min-h-[245px] p-2 sm:p-2.5 text-sm',
  sm: 'w-[200px] min-h-[260px] p-3 text-sm',
  md: 'w-[260px] min-h-[300px] p-4 text-base',
  lg: 'w-[320px] min-h-[360px] p-5 text-base',
} as const;

const SEAL = {
  xs: { outer: 'size-12', inner: 'size-9' },
  sm: { outer: 'size-14', inner: 'size-11' },
  md: { outer: 'size-16', inner: 'size-[3.25rem]' },
  lg: { outer: 'size-20', inner: 'size-16' },
} as const;

const num = (v: string | number) => (typeof v === 'number' ? formatNumber(v) : v);

/**
 * Một trang sổ: Mã trang trước, Nội dung, Mã trang (đóng dấu khi đã khớp).
 * Trạng thái phân biệt bằng viền, nhãn chữ và dấu ✓/✗, không chỉ bằng màu.
 */
export function TrangSo({
  pageNumber,
  content,
  pageCode,
  prevCode,
  isConfirmed = false,
  isInvalid = false,
  isValidating = false,
  isInteractive = false,
  onClick,
  className = '',
  size = 'md',
  isCover = false,
  isDimmed = false,
  willRecalc = false,
  struckContent,
  contentSlot,
  codeSlot,
  invalidBadgeText,
}: TrangSoProps) {
  // Ưu tiên hiển thị: sai lệch (đỏ) > sẽ phải tính lại (vàng nét đứt) > đã xác nhận (xanh) > bình thường
  const border = isInvalid
    ? 'border-do-son ring-2 ring-do-son/30'
    : willRecalc
      ? 'border-2 border-dashed border-vang-dam ring-2 ring-vang/30'
      : isConfirmed
        ? 'border-xanh-la-dam'
        : 'border-nau-go/60';

  const formattedCode = typeof pageCode === 'number' ? formatNumber(pageCode) : pageCode;
  const longCode = String(formattedCode).length > 2;
  const codeText = longCode
    ? { xs: 'text-sm', sm: 'text-sm', md: 'text-base sm:text-lg', lg: 'text-xl sm:text-2xl' }[size]
    : { xs: 'text-lg', sm: 'text-lg sm:text-xl', md: 'text-xl sm:text-2xl', lg: 'text-2xl sm:text-3xl' }[size];
  const margin = size === 'xs' ? 'pl-5 sm:pl-6' : 'pl-7 sm:pl-8';
  const marginLine = size === 'xs' ? 'left-5 sm:left-6' : 'left-7 sm:left-8';

  const badge = isInvalid ? (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full bg-do-son/10 px-1.5 py-0.5 text-xs font-bold text-do-son-dam sm:px-2"
      aria-label={invalidBadgeText || ui.trangSo.saiNhan}
    >
      {invalidBadgeText || ui.trangSo.sai}
    </span>
  ) : willRecalc ? (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full bg-vang/25 px-1.5 py-0.5 text-xs font-bold text-nau-go-dam sm:px-2"
      aria-label={ui.trangSo.phaiTinhLai}
    >
      {ui.trangSo.phaiTinhLai}
    </span>
  ) : isConfirmed ? (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full bg-xanh-la/15 px-1.5 py-0.5 text-xs font-bold text-xanh-la-dam sm:px-2"
      aria-label={ui.trangSo.hopLeNhan}
    >
      {ui.trangSo.hopLe}
    </span>
  ) : null;

  return (
    <div
      onClick={isInteractive && !isDimmed ? onClick : undefined}
      className={`
        bg-o-ly-grid relative select-none overflow-hidden rounded-2xl border-2 ${border}
        shadow-[0_3px_0_0_var(--color-nau-go-dam)] transition-all duration-200
        ${SIZE_CLASS[size]}
        ${isDimmed ? 'pointer-events-none opacity-[0.45]' : ''}
        ${isInteractive && !isDimmed ? 'cursor-pointer hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {/* Đường kẻ lề đỏ của vở ô ly */}
      <div aria-hidden="true" className={`pointer-events-none absolute bottom-0 top-0 z-0 w-[1.5px] bg-do-son/40 ${marginLine}`} />

      <div className={`relative z-10 flex h-full min-h-[240px] flex-col justify-between ${margin}`}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-1 border-b border-nau-go/30 pb-2">
            <span className="whitespace-nowrap font-display text-base font-extrabold text-muc-tim-dam sm:text-lg">
              {isCover ? ui.trangSo.bia : fmt(ui.trangSo.trang, { n: pageNumber })}
            </span>
            {badge}
          </div>

          {!isCover && prevCode !== undefined && (
            <div className="mt-2 rounded-xl border border-nau-go/30 bg-white/90 p-2">
              <div className="text-xs font-semibold text-nau-go-dam">{ui.trangSo.maTrangTruoc}</div>
              <div className="mt-0.5 truncate font-display text-sm font-bold">{num(prevCode)}</div>
            </div>
          )}

          {!isCover && (
            <div className="mt-2 rounded-xl border border-nau-go/30 bg-white/90 p-2 sm:p-2.5">
              <div className="text-xs font-semibold text-nau-go-dam">{ui.trangSo.noiDung}</div>
              {contentSlot ? (
                <div className="mt-1">{contentSlot}</div>
              ) : struckContent !== undefined ? (
                <div className="mt-0.5 flex min-h-[28px] items-center gap-1.5">
                  <span className="text-sm font-bold text-nau-go line-through decoration-do-son decoration-2 sm:text-base">
                    {num(struckContent)}
                  </span>
                  <span className="font-display text-base font-extrabold text-do-son-dam sm:text-lg">
                    {typeof content === 'number' ? formatNumber(content) : content}
                  </span>
                </div>
              ) : (
                <div className="mt-0.5 flex min-h-[28px] items-center font-display text-base font-extrabold sm:text-lg">
                  {typeof content === 'number' ? formatNumber(content) : content}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-2">
          <div className="rounded-xl border border-nau-go/30 bg-white/90 p-2 sm:p-2.5">
            <div className="text-xs font-semibold text-nau-go-dam">{ui.trangSo.maTrang}</div>
            {codeSlot ? (
              <div className="mt-1 flex items-center justify-center">{codeSlot}</div>
            ) : isConfirmed && !isInvalid && !willRecalc ? (
              <div className="flex items-center justify-center py-1">
                <div
                  className={`pointer-events-none flex animate-seal-stamp items-center justify-center rounded-full border-2 border-dashed border-muc-tim bg-muc-tim/10 p-1 shadow-sm ${SEAL[size].outer}`}
                >
                  <div className={`flex items-center justify-center rounded-full border border-muc-tim ${SEAL[size].inner}`}>
                    <span className={`select-text font-display font-extrabold leading-none text-muc-tim-dam ${codeText}`}>
                      {isValidating ? <span className="animate-pulse text-xs">{ui.trangSo.dangTinh}</span> : formattedCode}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`flex items-center justify-center font-display font-extrabold text-muc-tim-dam ${
                  size === 'xs' ? 'h-12 text-lg' : size === 'sm' ? 'h-14 text-xl' : size === 'lg' ? 'h-20 text-3xl' : 'h-16 text-2xl'
                }`}
              >
                {isValidating ? <span className="animate-pulse text-xs">{ui.trangSo.dangTinh}</span> : formattedCode}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
