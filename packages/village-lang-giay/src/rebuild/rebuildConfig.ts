/**
 * Số liệu của màn 3 "Ghép lại cuốn sổ" (spec 05, mục "Màn 3"). Mọi số ở đây có trong spec; chưa có số nào do tự chọn.
 */
export const REBUILD_SPEC = {
  /** Ba vòng: số trang thật của chuỗi, và có trang giả hay không */
  rounds: [
    { pages: 5, fake: false },
    { pages: 7, fake: true },
    { pages: 9, fake: true },
  ] as const,
  /** 3 tim cho cả ván */
  hearts: 3,
  /** Điểm mỗi vòng = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ */
  roundBase: 100,
  perError: 10,
  fakeBonus: 30,
  /** Đồng, Bạc, Vàng */
  medals: [150, 250, 330] as const,
} as const;

/** Mã trang và nội dung đều thuộc 0 đến 99 (mod 100, spec giai đoạn 1). */
export const REBUILD_CODE_MAX = 99;
