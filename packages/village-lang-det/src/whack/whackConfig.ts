/**
 * Số liệu của màn 5 "Đập {phanDien}" (spec 06, mục "Màn 5"). Đơn vị thời gian: GIÂY (mọi `dt`, đồng hồ, thời hạn đều là giây); khoảng cách: đơn vị dọc làn.
 *
 * Làn dài 10 đơn vị, vị trí tính từ đầu làn (0, nơi chuột xuất hiện) xuống cuốn sổ (10). Vùng đập là 10% đến 35% chiều dài tính từ dưới lên, tức vị trí [6,5; 9] (sửa sau B6: trước là 15% đến 30%, [7; 8,5], vì game quá khó: bot trung bình thua sau khoảng 20 chuột, không tới được câu hỏi); tới 10 là lọt vào sổ.
 * Những chỗ spec chưa nói (đã chốt trong lời giao bước B6, ghi cả trong spec 06): vị trí vùng đập, đồng hồ lịch dừng trong lượt trùm, lượt trùm làm chuột còn 20% tốc độ rồi đứng yên khi mở câu hỏi,
 * làm tròn xuống số giây còn lại. Số "tự chọn" của bước này được ghi chú riêng ngay tại chỗ.
 */
export const WHACK_SPEC = {
  /** 4 làn */
  lanes: 4,
  /** Chiều dài làn, và hai đầu vùng đập (vị trí tính từ đầu làn) */
  laneLength: 10,
  zoneStart: 6.5,
  zoneEnd: 9,
  /** Đập hụt thì làn đó nghỉ chừng này giây (không đập được) */
  hitRest: 0.2,
  /** Chuột cần `runSecondsStart` giây từ đầu làn tới đầu vùng đập (vị trí 6,5) lúc đồng hồ lịch = 0, giảm tuyến tính còn `runSecondsEnd` giây ở giây `rampSeconds` (rồi giữ nguyên) */
  runSecondsStart: 3.2,
  runSecondsEnd: 2.2,
  rampSeconds: 120,
  /** Nhịp sinh: 1,3 giây một con, giảm tuyến tính còn 0,7 giây ở giây `rampSeconds`. Con đầu tiên sinh ở giây `firstSpawn` (tự chọn: bằng nhịp đầu). */
  spawnStart: 1.3,
  spawnEnd: 0.7,
  firstSpawn: 1.3,
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
  /**
   * Chuột đổi làn: tới vị trí này (cách đầu vùng đập 1,5) thì nhảy sang làn kề một lần, nhưng chỉ sang làn kề đang trống trong khoảng ±`laneChangeClear` quanh vị trí của nó (làn giữa: thử bên rng chọn, bị chiếm thì thử bên kia;
   * không làn nào trống thì không đổi, vẫn là chuột đổi làn, vẫn 15 điểm). Sửa sau B6.
   */
  laneChangeAt: 5,
  laneChangeClear: 1.5,
  /** Chuột nhanh: tốc độ nhân lên */
  fastFactor: 1.6,
  /** Chuột to: đập 2 lần, sau lần đầu khựng (đứng yên) chừng này giây và chớp sáng */
  bigHits: 2,
  bigFreeze: 0.3,
  /** Sổ chịu tối đa 8 vết mực: đủ 8 vết là thua (cân bằng sau B6, phương án A: trước là 5, bot trung bình lọt ~14 chuột mỗi ván nên 5 vết quá ít) */
  inkMax: 8,
  /**
   * Tiền đồng: khoảng 8 giây hiện một đồng (±1 giây), tồn tại 2,5 giây, chạm được +5 điểm và +1 xu. Đồng hiện ở làn ngẫu nhiên, vị trí dọc làn ngẫu nhiên trong [`posMin`; `posMax`]
   * (tự chọn: giữa làn, ngoài vùng đập; cảnh có thể vẽ lại theo ảnh). Đếm theo đồng hồ lịch nên dừng trong lượt trùm.
   */
  coin: { every: 8, jitter: 1, life: 2.5, points: 5, xu: 1, posMin: 2, posMax: 6 },
  /**
   * Trùm: `count` lần, ở giây `every`, 2 × `every`, … của đồng hồ lịch (12, 24, …, 120). Lúc trùm ra chuột còn `slowFactor` tốc độ trong lúc {phanDien} chạy xuống (`runSeconds` giây, tự chọn, tới giữa vùng đập),
   * rồi ĐỨNG CHỜ ở giữa vùng đập tới khi em đập trúng (P9: chuột đi từ dưới lên; đập trúng mới mở lượt đáp án). Lượt đáp án: 2 đến 4 chuột vàng mang nhãn A, B, C, D chạy từ đầu làn tới sổ trong `answerSeconds[0]` giây (lần 1–5) hay `answerSeconds[1]` giây (lần 6–10), chậm hơn chuột thường nhiều (tự chọn, để đọc kịp câu dài nhất); chuột thường đứng yên suốt lượt. Nút "Đọc xong" (`readBoost`): chuột đáp án chạy nhanh `readBoost` lần tới đầu vùng đập rồi về tốc độ thường; điểm tính theo quãng còn lại ở tốc độ thường nên bấm không tăng điểm. Số giây còn lại để tính điểm = số giây chuột còn cần để tới sổ lúc em đập. Đúng: `base` + `perSecond` × số giây còn lại (làm tròn xuống), và xoá 2 vết mực nếu đang có (`inkOnCorrect`, không xuống dưới 0; cân bằng sau B6, phương án A: trước là 1 vết). Sai hoặc hết giờ: +1 vết mực.
   */
  boss: { count: 10, every: 12, slowFactor: 0.2, runSeconds: 1.2, answerSeconds: [18, 14] as const, readBoost: 3, firstHalf: 5, base: 100, perSecond: 5, inkOnCorrect: -2 },
  /** Bước mô phỏng cố định (giây): `stepWhack` chia `dt` thành các bước này để kết quả không phụ thuộc tốc độ khung hình (tự chọn: 1/120) */
  tick: 1 / 120,
  /**
   * Mốc điểm cả ván: Đồng, Bạc, Vàng (khai báo theo chuẩn màn 2, 3, 8, 12). TẠM, chỉnh khi học sinh chơi thật. Đặt lại sau P9b (chỉnh độ khó: nhịp sinh 1,3 → 0,7 giây, chuột cần 3,2 → 2,2 giây tới vùng đập) và P9 (chuột đi lên, lượt đáp án: điểm đáp án giảm vì tính theo quãng chuột còn phải chạy) theo số liệu 300 ván mỗi bot:
   * Đồng = phân vị 25% điểm bot trung bình (1790) làm tròn xuống bội số 50; Bạc = phân vị 75% điểm bot trung bình (2440) làm tròn xuống bội số 50; Vàng = phân vị 10% điểm bot giỏi (2620) làm tròn xuống bội số 50. Kết quả: bot giỏi Vàng 94,7%, bot trung bình Vàng 6,0%.
   * Phân vị theo hạng gần nhất (`percentile` ở `whackBots.ts`). Xem `whackBalance.test.ts` và spec 06.
   */
  medals: [1750, 2400, 2600] as const,
} as const;

export type MouseKind = 'thuong' | 'doiLan' | 'nhanh' | 'to';
/** Thứ tự các loại trong `WHACK_SPEC.mix[].weights` */
export const MOUSE_KINDS: readonly MouseKind[] = ['thuong', 'doiLan', 'nhanh', 'to'];
