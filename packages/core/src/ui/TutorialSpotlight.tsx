import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
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

    // Cho phép sau 400ms đối với thao tác chuột/chạm
    const timer = setTimeout(() => {
      actionArmedRef.current = true;
    }, 400);

    window.addEventListener('keyup', handleKeyUp);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keyup', handleKeyUp);
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
        const isInView = r.top >= 0 && r.bottom <= window.innerHeight;
        if (!isInView) {
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

  // Lắng nghe scroll, resize để cập nhật spotlight bám sát target
  useEffect(() => {
    if (!isOpen) return;

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });

    // Dùng interval nhẹ hỗ trợ animation trượt/đổi kích thước nếu có
    const interval = setInterval(updateRect, 100);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, { capture: true });
      clearInterval(interval);
    };
  }, [isOpen, updateRect]);

  // Tính toán vị trí hiển thị Tooltip thông minh không che target và không tràn màn hình
  useLayoutEffect(() => {
    if (!isOpen) return;

    const tooltipEl = tooltipRef.current;
    const ttHeight = tooltipEl ? tooltipEl.offsetHeight : 180;
    const ttWidth = tooltipEl ? tooltipEl.offsetWidth : 360;

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (!targetRect) {
      // Khi không có target, đặt tooltip ở trung tâm màn hình
      setTooltipPos({
        top: Math.max(16, (winH - ttHeight) / 2),
        left: Math.max(16, (winW - ttWidth) / 2),
        placement: 'bottom',
      });
      return;
    }

    const pad = padding;
    const spaceBelow = winH - (targetRect.bottom + pad);
    const spaceAbove = targetRect.top - pad;

    let placement: 'top' | 'bottom' = 'bottom';
    // Nếu bên dưới chật mà bên trên rộng hơn thì đặt ở trên
    if (spaceBelow < ttHeight + 20 && spaceAbove > spaceBelow) {
      placement = 'top';
    }

    let top = 0;
    if (placement === 'bottom') {
      top = targetRect.bottom + pad + 12;
    } else {
      top = targetRect.top - pad - ttHeight - 12;
    }

    // Đảm bảo không tràn trên/dưới
    top = Math.max(12, Math.min(winH - ttHeight - 12, top));

    // Căn ngang theo tâm target, đảm bảo cách viền tối thiểu 12px
    let left = targetRect.left + targetRect.width / 2 - ttWidth / 2;
    left = Math.max(12, Math.min(winW - ttWidth - 12, left));

    setTooltipPos({ top, left, placement });
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

  const pad = padding;
  const x1 = targetRect ? Math.max(0, targetRect.left - pad) : 0;
  const y1 = targetRect ? Math.max(0, targetRect.top - pad) : 0;
  const x2 = targetRect ? Math.min(window.innerWidth, targetRect.right + pad) : 0;
  const y2 = targetRect ? Math.min(window.innerHeight, targetRect.bottom + pad) : 0;
  const cutW = Math.max(0, x2 - x1);
  const cutH = Math.max(0, y2 - y1);

  return (
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
              reducedMotion ? '' : 'transition-all duration-200'
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
        className={`fixed z-50 w-full max-w-[min(440px,calc(100vw-24px))] rounded-2xl border-2 border-nau-go/80 bg-giay/98 p-4 text-chu shadow-2xl ${
          reducedMotion ? '' : 'transition-all duration-200'
        }`}
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
      >
        {/* Header tooltip: Huy hiệu bước + Nút Bỏ qua */}
        <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-nau-go/30 pb-2">
          <span
            id="tutorial-step-title"
            className="font-display text-sm font-extrabold uppercase tracking-wide text-muc-tim-dam"
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
            className="text-xs font-semibold text-chu/70 underline-offset-2 hover:text-chu hover:underline focus-visible:outline-2 focus-visible:outline-muc-tim"
          >
            {tutorialTexts.chung.boQua}
          </button>
        </div>

        {/* Nội dung chỉ dẫn */}
        <p className="text-base font-medium leading-relaxed sm:text-lg text-chu-dam">{step?.content}</p>

        {/* Thông báo phản hồi đúng/sai nếu có */}
        {feedbackMessage && (
          <div
            role="status"
            className={`mt-3 rounded-xl border p-2.5 text-sm font-semibold leading-snug ${
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

        {/* Nút hành động ở chân Tooltip */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
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
              onClick={() => {
                if (!actionArmedRef.current) return;
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
}
