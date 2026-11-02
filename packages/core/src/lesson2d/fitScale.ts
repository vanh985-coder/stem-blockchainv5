/**
 * "Vừa khung" cho trang bài học 2D (thay cho phóng cố định `.lesson-zoom`): tính một tỉ lệ để cả nội dung (thanh trên,
 * bảng trạm) nằm gọn trong khung nhìn. Hàm thuần, không import React hay DOM; phần đo DOM nằm ở `useFitScale.ts`.
 *
 * Nội dung được dàn trang ở bề rộng cố định `fitLayoutWidth` (không phụ thuộc tỉ lệ), nên chiều cao tự nhiên đo được
 * không đổi theo tỉ lệ và việc đo không tạo vòng lặp.
 */

/** Tỉ lệ lớn nhất: màn rất rộng cũng không phóng quá mức này. */
export const FIT_SCALE_MAX = 1.6;
/** Tỉ lệ nhỏ nhất tuyệt đối, kể cả khi nội dung không có chữ hay nút nhỏ. */
export const FIT_SCALE_FLOOR = 0.5;
/** Chữ nhỏ nhất sau khi áp tỉ lệ (px CSS). */
export const FIT_MIN_TEXT_PX = 14;
/** Nút và ô kéo thả nhỏ nhất sau khi áp tỉ lệ (px CSS, cạnh ngắn). */
export const FIT_MIN_TARGET_PX = 44;
/** Bề rộng dàn trang tự nhiên tối đa của nội dung (px CSS, trước khi phóng). */
export const FIT_NATURAL_MAX_WIDTH = 1100;
/** Bề rộng dàn trang tối thiểu: dưới mức này (khung rất hẹp) vẫn dàn trang ở mức này rồi cho cuộn ngang bị loại bằng tỉ lệ. */
export const FIT_NATURAL_MIN_WIDTH = 320;
/** Chừa chút chiều cao (px) khi tính tỉ lệ để làm tròn không đẩy trang cuộn dọc vài px. */
export const FIT_HEIGHT_SLACK = 2;
/** Tỉ lệ đổi ít hơn mức này thì giữ cũ (chống giật và vòng lặp đo). */
export const FIT_EPSILON = 0.004;

/** Bề rộng dàn trang (px CSS) trong khung rộng `availW`. */
export function fitLayoutWidth(availW: number): number {
  if (!(availW > 0)) return FIT_NATURAL_MIN_WIDTH;
  return Math.round(Math.max(FIT_NATURAL_MIN_WIDTH, Math.min(availW, FIT_NATURAL_MAX_WIDTH)));
}

/**
 * Số px vật lý trên mỗi px CSS dùng để đo chữ và nút "thực tế": trên máy tính, zoom trình duyệt hay đặt tỉ lệ hiển thị 125%
 * làm 1 px CSS lớn hơn 1 px vật lý nên ngưỡng 14 px và 44 px tính theo px vật lý (zoom 150% vẫn cho thu nhỏ trang). Màn cảm ứng
 * (điện thoại, máy tính bảng) tính theo px CSS vì mật độ điểm ảnh cao không làm chữ to hơn khi nhìn.
 */
export function pixelUnit(devicePixelRatio: number, coarsePointer: boolean): number {
  if (coarsePointer) return 1;
  return Number.isFinite(devicePixelRatio) && devicePixelRatio > 1 ? devicePixelRatio : 1;
}

/**
 * Tỉ lệ tối thiểu để chữ nhỏ nhất ≥ 14 px và nút nhỏ nhất ≥ 44 px, đo ở tỉ lệ 1.
 * Số đo không hợp lệ (0, NaN, vô cực) thì bỏ qua điều kiện đó. Kẹp trong [FIT_SCALE_FLOOR, FIT_SCALE_MAX].
 */
export function minFitScale(minFontPx: number, minTargetPx: number): number {
  const need = (have: number, want: number) => (Number.isFinite(have) && have > 0 ? want / have : 0);
  const m = Math.max(need(minFontPx, FIT_MIN_TEXT_PX), need(minTargetPx, FIT_MIN_TARGET_PX));
  return Math.min(FIT_SCALE_MAX, Math.max(FIT_SCALE_FLOOR, m));
}

export interface FitInput {
  /** Khung chứa (px CSS), đã trừ chỗ dành cho hai khung nhân vật */
  availW: number;
  availH: number;
  /** Kích thước tự nhiên của nội dung ở tỉ lệ 1 (px CSS) */
  naturalW: number;
  naturalH: number;
  /** Tỉ lệ tối thiểu (xem `minFitScale`) */
  minScale: number;
}

export interface FitResult {
  scale: number;
  /** Nội dung cao hơn khung ở tỉ lệ này: trang cuộn dọc */
  scrolls: boolean;
}

/**
 * Tỉ lệ = min(rộng khung / rộng nội dung, cao khung / cao nội dung), kẹp trong [tối thiểu, FIT_SCALE_MAX].
 * Chạm tỉ lệ tối thiểu mà vẫn cao quá thì giữ tối thiểu và để trang cuộn dọc.
 */
export function fitScaleFor({ availW, availH, naturalW, naturalH, minScale }: FitInput): FitResult {
  const lo = Math.min(FIT_SCALE_MAX, Math.max(FIT_SCALE_FLOOR, minScale));
  if (!(availW > 0 && availH > 0 && naturalW > 0 && naturalH > 0)) return { scale: Math.max(lo, 1), scrolls: false };
  const raw = Math.min(availW / naturalW, (availH - FIT_HEIGHT_SLACK) / naturalH);
  const scale = Math.min(FIT_SCALE_MAX, Math.max(lo, raw));
  return { scale, scrolls: naturalH * scale > availH + 1 };
}

/** Giữ tỉ lệ cũ nếu tỉ lệ mới chỉ khác chút ít; ngược lại làm tròn XUỐNG 3 chữ số (không bao giờ vượt mức vừa khung). */
export function settleScale(prev: number | null, next: number): number {
  if (prev !== null && Math.abs(prev - next) < FIT_EPSILON) return prev;
  return Math.floor(next * 1000 + 1e-6) / 1000;
}
