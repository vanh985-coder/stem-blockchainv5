/**
 * Số liệu của màn 9 "Chữa đàn gà" (spec 07, mục "Màn 9"). Đơn vị thời gian: GIÂY (mọi `dt`, đồng hồ, thời hạn đều là giây); khoảng cách: đơn vị dọc làn.
 *
 * Những chỗ spec chưa nói (đã chốt trong lời giao bước B10, ghi cả trong spec 07):
 *  - làn dài 10 đơn vị (0 là cuối đường, 10 là cổng làng), 3 làn;
 *  - thời gian gà chạy từ 0 tới cổng: đợt 1 là 9 giây, đợt 2 là 7 giây, đợt 3 là 6 giây, gà trùm 14 giây; nhịp sinh 1,6 / 1,3 / 1,1 giây; không sinh vào làn có con gần nhất còn dưới 1,5;
 *  - bắn: chọn thuốc rồi chọn một con gà; viên thuốc LUÔN trúng con đã chọn, bay 0,4 giây, xét kết quả lúc tới (gà đã tới cổng trước đó thì phát đó không tính); giữa hai phát tối thiểu 0,35 giây;
 *  - gà trùm tới cổng mà chưa chữa xong thì mất 1 tim và hết ván; chữa xong trùm hoặc hết tim cũng là hết ván;
 *  - nạp đạn (trước mỗi đợt, không tính giờ): mỗi thuốc có 1 nhãn đúng (= publicKey của khuôn) cùng 2 nhãn nhiễu cho cả đợt: một nhãn BẪY bằng chính số khuôn của một thuốc trong đợt, một nhãn là mẫu công khai
 *    của một khuôn ngoài đợt; nhãn nhiễu không trùng mẫu công khai nào của đợt; kéo nhãn vào thuốc sai thì nhãn bật ra và đợt đó mất thưởng nạp;
 *  - điểm tối đa: 30 gà × 20 + 3 × 30 + 60 = 750.
 * Những số "tự chọn" của bước này được ghi chú riêng ngay tại chỗ.
 */

export interface ChickenRound {
  /** Khuôn riêng của các thuốc trong đợt, theo thứ tự thuốc 1, 2, … (mẫu công khai tính bằng `publicKey`, không viết sẵn ở đây) */
  keys: readonly number[];
  /** Số gà thường trong đợt */
  chickens: number;
  /** Số giây gà chạy từ cuối đường (0) tới cổng (10) */
  runSeconds: number;
  /** Nhịp sinh (giây một con) */
  spawnEvery: number;
}

export interface ChickenSpec {
  lanes: number;
  /** Chiều dài làn: 0 là cuối đường, `laneLength` là cổng làng */
  laneLength: number;
  rounds: readonly ChickenRound[];
  /** Không sinh vào làn có con gần nhất còn dưới ngưỡng này (vị trí tính từ cuối đường) */
  spawnGuard: number;
  /** Con đầu tiên sinh sau bấy nhiêu nhịp sinh kể từ lúc đợt bắt đầu (tự chọn: 1, tức bằng đúng một nhịp) */
  firstSpawnBeats: number;
  /** Thời gian viên thuốc bay (giây) và khoảng cách tối thiểu giữa hai phát bắn (giây) */
  flight: number;
  cooldown: number;
  /** Gà trùm: số giây chạy từ 0 tới cổng, số lần chữa cần, làn xuất hiện (tự chọn: làn giữa) */
  boss: { runSeconds: number; cures: number; lane: number };
  /** Số tim */
  hearts: number;
  /** Điểm: chữa đúng, phát sai (trừ), mỗi đợt nạp đạn không sai, chữa xong trùm */
  points: { cure: number; wrong: number; cleanLoad: number; boss: number };
  /** Số nhãn nhiễu mỗi đợt nạp đạn: 1 nhãn bẫy và 1 nhãn mẫu công khai của khuôn ngoài đợt */
  decoys: number;
  /** Bước mô phỏng cố định (giây): `stepChicken` chia `dt` thành các bước này để kết quả không phụ thuộc tốc độ khung hình (tự chọn: 1/120) */
  tick: number;
  /** Mốc điểm cả ván: Đồng, Bạc, Vàng */
  medals: readonly [number, number, number];
}

/** Ba đợt theo bảng spec 07 (thuốc 3, 5, 6 / 5, 7, 9 / 3, 6, 7, 9; 8, 10, 12 gà). Các số giây và nhịp sinh là số chốt của lời giao B10. */
const BASE_ROUNDS: readonly ChickenRound[] = [
  { keys: [3, 5, 6], chickens: 8, runSeconds: 9, spawnEvery: 1.6 },
  { keys: [5, 7, 9], chickens: 10, runSeconds: 7, spawnEvery: 1.3 },
  { keys: [3, 6, 7, 9], chickens: 12, runSeconds: 6, spawnEvery: 1.1 },
];

export const CHICKEN_SPEC: ChickenSpec = {
  lanes: 3,
  laneLength: 10,
  rounds: BASE_ROUNDS,
  spawnGuard: 1.5,
  firstSpawnBeats: 1,
  flight: 0.4,
  cooldown: 0.35,
  boss: { runSeconds: 14, cures: 3, lane: 1 },
  hearts: 3,
  points: { cure: 20, wrong: -5, cleanLoad: 30, boss: 60 },
  decoys: 2,
  tick: 1 / 120,
  /**
   * Mốc TẠM (chỉnh khi học sinh chơi thật). Mốc của spec 300 / 500 / 700 cho bot giỏi Vàng 97,0% nhưng bot trung bình cũng Vàng 22,3% (trên 15%), nên đặt lại theo quy tắc màn 6 từ số liệu 300 ván mỗi bot
   * (luật gốc, không cần phương án A, B, C): Đồng = phân vị 25% điểm bot trung bình (650), Bạc = phân vị 75% điểm bot trung bình (695), Vàng = phân vị 10% điểm bot giỏi (715), đều làm tròn xuống bội số 10 → 650 / 690 / 710.
   * Điểm tối đa 750 nên các mốc dồn sát nhau: xem `chickenBalance.test.ts` và spec 07.
   */
  medals: [650, 690, 710],
};

/**
 * Phương án độ khó thử khi bot trung bình chưa tới được gà trùm (lời giao B10, thử lần lượt, dừng ở phương án đầu tiên đạt):
 *  A: gà chậm hơn 20% mọi đợt (kể cả trùm: thời gian chạy × 1,25); B: A + 4 tim; C: B + nhịp sinh giãn 20% (nhịp × 1,2).
 */
export function chickenVariant(v: 'base' | 'A' | 'B' | 'C'): ChickenSpec {
  if (v === 'base') return CHICKEN_SPEC;
  const slow = 1 / 0.8;
  const spaced = v === 'C' ? 1.2 : 1;
  return {
    ...CHICKEN_SPEC,
    rounds: BASE_ROUNDS.map((r) => ({ ...r, runSeconds: r.runSeconds * slow, spawnEvery: r.spawnEvery * spaced })),
    boss: { ...CHICKEN_SPEC.boss, runSeconds: CHICKEN_SPEC.boss.runSeconds * slow },
    hearts: v === 'A' ? CHICKEN_SPEC.hearts : 4,
  };
}
