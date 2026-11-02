import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useSettings } from '../settings/SettingsProvider';
import { tutorialTexts } from '../content/tutorial';
import { chooseTooltipPlacement } from './tutorialPlacement';
import { allowKeyboardClick, createEnterTracker, trackEnterDown, trackEnterUp } from './enterGuard';

export interface TutorialStep {
  id: string;
  /** CSS selector của phần tử cần focus (ví dụ: '[data-tutorial="code-input"]') */
  targetSelector?: string;
  /** Lời nhắc hướng dẫn ngắn */
  content: string;
  /** Tiêu đề bước */
  title?: string;
  /** Bước này có cho phép người dùng thao tác thật vào target không? */
  interactive?: boolean;
  /** Nhãn nút bấm tiếp tục (mặc định: "Tiếp tục" hoặc "Đã hiểu") */
  nextLabel?: string;
  /** Tự động ẩn nút Tiếp tục khi đang chờ người dùng thao tác thật */
  hideNextButton?: boolean;
}

export interface TutorialActionButton {
  label: string;
  onClick: () => void;
  autoFocus?: boolean;
  variant?: 'primary' | 'secondary';
}

export interface TutorialSpotlightProps {
  isOpen: boolean;
  steps: TutorialStep[];
  currentStepIndex: number;
  onNext?: () => void;
  onPrev?: () => void;
  onSkip: () => void;
  /** Khoảng cách đệm quanh target (mặc định: 8px) */
  padding?: number;
  /** Phản hồi kết quả (nếu có) */
  feedbackMessage?: string;
  feedbackType?: 'success' | 'error' | 'info';
  /** Nút hành động tùy biến ở tooltip */
  actionButton?: TutorialActionButton;
  children?: ReactNode;
}

interface RectState {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export type { TooltipPlacement } from './tutorialPlacement';

interface TooltipPosition {
  top: number;
  left: number;
  /** Rộng đặt thẳng; 0 = để CSS tự quyết (lần đầu, chưa đo) */
  width: number;
  maxAvailableHeight: number;
  /** false: vùng sáng quá lớn, tooltip buộc phải nằm trên nó (khi đó vùng sáng được cắt bỏ phần dưới tooltip) */
  clear: boolean;
}

function getViewportDimensions() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const width = vv ? vv.width : typeof window !== 'undefined' ? window.innerWidth : 1024;
  const height = vv ? vv.height : typeof window !== 'undefined' ? window.innerHeight : 768;
  const offsetLeft = vv ? vv.offsetLeft : 0;
  const offsetTop = vv ? vv.offsetTop : 0;
  return { width, height, offsetLeft, offsetTop };
}

