import { describe, expect, it } from 'vitest';
import { MEMORY_SPEC } from './memoryConfig';
import { AVERAGE_BOT, GOOD_BOT, simulateMany, simulateMemory } from './memoryBots';

/**
 * Cân bằng màn 8 với mốc 300 / 550 / 750 (spec 07): 300 ván mỗi bot, seed 1 đến 300. Tiêu chí như màn 2, 3: bot giỏi ≥ 90% Vàng; bot trung bình chủ yếu Đồng hoặc Bạc
 * (≥ 80%), Vàng dưới 10%. Màn 8 không có tim nên không có tỉ lệ hết tim.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 07):
 *  - bot giỏi (nhớ hết, tính đúng, để ý thẻ bị tráo): lật sai trung bình 1,92 / 3,16 / 4,52 mỗi vòng; điểm trung bình 804,0 (thấp nhất 780) → 100% Vàng;
 *  - bot trung bình (quên 30% thẻ đã thấy sau mỗi lượt, 15% lật nhầm sang thẻ bên cạnh, không để ý thẻ bị tráo): lật sai trung bình 3,40 / 7,13 / 13,35;
 *    điểm trung bình 661,3 (490 đến 800); chưa đạt 0%, Đồng 5,3%, Bạc 90,0%, Vàng 4,7%.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 8', () => {
  const medals = MEMORY_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('bot giỏi: ít nhất 90% ván đạt Vàng', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
  });

  it('bot trung bình: chủ yếu Đồng hoặc Bạc, hầu như không Vàng', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThanOrEqual(0.8);
    expect(avg.medals.vang / avg.games).toBeLessThan(0.1);
  });

  it('vòng 3 có tráo bài trong lúc bot chơi', () => {
    let swapped = 0;
    for (let seed = 1; seed <= 50; seed++) if (simulateMemory(seed, AVERAGE_BOT).swaps > 0) swapped++;
    expect(swapped).toBeGreaterThan(40);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateMemory(42, AVERAGE_BOT)).toEqual(simulateMemory(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 30, medals)).toEqual(simulateMany(GOOD_BOT, 30, medals));
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(804.0, 1);
    expect(good.min).toBe(780);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(avg.mean).toBeCloseTo(661.3, 1);
    expect(avg.medals).toEqual({ chua: 0, dong: 16, bac: 270, vang: 14 });
  });
});
