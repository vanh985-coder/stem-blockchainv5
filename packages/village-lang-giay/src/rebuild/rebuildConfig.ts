/**
 * Số liệu của màn 3 "Ghép lại cuốn sổ" (spec 05, mục "Màn 3"). P4b: HAI vòng. Vòng 1 và vòng 2 (ghép sổ) là số liệu gốc của spec; vòng 2 có thêm đoạn cuối "giữ sổ"
 * (`keep: true`): ngay sau khi ghép xong chuỗi 7 trang, {phanDien} quay lại tráo trang trong chuỗi đó và em sửa (cơ chế của vòng 3 cũ, bước X2), số liệu ở `REBUILD_KEEP`.
 */
export const REBUILD_SPEC = {
  /** Hai vòng: số trang thật của chuỗi, có trang giả nhét vào khay hay không, và có đoạn cuối giữ sổ hay không */
  rounds: [
    { pages: 5, fake: false, keep: false },
    { pages: 7, fake: true, keep: true },
  ] as const,
  /** 3 tim cho cả ván (vào đoạn giữ sổ được hồi đủ 3 tim, bước X3) */
  hearts: 3,
  /** Điểm mỗi vòng ghép = 100 − 10 × số lỗi, cộng 30 nếu bỏ đúng trang giả vào rổ */
  roundBase: 100,
  perError: 10,
  fakeBonus: 30,
  /** Đồng, Bạc, Vàng (tổng điểm cả ván). P4b: đặt lại theo quy tắc phân vị bot (Đồng = p25 bot trung bình, Bạc = p75 bot trung bình, Vàng = p10 bot giỏi; 300 ván mỗi bot): 290 / 320 / 355; Vàng bằng điểm tối đa (355), xem spec 05 mục "P4b". Trước P4b (3 vòng): 200 / 400 / 475 */
  medals: [290, 320, 355] as const,
} as const;

/**
 * Đoạn "giữ sổ" (cuối vòng 2, từ P4b; trước đó là vòng 3 dài 90 giây): {phanDien} liên tục tráo một trang thật trong chuỗi thành trang giả; học sinh sửa liên tục.
 * Đơn vị thời gian: giây.
 */
export const REBUILD_KEEP = {
  /** P4b: cả đoạn kéo dài 45 giây (trước đó 90 giây): đủ 5 lần tráo để thực hành phát hiện, bỏ trang giả vào rổ và đặt lại trang thật */
  seconds: 45,
  /** Lần tráo đầu tiên */
  firstSwapAt: 6,
  /** Khoảng cách giữa hai lần tráo giảm tuyến tính theo giờ chơi, từ 9 giây (lúc 0) xuống 6 giây (lúc hết đoạn); bước X2b: xuống 5 (trước đó 4), bước X3: xuống 6 */
  intervalStart: 9,
  intervalEnd: 6,
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
