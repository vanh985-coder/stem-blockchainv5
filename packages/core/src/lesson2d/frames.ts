/**
 * Hai khung 3D ở trang bài học (spec 03 mục 4): học sinh bên trái, {phanDien} bên phải. Hàm thuần, không import
 * three hay React: quyết định hiện hay ẩn và kích thước khung, dùng ở trang đầu mà không kéo lõi 3D vào.
 */
import type { QualityLevel } from '../three/quality';

/** Chỉ xét hiện khung từ màn hình rộng bấy nhiêu px (spec: từ 1280px; dưới đó bảng giữ cỡ cũ). */
export const MIN_VIEWPORT_WIDTH = 1280;
/**
 * Bề rộng "gốc" của bảng bài học khi chưa phóng (px CSS): thân trang `max-w-4xl` = 896px trừ lề hai bên 2 × 12px.
 * Bảng thật trên màn hình = BOARD_BASE_WIDTH × hệ số phóng `s` (xem `lessonFrameLayout`).
 */
export const BOARD_BASE_WIDTH = 872;
/** Hệ số phóng tối đa của bảng, bằng mức phóng của trang bài học khi không có khung (xem `.lesson-zoom` trong theme.css). */
export const BOARD_ZOOM_MAX = 1.35;
/**
 * s hơi dưới 1 (từ 0,99, tức thiếu chưa tới 9px bề rộng) vẫn dùng 1 để khung có ở màn 1280px kể cả khi có thanh cuộn dọc 17px
 * của Windows; khe giữa khung và bảng chỉ mất vài px.
 */
export const BOARD_ZOOM_TOLERANCE = 0.99;

/** Bề rộng khung f = 14% bề rộng màn hình, kẹp trong khoảng 180 đến 280px. */
export const FRAME_WIDTH_RATIO = 0.14;
export const FRAME_MIN_WIDTH = 180;
export const FRAME_MAX_WIDTH = 280;
/** Chiều cao khung tối đa. */
export const FRAME_MAX_HEIGHT = 420;
/** Mỗi bên bảng chừa f + bấy nhiêu px (khe giữa khung với bảng và với mép màn hình). */
export const FRAME_MARGIN = 16;
/** Khung thấp hơn mức này thì ẩn. */
export const FRAME_MIN_HEIGHT = 240;
/** Mép dưới của khung cách đáy màn hình (px) và chừa chỗ phía trên (px). */
export const FRAME_BOTTOM = 16;
export const FRAME_TOP_RESERVE = 80;

/** Dưới mức FPS này trong 3 giây đầu thì coi là máy yếu: ẩn khung và dọn bộ nhớ (spec 03 mục 4). */
export const LESSON_FPS_MIN = 30;

export function shouldHideForFps(fps: number): boolean {
  return fps < LESSON_FPS_MIN;
}

export interface FrameLayout {
  width: number;
  height: number;
  /** Mép dưới cách đáy màn hình (px) */
  bottom: number;
  /** Khoảng cách từ mép trái màn hình tới khung trái; từ mép phải tới khung phải (px) */
  inset: number;
  /** Hệ số phóng của bảng bài học để chừa chỗ cho khung (từ 1 đến 1,35) */
  zoom: number;
}

/** Bề rộng khung f theo bề rộng màn hình (px, làm tròn). */
export function frameWidthFor(viewportWidth: number): number {
  return Math.round(Math.min(FRAME_MAX_WIDTH, Math.max(FRAME_MIN_WIDTH, viewportWidth * FRAME_WIDTH_RATIO)));
}

/**
 * Hệ số phóng của bảng khi có khung: s = min(1,35, (bề rộng màn − 2 × (f + 16)) / bề rộng gốc của bảng).
 * Nhỏ hơn 1 nghĩa là không đủ chỗ để chừa khung.
 */
export function boardZoomFor(viewportWidth: number, frameWidth: number): number {
  return Math.min(BOARD_ZOOM_MAX, (viewportWidth - 2 * (frameWidth + FRAME_MARGIN)) / BOARD_BASE_WIDTH);
}

