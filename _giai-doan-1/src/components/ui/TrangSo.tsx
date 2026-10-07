import React from 'react';
import { formatNumber } from '../../lib/format';

export interface TrangSoProps {
  pageNumber: number;
  content: string | number | React.ReactNode;
  pageCode: string | number;
  prevCode?: string | number;
  isConfirmed?: boolean;
  isInvalid?: boolean;
  isValidating?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  // Props mới cho Bài 1
  isCover?: boolean;
  isDimmed?: boolean;
  willRecalc?: boolean;
  struckContent?: number;
  contentSlot?: React.ReactNode;
  codeSlot?: React.ReactNode;
  invalidBadgeText?: string;
}

export const TrangSo: React.FC<TrangSoProps> = ({
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
}) => {
  const sizeClasses = {
    xs: 'w-[140px] sm:w-[170px] min-h-[245px] p-2 sm:p-2.5 text-xs',
    sm: 'w-[200px] min-h-[260px] p-3 text-xs',
    md: 'w-[260px] min-h-[300px] p-4 text-sm',
    lg: 'w-[320px] min-h-[360px] p-5 text-base',
  };

  const sealSizes = {
    xs: { outer: 'w-12 h-12', inner: 'w-9 h-9' },
    sm: { outer: 'w-14 h-14', inner: 'w-11 h-11' },
    md: { outer: 'w-16 h-16', inner: 'w-13 h-13' },
    lg: { outer: 'w-20 h-20', inner: 'w-16 h-16' },
  };

  // Thứ tự ưu tiên hiển thị: isInvalid (đỏ) > willRecalc (vàng nét đứt) > isConfirmed (đóng dấu) > bình thường
  const statusBorderClass = isInvalid
    ? 'border-[#E5484D] ring-2 ring-[#E5484D]/30'
    : willRecalc
      ? 'border-2 border-dashed border-[#F59E0B] ring-2 ring-[#F59E0B]/20'
      : isConfirmed
        ? 'border-[#1FAF5A]'
        : 'border-[#D5CBFF]';

  const formattedCode =
    typeof pageCode === 'number' ? formatNumber(pageCode) : pageCode;
  const isLongCode = String(formattedCode).length > 2;

  const codeTextClass = isLongCode
    ? size === 'xs'
      ? 'text-xs font-black'
      : size === 'sm'
        ? 'text-sm font-black'
        : size === 'lg'
          ? 'text-xl sm:text-2xl font-black'
          : 'text-base sm:text-lg font-black'
    : size === 'xs'
      ? 'text-base font-black'
      : size === 'sm'
        ? 'text-lg sm:text-xl font-black'
        : size === 'lg'
          ? 'text-2xl sm:text-3xl font-black'
          : 'text-xl sm:text-2xl font-black';

  return (
    <div
      onClick={isInteractive && !isDimmed ? onClick : undefined}
      className={`
        relative rounded-[14px] bg-o-ly-grid border-2 ${statusBorderClass}
        shadow-sticker overflow-hidden select-none transition-all duration-200
        ${sizeClasses[size]}
        ${isDimmed ? 'opacity-[0.45] pointer-events-none' : ''}
        ${isInteractive && !isDimmed ? 'cursor-pointer hover:-translate-y-1 hover:shadow-sticker-lg' : ''}
        ${className}
      `}
    >
      {/* Đường kẻ lề đỏ nhạt thân quen của vở ô ly Việt Nam */}
      <div
        aria-hidden="true"
        className={`absolute top-0 bottom-0 ${size === 'xs' ? 'left-5 sm:left-6' : 'left-7 sm:left-8'} w-[1.5px] bg-[#FFA8AA] z-0 pointer-events-none`}
      />

      {/* Nội dung trang sổ - thụt lề vào trong bên phải đường lề đỏ */}
      <div className={`relative z-10 ${size === 'xs' ? 'pl-5 sm:pl-6' : 'pl-7 sm:pl-8'} flex flex-col justify-between h-full min-h-[240px]`}>
        {/* Tiêu đề trang sổ */}
        <div>
          <div className="flex items-center justify-between flex-wrap gap-1 pb-2 border-b border-[#E9E4FF]">
            <span className="font-display font-bold text-base sm:text-lg text-[#5B3FD6] whitespace-nowrap">
              {isCover ? 'Trang bìa' : `Trang ${pageNumber}`}
            </span>
            {isInvalid ? (
              <span
                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#E5484D]/10 text-[#E5484D] whitespace-nowrap"
                aria-label={invalidBadgeText || 'Sai lệch'}
              >
                {invalidBadgeText || '✗ Sai lệch'}
              </span>
            ) : willRecalc ? (
              <span
                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#F59E0B]/15 text-[#D97706] whitespace-nowrap"
                aria-label="Sẽ phải tính lại"
              >
                Sẽ phải tính lại
              </span>
            ) : isConfirmed ? (
              <span
                className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-[#1FAF5A]/10 text-[#1FAF5A] whitespace-nowrap"
                aria-label="Hợp lệ"
              >
                ✓ Hợp lệ
              </span>
            ) : null}
          </div>

          {/* Ô Mã trang trước (nếu có, và không phải trang bìa) */}
          {!isCover && prevCode !== undefined && (
            <div className="mt-2 p-2 rounded-[10px] bg-white/90 border border-[#E3E0EE]">
              <div className="text-xs font-semibold text-[#6B6485]">
                Mã trang trước
              </div>
              <div className="font-display font-bold text-sm text-[#2A2340] truncate mt-0.5">
                {typeof prevCode === 'number' ? formatNumber(prevCode) : prevCode}
              </div>
            </div>
          )}

          {/* Ô Nội dung ghi trong trang (trang bìa không có ô nội dung) */}
          {!isCover && (
            <div className="mt-2 p-2 sm:p-2.5 rounded-[10px] bg-white/90 border border-[#E3E0EE]">
              <div className="text-xs font-semibold text-[#6B6485]">
                Nội dung
              </div>
              {contentSlot ? (
                <div className="mt-1">{contentSlot}</div>
              ) : struckContent !== undefined ? (
                <div className="flex items-center gap-1.5 min-h-[28px] mt-0.5">
                  <span className="line-through decoration-[#E5484D] decoration-2 text-[#8C827A] font-bold text-sm sm:text-base">
                    {typeof struckContent === 'number' ? formatNumber(struckContent) : struckContent}
                  </span>
                  <span className="font-display font-extrabold text-base sm:text-lg text-[#E5484D]">
                    {typeof content === 'number' ? formatNumber(content) : content}
                  </span>
                </div>
              ) : (
                <div className="font-display font-extrabold text-base sm:text-lg text-[#2A2340] mt-0.5 min-h-[28px] flex items-center">
                  {typeof content === 'number' ? formatNumber(content) : content}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ô Mã trang (phần dưới) */}
        <div className="mt-2">
          <div className="p-2 sm:p-2.5 rounded-[10px] bg-white/90 border border-[#E3E0EE]">
            <div className="text-xs font-semibold text-[#6B6485]">
              Mã trang
            </div>
            {codeSlot ? (
              <div className="mt-1 flex items-center justify-center">
                {codeSlot}
              </div>
            ) : isConfirmed && !isInvalid && !willRecalc ? (
              <div className="flex items-center justify-center py-1">
                <div
                  className={`
                    rounded-full border-2 border-dashed border-[#5B3FD6] bg-[#5B3FD6]/10
                    flex items-center justify-center p-1 pointer-events-none shadow-sm animate-seal-stamp
                    ${sealSizes[size].outer}
                  `}
                >
                  <div
                    className={`
                      rounded-full border border-[#5B3FD6] flex items-center justify-center
                      ${sealSizes[size].inner}
                    `}
                  >
                    <span
                      className={`
                        font-display ${codeTextClass} text-[#5B3FD6] leading-none select-text
                      `}
                    >
                      {isValidating ? (
                        <span className="animate-pulse text-[#6B6485] text-xs">Đang tính...</span>
                      ) : (
                        formattedCode
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`
                  font-display font-extrabold text-[#5B3FD6] flex items-center justify-center
                  ${size === 'xs' ? 'h-12 text-base sm:text-lg' : size === 'sm' ? 'h-14 text-lg sm:text-xl' : size === 'lg' ? 'h-20 text-2xl sm:text-3xl' : 'h-16 text-xl sm:text-2xl'}
                `}
              >
                {isValidating ? (
                  <span className="animate-pulse text-[#6B6485] text-xs">Đang tính...</span>
                ) : (
                  formattedCode
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
