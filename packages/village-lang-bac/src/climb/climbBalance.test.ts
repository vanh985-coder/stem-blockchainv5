import { describe, expect, it } from 'vitest';
import { CLIMB_SPEC } from './climbConfig';
import { AVERAGE_BOT, GOOD_BOT, simulateClimb, simulateMany } from './climbBots';

/**
 * Cân bằng màn 12 "Leo bậc gỗ" với mốc 200 / 350 / 450 (theo nghĩa, spec 08): 300 ván mỗi bot, seed 1 đến 300.
 * Bot giỏi phải 100% Vàng (assert). Bot trung bình (nhầm thứ tự 15%, nhảy hụt 10%) CHỈ in bảng tỉ lệ, không assert ngưỡng.
 */
describe('cân bằng màn 12', () => {
  const medals = CLIMB_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('bot giỏi: 100% ván đạt Vàng (450 điểm), không hết tim, không nhầm, không hụt', () => {
    expect(good.medals.vang).toBe(good.games);
    expect(good.mean).toBe(450);
    expect(good.lost).toBe(0);
    expect(good.meanMistakes).toBe(0);
    expect(good.meanMisses).toBe(0);
  });

  it('bot trung bình: chỉ in bảng tỉ lệ (không assert ngưỡng)', () => {
    const pct = (n: number) => `${((100 * n) / avg.games).toFixed(1)}%`;
    console.info(
      [
        'màn 12, bot trung bình (nhầm thứ tự 15%, nhảy hụt 10%), 300 ván, mốc ' + medals.join(' / '),
        `chưa đạt ${pct(avg.medals.chua)} · Đồng ${pct(avg.medals.dong)} · Bạc ${pct(avg.medals.bac)} · Vàng ${pct(avg.medals.vang)} · hết tim ${pct(avg.lost)} · điểm trung bình ${avg.mean.toFixed(1)} (${avg.min} đến ${avg.max}) · nhầm ${avg.meanMistakes.toFixed(2)} lần, hụt ${avg.meanMisses.toFixed(2)} lần mỗi ván`,
      ].join('\n'),
    );
    expect(avg.games).toBe(300);
    expect(avg.medals.chua + avg.medals.dong + avg.medals.bac + avg.medals.vang).toBe(300);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateClimb(42, AVERAGE_BOT)).toEqual(simulateClimb(42, AVERAGE_BOT));
  });
});
