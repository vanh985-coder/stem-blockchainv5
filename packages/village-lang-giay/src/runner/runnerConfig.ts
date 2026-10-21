/**
 * Số liệu của màn 2 "Đuổi theo {phanDien}" (spec 05, mục "Màn 2").
 *
 * Chia hai nhóm:
 *  - `RUNNER_SPEC`: số liệu ĐÃ CÓ trong spec. Không đổi nếu không sửa spec.
 *  - `RUNNER_TUNING`: số liệu spec CHƯA có (thời gian đổi làn, kích thước chướng ngại, tần suất vật nhặt…). Đặt ở đây để chỉnh một chỗ; các số tần suất vật nhặt
 *    đã được chỉnh bằng mô phỏng cân bằng (`runnerBalance.test.ts`), đừng đổi nếu chưa chạy lại mô phỏng đó.
 *
 * Đơn vị: mét (đơn vị thế giới), giây. Trục z là hướng chạy; x là làn (−2, 0, 2).
 */

/** Số liệu có trong spec. */
export const RUNNER_SPEC = {
  /** 3 làn: x = −2, 0, 2 (chỉ số làn 0, 1, 2) */
  laneX: [-2, 0, 2] as const,
  /**
   * Tốc độ bắt đầu 10, tăng 0,3 mỗi 5 giây (theo bậc: 10 trong 5 giây đầu, 10,3 trong 5 giây kế…), tối đa 18. Bước X1: trước đó là 8, 0,25 và 16; đổi vì người dùng thấy màn 2 chạy chậm.
   */
  speed: { start: 10, add: 0.3, everySec: 5, max: 18 },
  /** Nhảy: vận tốc đầu 7, trọng lực 22 (đỉnh ≈ 1,11, cả cú nhảy 0,64 giây); có guốc mộc thì vận tốc đầu 10 (0,91 giây) */
  jump: { v0: 7, v0Boots: 10, gravity: 22 },
  /** Trượt kéo dài 0,6 giây; khi trượt, thân cao 0,6 */
  slide: { sec: 0.6, height: 0.6 },
  /** Chướng ngại thấp cao 0,8; sào ngang có đáy ở độ cao 1,0; nóc xe chở hàng cao 0,9 */
  lowHeight: 0.8,
  highBottom: 1.0,
  roofHeight: 0.9,
  /** Khoảng cách giữa hai hàng chướng ngại ≥ tốc độ × 1,0 (có guốc mộc thì × 1,2) */
  gapFactor: 1.0,
  gapFactorBoots: 1.2,
  /** 4 vòng, mỗi vòng 25 giây; câu hỏi có 15 giây trả lời; 3 tim */
  rounds: 4,
  roundSec: 25,
  quizSec: 15,
  hearts: 3,
  /** Trả lời đúng được +3 trang */
  quizPages: 3,
  /** Vật nhặt: khiên (nón lá), guốc mộc, túi tiền đều kéo dài tối đa 10 giây; túi tiền hút tiền trong 6 đơn vị phía trước */
  powerSec: 10,
  magnetRange: 6,
  /** Điểm = trang × 10 + tiền đồng + quãng đường ÷ 10 + câu đúng × 30 */
  score: { perPage: 10, perCoin: 1, perMeters: 10, perCorrect: 30 },
  /** Mốc điểm: Đồng, Bạc, Vàng */
  medals: [200, 380, 520] as const,
  /** {phanDien} chạy ở phía trước cách 12 đến 15 đơn vị; khoảng mỗi 6 giây ném một đống rơm */
  villainAhead: [12, 15] as const,
  throwEverySec: 6,
} as const;

