import { Fragment, memo, useEffect, useRef, type ReactNode, type Ref } from 'react';
import { useSettings } from '../settings/SettingsProvider';
import { MatXich } from './MatXich';
import { TrangSo } from './TrangSo';

export interface ChainPageData {
  content: number | null;
  code: number | null;
  struckContent?: number;
}

export interface ChainStripProps {
  genesisCode: number;
  pages: ChainPageData[];
  /** Vị trí (từ 0) của trang lệch đầu tiên, hoặc -1 nếu không có */
  firstInvalidIndex: number;
  /** Trang đang làm: dải tự cuộn tới đây */
  activePageIndex: number;
  isPageConfirmed?: (index: number) => boolean;
  isPageDimmed?: (index: number) => boolean;
  isPageWillRecalc?: (index: number) => boolean;
  isPageInvalid?: (index: number) => boolean;
  getPageInvalidBadgeText?: (index: number) => string | undefined;
  renderContentSlot?: (index: number) => ReactNode;
  renderCodeSlot?: (index: number) => ReactNode;
  /** Vị trí trang vừa được mạng thêm vào (trượt vào từ bên phải) */
  slideInFromIndex?: number;
  className?: string;
}

// Từng trang bọc memo để không vẽ lại cả dải khi chỉ một trang đổi.
const PageItem = memo(function PageItem(props: {
  pageNumber: number;
  content: number | null;
  pageCode: number | null;
  prevCode: number;
  isConfirmed: boolean;
  isInvalid: boolean;
  isDimmed: boolean;
  willRecalc: boolean;
  struckContent?: number;
  contentSlot?: ReactNode;
  codeSlot?: ReactNode;
  invalidBadgeText?: string;
  slideIn: boolean;
  itemRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={props.itemRef} className={`shrink-0 snap-center ${props.slideIn ? 'animate-slide-in-right' : ''}`}>
      <TrangSo
        size="xs"
        pageNumber={props.pageNumber}
        prevCode={props.prevCode}
        content={props.content ?? '---'}
        pageCode={props.pageCode ?? '---'}
        isConfirmed={props.isConfirmed}
        isInvalid={props.isInvalid}
        isDimmed={props.isDimmed}
        willRecalc={props.willRecalc}
        struckContent={props.struckContent}
        contentSlot={props.contentSlot}
        codeSlot={props.codeSlot}
        invalidBadgeText={props.invalidBadgeText}
      />
    </div>
  );
});

/** Dải trang sổ cuộn ngang, kèm mắt xích ở giữa. Tự cuộn tới trang đang làm. */
export function ChainStrip({
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
  slideInFromIndex,
  className = '',
}: ChainStripProps) {
  const { settings } = useSettings();
  const reducedMotion = settings.reducedMotion;
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [activePageIndex, pages.length, reducedMotion]);

  return (
    <div
      className={`flex w-full snap-x snap-mandatory items-center gap-2 overflow-x-auto px-3 py-4 sm:gap-3 sm:px-6 ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="shrink-0 snap-center">
        <TrangSo size="xs" isCover pageNumber={0} content={0} pageCode={genesisCode} isConfirmed />
      </div>

      {pages.map((p, idx) => {
        const prevCode = idx === 0 ? genesisCode : (pages[idx - 1].code ?? 0);
        const isBroken = firstInvalidIndex === idx;
        const valid = isPageConfirmed ? isPageConfirmed(idx) : p.code !== null && firstInvalidIndex !== idx;
        const chainStatus = isBroken ? 'broken' : valid ? 'valid' : 'neutral';
        const active = activePageIndex === idx;

        return (
          <Fragment key={idx}>
            <div className="flex shrink-0 items-center justify-center">
              <MatXich size="sm" status={chainStatus} animateOnChange={!reducedMotion} />
            </div>
            <PageItem
              itemRef={active ? activeRef : undefined}
              pageNumber={idx + 1}
              content={p.content}
              pageCode={p.code}
              prevCode={prevCode}
              isConfirmed={isPageConfirmed ? isPageConfirmed(idx) : false}
              isInvalid={isPageInvalid ? isPageInvalid(idx) : firstInvalidIndex === idx}
              isDimmed={isPageDimmed ? isPageDimmed(idx) : false}
              willRecalc={isPageWillRecalc ? isPageWillRecalc(idx) : false}
              struckContent={p.struckContent}
              contentSlot={renderContentSlot ? renderContentSlot(idx) : undefined}
              codeSlot={renderCodeSlot ? renderCodeSlot(idx) : undefined}
              invalidBadgeText={getPageInvalidBadgeText ? getPageInvalidBadgeText(idx) : undefined}
              slideIn={!reducedMotion && slideInFromIndex !== undefined && idx >= slideInFromIndex}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
