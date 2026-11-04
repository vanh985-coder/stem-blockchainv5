/**
 * Lớp "ghi đè demo" riêng cho nhịp video (`?man=...` mà không có `?day=1`): mỗi màn dài 30 đến 40 giây. Cấu hình và luật game thật KHÔNG đổi: mọi chỗ dùng đi qua `PACING`
 * (null ở bản không demo, hoặc `?day=1`) và `withOverrides` trả lại đúng đối tượng gốc khi không có ghi đè.
 */
import { DEMO_ACTIVE, DEMO_DAY, DEMO_HD, DEMO_MEN } from './config';

export interface VideoPacing {
  /** Nhịp gõ mỗi ký tự (mili giây) */
  typeMs: readonly [number, number];
  /** Thời gian "đọc" một đoạn chữ (mili giây) */
  readMs: readonly [number, number];
  /** Hộp thoại nhân vật: hiện chừng này rồi bấm tiếp */
  dialogMs: number;
  /** Hướng dẫn làm thử: bỏ qua sau chừng này (mili giây) */
  tutorialWatchMs: number;
  /** Các chờ trang trí (xem một lúc cho đẹp) nhân với hệ số này */
  sleepScale: number;
  /** Con trỏ giả di nhanh hơn chừng này lần */
  cursorBoost: number;
  /** Chờ trước khi bấm Bắt đầu (sau khi đọc luật) và các chờ ngắn khác */
  shortWaitMs: number;
  lesson1: {
    /** Số trang trạm Dễ đã điền sẵn (bot chỉ làm các trang còn lại: 1 lượt) */
    easyPrefilled: number;
    /** Trạm Trung bình: trang bị sửa trộm (chỉ số từ 0; 4 là trang cuối nên chỉ sửa 1 trang) */
    tamperIndex: number;
    tamperAnimMs: number;
    /** Trạm Khó */
    hardDurationMs: number;
    /** Mạng sinh trang mới đều mỗi chừng này (mili giây) */
    hardSpawnMs: number;
    /** Khoảng lệch mục tiêu (trang) lúc hết giờ, bot tự giữ trong khoảng này */
    gapMin: number;
    gapMax: number;
    /** Dừng trên khung tổng kết cho thấy khoảng cách (mili giây) */
    gapHoldMs: number;
    /** Bot sửa chậm: nghỉ giữa hai lần sửa (mili giây) và nhịp gõ riêng */
    botPauseMs: number;
    botTypeMs: readonly [number, number];
    /** Bot không dừng sửa trước khi đã sửa ít nhất chừng này trang */
    hardMinFixed: number;
  };
  /** Chỉ video hướng dẫn, bài học (Màn 1, 10): nhịp chậm cho dễ theo dõi */
  hd?: {
    /** Gõ số (mili giây mỗi ký tự) */
    typeMs: readonly [number, number];
    /** Con trỏ chỉ vào các số dùng để tính trước mỗi lần nhập */
    pointMs: readonly [number, number];
    /** Dừng sau khi kiểm tra / biểu quyết để đọc phản hồi */
    afterMs: readonly [number, number];
    /** Một lần kéo lá */
    dragMs: readonly [number, number];
  };
  runner: { rounds: number; roundSec: number };
  whack: { bossCount: number; bossEvery: number; spawnStart: number; spawnEnd: number };
  /** Màn 10: trạm Dễ chỉ 1 cặp, trạm Khó điền sẵn bớt ô (bot chỉ đặt số ô này) */
  man10: { easyQuestions: number; hardPlace: number };
}

export const VIDEO_PACING: VideoPacing = {
  typeMs: [60, 90],
  readMs: [500, 1000],
  dialogMs: 1000,
  tutorialWatchMs: 150,
  sleepScale: 0.1,
  cursorBoost: 2.6,
  shortWaitMs: 400,
  lesson1: {
    easyPrefilled: 4,
    tamperIndex: 4,
    tamperAnimMs: 600,
    hardDurationMs: 4200,
    hardSpawnMs: 330,
    gapMin: 10,
    gapMax: 20,
    gapHoldMs: 2000,
    botPauseMs: 500,
    botTypeMs: [260, 360],
    hardMinFixed: 1,
  },
  runner: { rounds: 1, roundSec: 17 },
  whack: { bossCount: 1, bossEvery: 17, spawnStart: 0.85, spawnEnd: 0.85 },
  man10: { easyQuestions: 1, hardPlace: 1 },
};

/**
 * Nhịp "video hướng dẫn" (`?kieu=huongdan`): ván vẫn ngắn như nhịp video nhưng bot chậm rãi hơn (gõ, đọc, hộp thoại) để người xem theo kịp; phần tua nhanh do `timeScale` lo.
 * Bài học (Màn 1, 10) không tua; trạm Khó của Màn 1 đua 9 giây thật.
 */
export const HD_PACING: VideoPacing = {
  ...VIDEO_PACING,
  typeMs: [110, 150],
  readMs: [1800, 3200],
  dialogMs: 1200,
  sleepScale: 0.3,
  cursorBoost: 3,
  shortWaitMs: 600,
  runner: { rounds: 1, roundSec: 28 },
  // bài học (Màn 1, 10) chạy tốc độ thường, nhiều lượt hơn: Dễ 3 trang, Trung bình sửa 3 trang kéo theo, Khó đua 9 giây thật và sửa ít nhất 3 trang
  lesson1: { ...VIDEO_PACING.lesson1, easyPrefilled: 2, tamperIndex: 2, hardDurationMs: 9000, hardSpawnMs: 640, gapHoldMs: 2000, hardMinFixed: 3 },
  man10: { easyQuestions: 3, hardPlace: 99 },
  hd: { typeMs: [150, 220], pointMs: [1000, 1500], afterMs: [1500, 2000], dragMs: [800, 1200] },
};

/** Hàm thuần: nhịp video khi `on`, ngược lại null. */
export function videoPacing(on: boolean): VideoPacing | null {
  return on ? VIDEO_PACING : null;
}

/** Nhịp video đang dùng: chỉ khi chạy demo ở chế độ danh sách màn và không có `?day=1`. */
export const PACING: VideoPacing | null = DEMO_HD ? HD_PACING : videoPacing(DEMO_ACTIVE && DEMO_MEN !== null && !DEMO_DAY);

/** Chờ trang trí: nhịp video thì rút ngắn, ngoài ra giữ nguyên. */
export const pace = (ms: number): number => (PACING ? Math.round(ms * PACING.sleepScale) : ms);

type Plain = Record<string, unknown>;

/** Trộn sâu `over` vào `base`; `over` null thì trả lại CHÍNH `base` (không sao chép), nên bản không demo giữ nguyên đối tượng và số cũ. */
export function withOverrides<T extends object>(base: T, over: Plain | null | undefined): T {
  if (!over) return base;
  const out: Plain = { ...(base as Plain) };
  for (const [k, v] of Object.entries(over)) {
    const cur = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? withOverrides(cur as object, v as Plain) : v;
  }
  return out as T;
}