/** Số liệu spec chưa có (đặt tạm, có chú thích). */
export const RUNNER_TUNING = {
  /** Thời gian đổi sang làn bên cạnh (giây). Trong lúc đổi, nhân vật chắn cả hai làn (va chạm tính theo x thật). */
  laneChangeSec: 0.15,
  /** Kích thước thân nhân vật: nửa rộng, nửa dài (dọc đường), cao khi đứng */
  player: { halfWidth: 0.35, halfDepth: 0.3, height: 1.7 },
  /** Nửa rộng của một làn (chướng ngại và vật nhặt) */
  laneHalfWidth: 0.9,
  /** Chướng ngại: nửa dài dọc đường; sào ngang dày từ đáy 1,0 lên 1,5 */
  low: { halfDepth: 0.5, height: 0.8 },
  high: { halfDepth: 0.25, bottom: 1.0, top: 1.5 },
  /**
   * Chắn làn = xe bò (model `xe-bo`, phóng đều 2,4 lần nên dài 2,35: nửa đầu là con bò cao thấp, nửa sau là thùng xe chất rơm) cao 2,5 để cả khi có guốc mộc (đỉnh nhảy 2,27) cũng không bay qua.
   * Phần đầu (con bò) chỉ cao `frontTop` nên nhảy qua được chỗ con bò nhưng vẫn va vào thùng xe phía sau.
   */
  block: { halfDepth: 1.175, height: 2.5, frontLen: 1.175, frontTop: 0.9 },
  /** Chắn làn loại phên giấy (ba tầng phên giữa bốn cột, cao đều): nửa dài dọc đường */
  phenHalfDepth: 0.6,
  /**
   * Xe chở hàng = `units` xe kéo tay (model `xe-cho-hang`) nối đuôi thành một khối chạy trên nóc liên tục. Model phóng đều theo x, z (hệ số `scale` = 1,5) và theo y sao cho đỉnh kiện hàng
   * (0,76 trong file) đúng 0,9 (hệ số y = 1,184; lệch so với x, z là 1,27, không quá 1,3). Thùng xe trong file dài 0,71 (từ x = −0,49 tới 0,22; hai càng xe thấp ở phần còn lại, đầu xe ở phía x dương),
   * nên mỗi xe có thùng dài `unitBed` = 0,71 × 1,5 và cả khối dài `length` = units × unitBed.
   * `halfWidth`: nửa rộng của khối xe (hẹp hơn làn), dùng cho va chạm và đáp lên nóc. `nearOffset`: đầu khối nằm cách vị trí hàng chừng này.
   */
  truck: { units: 4, scale: 1.5, unitBed: 1.065, length: 4.26, halfWidth: 0.5, nearOffset: 0.6 },
  /** Sau khi mất tim, nhấp nháy và không bị va thêm trong chừng này giây */
  hitInvulnSec: 1.0,

  /** Hàng chướng ngại đầu tiên cách vạch xuất phát; sinh trước tới bấy nhiêu phía trước; giữ lại bấy nhiêu phía sau */
  firstRowZ: 30,
  spawnAhead: 90,
  keepBehind: 12,
  /**
   * Hệ số khoảng cách tối thiểu mà bộ sinh dùng LUÔN (kể cả khi chưa có guốc mộc): 1,2 thay vì 1,0 của spec, để lúc vừa nhặt guốc (nhảy mất 0,91 giây) không gặp đoạn quá khó vì
   * các hàng đã sinh sẵn cách nhau theo 1,0. Test của spec (≥ 1,0) vẫn đúng.
   */
  gapFactor: 1.2,
  /** Khoảng cách hai hàng = tốc độ × gapFactor × (1 + ngẫu nhiên từ 0 đến gapJitter) */
  gapJitter: 0.55,
  /** Làn "luôn đi qua được" của hàng kế tiếp: giữ nguyên / sang trái / sang phải (tối đa 1 làn mỗi hàng) */
  pathMove: { stay: 0.5, left: 0.25, right: 0.25 },
  /** Làn đi qua được: trống / thấp (phải nhảy) / cao (phải trượt) */
  pathCell: { empty: 0.45, low: 0.3, high: 0.25 },
  /** Mỗi làn còn lại có chướng ngại với xác suất này; loại chướng ngại theo trọng số */
  otherLaneChance: 0.4,
  otherKind: { block: 0.35, low: 0.25, high: 0.15, truck: 0.25 },

  /** Hai bên đường dừng trước và sau chướng ngại bấy nhiêu mét thì mới đặt vật nhặt */
  itemMargin: 1.0,
  /** Chuỗi vật nhặt: xác suất có mặt trong mỗi khoảng giữa hai hàng, số vật (từ–đến), khoảng cách, phần trăm là trang (còn lại là tiền đồng) */
  chain: { chance: 0.25, min: 3, max: 6, spacing: 1.6, pageShare: 0.4 },
  /** Vật nhặt đặc biệt (nón lá, guốc mộc, túi tiền): xác suất mỗi khoảng giữa hai hàng và trọng số từng loại */
  power: { chance: 0.12, nonla: 0.3, guoc: 0.3, tui: 0.4 },
  /** Trên nóc xe chở hàng: xác suất có hàng vật nhặt (đỉnh nóc) và số vật */
  roof: { chance: 0.7, count: 3 },
  /** Độ cao tâm vật nhặt trên mặt đất; vật nhặt trên nóc xe cộng thêm chiều cao nóc */
  itemY: 0.6,
  itemHalfDepth: 0.4,
  itemHalfWidth: 0.45,

  /**
   * {phanDien} làm rơi 2 đến 4 trang sổ (khoảng mỗi `everySec` ± `jitterSec` giây): trang bay lả tả `flightSec` giây rồi nằm trên một làn, cách `spacing` mét, ở chỗ nhặt được
   * (không trong chướng ngại, cách chướng ngại ≥ `margin`, không chồng lên vật nhặt khác), cách người chơi ≥ `aheadMin` mét. Số trang rơi được trừ vào số trang của các chuỗi vật nhặt sinh sau
   * (ngân sách trang sổ không đổi). Chưa có chỗ phù hợp thì thử lại sau `retrySec`.
   */
  drop: { everySec: 16, jitterSec: 3, min: 2, max: 4, spacing: 1.5, aheadMin: 20, flightSec: 1.0, retrySec: 0.4, margin: 1.0 },
  /** Ném rơm: rơm rơi xuống hàng đầu tiên cách người chơi ít nhất bấy nhiêu mét (còn chỗ trống), bay mất bấy nhiêu giây (chưa va được trong lúc bay); ngẫu nhiên ± giây */
  throwAheadMin: 22,
  throwFlightSec: 0.7,
  throwJitterSec: 1.0,
  /** Chưa có hàng nào hợp lệ để ném rơm thì thử lại sau chừng này giây */
  throwRetrySec: 0.25,

  /** Hết vòng thì chạy chậm dần trong slowSec giây, hỏi, rồi tăng tốc lại trong resumeSec giây; lúc hỏi xóa chướng ngại trong clearAhead mét phía trước */
  slowSec: 1.2,
  resumeSec: 1.0,
  clearAhead: 14,
  /** Bước nhỏ nhất của mô phỏng (giây); dt lớn hơn thì chia nhỏ */
  maxSubstep: 1 / 30,
} as const;

export type RunnerSpec = typeof RUNNER_SPEC;
export type RunnerTuning = typeof RUNNER_TUNING;
