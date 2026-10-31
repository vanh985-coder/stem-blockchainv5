import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useSettings } from '../settings/SettingsProvider';
import { tutorialTexts } from '../content/tutorial';

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

export type TooltipPlacement = 'bottom' | 'top' | 'right' | 'left';

interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
  maxAvailableHeight: number;
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
    placement: 'bottom',
    maxAvailableHeight: 320,
  });

  const step = steps[currentStepIndex];
  const tooltipRef = useRef<HTMLDivElement>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);

  // Xử lý chu kỳ phím Enter chống kích hoạt đúp chuyển tiếp / bắt đầu bài thật
  const actionArmedRef = useRef(false);
  useEffect(() => {
    if (!actionButton) {
      actionArmedRef.current = false;
      return;
    }

    actionArmedRef.current = false;
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        actionArmedRef.current = true;
      }
    };

    // Cho phép sau 400ms đối với thao tác bàn phím nếu phím Enter đã nhả
    const timer = setTimeout(() => {
      actionArmedRef.current = true;
    }, 400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && actionArmedRef.current) {
        e.preventDefault();
        actionButton.onClick();
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionButton]);

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

    setTargetRect({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
    });
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

  // Tính toán vị trí hiển thị Tooltip thông minh: 4 hướng (bottom, top, right, left), không che target và không tràn màn hình
  useLayoutEffect(() => {
    if (!isOpen) return;

    const tooltipEl = tooltipRef.current;
    const ttHeight = tooltipEl ? tooltipEl.offsetHeight : 180;
    const ttWidth = tooltipEl ? tooltipEl.offsetWidth : 360;

    const vp = getViewportDimensions();
    const margin = 12;
    const gap = 12;

    if (!targetRect) {
      // Khi không có target, đặt tooltip ở trung tâm màn hình, giới hạn maxAvailableHeight
      const maxAvailableHeight = Math.min(420, vp.height - margin * 2);
      setTooltipPos({
        top: vp.offsetTop + Math.max(margin, (vp.height - ttHeight) / 2),
        left: vp.offsetLeft + Math.max(margin, (vp.width - ttWidth) / 2),
        placement: 'bottom',
        maxAvailableHeight,
      });
      return;
    }

    const pad = padding;
    const x1 = targetRect.left - pad;
    const y1 = targetRect.top - pad;
    const x2 = targetRect.right + pad;
    const y2 = targetRect.bottom + pad;

    // Khoảng trống ở 4 phía
    const spaceBelow = vp.height - y2 - gap - margin;
    const spaceAbove = y1 - gap - margin;
    const spaceRight = vp.width - x2 - gap - margin;
    const spaceLeft = x1 - gap - margin;

    let placement: TooltipPlacement = 'bottom';
    let maxAvailableHeight = 320;

    // 1. Nếu màn hình ngang rất thấp (chiều cao <= 450px)
    if (vp.height <= 450) {
      if (spaceRight >= 240 && spaceRight >= spaceLeft) {
        placement = 'right';
      } else if (spaceLeft >= 240) {
        placement = 'left';
      } else if (spaceBelow >= spaceAbove) {
        placement = 'bottom';
      } else {
        placement = 'top';
      }
    } else {
      // 2. Màn hình bình thường: ưu tiên bottom nếu đủ chỗ
      if (spaceBelow >= ttHeight + 8) {
        placement = 'bottom';
      } else if (spaceAbove >= ttHeight + 8) {
        placement = 'top';
      } else if (spaceRight >= 260 && spaceRight >= spaceLeft) {
        placement = 'right';
      } else if (spaceLeft >= 260) {
        placement = 'left';
      } else if (spaceBelow >= spaceAbove) {
        placement = 'bottom';
      } else {
        placement = 'top';
      }
    }

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = y2 + gap + vp.offsetTop;
      left = targetRect.left + (targetRect.width - ttWidth) / 2 + vp.offsetLeft;
      maxAvailableHeight = Math.min(380, Math.max(140, vp.height - (y2 + gap) - margin));
    } else if (placement === 'top') {
      top = y1 - gap - ttHeight + vp.offsetTop;
      left = targetRect.left + (targetRect.width - ttWidth) / 2 + vp.offsetLeft;
      maxAvailableHeight = Math.min(380, Math.max(140, y1 - gap - margin));
    } else if (placement === 'right') {
      left = x2 + gap + vp.offsetLeft;
      top = targetRect.top + (targetRect.height - ttHeight) / 2 + vp.offsetTop;
      maxAvailableHeight = Math.min(380, vp.height - margin * 2);
    } else {
      // placement === 'left'
      left = x1 - gap - ttWidth + vp.offsetLeft;
      top = targetRect.top + (targetRect.height - ttHeight) / 2 + vp.offsetTop;
      maxAvailableHeight = Math.min(380, vp.height - margin * 2);
    }

    // Đảm bảo không tràn viewport theo cả 2 trục
    const effectiveHeight = Math.min(ttHeight, maxAvailableHeight);
    top = Math.max(margin + vp.offsetTop, Math.min(vp.offsetTop + vp.height - effectiveHeight - margin, top));
    left = Math.max(margin + vp.offsetLeft, Math.min(vp.offsetLeft + vp.width - ttWidth - margin, left));

    setTooltipPos({ top, left, placement, maxAvailableHeight });
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
  const y1 = targetRect ? Math.max(0, targetRect.top - pad) : 0;
  const x2 = targetRect ? Math.min(vp.width, targetRect.right + pad) : 0;
  const y2 = targetRect ? Math.min(vp.height, targetRect.bottom + pad) : 0;
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
        className={`fixed z-50 flex flex-col w-full max-w-[min(440px,calc(100vw-24px))] rounded-2xl border-2 border-nau-go/80 bg-giay/98 p-3.5 sm:p-4 text-chu shadow-2xl ${
          reducedMotion ? '' : 'transition-all duration-150'
        }`}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          maxHeight: tooltipPos.maxAvailableHeight ? `${tooltipPos.maxAvailableHeight}px` : 'calc(100vh - 24px)',
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
            onClick={onSkip}
            className="shrink-0 text-xs font-semibold text-chu/70 underline-offset-2 hover:text-chu hover:underline focus-visible:outline-2 focus-visible:outline-muc-tim"
          >
            {tutorialTexts.chung.boQua}
          </button>
        </div>

        {/* Nội dung chỉ dẫn và thông báo: cuộn được nếu màn hình hẹp hoặc nội dung dài */}
        <div className="overflow-y-auto flex-1 min-h-0 pr-1 space-y-2">
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
            <Button size="sm" variant="secondary" onClick={onPrev}>
              {tutorialTexts.chung.quayLai}
            </Button>
          )}
          {actionButton ? (
            <Button
              size="sm"
              variant={actionButton.variant || 'primary'}
              autoFocus={false}
              onClick={(e) => {
                if (e.detail === 0 && !actionArmedRef.current) return;
                actionButton.onClick();
              }}
            >
              {actionButton.label}
            </Button>
          ) : !step?.hideNextButton ? (
            <Button size="sm" variant="primary" onClick={onNext}>
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
