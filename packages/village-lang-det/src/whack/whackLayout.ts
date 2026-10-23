/**
 * Bố cục cảnh màn 5 (hàm thuần, không import three; như `climbLayout.ts` của màn 12). Đơn vị thế giới của Scene25D: khung ngang 16 × 9, gốc ở tâm, y hướng lên. Khung luôn là 16:9 dù cửa sổ tỉ lệ nào
 * (dải đen hai bên hay trên dưới), nên chỉ phần HUD (cỡ cố định theo điểm ảnh CSS) đổi theo cỡ khung.
 *
 * Luật bố cục (sửa sau B7): học sinh, cô Chi, {phanDien} lúc đứng chờ và HUD KHÔNG che 4 vùng đập và đoạn làn ngay trên vùng đập (`guardBox`). Học sinh đứng ở hàng dưới cùng, dưới đuôi các làn,
 * trượt ngang tới chân làn được đập; cô Chi đứng cố định ở khoảng trống bên trái sân; {phanDien} chờ ở đầu làn (xa, nhỏ), phía trên đoạn làn được giữ trống.
 */
import { BOOK_POINT, imageToWorld, lanePose, laneQuad, type WorldXY } from './man05Lanes';
import { WHACK_SPEC } from './whackConfig';

/** Hộp bao theo trục (thế giới, y hướng lên: `y0` < `y1`) */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Hai hộp có giao nhau không (`gap` > 0 đòi thêm khoảng hở giữa hai hộp) */
export const boxesOverlap = (a: Box, b: Box, gap = 0): boolean => a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap;

/** Hộp bao nhỏ nhất của một hình nhiều đỉnh */
export function pointsBox(points: readonly WorldXY[]): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}

/** Đoạn làn được giữ trống phía trên vùng đập: từ vị trí này (1,5 đơn vị trên đầu vùng đập) xuống hết vùng đập */
export const GUARD_FROM = 5;

/** Hộp bao của vùng đập của một làn (cả bề rộng dải vải) */
export const zoneBox = (lane: number): Box => pointsBox(laneQuad(lane, WHACK_SPEC.zoneStart, WHACK_SPEC.zoneEnd));
/** Hộp bao của vùng đập cộng đoạn làn ngay trên nó */
export const guardBox = (lane: number): Box => pointsBox(laneQuad(lane, GUARD_FROM, WHACK_SPEC.zoneEnd));
/** Mọi hộp phải để trống: 4 vùng đập kèm đoạn làn ngay trên */
export const keepClearBoxes = (): Box[] => Array.from({ length: WHACK_SPEC.lanes }, (_, l) => guardBox(l));

/** Nửa bề rộng hộp bao của một nhân vật, tính theo chiều cao (kể cả tay giơ, quạt khi đập, tay giơ trêu) */
export const CHAR_HALF_WIDTH = 0.4;

/**
 * Học sinh: cao `height` (nhỏ để vừa khoảng trống dưới đuôi các làn: từ đáy khung −4,5 lên tới cạnh dưới các vùng đập chừng −2,2), chân ở `feetY` (sát đáy khung). Lúc đập, tay giơ quạt lên
 * tới `reach` × chiều cao nên hộp bao cao tới mức đó.
 */
export const STUDENT = { height: 1.85, feetY: -4.45, reach: 1.15 } as const;

/** Cuốn sổ trên bàn: tâm và nửa kích thước (thế giới); học sinh đứng lệch ra ngoài để không che sổ và các vết mực */
export const BOOK = { half: { w: 0.85, h: 0.55 } } as const;
export const bookBox = (): Box => {
  const c = imageToWorld(BOOK_POINT.u, BOOK_POINT.v);
  return { x0: c.x - BOOK.half.w, y0: c.y - BOOK.half.h, x1: c.x + BOOK.half.w, y1: c.y + BOOK.half.h };
};

/** Hộp bao của học sinh đứng ở hoành độ `x` (đang giơ quạt) */
export function studentBox(x: number): Box {
  const hw = CHAR_HALF_WIDTH * STUDENT.height;
  return { x0: x - hw, y0: STUDENT.feetY, x1: x + hw, y1: STUDENT.feetY + STUDENT.height * STUDENT.reach };
}

/**
 * Hoành độ chỗ học sinh đứng để đập làn `lane`: ngay dưới đuôi làn; nếu chỗ đó che cuốn sổ thì dịch ra mép sổ (bên gần hơn).
 */
