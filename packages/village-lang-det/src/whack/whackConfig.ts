/**
 * Số liệu của màn 5 "Đập {phanDien}" (spec 06, mục "Màn 5"). Đơn vị thời gian: GIÂY (mọi `dt`, đồng hồ, thời hạn đều là giây); khoảng cách: đơn vị dọc làn.
 *
 * Làn dài 10 đơn vị, vị trí tính từ đầu làn (0, nơi chuột xuất hiện) xuống cuốn sổ (10). Vùng đập là 15% đến 30% chiều dài tính từ dưới lên, tức vị trí [7; 8,5]; tới 10 là lọt vào sổ.
 * Những chỗ spec chưa nói (đã chốt trong lời giao bước B6, ghi cả trong spec 06): vị trí vùng đập, đồng hồ lịch dừng trong lượt trùm, lượt trùm làm chuột còn 20% tốc độ rồi đứng yên khi mở câu hỏi,
 * làm tròn xuống số giây còn lại. Số "tự chọn" của bước này được ghi chú riêng ngay tại chỗ.
 */
export const WHACK_SPEC = {
  /** 4 làn */
  lanes: 4,
  /** Chiều dài làn, và hai đầu vùng đập (vị trí tính từ đầu làn) */
  laneLength: 10,
  zoneStart: 7,
  zoneEnd: 8.5,
  /** Đập hụt thì làn đó nghỉ chừng này giây (không đập được) */
  hitRest: 0.2,
  /** Chuột cần `runSecondsStart` giây từ đầu làn tới đầu vùng đập (vị trí 7) lúc đồng hồ lịch = 0, giảm tuyến tính còn `runSecondsEnd` giây ở giây `rampSeconds` (rồi giữ nguyên) */
  runSecondsStart: 3,
  runSecondsEnd: 1.8,
  rampSeconds: 120,
  /** Nhịp sinh: 1,2 giây một con, giảm tuyến tính còn 0,55 giây ở giây `rampSeconds`. Con đầu tiên sinh ở giây `firstSpawn` (tự chọn: bằng nhịp đầu). */
  spawnStart: 1.2,
  spawnEnd: 0.55,
  firstSpawn: 1.2,
  /** Không sinh vào làn có con gần nhất còn dưới ngưỡng này (15% đầu làn) */
  spawnGuard: 1.5,
  /**
   * Tỉ lệ các loại chuột [thường, đổi làn, nhanh, to] từ giây `from` của đồng hồ lịch (spec 06): 0–20, 20–40, 40–60, từ 60.
   */
  mix: [
    { from: 0, weights: [1, 0, 0, 0] },
    { from: 20, weights: [0.8, 0.2, 0, 0] },
    { from: 40, weights: [0.6, 0.2, 0.2, 0] },
    { from: 60, weights: [0.45, 0.2, 0.2, 0.15] },
  ] as const,
  /** Điểm mỗi loại khi hạ xong */
  points: { thuong: 10, doiLan: 15, nhanh: 15, to: 30 },
  /** Chuột đổi làn: tới vị trí này (cách đầu vùng đập 1,5) thì nhảy sang làn kề một lần */
  laneChangeAt: 5.5,
  /** Chuột nhanh: tốc độ nhân lên */
  fastFactor: 1.6,
  /** Chuột to: đập 2 lần, sau lần đầu khựng (đứng yên) chừng này giây và chớp sáng */
  bigHits: 2,
  bigFreeze: 0.3,
  /** 5 vết mực là thua */
  inkMax: 5,
  /**
   * Tiền đồng: khoảng 8 giây hiện một đồng (±1 giây), tồn tại 2,5 giây, chạm được +5 điểm và +1 xu. Đồng hiện ở làn ngẫu nhiên, vị trí dọc làn ngẫu nhiên trong [`posMin`; `posMax`]
   * (tự chọn: giữa làn, ngoài vùng đập; cảnh có thể vẽ lại theo ảnh). Đếm theo đồng hồ lịch nên dừng trong lượt trùm.
   */
  coin: { every: 8, jitter: 1, life: 2.5, points: 5, xu: 1, posMin: 2, posMax: 6 },
  /**
   * Trùm: `count` lần, ở giây `every`, 2 × `every`, … của đồng hồ lịch (12, 24, …, 120). Lúc trùm ra chuột còn `slowFactor` tốc độ trong lúc {phanDien} chạy xuống (`runSeconds` giây, tự chọn, tới giữa vùng đập),
   * rồi mở câu hỏi: chuột đứng yên. Thời gian trả lời: `answerSeconds[0]` cho lần 1–5, `answerSeconds[1]` cho lần 6–10. Đúng: `base` + `perSecond` × số giây còn lại (làm tròn xuống).
   */
  boss: { count: 10, every: 12, slowFactor: 0.2, runSeconds: 1.2, answerSeconds: [15, 10] as const, firstHalf: 5, base: 100, perSecond: 5 },
  /** Bước mô phỏng cố định (giây): `stepWhack` chia `dt` thành các bước này để kết quả không phụ thuộc tốc độ khung hình (tự chọn: 1/120) */
  tick: 1 / 120,
  /**
   * Mốc điểm cả ván: Đồng, Bạc, Vàng (spec 06; khai báo theo chuẩn màn 2, 3, 8, 12). Spec ghi "chỉnh lại sau khi chơi thử": số liệu bot ở `whackBalance.test.ts` và spec 06.
   */
  medals: [800, 1600, 2400] as const,
} as const;

export type MouseKind = 'thuong' | 'doiLan' | 'nhanh' | 'to';
/** Thứ tự các loại trong `WHACK_SPEC.mix[].weights` */
export const MOUSE_KINDS: readonly MouseKind[] = ['thuong', 'doiLan', 'nhanh', 'to'];
