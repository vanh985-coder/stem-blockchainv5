import { describe, expect, it } from 'vitest';
import { CLIMB_SPEC } from './climbConfig';
import { AVERAGE_BOT, GOOD_BOT, simulateClimb, simulateMany } from './climbBots';

/**
 * Cân bằng màn 12 với mốc 250 / 450 / 570 (spec 08; đổi ở bước sửa sau B4): 300 ván mỗi bot, seed 1 đến 300.
 * Bot giỏi phải 100% Vàng (assert). Bot trung bình CHỈ in bảng tỉ lệ, KHÔNG assert ngưỡng 80% / 10% cho màn này: ngưỡng chỉnh khi học sinh chơi thật.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 08):
 *  - bot giỏi (σ 0,04 giây, không đọc nhầm): 586 điểm ở cả 300 ván (36 đồng, 3 tim) → 100% Vàng;
 *  - bot trung bình (σ 0,12 giây, đọc nhầm 10%): điểm trung bình 441,9 (2 đến 586); chưa đạt 12,0%, Đồng 18,7%, Bạc 55,7%, Vàng 13,7%; hết tim 30,7% (92 ván);
 *    trung bình 1,76 lần ngõ cụt, 0,84 lần trượt, 28,2 đồng mỗi ván.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 12', () => {
  const medals = CLIMB_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('bot giỏi: 100% ván đạt Vàng, không ván nào hết tim', () => {
    expect(good.medals.vang).toBe(good.games);
    expect(good.lost).toBe(0);
  });

  it('bot trung bình: chỉ in bảng tỉ lệ (không assert ngưỡng; ngưỡng chỉnh khi học sinh chơi thật)', () => {
    const pct = (n: number) => `${((100 * n) / avg.games).toFixed(1)}%`;
    console.info(
      [
        'màn 12, bot trung bình, 300 ván, mốc ' + medals.join(' / '),
        `chưa đạt ${pct(avg.medals.chua)} · Đồng ${pct(avg.medals.dong)} · Bạc ${pct(avg.medals.bac)} · Vàng ${pct(avg.medals.vang)} · hết tim ${pct(avg.lost)} · điểm trung bình ${avg.mean.toFixed(1)}`,
      ].join('\n'),
    );
    expect(avg.games).toBe(300);
    expect(avg.medals.chua + avg.medals.dong + avg.medals.bac + avg.medals.vang).toBe(300);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateClimb(42, AVERAGE_BOT)).toEqual(simulateClimb(42, AVERAGE_BOT));
    expect(simulateMany(AVERAGE_BOT, 30, medals)).toEqual(simulateMany(AVERAGE_BOT, 30, medals));
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBe(586);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(avg.mean).toBeCloseTo(441.9, 1);
    expect(avg.medals).toEqual({ chua: 36, dong: 56, bac: 167, vang: 41 });
    expect(avg.lost).toBe(92);
  });
});