export function studentStand(lane: number): number {
  const tail = lanePose(lane, WHACK_SPEC.laneLength, { x: 0, y: 0, scale: 1 }).x;
  const book = bookBox();
  const bx = (book.x0 + book.x1) / 2;
  const reach = BOOK.half.w + CHAR_HALF_WIDTH * STUDENT.height + 0.05;
  if (Math.abs(tail - bx) >= reach) return tail;
  return tail < bx ? bx - reach : bx + reach;
}

/** Chỗ đứng ban đầu và lúc nghỉ: chân làn 2 (giữa các làn) */
export const studentHome = (): number => studentStand(1);

/** Cô Chi đứng cố định ở khoảng trống bên trái sân, cách xa mọi làn (chân ở `feetY`) */
export const CHI = { x: -6.3, feetY: -3.9, height: 2.6 } as const;
export function chiBox(): Box {
  const hw = CHAR_HALF_WIDTH * CHI.height;
  return { x0: CHI.x - hw, y0: CHI.feetY, x1: CHI.x + hw, y1: CHI.feetY + CHI.height };
}

/** {phanDien} làm trùm: chiều cao ở cỡ đầy đủ (gần sổ), nhỏ dần lên đầu làn theo phối cảnh; chân thấp hơn điểm làn một chút */
export const BOSS_HEIGHT = 2.9;
export const BOSS_FEET_DROP = 0.2;
/** Chỗ trùm đứng chờ câu hỏi: ở đầu làn, phía trên đoạn làn được giữ trống (tự chọn, test giữ cho hộp bao không chạm `keepClearBoxes`) */
export const BOSS_WAIT_POS = 3;
/** Chỗ trùm chạy xuống để học sinh đét trúng (cuối làn, ngay trên sổ) */
export const BOSS_HIT_POS = 9.3;
/** Vị trí trên làn mà logic cho trùm dừng (giữa vùng đập); cảnh ánh xạ về `BOSS_WAIT_POS` */
export const BOSS_LOGIC_STOP = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;

export interface BossPose {
  /** hoành độ và độ cao của CHÂN */
  x: number;
  y: number;
  /** chiều cao trên màn */
  height: number;
  /** hệ số phóng của nhóm (so với cỡ đầy đủ) */
  scale: number;
}
const POSE = { x: 0, y: 0, scale: 1 };
export function bossPose(lane: number, pos: number, out: BossPose = { x: 0, y: 0, height: 0, scale: 1 }): BossPose {
  const p = lanePose(lane, pos, POSE);
  out.x = p.x;
  out.y = p.y - BOSS_FEET_DROP;
  out.scale = 0.45 + 0.55 * p.scale;
  out.height = BOSS_HEIGHT * out.scale;
  return out;
}
export function bossBox(lane: number, pos: number): Box {
  const b = bossPose(lane, pos);
  const hw = CHAR_HALF_WIDTH * b.height;
  return { x0: b.x - hw, y0: b.y, x1: b.x + hw, y1: b.y + b.height };
}

/** Vị trí trên làn của trùm trong cảnh, từ vị trí `pos` của logic lúc trùm chạy xuống (0 đến `BOSS_LOGIC_STOP`) về `BOSS_WAIT_POS` */
export const bossViewPos = (logicPos: number): number => (Math.min(Math.max(logicPos, 0), BOSS_LOGIC_STOP) / BOSS_LOGIC_STOP) * BOSS_WAIT_POS;

/**
 * HUD (chấm mực, điểm, xu, lượt trùm) ở góc trên bên phải khung, cỡ cố định theo điểm ảnh CSS (đo ở 360 px cao: chừng 232 × 66, cách mép phải 56 vì nút "?" chiếm góc, cách mép trên 8). Đổi sang đơn vị
 * thế giới theo bề rộng khung (điểm ảnh).
 */
export const HUD = { width: 240, height: 70, right: 56, top: 8 } as const;
export function hudBox(framePxWidth: number): Box {
  const ppu = framePxWidth / 16;
  const x1 = 8 - HUD.right / ppu;
  const y1 = 4.5 - HUD.top / ppu;
  return { x0: x1 - HUD.width / ppu, y0: y1 - HUD.height / ppu, x1, y1 };
}

/** Các bố cục cần kiểm: cỡ cửa sổ (điểm ảnh) */
export const CHECK_VIEWPORTS: readonly { width: number; height: number }[] = [
  { width: 640, height: 360 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
];

