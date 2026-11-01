/**
 * Số liệu của màn 12 "Leo bậc gỗ" (spec 08, mục "Màn 12"). Đơn vị: thế giới của cảnh (khung dọc 9 × 16), thời gian: giây.
 * Mọi số ở đây là TỰ CHỌN trừ khi chú thích nói là của lời giao (số lá, số lựa chọn, tim, điểm, mốc, khóa 0,4 và 0,6 giây).
 */
export interface ClimbRoundSpec {
  /** Số lá của cây (lời giao: 8, 8, 16) */
  leaves: number;
  /** Số bậc lựa chọn mỗi tầng (lời giao: 2, 2, 3) */
  choices: number;
  /** Tốc độ trượt của bậc lựa chọn (đơn vị/giây); 0 là đứng yên (lời giao: vòng 1 đứng yên, vòng 2 trượt, vòng 3 trượt nhanh hơn) */
  slide: number;
}

export const CLIMB_SPEC = {
  rounds: [
    { leaves: 8, choices: 2, slide: 0 },
    { leaves: 8, choices: 2, slide: 0.7 },
    { leaves: 16, choices: 3, slide: 1.4 },
  ] as readonly ClimbRoundSpec[],
  /** 3 tim cho cả game */
  hearts: 3,
  /** Khoảng cách giữa hai tầng bậc */
  gap: 3,
  /** Bề rộng một bậc gỗ */
  stepWidth: 1.7,
  /** Nửa bề rộng thân nhân vật khi xét đáp xuống */
  playerHalf: 0.3,
  /** Đáp xuống (hay đứng vững) cần phần giao theo trục x của thân và bậc từ chừng này trở lên */
  minOverlap: 0.15,
  /** Tốc độ đi ngang (cả trên không: giữ phím để lái) */
  moveSpeed: 5,
  gravity: 30,
  /** Độ cao đỉnh cú nhảy: 1,25 × khoảng cách tầng, vừa tới tầng trên và không tới được tầng trên nữa */
  jumpApex: 3.75,
  /** Đi ngang không vượt khỏi ± giá trị này */
  bounds: 3.9,
  /** x của hai bậc ở tầng đang đứng (nút hiện tại và bậc anh em): ± giá trị này, nút ở bên trái nếu là con trái */
  pairX: 1.1,
  /** x gốc của các bậc lựa chọn theo số lựa chọn */
  choiceX: { 2: [-2.2, 2.2], 3: [-2.6, 0, 2.6] } as Readonly<Record<number, readonly number[]>>,
  /** Biên độ trượt của bậc lựa chọn quanh x gốc (ba bậc cách nhau 1 nên hai bậc kề không chạm nhau) */
  slideAmplitude: 0.4,
  /** Bậc sai nứt rồi biến mất sau chừng này giây (lời giao 0,4) */
  crackSeconds: 0.4,
  /** Nhảy hụt hay rơi khỏi mép: khóa nhảy chừng này giây (lời giao 0,6) */
  missLock: 0.6,
  /** Rơi quá chừng này dưới bậc thì về bậc cũ */
  fallRescue: 1.5,
  /** "Giảm chuyển động": bậc trượt chậm lại còn chừng này */
  reducedSlideScale: 0.5,
  /** Điểm = số vòng xong × 100 + tim còn × 50 (tối đa 450) */
  points: { perRound: 100, perHeart: 50 },
  /**
   * Mốc điểm, THEO NGHĨA (lời giao). Đồng 200 là xong 2 vòng (hết tim ở vòng 3 vẫn được 200); Bạc 350 là xong cả 3 vòng, nhầm tối đa 2 lần (3 × 100 + 1 tim × 50);
   * Vàng 450 là xong cả 3 vòng, không nhầm lần nào. Nhảy hụt hay rơi khỏi mép không mất tim nên không tính là nhầm.
   */
  medals: [200, 350, 450] as const,
} as const;

export const CLIMB_ROUNDS = CLIMB_SPEC.rounds;
/** Điểm tối đa của phiên bản này: điểm cao nhất cũ vượt số này thì màn thông tin hiện "Kỷ lục từ phiên bản trước" (prop `maxScore` của MiniGameLevel). */
export const CLIMB_MAX_SCORE = CLIMB_SPEC.rounds.length * CLIMB_SPEC.points.perRound + CLIMB_SPEC.hearts * CLIMB_SPEC.points.perHeart;
