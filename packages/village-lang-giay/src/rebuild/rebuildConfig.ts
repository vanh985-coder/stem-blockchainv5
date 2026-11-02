/**
 * Số liệu của màn 3 "Ghép lại cuốn sổ" (spec 05, mục "Màn 3"). Bỏ đoạn giữ sổ (02/11/2026): HAI vòng ghép sổ (vòng 1: 5 trang; vòng 2: 7 trang, 1 trang giả).
 * Ghép xong vòng 2 thì hết ván vào thẳng màn kết quả.
 */
export const REBUILD_SPEC = {
  /** Hai vòng: số trang thật của chuỗi, có trang giả nhét vào khay hay không */
  rounds: [
    { pages: 5, fake: false },
    { pages: 7, fake: true },
  ] as const,
  /** 3 tim cho cả ván */
  hearts: 3,
  /** Điểm mỗi vòng ghép = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ */
  roundBase: 100,
  perError: 10,
  fakeBonus: 30,
  /**
   * Đồng, Bạc, Vàng (tổng điểm cả ván). Bỏ giữ sổ (tối đa 230 điểm):
   * Đồng = 210 (qua 2 vòng với 2 lỗi), Bạc = 220 (qua 2 vòng với 1 lỗi), Vàng = 230 (hoàn hảo 0 lỗi, p10 bot giỏi = 230).
   * Trước đó (P4b): 290 / 320 / 330 (tối đa 355). Trước P4b: 200 / 400 / 475 (tối đa 505).
   */
  medals: [210, 220, 230] as const,
} as const;

/** Mã trang và nội dung đều thuộc 0 đến 99 (mod 100, spec giai đoạn 1). */
export const REBUILD_CODE_MAX = 99;
