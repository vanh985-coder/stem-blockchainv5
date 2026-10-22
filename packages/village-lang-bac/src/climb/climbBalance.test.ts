import { describe, expect, it } from 'vitest';
import { CLIMB_SPEC } from './climbConfig';
import { AVERAGE_BOT, GOOD_BOT, simulateClimb, simulateMany } from './climbBots';

/**
 * Cân bằng màn 12 với mốc 250 / 400 / 520 (spec 08): 300 ván mỗi bot, seed 1 đến 300. Tiêu chí như màn 2, 3, 8: bot giỏi ≥ 90% Vàng; bot trung bình Đồng hoặc Bạc ≥ 80%, Vàng dưới 10%.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 08):
 *  - bot giỏi (σ 0,04 giây, không đọc nhầm): 586 điểm ở cả 300 ván (36 đồng, 3 tim) → 100% Vàng;
 *  - bot trung bình (σ 0,12 giây, đọc nhầm 10%): điểm trung bình 441,9 (2 đến 586); chưa đạt 12,0%, Đồng 18,7%, Bạc 28,3%, Vàng 41,0%; hết tim 30,7% (92 ván);
 *    trung bình 1,76 lần ngõ cụt, 0,84 lần trượt, 28,2 đồng mỗi ván. TIÊU CHÍ CHƯA ĐẠT (Vàng quá nhiều, Đồng + Bạc 47%): không sửa mốc, chờ chủ dự án quyết.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 12', () => {
  const medals = CLIMB_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('bot giỏi: ít nhất 90% ván đạt Vàng, không ván nào hết tim', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
    expect(good.lost).toBe(0);
  });

  it('bot trung bình: CHƯA đạt tiêu chí (Đồng + Bạc 47%, Vàng 41%): ghi lại số thật, mốc giữ nguyên chờ quyết định', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeLessThan(0.8);
    expect(avg.medals.vang / avg.games).toBeGreaterThanOrEqual(0.1);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateClimb(42, AVERAGE_BOT)).toEqual(simulateClimb(42, AVERAGE_BOT));
    expect(simulateMany(AVERAGE_BOT, 30, medals)).toEqual(simulateMany(AVERAGE_BOT, 30, medals));
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBe(586);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(avg.mean).toBeCloseTo(441.9, 1);
    expect(avg.medals).toEqual({ chua: 36, dong: 56, bac: 85, vang: 123 });
    expect(avg.lost).toBe(92);
  });
});