/**
 * Bố cục khi có khung: bảng thu nhỏ (hoặc phóng ít hơn 1,35) để chừa chỗ hai bên, mỗi khung nằm giữa khoảng trống của nó.
 * Trả về null (dùng bố cục cũ, không có khung) nếu: màn hẹp hơn 1280px; s < 1 (dung sai 0,99, xem `BOARD_ZOOM_TOLERANCE`); hoặc cửa sổ quá thấp.
 * @param scrollbar bề rộng thanh cuộn dọc (px): bảng căn giữa trong phần còn lại, còn mốc 1280px tính cả thanh cuộn
 */
export function lessonFrameLayout(viewportWidth: number, viewportHeight: number, scrollbar = 0): FrameLayout | null {
  if (!(viewportWidth >= MIN_VIEWPORT_WIDTH)) return null;
  const usable = viewportWidth - Math.max(0, scrollbar);
  const width = frameWidthFor(usable);
  const raw = boardZoomFor(usable, width);
  if (!(raw >= BOARD_ZOOM_TOLERANCE)) return null;
  const zoom = Math.max(1, raw);
  const height = Math.min(FRAME_MAX_HEIGHT, Math.floor(viewportHeight - FRAME_BOTTOM - FRAME_TOP_RESERVE));
  if (height < FRAME_MIN_HEIGHT) return null;
  const gap = (usable - BOARD_BASE_WIDTH * zoom) / 2;
  return { width, height, bottom: FRAME_BOTTOM, inset: Math.round((gap - width) / 2), zoom };
}

export interface FrameVisibilityInput {
  /** Bề rộng cửa sổ gồm cả thanh cuộn (window.innerWidth) */
  viewportWidth: number;
  viewportHeight: number;
  /** Bề rộng thanh cuộn dọc (innerWidth − clientWidth), mặc định 0 */
  scrollbar?: number;
  /** Cài đặt "Giảm chuyển động" */
  reducedMotion: boolean;
  /** Cài đặt "Chữ to": không có khung, bảng giữ cỡ cũ */
  largeText?: boolean;
  /** Mức chất lượng đang dùng (đã tính cài đặt, cấu hình máy và mức trần của phiên) */
  level: QualityLevel;
  /** Đang ở màn không dùng khung (ví dụ cảnh trao Trang Sổ Vàng) */
  suspended?: boolean;
  /** Tải chunk hoặc model bị lỗi */
  failed?: boolean;
  /** FPS dưới ngưỡng trong 3 giây đầu */
  tooSlow?: boolean;
}

/** Máy yếu: mức Thấp (cài đặt Tự động chọn Thấp cho điện thoại và máy yếu, hoặc em tự chọn Thấp). */
export function isWeakDevice(level: QualityLevel): boolean {
  return level === 'low';
}

/**
 * Trang có dành chỗ cho khung (bảng thu nhỏ theo `lessonFrameLayout`) không. Chỉ xét thứ có từ lúc mở trang: cỡ màn hình,
 * "Giảm chuyển động", "Chữ to", máy yếu. KHÔNG xét tải lỗi hay FPS thấp (xảy ra sau): nếu khung bị ẩn về sau thì bố cục
 * giữ nguyên, bảng không nhảy.
 */
export function shouldReserveFrameLayout(i: FrameVisibilityInput): boolean {
  if (i.reducedMotion || i.largeText) return false;
  if (isWeakDevice(i.level)) return false;
  return lessonFrameLayout(i.viewportWidth, i.viewportHeight, i.scrollbar) !== null;
}

/**
 * Có hiện hai khung 3D không. Ẩn khi: không dành chỗ được (màn hẹp, không đủ chỗ, "Giảm chuyển động", "Chữ to", máy yếu);
 * tải lỗi; FPS thấp; hoặc đang ở màn không dùng khung.
 */
export function shouldShowLessonFrames(i: FrameVisibilityInput): boolean {
  if (i.suspended || i.failed || i.tooSlow) return false;
  return shouldReserveFrameLayout(i);
}

/** Chờ bấy nhiêu ms sau khi trang bài học đã hiện (rồi chờ lúc rảnh) mới tải chunk 3D và 2 model. */
export const LOAD_DELAY_MS = 1200;
