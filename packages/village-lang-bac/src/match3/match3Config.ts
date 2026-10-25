/**
 * Số liệu của màn 11 "Ghép lá cây sổ" (spec 08, mục "Màn 11"). Đơn vị: ô, lượt, điểm (không có thời gian).
 *
 * Luật gốc của spec: lưới 7 × 7, 6 loại lá; ba vòng (4 ô cây, 20 lượt, 3 lá giả) / (8, 25, 5) / (8, 25, 8); mỗi lá nổ +5, mỗi ô cây lấp +50, xong cây +20 mỗi lượt dư; mốc 600 / 1000 / 1400;
 * cứ 5 lượt {phanDien} ném một lá giả.
 *
 * Những chỗ spec chưa nói (đã chốt trong lời giao bước B12, ghi cả trong spec 08):
 *  - "một hàng" là một nhóm liền nhau từ 3 lá cùng loại thẳng hàng trở lên (hình L, T tính theo đường dài nhất); mỗi hàng loại X lấp TỐI ĐA một ô cây loại X còn trống;
 *  - mỗi ô cây yêu cầu một loại lá, chọn theo rng sao cho không loại nào chiếm quá 3 ô trong 8 (tự chọn: 4 ô thì tối đa 2 ô mỗi loại, cùng tỉ lệ);
 *  - hoa sen chỉ tạo khi đúng 4 thẳng hàng, gió xoáy khi từ 5 thẳng hàng trở lên; ô đặc biệt đặt ở ô vừa đổi nếu ô đó nằm trong nhóm, không thì ô giữa của đường dài nhất (tự chọn: ô thứ ⌊(n − 1) / 2⌋);
 *  - tự chọn: ô cây lấp theo thứ tự chỉ số (ô trống nhỏ nhất cần đúng loại); lá giả cũng rơi theo trọng lực như lá khác; lá giả và ô gió bị xóa thêm không cộng điểm.
 */

export interface Match3Round {
  /** Số ô lá trên cây: 4 hay 8 (lũy thừa của 2: cây nhị phân) */
  slots: number;
  /** Số lượt (một lượt là một lần đổi chỗ hợp lệ) */
  turns: number;
  /** Số lá giả lúc đầu vòng */
  fakes: number;
}

export interface Match3Spec {
  /** Lưới size × size */
  size: number;
  /** Số loại lá thường */
  kinds: number;
  rounds: readonly Match3Round[];
  /** Cứ mỗi bấy nhiêu lượt, {phanDien} ném một lá giả */
  throwEvery: number;
  /** Mỗi ô cây có nhiều nhất bấy nhiêu ô cùng loại, tính trên 8 ô (4 ô thì chia theo tỉ lệ, làm tròn lên) */
  maxSameOf8: number;
  /** Điểm: mỗi lá nổ, mỗi ô cây lấp, mỗi lượt dư khi xong cây */
  points: { leaf: number; slot: number; spare: number };
  /** Mốc điểm cả ván: Đồng, Bạc, Vàng */
  medals: readonly [number, number, number];
}

/** Luật gốc theo bảng spec 08. */
export const BASE_ROUNDS: readonly Match3Round[] = [
  { slots: 4, turns: 20, fakes: 3 },
  { slots: 8, turns: 25, fakes: 5 },
  { slots: 8, turns: 25, fakes: 8 },
];

export const BASE_MATCH3_SPEC: Match3Spec = {
  size: 7,
  kinds: 6,
  rounds: BASE_ROUNDS,
  throwEvery: 5,
  maxSameOf8: 3,
  points: { leaf: 5, slot: 50, spare: 20 },
  medals: [600, 1000, 1400],
};

/**
 * Phương án số lượt (lời giao cân bằng màn 11: với luật gốc bot chọn ngẫu nhiên cũng xong cây ~99% và mọi bot đều Vàng, học sinh bấm bừa vẫn thắng). CHỈ đổi số lượt ba vòng, mọi luật khác giữ nguyên.
 * `'base'` là luật gốc của spec (20, 25, 25); A (12, 16, 16); B (10, 14, 14); C (8, 12, 12). Thử lần lượt, dừng ở phương án đầu tiên đạt mục tiêu; không phương án nào đạt cả hai mục tiêu (xem `MATCH3_SPEC`).
 */
export type Match3Variant = 'base' | 'A' | 'B' | 'C';

export const MATCH3_TURNS: Readonly<Record<Match3Variant, readonly [number, number, number]>> = {
  base: [20, 25, 25],
  A: [12, 16, 16],
  B: [10, 14, 14],
  C: [8, 12, 12],
};

export function match3Variant(variant: Match3Variant, base: Match3Spec = BASE_MATCH3_SPEC): Match3Spec {
  if (variant === 'base') return base;
  const turns = MATCH3_TURNS[variant];
  return { ...base, rounds: base.rounds.map((r, i) => ({ ...r, turns: turns[i] })) };
}

/**
 * Số liệu đang dùng: phương án C (8, 12, 12 lượt), luật khác như spec. Mục tiêu (300 ván mỗi bot, seed 1 đến 300): bot giỏi xong cả 3 cây ≥ 85% và bot ngẫu nhiên xong cả 3 cây ≤ 40%.
 * Xong cả 3 cây: A giỏi 86,7% / ngẫu nhiên 59,0%; B giỏi 71,7% / ngẫu nhiên 35,7%; C giỏi 45,7% / ngẫu nhiên 15,0%. Không phương án nào đạt cả hai (A đạt bot giỏi mà bot ngẫu nhiên còn quá cao; B và C đạt bot
 * ngẫu nhiên mà bot giỏi quá thấp), nên theo lời giao dừng ở C và báo số thật.
 *
 * MỐC ĐIỂM 600 / 1000 / 1400 (của spec) vẫn CHƯA CHỌN ĐƯỢC mốc theo nghĩa (Vàng ≈ xong 3 cây, Bạc ≈ xong 2 cây, Đồng ≈ xong 1 cây): điểm hầu như không phụ thuộc số cây xong (lá nổ khoảng 1.200 điểm,
 * ô cây và lượt dư chỉ thêm vài trăm) nên điểm các ván xong 0, 1, 2, 3 cây chồng lên nhau (p10 đến p90: 1.370 đến 1.605, 1.460 đến 1.745, 1.565 đến 1.810, 1.670 đến 1.915); không bội số 50 nào thỏa
 * hai điều kiện ≥ 90% và ≤ 10% của lời giao. Báo số liệu, giữ mốc của spec (298 / 300 ván của bot giỏi và bot trung bình, 294 / 300 của bot ngẫu nhiên vẫn Vàng).
 */
export const MATCH3_SPEC: Match3Spec = match3Variant('C');
