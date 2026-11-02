export type TooltipPlacement = 'bottom' | 'top' | 'right' | 'left';

export interface PlacementViewport {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

/** Vùng sáng (đã cộng đệm) theo toạ độ khung nhìn */
export interface PlacementHole {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TooltipPlacementResult {
  placement: TooltipPlacement;
  top: number;
  left: number;
  /** Rộng đặt thẳng cho tooltip (thu hẹp khi đặt cạnh bên mà thiếu chỗ) */
  width: number;
  /** Cao tối đa; thân tooltip cuộn khi nội dung dài hơn */
  maxHeight: number;
  /** false: không hướng nào đủ chỗ, tooltip vẫn có thể đè lên vùng sáng */
  clear: boolean;
}

export interface PlacementInput {
  vp: PlacementViewport;
  hole: PlacementHole | null;
  /** Rộng và cao TỰ NHIÊN của tooltip (không bị kẹp bởi maxHeight hay width của lần trước) */
  width: number;
  height: number;
  /** Vật cản khác (ví dụ thanh nút làm thử của game) mà tooltip không được đè lên, nếu còn hướng khác */
  obstacles?: PlacementHole[];
  margin?: number;
  gap?: number;
}

/** Cao tối thiểu để còn thấy đầu, một dòng thân và nút (đầu + chân ≈ 100px) */
export const TOOLTIP_MIN_HEIGHT = 132;
/** Rộng tối thiểu khi thu hẹp để đặt cạnh bên */
export const TOOLTIP_MIN_WIDTH = 180;
const MAX_HEIGHT = 380;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Candidate {
  placement: TooltipPlacement;
  width: number;
  height: number;
  top: number;
  left: number;
  /** nội dung hiện đủ, không phải cuộn và không bị thu hẹp */
  full: boolean;
}

/**
 * Hàm thuần: chọn chỗ đặt tooltip. Thử 4 hướng quanh vùng sáng, chỉ nhận hướng mà khung tooltip KHÔNG giao vùng sáng.
 * Ưu tiên hướng cho nội dung hiện đủ; không hướng nào đủ thì nhận hướng không giao mà nhiều diện tích nhất (thân cuộn,
 * cạnh bên thì thu hẹp); không hướng nào không giao (vùng sáng quá lớn) thì dán tooltip vào mép khung nhìn có nhiều chỗ nhất,
 * cao tối thiểu, để nút vẫn nằm trong khung nhìn và bấm được.
 */
export function chooseTooltipPlacement({ vp, hole, width, height, obstacles = [], margin = 12, gap = 12 }: PlacementInput): TooltipPlacementResult {
  const fullW = Math.min(width, vp.width - margin * 2);
  const maxH = Math.min(MAX_HEIGHT, vp.height - margin * 2);

  if (!hole) {
    const h = Math.min(height, Math.min(420, vp.height - margin * 2));
    return {
      placement: 'bottom',
      top: vp.offsetTop + Math.max(margin, (vp.height - h) / 2),
      left: vp.offsetLeft + Math.max(margin, (vp.width - fullW) / 2),
      width: fullW,
      maxHeight: Math.min(420, vp.height - margin * 2),
      clear: true,
    };
  }

  const cx = (hole.x1 + hole.x2) / 2;
  const cy = (hole.y1 + hole.y2) / 2;
  const below = vp.height - hole.y2 - gap - margin;
  const above = hole.y1 - gap - margin;
  const toRight = vp.width - hole.x2 - gap - margin;
  const toLeft = hole.x1 - gap - margin;

  const candidates: Candidate[] = [];

  const vertical = (placement: 'bottom' | 'top', space: number) => {
    if (space < TOOLTIP_MIN_HEIGHT) return;
    const h = Math.min(height, space, MAX_HEIGHT);
    const left = clamp(cx - fullW / 2, margin, vp.width - fullW - margin);
    const top = placement === 'bottom' ? hole.y2 + gap : hole.y1 - gap - h;
    candidates.push({ placement, width: fullW, height: h, top, left, full: height <= Math.min(space, MAX_HEIGHT) });
  };

  const sideways = (placement: 'right' | 'left', space: number) => {
    if (space < TOOLTIP_MIN_WIDTH) return;
    const w = Math.min(fullW, space);
    // Hẹp lại thì chữ xuống dòng nhiều hơn: ước lượng cao tỉ lệ nghịch với rộng, rồi để thân cuộn nếu vẫn quá
    const est = w >= fullW ? height : height * (fullW / w);
    const h = Math.min(est, maxH);
    const top = clamp(cy - h / 2, margin, vp.height - h - margin);
    const left = placement === 'right' ? hole.x2 + gap : hole.x1 - gap - w;
    candidates.push({ placement, width: w, height: h, top, left, full: w >= fullW && height <= maxH });
  };

  // Màn ngang thấp: ưu tiên hai bên để khỏi ăn mất chiều cao quý giá
  if (vp.height <= 450) {
    sideways('right', toRight);
    sideways('left', toLeft);
    vertical('bottom', below);
    vertical('top', above);
  } else {
    vertical('bottom', below);
    vertical('top', above);
    sideways('right', toRight);
    sideways('left', toLeft);
  }

  const hits = (c: Candidate, o: PlacementHole) => c.left < o.x2 && c.left + c.width > o.x1 && c.top < o.y2 && c.top + c.height > o.y1;
  const unblocked = candidates.filter((c) => !obstacles.some((o) => hits(c, o)));
  const pool = unblocked.length > 0 ? unblocked : candidates;
  const best = pool.find((c) => c.full) ?? pool.reduce<Candidate | null>((a, c) => (!a || c.width * c.height > a.width * a.height ? c : a), null);

  if (best) {
    return {
      placement: best.placement,
      top: vp.offsetTop + best.top,
      left: vp.offsetLeft + best.left,
      width: best.width,
      maxHeight: Math.max(TOOLTIP_MIN_HEIGHT, Math.floor(best.height)),
      clear: true,
    };
  }

  // Vùng sáng chiếm gần hết khung nhìn: dán vào mép nhiều chỗ nhất, cao tối thiểu; đây là chỗ duy nhất tooltip còn đè lên vùng sáng
  const h = Math.min(height, Math.max(TOOLTIP_MIN_HEIGHT, Math.max(below, above)), maxH);
  const atBottom = below >= above;
  return {
    placement: atBottom ? 'bottom' : 'top',
    top: vp.offsetTop + (atBottom ? vp.height - h - margin : margin),
    left: vp.offsetLeft + clamp(cx - fullW / 2, margin, vp.width - fullW - margin),
    width: fullW,
    maxHeight: Math.floor(h),
    clear: false,
  };
}
