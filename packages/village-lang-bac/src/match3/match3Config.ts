/**
 * Số liệu của màn 11 "Ghép lá cây sổ" (spec 08, mục "Màn 11"). Đơn vị: ô, lượt, điểm (không có thời gian).
 *
 * Luật gốc của spec: lưới 7 × 7, 6 loại lá; ba vòng (4 ô cây, 20 lượt, 3 lá giả) / (8, 25, 5) / (8, 25, 8); mỗi lá nổ +5, mỗi ô cây lấp +50, xong cây +20 mỗi lượt dư; mốc 600 / 1000 / 1400
 * (`BASE_MATCH3_SPEC` dùng điểm đã sửa ở lượt cân bằng 2: lá +1, ô cây +50, xong cây +200 + 20 × lượt dư; số lượt và mốc đang dùng ở `MATCH3_SPEC`); cứ 5 lượt {phanDien} ném một lá giả.
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
  /** Điểm: mỗi lá nổ, mỗi ô cây lấp, mỗi cây xong, và mỗi lượt dư khi xong cây */
  points: { leaf: number; slot: number; tree: number; spare: number };
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
  points: { leaf: 1, slot: 50, tree: 200, spare: 20 },
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

/** Luật gốc với số lượt tùy ý: vòng 1 `round1`, vòng 2 và vòng 3 cùng `round23` (dùng quét lưới số lượt). */
export function match3WithTurns(round1: number, round23: number, base: Match3Spec = BASE_MATCH3_SPEC): Match3Spec {
  const turns = [round1, round23, round23];
  return { ...base, rounds: base.rounds.map((r, i) => ({ ...r, turns: turns[i] })) };
}

export function match3Variant(variant: Match3Variant, base: Match3Spec = BASE_MATCH3_SPEC): Match3Spec {
  if (variant === 'base') return base;
  const turns = MATCH3_TURNS[variant];
  return { ...base, rounds: base.rounds.map((r, i) => ({ ...r, turns: turns[i] })) };
}

/**
 * Số liệu đang dùng (cân bằng màn 11, lượt 2): điểm mới (lá nổ +1, ô cây +50, xong cây +200 + 20 × lượt dư) và số lượt 12 / 15 / 15, mốc 1150 / 1550 / 1850. Lý do: điểm lá nổ (~1.200) lấn át điểm dựng cây nên
 * điểm không phản ánh số cây xong; bot ngẫu nhiên vốn ăn may nhờ nổ dây chuyền nên mục tiêu ≤ 40% quá chặt.
 *
 * Số lượt: quét lưới vòng 1 ∈ {8 … 12} × vòng 2 = vòng 3 ∈ {12 … 16}, 300 ván mỗi bot mỗi ô; mục tiêu bot giỏi xong cả 3 cây ≥ 80% và bot ngẫu nhiên ≤ 50%. KHÔNG ô nào đạt cả hai; theo lời giao chọn ô có
 * (giỏi − ngẫu nhiên) lớn nhất trong các ô có giỏi ≥ 80%: 12 / 15 / 15 (giỏi 245 / 300 = 81,7%, ngẫu nhiên 154 / 300 = 51,3%, hiệu 91). Xem bảng ở `match3Balance.test.ts` và spec 08.
 *
 * Mốc theo nghĩa (Vàng ≈ xong 3 cây, Bạc ≈ xong 2 cây, Đồng ≈ xong 1 cây): ≥ 85% ván xong k cây đạt mốc k và ≤ 15% ván xong ít hơn k cây đạt mốc k (gộp 900 ván của cả 3 bot). Thỏa: Đồng 1050 đến 1250,
 * Bạc 1450 đến 1600, Vàng 1800 đến 1900; chọn giữa khoảng thỏa (tự chọn): 1150 / 1550 / 1850.
 */
export const MATCH3_SPEC: Match3Spec = { ...match3WithTurns(12, 15), medals: [1150, 1550, 1850] };
