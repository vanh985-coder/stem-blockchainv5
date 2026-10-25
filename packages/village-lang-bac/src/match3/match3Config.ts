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
 * Phương án độ khó khi bot trung bình xong cây vòng 1 chưa tới 70% (lời giao B12): A là mỗi vòng thêm 5 lượt; B là A và lá giả lúc đầu 2 / 4 / 6.
 * `'base'` là luật gốc.
 */
export type Match3Variant = 'base' | 'A' | 'B';

export function match3Variant(variant: Match3Variant, base: Match3Spec = BASE_MATCH3_SPEC): Match3Spec {
  if (variant === 'base') return base;
  const fakes = [2, 4, 6];
  return { ...base, rounds: base.rounds.map((r, i) => ({ ...r, turns: r.turns + 5, ...(variant === 'B' ? { fakes: fakes[i] } : {}) })) };
}

/**
 * Số liệu đang dùng (chọn ở bước B12; xem `match3Balance.test.ts` và spec 08): luật gốc, KHÔNG dùng phương án A hay B (bot trung bình xong cây vòng 1 ở 99,7% ván, đã vượt mục tiêu 70%).
 *
 * MỐC ĐIỂM 600 / 1000 / 1400 CHƯA ĐẠT mục tiêu cân bằng và đang chờ chủ dự án chọn: với luật gốc mọi bot, kể cả bot chỉ chọn ngẫu nhiên, đều được 2.170 đến 2.950 điểm (xem bảng ở `match3Balance.test.ts`), nên
 * cả bot giỏi, bot trung bình và bot ngẫu nhiên đều Vàng 100%. Quy tắc phân vị (Đồng = p25 bot trung bình, Bạc = p75 bot trung bình, Vàng = p10 bot giỏi, làm tròn xuống bội số 50) cho 2.450 / 2.550 / 2.400, ba mốc
 * cách nhau dưới 150 điểm và không tăng dần, nên KHÔNG áp dụng; giữ 600 / 1000 / 1400 của spec cho tới khi chọn mốc theo nghĩa.
 */
export const MATCH3_SPEC: Match3Spec = BASE_MATCH3_SPEC;
