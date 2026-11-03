import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { fitLayoutWidth, fitScaleFor, minFitScale, pixelUnit, settleScale } from './fitScale';

interface FitState {
  scale: number;
  /** Bề rộng dàn trang của nội dung (px CSS, trước khi phóng) */
  layoutW: number;
  /** Chiều cao chiếm chỗ sau khi phóng (px), hoặc null khi chưa đo */
  boxH: number | null;
}

const INITIAL: FitState = { scale: 1, layoutW: 0, boxH: null };

/** Phần tử hoặc tổ tiên (đến gốc đo) đang có transform (hiệu ứng vào, nhún, thu phóng): cỡ vẽ ra lúc đó chỉ là tạm thời. */
function isTransformed(el: Element, root: Element): boolean {
  for (let a: Element | null = el; a && a !== root; a = a.parentElement) {
    if (getComputedStyle(a).transform !== 'none') return true;
  }
  return false;
}

/** Chữ nhỏ nhất và cạnh ngắn nhỏ nhất của nút/ô kéo thả trong `root`, đo ở tỉ lệ 1 (chia cho tỉ lệ đang áp). */
function scanSmallest(root: HTMLElement, applied: number): { font: number; target: number } {
  let font = Infinity;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || seen.has(el) || !n.nodeValue || n.nodeValue.trim() === '') continue;
    seen.add(el);
    if (el.closest('[aria-hidden="true"], .sr-only, script, style')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px > 0 && px < font) font = px;
  }
  let target = Infinity;
  root.querySelectorAll<HTMLElement>('button, [role="button"], input:not([type="hidden"]), select, textarea').forEach((el) => {
    if (el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || isTransformed(el, root)) return;
    const side = Math.min(r.width, r.height) / applied;
    if (side < target) target = side;
  });
  // Chữ: getComputedStyle trả cỡ chưa nhân tỉ lệ của chính khối được phóng, nên đã là số ở tỉ lệ 1.
  return { font, target };
}

/**
 * Khung "vừa khung" cho trang bài học (spec 03): đo kích thước tự nhiên của nội dung rồi phóng cả khối bằng `zoom` sao cho
 * gọn trong khung nhìn, tỉ lệ nằm trong [tối thiểu, 1,6] (xem `fitScale.ts`). Nội dung dàn trang ở bề rộng cố định theo
 * khung (`fitLayoutWidth`) nên chiều cao đo được không đổi theo tỉ lệ: đo không tạo vòng lặp.
 *
 * Đo lại khi đổi cỡ khung, cỡ cửa sổ, zoom trình duyệt (`visualViewport`) hoặc nội dung đổi cao; mỗi lần đo chỉ gom về một
 * khung hình (rAF) và chỉ cập nhật khi số đổi đáng kể.
 * @param hostRef phần tử cuộn chứa trang (đo khung từ đây)
 * @param reserveX chỗ dành cho hai khung nhân vật (px, cả hai bên cộng lại)
 */
export function FitBox({ hostRef, reserveX, children }: { hostRef: RefObject<HTMLElement | null>; reserveX: number; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<FitState>(INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const raf = useRef(0);

  const measure = useCallback(() => {
    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;
    const availW = host.clientWidth - reserveX;
    const availH = host.clientHeight;
    if (!(availW > 0 && availH > 0)) return;
    const cur = stateRef.current;
    const applied = cur.scale;
    const rect = inner.getBoundingClientRect();
    const naturalH = rect.height / applied;
    const { font, target } = scanSmallest(inner, applied);
    const unit = pixelUnit(window.devicePixelRatio, window.matchMedia?.('(pointer: coarse)').matches ?? false);
    const minScale = minFitScale(font * unit, target * unit);
    // Tỉ lệ tối thiểu lớn hơn 1 (chữ hay nút nhỏ) thì dàn trang hẹp lại bấy nhiêu lần để bề rộng sau phóng vẫn vừa khung.
    const layoutW = fitLayoutWidth(availW / Math.max(1, minScale));
    // Nội dung tràn ngang (rộng hơn bề rộng dàn trang): tính vào bề rộng tự nhiên để tỉ lệ thu nhỏ cho vừa.
    const overflow = inner.clientWidth > 0 ? Math.max(1, inner.scrollWidth / inner.clientWidth) : 1;
    const naturalW = layoutW * overflow;
    const { scale } = fitScaleFor({ availW, availH, naturalW, naturalH, minScale });
    const next = settleScale(cur.layoutW === 0 ? null : applied, scale);
    const boxH = Math.ceil(naturalH * next);
    if (next === cur.scale && layoutW === cur.layoutW && cur.boxH !== null && Math.abs(boxH - cur.boxH) <= 1) return;
    setState({ scale: next, layoutW, boxH });
  }, [hostRef, reserveX]);

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      measure();
    });
  }, [measure]);

  // Đo ngay trước khi vẽ lần đầu để không nháy tỉ lệ 1.
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Sau mỗi lần cập nhật tỉ lệ hoặc bề rộng dàn trang, đo lại một lần để chốt chiều cao thật (một nhịp, không lặp vì số không đổi thì dừng).
  useEffect(() => {
    schedule();
  }, [state.scale, state.layoutW, schedule]);

  useEffect(() => {
    const host = hostRef.current;
    const inner = innerRef.current;
    if (!host || !inner) return;
    const ro = new ResizeObserver(schedule);
    ro.observe(host);
    ro.observe(inner);
    // Hiệu ứng vào/ra của phần tử kết thúc thì đo lại (lúc đang chạy, cỡ vẽ ra chưa phải cỡ thật)
    inner.addEventListener('animationend', schedule, true);
    inner.addEventListener('transitionend', schedule, true);
    window.addEventListener('resize', schedule);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', schedule);
    // Phông chữ tải xong làm đổi cỡ chữ và chiều cao
    void document.fonts?.ready.then(schedule);
    return () => {
      ro.disconnect();
      inner.removeEventListener('animationend', schedule, true);
      inner.removeEventListener('transitionend', schedule, true);
      window.removeEventListener('resize', schedule);
      vv?.removeEventListener('resize', schedule);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [hostRef, schedule]);

  const style: CSSProperties = {
    width: state.layoutW > 0 ? state.layoutW : undefined,
    zoom: state.scale,
    marginInline: 'auto',
    // --lz cho các nơi đã đọc hệ số phóng của trang (khung trang bài học cũ)
    ['--lz' as string]: state.scale,
  };
  return (
    <div data-testid="lesson-fit" data-fit-scale={state.scale} style={state.boxH === null ? undefined : { height: state.boxH }}>
      <div ref={innerRef} className="lesson-fit-inner" style={style}>
        {children}
      </div>
    </div>
  );
}
