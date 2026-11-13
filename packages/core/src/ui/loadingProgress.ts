/** Hàm thuần tính phần trăm của màn chờ chung (`LoadingScreen`). */

/** Phần trăm cao nhất khi chỉ đang chờ (chưa xong): chỗ không đo được tiến độ chạy chậm dần tới đây rồi đứng. */
export const CRAWL_MAX = 90;
/** Phần trăm cao nhất khi có số đo thật mà chưa xong (xong thật mới lên 100%). */
export const MEASURED_MAX = 95;
/** Hằng thời gian của đường chạy chậm (ms): càng lớn càng chậm. */
export const CRAWL_TAU_MS = 6000;
/** Chỗ có số đo vẫn chạy chậm tới mức này để thanh không đứng ở 0% trong lúc chưa có số đo mới. */
export const MEASURED_FLOOR = 30;
/** Hằng thời gian của chuyển động mượt (ms): số hiển thị đuổi theo mục tiêu. */
export const EASE_TAU_MS = 300;

/** Đường chạy chậm theo thời gian đã chờ: 0 lúc đầu, tiến dần tới `CRAWL_MAX` và không bao giờ vượt. */
export function crawlPercent(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  return CRAWL_MAX * (1 - Math.exp(-elapsedMs / CRAWL_TAU_MS));
}

/**
 * Mục tiêu của thanh. Không đo được (`measured` null) thì theo đường chạy chậm. Có số đo thì lấy số đo (kẹp 0 đến `MEASURED_MAX`),
 * nhưng không thấp hơn đường chạy chậm giới hạn ở `MEASURED_FLOOR` (khỏi đứng yên ở 0% khi số đo chưa cập nhật).
 */
export function targetPercent(measured: number | null | undefined, elapsedMs: number): number {
  const crawl = crawlPercent(elapsedMs);
  if (measured === null || measured === undefined || Number.isNaN(measured)) return crawl;
  const m = Math.min(MEASURED_MAX, Math.max(0, measured));
  return Math.max(m, Math.min(crawl, MEASURED_FLOOR));
}

/**
 * Số hiển thị đuổi theo mục tiêu mượt: không bao giờ lùi, không vượt mục tiêu, và mỗi khung hình chỉ nhích một phần (không nhảy thẳng từ 0 lên 100).
 * @param dtMs thời gian giữa hai lần gọi (ms)
 */
export function easePercent(prev: number, target: number, dtMs: number): number {
  if (target <= prev) return prev;
  const next = prev + (target - prev) * (1 - Math.exp(-Math.max(0, dtMs) / EASE_TAU_MS));
  return target - next < 0.05 ? target : next;
}
