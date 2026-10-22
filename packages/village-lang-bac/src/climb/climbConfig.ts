/**
 * Số liệu của màn 12 "Leo cây tìm lá giả" (spec 08, mục "Màn 12"). Đơn vị thời gian: giây; khoảng cách: đơn vị ngang của thanh (người chơi treo ở x = 0).
 */
export const CLIMB_SPEC = {
  /**
   * 4 vòng (spec 08): số lá = 2^số tầng; tốc độ trượt của cặp tay nắm (|dc/dt|); tầm với ở đỉnh cú bật; vòng 1–2 hiện giá trị thật (`combine`), vòng 3–4 hiện mã rút gọn 4 chữ số.
   */
  rounds: [
    { leaves: 8, depth: 3, speed: 1.2, reach: 0.6, codes: false },
    { leaves: 16, depth: 4, speed: 1.6, reach: 0.55, codes: false },
    { leaves: 32, depth: 5, speed: 2.0, reach: 0.5, codes: true },
    { leaves: 64, depth: 6, speed: 2.4, reach: 0.45, codes: true },
  ] as const,
  /** 3 tim cho cả game */
  hearts: 3,
  /** Tâm cặp tay nắm c(t) chạy sóng tam giác trong [−sway; sway]; hai tay nắm ở c − halfGap và c + halfGap (cách nhau 3 > 2 × tầm với nên không bao giờ nắm được cả hai) */
  sway: 1.5,
  halfGap: 1.5,
  /** Bật lên lúc t thì tới đỉnh lúc t + jumpPeak (giây): kiểm tra nắm ở đỉnh (bước B3, theo lời giao) */
  jumpPeak: 0.35,
  /** Nắm nhầm nhánh khớp (ngõ cụt) hay không nắm được gì: khóa bật bấy nhiêu giây kể từ đỉnh cú bật (bước B3) */
  lockAfterFail: 1,
  /** Mỗi khoảng giữa hai tầng có bấy nhiêu tiền đồng; chỉ nhặt khi leo qua khoảng đó ngay lần bật đầu tiên ở tầng đó (không trượt, không ngõ cụt trước đó), không thì mất (bước B4). Tối đa 2 × (3 + 4 + 5 + 6) = 36 đồng. */
  coinsPerGap: 2,
  /** Mã rút gọn: số chữ số cuối của giá trị trong sổ */
  codeDigits: 4,
  /** Điểm = số vòng xong × 100 + số tiền đồng × 1 + số tim còn × 50 */
  points: { perRound: 100, perCoin: 1, perHeart: 50 },
  /**
   * Mốc điểm cả ván: Đồng, Bạc, Vàng (khai báo theo chuẩn màn 2, 3, 8). Nghĩa (đổi ở bước sửa sau B4, theo lời chủ dự án): Đồng 250 là qua được 3 vòng (3 × 100 cộng đồng nhặt được);
   * Bạc 450 là leo hết 4 vòng, nhầm nhánh tối đa 2 lần (hoàn hảo 586, mỗi ngõ cụt trừ 50 điểm tim và 2 đồng: 482 khi nhầm 2 lần, 430 khi nhầm 3 lần);
   * Vàng 570 là không nhầm nhánh lần nào (hoàn hảo 586; trượt không mất tim chỉ mất 2 đồng mỗi lần nên 570 cho phép trượt tối đa 8 lần).
   */
  medals: [250, 450, 570] as const,
} as const;

export const CLIMB_ROUNDS = CLIMB_SPEC.rounds;
export type ClimbRoundSpec = (typeof CLIMB_SPEC.rounds)[number];
