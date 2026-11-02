/**
 * Số liệu của màn 9 "Bắn trứng khắc dấu" (spec 07, mục "Màn 9"; game kiểu Bubble Shooter). Đơn vị bàn: đường kính một quả trứng = 1; tâm ô (hàng r, cột c) tính bằng `cellCenter` trong `bubbleLogic.ts`.
 *
 * Những chỗ lời giao chưa nói (tự chọn, ghi cả ở spec 07):
 *  - dây giới hạn nằm ở mép trên của hàng 13 (hàng đầu là hàng 0); trứng nằm ở hàng 13 trở xuống là chạm dây;
 *  - khóa riêng mỗi đợt rút trong 2 đến 15 (mẫu công khai khác nhau vì 5 là căn nguyên thủy mod 23), các khóa trong đợt khác nhau;
 *  - bàn đầu đợt không có cụm 3 trứng cùng số dính nhau (sinh có kiểm), hàng mới khi hạ bàn rút ngẫu nhiên trong các số của đợt;
 *  - mốc điểm đặt theo bot (xem `bubbleBalance.test.ts`).
 */

export interface BubbleRound {
  /** Số khóa riêng (= số loại trứng) của đợt */
  keys: number;
  /** Số hàng ban đầu của bàn */
  rows: number;
  /** Cứ bấy nhiêu phát thì cả bàn hạ một hàng */
  descendEvery: number;
}

export interface BubbleSpec {
  /** Bề rộng bàn (đơn vị trứng): hàng rộng 10 ô, hàng hẹp 9 ô */
  width: number;
  /** Chiều cao một hàng (căn 3 chia 2) */
  rowH: number;
  /** Hàng đầu tiên chạm dây giới hạn */
  limitRow: number;
  /** Khoảng cách tâm hai trứng nhỏ hơn số này thì trứng bay dừng lại (nhỏ hơn 1 một chút để trượt qua khe hẹp dễ hơn) */
  hitDist: number;
  /** Góc ngắm nhỏ nhất và lớn nhất (độ, 90 là thẳng lên) */
  minAngle: number;
  maxAngle: number;
  /** Tốc độ trứng bay (đơn vị trứng mỗi giây): chỉ dùng cho hoạt cảnh, luật không phụ thuộc */
  speed: number;
  rounds: readonly BubbleRound[];
  hearts: number;
  /** Số hàng dưới cùng bị xóa khi trứng chạm dây */
  penaltyRows: number;
  /** Trứng nhiễu ở khay nạp: 1 ghi chính số khóa riêng, còn lại ghi mẫu công khai của khóa ngoài đợt */
  decoys: number;
  /** Cụm cùng số liền nhau từ bấy nhiêu trứng thì vỡ */
  minGroup: number;
  /** Điểm: mỗi trứng vỡ, mỗi trứng rơi, đợt nạp không sai, đợt xong, mỗi tim còn lại lúc hết ván */
  points: { pop: number; drop: number; cleanLoad: number; round: number; heart: number };
  /** Khoảng rút khóa riêng */
  keyRange: readonly [number, number];
  /** Mốc điểm cả ván: Đồng, Bạc, Vàng */
  medals: readonly [number, number, number];
}

export const BUBBLE_SPEC: BubbleSpec = {
  width: 10,
  rowH: Math.sqrt(3) / 2,
  limitRow: 13,
  hitDist: 0.9,
  minAngle: 12,
  maxAngle: 168,
  speed: 34,
  rounds: [
    { keys: 3, rows: 5, descendEvery: 12 },
    { keys: 4, rows: 7, descendEvery: 12 },
    { keys: 5, rows: 8, descendEvery: 10 },
  ],
  hearts: 3,
  penaltyRows: 2,
  decoys: 3,
  minGroup: 3,
  points: { pop: 10, drop: 20, cleanLoad: 30, round: 100, heart: 50 },
  keyRange: [2, 15],
  medals: [1600, 2450, 2750],
};

/**
 * Điểm "tối đa" dùng cho chú thích "Kỷ lục từ phiên bản trước" (prop `maxScore` của `MiniGameLevel`): mọi trứng ban đầu đều rơi (20 điểm), cộng thưởng nạp, đợt, tim.
 * Hạ bàn thêm hàng nên điểm thật có thể cao hơn chút; số này đủ để điểm cũ (tối đa 750 của game gà) không bị coi là điểm của thang mới.
 */
export function bubbleMaxScore(spec: BubbleSpec = BUBBLE_SPEC): number {
  let eggs = 0;
  for (const r of spec.rounds) for (let i = 0; i < r.rows; i++) eggs += i % 2 === 0 ? 10 : 9;
  return eggs * spec.points.drop + spec.rounds.length * (spec.points.cleanLoad + spec.points.round) + spec.hearts * spec.points.heart;
}
