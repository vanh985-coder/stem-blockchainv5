import React, { useEffect, useRef } from 'react';
import { TrangSo } from '../ui/TrangSo';
import { MatXich } from '../ui/MatXich';
import { useProgress } from '../../app/ProgressContext';

export interface ChainPageData {
  content: number | null;
  code: number | null;
  struckContent?: number;
}

export interface ChainStripProps {
  genesisCode: number;
  pages: ChainPageData[];
  firstInvalidIndex: number; // 0-based index of first invalid page, or -1 if none
  activePageIndex: number;   // 0-based index of the page currently in focus / active
  isPageConfirmed?: (index: number) => boolean;
  isPageDimmed?: (index: number) => boolean;
  isPageWillRecalc?: (index: number) => boolean;
  isPageInvalid?: (index: number) => boolean;
  getPageInvalidBadgeText?: (index: number) => string | undefined;
  renderContentSlot?: (index: number) => React.ReactNode;
  renderCodeSlot?: (index: number) => React.ReactNode;
  className?: string;
}

// Component từng trang bọc React.memo để tối ưu re-render
const MemoizedPageItem = React.memo<{
  pageNumber: number;
  content: number | null;
  pageCode: number | null;
  prevCode: number;
  isConfirmed: boolean;
  isInvalid: boolean;
  isDimmed: boolean;
  willRecalc: boolean;
  struckContent?: number;
  contentSlot?: React.ReactNode;
  codeSlot?: React.ReactNode;
  invalidBadgeText?: string;
  isCurrentActive: boolean;
  itemRef?: React.Ref<HTMLDivElement>;
}>(({
  pageNumber,
  content,
  pageCode,
  prevCode,
  isConfirmed,
  isInvalid,
  isDimmed,
  willRecalc,
  struckContent,
  contentSlot,
  codeSlot,
  invalidBadgeText,
  itemRef,
}) => {
  return (
    <div ref={itemRef} className="snap-center shrink-0">
      <TrangSo
        size="xs"
        pageNumber={pageNumber}
        prevCode={prevCode}
        content={content ?? '---'}
        pageCode={pageCode ?? '---'}
        isConfirmed={isConfirmed}
        isInvalid={isInvalid}
        isDimmed={isDimmed}
        willRecalc={willRecalc}
        struckContent={struckContent}
        contentSlot={contentSlot}
        codeSlot={codeSlot}
        invalidBadgeText={invalidBadgeText}
      />
    </div>
  );
});

MemoizedPageItem.displayName = 'MemoizedPageItem';

export const ChainStrip: React.FC<ChainStripProps> = ({
  genesisCode,
  pages,
  firstInvalidIndex,
  activePageIndex,
  isPageConfirmed,
  isPageDimmed,
  isPageWillRecalc,
  isPageInvalid,
  getPageInvalidBadgeText,
  renderContentSlot,
  renderCodeSlot,
  className = '',
}) => {
  const { progress } = useProgress();
  const reducedMotion = progress.settings.reducedMotion;
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Tự cuộn tới trang đang làm
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
  }, [activePageIndex, pages.length, reducedMotion]);

  return (
    <div
      className={`
        w-full overflow-x-auto py-4 px-3 sm:px-6
        flex items-center gap-2 sm:gap-3
        snap-x snap-mandatory scroll-smooth
        ${className}
      `}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* 1. Trang bìa (Genesis) */}
      <div className="snap-center shrink-0">
        <TrangSo
          size="xs"
          isCover={true}
          pageNumber={0}
          content={0}
          pageCode={genesisCode}
          isConfirmed={true}
        />
      </div>

      {/* 2. Dãy các trang kèm mắt xích ở giữa */}
      {pages.map((p, idx) => {
        const pageNumber = idx + 1;
        const prevCode = idx === 0 ? genesisCode : (pages[idx - 1].code ?? 0);

        // Mắt xích bên trái trang idx
        // Quy tắc: MatXich 'broken' nằm ngay bên trái trang lệch đầu tiên
        const isBroken = firstInvalidIndex === idx;
        const isPageValid = isPageConfirmed ? isPageConfirmed(idx) : (p.code !== null && firstInvalidIndex !== idx);
        const chainStatus = isBroken ? 'broken' : isPageValid ? 'valid' : 'neutral';

        const isDimmed = isPageDimmed ? isPageDimmed(idx) : false;
        const willRecalc = isPageWillRecalc ? isPageWillRecalc(idx) : false;
        const isConfirmed = isPageConfirmed ? isPageConfirmed(idx) : false;
        const isInvalid = isPageInvalid ? isPageInvalid(idx) : firstInvalidIndex === idx;
        const invalidBadgeText = getPageInvalidBadgeText ? getPageInvalidBadgeText(idx) : undefined;
        const isCurrentActive = activePageIndex === idx;

        return (
          <React.Fragment key={idx}>
            {/* Mắt xích nối với trang trước */}
            <div className="shrink-0 flex items-center justify-center">
              <MatXich
                size="sm"
                status={chainStatus}
                animateOnChange={!reducedMotion}
              />
            </div>

            {/* Thẻ trang sổ */}
            <MemoizedPageItem
              itemRef={isCurrentActive ? activeRef : undefined}
              pageNumber={pageNumber}
              content={p.content}
              pageCode={p.code}
              prevCode={prevCode}
              isConfirmed={isConfirmed}
              isInvalid={isInvalid}
              isDimmed={isDimmed}
              willRecalc={willRecalc}
              struckContent={p.struckContent}
              contentSlot={renderContentSlot ? renderContentSlot(idx) : undefined}
              codeSlot={renderCodeSlot ? renderCodeSlot(idx) : undefined}
              invalidBadgeText={invalidBadgeText}
              isCurrentActive={isCurrentActive}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