export function TutorialSpotlight({
  isOpen,
  steps,
  currentStepIndex,
  onNext,
  onPrev,
  onSkip,
  padding = 8,
  feedbackMessage,
  feedbackType = 'info',
  actionButton,
  children,
}: TutorialSpotlightProps) {
  const { settings } = useSettings();
  const reducedMotion = settings.reducedMotion;
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    width: 0,
    maxAvailableHeight: 320,
    clear: true,
  });

  const step = steps[currentStepIndex];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);

  // Enter giữ lặp (từ trước khi bước hiện ra, hoặc đang giữ) không được bấm thay mọi nút của tooltip: chỉ lần nhấn MỚI tính
  // (keydown không repeat và đã có keyup trước), giống FeedbackSheet. Chuột, chạm và đọc màn hình (click không do Enter) vẫn ăn ngay.
  const enterRef = useRef(createEnterTracker());
  const actionRef = useRef(actionButton);
  actionRef.current = actionButton;
  const hasAction = Boolean(actionButton);
  useEffect(() => {
    if (!isOpen) return;
    const tracker = enterRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      trackEnterDown(tracker, e);
      // Nút đang focus tự nhận Enter qua click; ở nơi khác thì Enter mới bấm nút hành động (vào bài thật)
      if (!hasAction || !tracker.fresh || e.target instanceof HTMLButtonElement) return;
      tracker.fresh = false;
      e.preventDefault();
      actionRef.current?.onClick();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') trackEnterUp(tracker);
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isOpen, hasAction]);
  // Mỗi bước hay nút mới: lần nhấn Enter còn dở của bước trước không được chuyển sang
  useEffect(() => {
    enterRef.current.fresh = false;
  }, [currentStepIndex, step?.id, actionButton?.label]);
  const guarded = (fn: (() => void) | undefined) => (e: MouseEvent<HTMLButtonElement>) => {
    if (allowKeyboardClick(enterRef.current, e)) fn?.();
  };

  // Tính toán và cập nhật bounding rect của target element
  const updateRect = useCallback(() => {
    if (!isOpen || !step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      setTargetRect(null);
      return;
    }

    // Giữ nguyên đối tượng cũ nếu vị trí không đổi: khỏi tính lại vị trí tooltip mỗi 80 ms
    setTargetRect((prev) =>
      prev && prev.left === r.left && prev.top === r.top && prev.width === r.width && prev.height === r.height
        ? prev
        : { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom },
    );
  }, [isOpen, step?.targetSelector]);

  // Cuộn target vào khung nhìn khi bước thay đổi
  useLayoutEffect(() => {
    if (!isOpen || !step?.targetSelector) return;

    let cancel = false;
    let attempts = 0;

    const findAndScroll = () => {
      if (cancel) return;
      const el = document.querySelector(step.targetSelector!) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        const vp = getViewportDimensions();
        // Kiểm tra xem target có nằm trọn vẹn trong vùng an toàn của viewport không
        const isInSafeView = r.top >= 48 && r.bottom <= vp.height - 48;
        if (!isInSafeView) {
          el.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'center',
          });
        }
        updateRect();
      } else if (attempts < 10) {
        attempts++;
        requestAnimationFrame(findAndScroll);
      }
    };

    findAndScroll();

    return () => {
      cancel = true;
    };
  }, [isOpen, step?.targetSelector, reducedMotion, updateRect]);

  // Lắng nghe scroll, resize, visualViewport để cập nhật spotlight bám sát target
  useEffect(() => {
    if (!isOpen) return;

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateRect, { passive: true });
      vv.addEventListener('scroll', updateRect, { passive: true });
    }

    // Polling nhẹ hỗ trợ animation trượt/đổi kích thước nếu có
    const interval = setInterval(updateRect, 80);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, { capture: true });
      if (vv) {
        vv.removeEventListener('resize', updateRect);
        vv.removeEventListener('scroll', updateRect);
      }
      clearInterval(interval);
    };
  }, [isOpen, updateRect]);

  // Vị trí tooltip: thử 4 hướng, chọn hướng không giao vùng sáng (xem tutorialPlacement.ts)
  useLayoutEffect(() => {
    if (!isOpen) return;

    const tooltipEl = tooltipRef.current;
    // Đo kích thước TỰ NHIÊN: gỡ tạm rộng và cao tối đa của lần trước (nếu đo khi đang bị kẹp thì vị trí sai, tooltip nhảy chỗ và chạm vào nút trượt), đo xong trả lại
    let ttWidth = 360;
    let ttHeight = 180;
    if (tooltipEl) {
      const prevWidth = tooltipEl.style.width;
      const prevMaxHeight = tooltipEl.style.maxHeight;
      tooltipEl.style.width = '';
      tooltipEl.style.maxHeight = 'none';
      ttWidth = tooltipEl.offsetWidth;
      ttHeight = tooltipEl.offsetHeight;
      tooltipEl.style.width = prevWidth;
      tooltipEl.style.maxHeight = prevMaxHeight;
    }

    const pad = padding;
    const hole = targetRect
      ? { x1: targetRect.left - pad, y1: targetRect.top - pad, x2: targetRect.right + pad, y2: targetRect.bottom + pad }
      : null;
    const obstacles = [...document.querySelectorAll<HTMLElement>('[data-tutorial-obstacle]')]
      .map((el) => el.getBoundingClientRect())
      .filter((o) => o.width > 0 && o.height > 0)
      .map((o) => ({ x1: o.left, y1: o.top, x2: o.right, y2: o.bottom }));
    const r = chooseTooltipPlacement({ vp: getViewportDimensions(), hole, width: ttWidth, height: ttHeight, obstacles });
    setTooltipPos((prev) =>
      prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.maxAvailableHeight === r.maxHeight && prev.clear === r.clear
        ? prev
        : { top: r.top, left: r.left, width: r.width, maxAvailableHeight: r.maxHeight, clear: r.clear },
    );
  }, [isOpen, targetRect, padding, step, feedbackMessage]);

  // Focus trap và xử lý phím bấm (Escape, Tab)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
        return;
      }

      if (e.key === 'Tab') {
        const tooltipEl = tooltipRef.current;
        if (!tooltipEl) return;

        // Tập hợp các phần tử focusable: trong tooltip + (nếu interactive thì trong target element)
        const interactiveEl =
          step?.interactive && step.targetSelector ? (document.querySelector(step.targetSelector) as HTMLElement) : null;

        const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]';
        const inTooltip = [...tooltipEl.querySelectorAll<HTMLElement>(selector)];
        const inTarget = interactiveEl ? [...interactiveEl.querySelectorAll<HTMLElement>(selector)] : [];

        // Nếu bản thân interactiveEl là input/button
        if (interactiveEl && interactiveEl.matches(selector) && !inTarget.includes(interactiveEl)) {
          inTarget.unshift(interactiveEl);
        }

        const focusables = [...inTarget, ...inTooltip].filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;

        const active = document.activeElement as HTMLElement;
        const idx = focusables.indexOf(active);

        if (e.shiftKey) {
          if (idx <= 0) {
            e.preventDefault();
            focusables[focusables.length - 1].focus();
          }
        } else {
          if (idx === -1 || idx >= focusables.length - 1) {
            e.preventDefault();
            focusables[0].focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSkip, step]);

  if (!isOpen) return null;

  const vp = getViewportDimensions();
  const pad = padding;
  const x1 = targetRect ? Math.max(0, targetRect.left - pad) : 0;
  let y1 = targetRect ? Math.max(0, targetRect.top - pad) : 0;
  const x2 = targetRect ? Math.min(vp.width, targetRect.right + pad) : 0;
  let y2 = targetRect ? Math.min(vp.height, targetRect.bottom + pad) : 0;
  if (targetRect && !tooltipPos.clear) {
    // Vùng sáng gần kín khung hình: nhường phần tooltip đang đứng, chỉ sáng phần còn lại để tooltip không đè lên vùng sáng
    const ttTop = tooltipPos.top;
    const ttBottom = tooltipPos.top + tooltipPos.maxAvailableHeight;
    if (ttTop + tooltipPos.maxAvailableHeight / 2 > vp.height / 2) y2 = Math.min(y2, ttTop - 8);
    else y1 = Math.max(y1, ttBottom + 8);
  }
  const cutW = Math.max(0, x2 - x1);
  const cutH = Math.max(0, y2 - y1);

  const spotlightContent = (
    <div className="tutorial-spotlight-root" data-testid="tutorial-spotlight">
      {/* 4 khối che phủ tối xung quanh vùng target khoét sáng */}
      {targetRect && cutW > 0 && cutH > 0 ? (
        <>
          {/* Top backdrop */}
          <div
            className="fixed left-0 right-0 top-0 z-40 bg-black/65 transition-opacity"
            style={{ height: y1 }}
            aria-hidden="true"
          />
          {/* Bottom backdrop */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40 bg-black/65 transition-opacity"
            style={{ top: y2 }}
            aria-hidden="true"
          />
          {/* Left backdrop */}
          <div
            className="fixed z-40 bg-black/65 transition-opacity"
            style={{ top: y1, left: 0, width: x1, height: cutH }}
            aria-hidden="true"
          />
          {/* Right backdrop */}
          <div
            className="fixed z-40 bg-black/65 transition-opacity"
            style={{ top: y1, left: x2, right: 0, height: cutH }}
            aria-hidden="true"
          />

          {/* Viền sáng bao quanh vùng target */}
          <div
            className={`fixed z-40 pointer-events-none rounded-xl border-2 border-yellow-400 ring-2 ring-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.6)] ${
              reducedMotion ? '' : 'transition-all duration-150'
            }`}
            style={{
              top: y1,
              left: x1,
              width: cutW,
              height: cutH,
            }}
            aria-hidden="true"
          />

          {/* Nếu bước KHÔNG cho phép tương tác với target, che một lớp trong suốt để tránh click ngoài ý muốn */}
          {!step?.interactive && (
            <div
              className="fixed z-40 bg-transparent cursor-default"
              style={{
                top: y1,
                left: x1,
                width: cutW,
                height: cutH,
              }}
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        /* Toàn màn hình nếu chưa có target */
        <div className="fixed inset-0 z-40 bg-black/65" aria-hidden="true" />
      )}

      {/* Tooltip đặt cạnh vùng focus */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-step-title"
        data-testid="tutorial-tooltip"
        // KHÔNG có transition ở top/left/max-height: tooltip đổi chỗ khi sang bước khác, nếu trượt 150 ms thì nút đang chạm bị dời khỏi ngón tay (chạm trượt)
        className="fixed z-50 flex flex-col w-full max-w-[min(440px,calc(100vw-24px))] rounded-2xl border-2 border-nau-go/80 bg-giay/98 p-3.5 sm:p-4 text-chu shadow-2xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          maxHeight: tooltipPos.maxAvailableHeight ? `${tooltipPos.maxAvailableHeight}px` : 'calc(100vh - 24px)',
          ...(tooltipPos.width > 0 ? { width: `${tooltipPos.width}px` } : {}),
        }}
      >
        {/* Header tooltip: Huy hiệu bước + Nút Bỏ qua (shrink-0) */}
        <div className="shrink-0 mb-2 flex items-center justify-between gap-2 border-b border-nau-go/30 pb-1.5">
          <span
            id="tutorial-step-title"
            className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-wide text-muc-tim-dam truncate"
          >
            {step?.title ||
              tutorialTexts.chung.buoc
                .replace('{current}', String(currentStepIndex + 1))
                .replace('{total}', String(steps.length))}
          </span>

          <button
            ref={skipBtnRef}
            type="button"
            onClick={guarded(onSkip)}
            className="shrink-0 text-xs font-semibold text-chu/70 underline-offset-2 hover:text-chu hover:underline focus-visible:outline-2 focus-visible:outline-muc-tim"
          >
            {tutorialTexts.chung.boQua}
          </button>
        </div>

        {/* Nội dung chỉ dẫn và thông báo: cuộn được nếu màn hình hẹp hoặc nội dung dài */}
        <div data-tooltip-body className="overflow-y-auto flex-1 min-h-0 pr-1 space-y-2">
          <p className="text-sm sm:text-base font-medium leading-relaxed text-chu-dam">{step?.content}</p>

          {feedbackMessage && (
            <div
              role="status"
              className={`rounded-xl border p-2 text-xs sm:text-sm font-semibold leading-snug ${
                feedbackType === 'success'
                  ? 'border-xanh-la-dam/60 bg-xanh-la/15 text-xanh-la-dam'
                  : feedbackType === 'error'
                    ? 'border-do-son/60 bg-do-son/15 text-do-son'
                    : 'border-muc-tim/40 bg-muc-tim/10 text-muc-tim-dam'
              }`}
            >
              {feedbackMessage}
            </div>
          )}
        </div>

        {/* Nút hành động ở chân Tooltip (shrink-0): luôn cố định ở footer tooltip, không bao giờ bị tràn */}
        <div className="shrink-0 mt-2.5 pt-2 border-t border-nau-go/20 flex flex-wrap items-center justify-end gap-2">
          {onPrev && currentStepIndex > 0 && !actionButton && (
            <Button size="sm" variant="secondary" onClick={guarded(onPrev)}>
              {tutorialTexts.chung.quayLai}
            </Button>
          )}
          {actionButton ? (
            <Button
              size="sm"
              variant={actionButton.variant || 'primary'}
              autoFocus={false}
              onClick={guarded(actionButton.onClick)}
            >
              {actionButton.label}
            </Button>
          ) : !step?.hideNextButton ? (
            <Button size="sm" variant="primary" onClick={guarded(onNext)}>
              {step?.nextLabel || tutorialTexts.chung.tiep}
            </Button>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );

  // Khi có document.body (chạy trên trình duyệt), mount ra trực tiếp document.body qua createPortal
  // để cách ly 100% khỏi CSS zoom hoặc transform của container mẹ. Khi SSR / không có DOM, trả về trực tiếp.
  if (typeof document !== 'undefined' && document.body) {
    return createPortal(spotlightContent, document.body);
  }

  return spotlightContent;
}
