/**
 * Số liệu của màn 6 "Diều đưa sổ" (spec 06, mục "Màn 6"). Đơn vị thời gian: GIÂY (mọi `dt`, đồng hồ, bộ đếm); khoảng cách: đơn vị thế giới của cảnh (vùng bay cao từ 0 tới 10), x tăng về phía diều bay.
 * Những chỗ spec chưa nói (đã chốt trong lời giao bước B8, ghi cả trong spec 06) được ghi chú "chốt B8"; chỗ tự chọn thêm ghi "tự chọn".
 */
export const KITE_SPEC = {
  /** Mỗi lần bật lên, vận tốc đứng thành giá trị này; trọng lực; rơi nhanh nhất (vận tốc đứng thấp nhất, âm là đi xuống) */
  flapVelocity: 5.5,
  gravity: 14,
  maxFall: -8,
  /** Vùng bay: đất ở 0, trần ở 10 (chạm là mất tim). Chạm tính theo hộp va chạm của diều. */
  floor: 0,
  ceiling: 10,

  /** Hộp va chạm của diều: chữ nhật quanh tâm diều (chốt B8; học sinh treo dưới diều không tính va chạm) */
  kite: { width: 0.8, height: 0.5 },
  /** Cột tre rộng 0,9 (chốt B8) */
  pillarWidth: 0.9,

  /** Khe nằm trọn trong [gapMin; gapMax] */
  gapMin: 0.5,
  gapMax: 9.5,
  /**
   * Chiều cao khe (chốt sau B8): khe 1 cao 3,16, mỗi khe hẹp 0,04, dừng ở `gapHeightMin`. Khe thứ k (đếm từ 1) cao max(gapHeightMin; 3,2 − 0,04 × k): với gapHeightMin = 2,4 thì đạt 2,4 đúng ở khe thứ 20 (khớp dòng test
   * "2,4 ở khe 20" của spec), khe thứ nhất cao 3,16 chứ không đủ 3,2.
   */
  gapHeight0: 3.2,
  gapShrink: 0.04,
  gapHeightMin: 2.4,
  /** Các cặp cột cách nhau 5 (từ tâm cột tới tâm cột); khe đầu cách chỗ diều xuất phát `firstGapX` (tự chọn: 8, khoảng 2 giây bay) */
  gapSpacing: 5,
  firstGapX: 8,
  /** Tâm hai khe liền nhau chênh nhau tối đa chừng này (chốt B8) */
  maxCenterShift: 3,

  /** Tốc độ ngang: 4, mỗi khe vượt qua tăng 0,1, tối đa 6,5 */
  speed0: 4,
  speedStep: 0.1,
  speedMax: 6.5,

  /**
   * Số tim. Spec: 3. ĐỔI sau B8 (phương án A của bước sửa độ khó): 5, vì với 3 tim bot trung bình chỉ qua trung bình 1,69 cổng và bot giỏi chỉ 42,3% ván qua đủ 4 cổng (đã tính cả bộ sinh khe bảo đảm qua được);
   * với 5 tim: 2,74 cổng và 89,0% (xem `kiteBalance.test.ts` và spec 06).
   */
  hearts: 5,
  /** Bất tử sau khi mất tim và sau câu hỏi ở cổng */
  invSeconds: 1,

  /**
   * Diều đen của {phanDien} (chốt B8): từ khe `fromGap`, mỗi khe có `chance` xuất hiện; cao 0,6; bám nửa trên hoặc nửa dưới khe (rng), dao động lên xuống trong dải sát mép đó sao cho phần trống còn lại của khe
   * luôn ≥ `minFree` (1,4): dải dao động rộng (cao khe − cao diều đen − minFree), khe 2,4 thì dải chỉ 0,4. Dao động theo thời gian chạy của ván (chu kỳ `period` giây, tự chọn), bề rộng hộp `width` (tự chọn).
   * Diều đen nằm đúng mặt phẳng của khe (cùng x với cặp cột).
   */
  black: { fromGap: 8, chance: 0.35, height: 0.6, width: 0.8, minFree: 1.4, period: 1.6 },
  /** Trang bản sao (chốt B8): mỗi khe tối đa 1 trang (xác suất `chance`), đặt trong phần trống chắc chắn của khe, cùng x với khe; nhặt khi chạm hộp diều; hình vuông cạnh `size` (tự chọn) */
  page: { chance: 0.6, size: 0.5 },

  /**
   * Cổng làng: sau khe thứ 6, 12, 18, 24 là cổng của làng thứ 1, 2, 3, 4. Cổng đặt giữa khe đó và khe kế (`offset` từ tâm khe, tự chọn = nửa khoảng cách). Tới cổng game dừng và hiện câu hỏi `quizSeconds` giây;
   * đúng +`correctPoints`; sai hay hết giờ mất 1 tim; cổng vẫn mở. Qua đủ 4 cổng là thắng.
   */
  gates: { after: [6, 12, 18, 24] as readonly number[], offset: 2.5, quizSeconds: 20, correctPoints: 50 },
  /** Điểm = số khe × 10 + số trang bản sao × 5 + số câu đúng × 50 */
  points: { gap: 10, page: 5 },

  /** Bước mô phỏng cố định (giây): `stepKite` chia `dt` thành các bước này để kết quả không phụ thuộc tốc độ khung hình (tự chọn: 1/120) */
  tick: 1 / 120,
  /**
   * Mốc điểm cả ván: Đồng, Bạc, Vàng (khai báo theo chuẩn màn 2, 3, 5, 8, 12). TẠM, chỉnh khi học sinh chơi thật. Đặt lại sau B8 theo phân vị của 300 ván mỗi bot ở luật hiện tại (5 tim): Đồng = p25 bot trung bình (240),
   * Bạc = p75 bot trung bình (405), Vàng = p10 bot giỏi (425), làm tròn xuống bội số 10: 240 / 400 / 420. (Nếu Bạc ≥ Vàng thì Bạc = trung bình cộng của Đồng và Vàng, làm tròn xuống bội số 10; lần này không cần.)
   */
  medals: [240, 400, 420] as const,
} as const;
