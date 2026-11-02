/**
 * Bố cục cảnh màn 12 "Leo bậc gỗ" trên Scene25D (hàm thuần, không import three). Đơn vị thế giới như Scene25D: khung dọc 9 × 16, khung ngang 16 × 9, gốc ở tâm khung, y hướng lên.
 * Toạ độ trong hệ của cây (cùng hệ với `climbLogic`: y là độ cao mặt bậc, tầng 0 ở y = 0); camera đi theo bằng cách dời cả cây xuống (`cameraY`).
 * Thân cây ở x = 0; bậc gỗ nằm trước thân. Khung ngang thì cây ở giữa, hai bên là trời.
 */
import { CLIMB_SPEC } from './climbConfig';
import { tierY } from './climbLogic';

export type ClimbFrame = 'portrait' | 'landscape';

export const WORLD: Record<ClimbFrame, { width: number; height: number }> = {
  portrait: { width: 9, height: 16 },
  landscape: { width: 16, height: 9 },
};

/** Bậc gỗ: bề rộng theo luật, dày `height` (mặt bậc ở y của tầng, thân bậc nằm dưới). */
export const STEP = { width: CLIMB_SPEC.stepWidth, height: 0.8 } as const;
export const stepCenterY = (surfaceY: number): number => surfaceY - STEP.height / 2;
/**
 * Ảnh `bac-go` và `bac-go-nut` (khung 1,7 × 0,8 như bậc): dây treo ở nửa trên, ván gỗ nằm từ 48% đến 80% chiều cao ảnh (đo từ ảnh gốc). Mặt trên ván phải trùng mặt đứng
 * của bậc (chỗ chân em chạm), nên khi dùng ảnh thì dịch hình lên `stepLift` đơn vị; số ghi giữa ván (`plankMid`, hơi thấp để chân em đứng trên ván ít che số). Chỗ đứng và vùng va chạm không đổi.
 */
export const STEP_ART = { plankTop: 0.48, plankBottom: 0.795, plankMid: 0.65 } as const;
export const stepLift = (): number => STEP_ART.plankTop * STEP.height;

/** Nhân vật cao 1,9 đơn vị: đầu cách đáy bậc tầng trên 0,3 khi đứng thẳng. */
export const PLAYER = { height: 1.9 } as const;
/** {phanDien} ngồi trên ngọn cây. */
export const VILLAIN = { height: 1.7 } as const;

/** Thân cây ghép từ các khúc `than-cay` (đã cắt bỏ đầu tròn): rộng 1,0, mỗi khúc cao theo tỉ lệ ảnh. */
export const TRUNK = { width: 1.0, tile: 1.73 } as const;
/** Gốc cây (dưới cùng) và ngọn cây (trên cùng). */
export const ROOT = { width: 5.2, height: 3.3 } as const;
export const CROWN = { width: 7.4, height: 4.9 } as const;
export const rootY = (): number => tierY(0) - STEP.height - ROOT.height / 2 + 0.55;
export const crownY = (depth: number): number => tierY(depth) + 1.6;
/** Biển khắc "Gốc trong sổ" trên thân, ngay trên đầu người đứng ở gốc. */
export const SIGN = { width: 3.6, height: 1.15 } as const;
export const signY = (depth: number): number => tierY(depth) + PLAYER.height + 0.55 + SIGN.height / 2;
/** Chỗ {phanDien} ngồi (chân) và chiếc lá giả ôm trong tay. */
export const villainY = (depth: number): number => signY(depth) + SIGN.height / 2 + 0.35;
export const LEAF_FAKE = { size: 0.9 } as const;

/** Khúc thân, từ trên gốc tới chân ngọn. */
export function trunkTiles(depth: number): number[] {
  const from = rootY() + ROOT.height / 2 - 0.4;
  const to = crownY(depth) - CROWN.height / 2 + 0.6;
  const out: number[] = [];
  for (let y = from + TRUNK.tile / 2; y - TRUNK.tile / 2 < to; y += TRUNK.tile * 0.98) out.push(y);
  return out;
}

/** Camera nhìn tầng em đang đứng: khung dọc thấy nhiều tầng phía trên; khung ngang chật hơn nên người đứng thấp hơn tâm ít hơn. */
export function cameraY(frame: ClimbFrame, level: number): number {
  return tierY(level) + (frame === 'portrait' ? 3.4 : 1.6);
}

/** Cắt ảnh theo khung có hình (u0, u1, v0, v1 theo tọa độ ảnh: v = 0 ở trên). */
export const CROPS = {
  trunk: { u0: 0.4, u1: 0.6, v0: 0.2, v1: 0.82 },
  root: { u0: 0.172, u1: 0.851, v0: 0.129, v1: 0.904 },
  crown: { u0: 0.215, u1: 0.769, v0: 0.152, v1: 0.841 },
} as const;

/** Số điểm ảnh CSS của một đơn vị thế giới khi khung rộng `framePx` điểm ảnh. */
export const pxPerUnit = (frame: ClimbFrame, framePx: number): number => framePx / WORLD[frame].width;

/** Cỡ chữ số trên bậc nhỏ nhất (px CSS); "Chữ to" nhân 1,15. */
export const MIN_LABEL_PX = 16;
export const LARGE_TEXT_SCALE = 1.15;

/**
 * Cỡ chữ số trên bậc (px CSS): chữ chiếm khoảng 62% chiều cao bậc (ván vẽ bằng code phủ kín khung) hay 1,2 lần bề dày tấm ván của ảnh `bac-go` (`onPlank`: ván mỏng, chữ quá lớn thì chân em che mất số), không dưới 16 (Chữ to: 18,4);
 * rồi thu cho vừa bề rộng chuỗi dài nhất (`widthAt1px`: bề rộng chuỗi ở cỡ 1 px) nhưng vẫn không dưới 16.
 */
export function labelFontPx(ppu: number, largeText: boolean, widthAt1px: number, onPlank = false): number {
  const k = largeText ? LARGE_TEXT_SCALE : 1;
  const ratio = onPlank ? (STEP_ART.plankBottom - STEP_ART.plankTop) * 1.2 : 0.62;
  const want = Math.max(MIN_LABEL_PX * k, STEP.height * ppu * ratio);
  const fitW = (STEP.width * ppu * 0.9) / Math.max(widthAt1px, 1e-6);
  return Math.max(MIN_LABEL_PX, Math.min(want, fitW));
}

/** Chọn khung theo kích thước màn hình: cao hơn rộng thì dọc. */
export const frameOf = (width: number, height: number): ClimbFrame => (height > width ? 'portrait' : 'landscape');

/** Độ trong suốt của bậc sai đang nứt: giữ rõ rồi mờ dần trong `crackSeconds` giây còn lại. */
export function crackAlpha(left: number): number {
  const total = CLIMB_SPEC.crackSeconds;
  return Math.max(0, Math.min(1, left / total));
}
