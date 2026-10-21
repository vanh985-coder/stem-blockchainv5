/**
 * Số liệu của màn 3 "Ghép lại cuốn sổ" (spec 05, mục "Màn 3"). Vòng 1 và 2 là số liệu gốc của spec; vòng 3 là "vòng giữ sổ 90 giây" (bước X2), số liệu ở `REBUILD_KEEP`.
 */
export const REBUILD_SPEC = {
  /** Ba vòng: số trang thật của chuỗi, có trang giả nhét vào khay hay không (vòng 1, 2), và có phải vòng giữ sổ (vòng 3) hay không */
  rounds: [
    { pages: 5, fake: false, keep: false },
    { pages: 7, fake: true, keep: false },
    { pages: 6, fake: false, keep: true },
  ] as const,
  /** 3 tim cho cả ván */
  hearts: 3,
  /** Điểm mỗi vòng (1 và 2) = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ */
  roundBase: 100,
  perError: 10,
  fakeBonus: 30,
  /** Đồng, Bạc, Vàng (tổng điểm cả ván; chỉnh ở bước X2 theo mô phỏng 300 ván mỗi bot, Vàng hạ 520 → 500 ở bước X3; xem spec 05) */
  medals: [200, 400, 500] as const,
} as const;

/**
 * Vòng 3, "giữ sổ": {phanDien} liên tục tráo một trang thật trong chuỗi thành trang giả; học sinh sửa liên tục.
 * Đơn vị thời gian: giây.
 */
export const REBUILD_KEEP = {
  /** Cả vòng kéo dài 90 giây */
  seconds: 90,
  /** Lần tráo đầu tiên */
  firstSwapAt: 6,
  /** Khoảng cách giữa hai lần tráo giảm tuyến tính theo giờ chơi, từ 9 giây (lúc 0) xuống 5 giây (lúc hết vòng); bước X2b: trước đó xuống 4 giây */
  intervalStart: 9,
  intervalEnd: 5,
  /** Không tráo trong những giây cuối, để trang nào bị tráo cũng còn thời gian sửa */
  noSwapLast: 6,
  /** Tối đa 3 ô chưa sửa xong cùng lúc; tới hạn mà đến lượt tráo thì không tráo nhưng học sinh mất 1 tim */
  maxUnfixed: 3,
  /** Một ô để quá 10 giây chưa sửa thì Bi gợi ý nửa trái hay nửa phải của chuỗi (không chỉ đúng ô) */
  hintAfter: 10,
  /** Điểm: +20 mỗi ô sửa xong, thêm +5 nếu sửa trong 5 giây kể từ lúc bị tráo; hết giờ mà ô chưa sửa thì −10 mỗi ô (hết tim giữa vòng thì vẫn tính +20/+5 các ô đã sửa, không trừ −10) */
  fixPoints: 20,
  fastWithin: 5,
  fastBonus: 5,
  leftPenalty: 10,
} as const;

/** Mã trang và nội dung đều thuộc 0 đến 99 (mod 100, spec giai đoạn 1). */
export const REBUILD_CODE_MAX = 99;
