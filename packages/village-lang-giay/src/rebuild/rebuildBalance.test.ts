import { describe, expect, it } from 'vitest';
import { REBUILD_SPEC } from './rebuildConfig';
import { AVERAGE_BOT, AVERAGE_BOT_CLEAN, GOOD_BOT, simulateMany, simulateRebuild } from './rebuildBots';

/**
 * Cân bằng màn 3 sau P4b (HAI vòng; vòng 2 kèm đoạn giữ sổ 45 giây với 5 lần tráo, điểm tối đa 100 + 130 + 125 = 355): 300 ván mỗi bot, seed 1 đến 300.
 * Mốc theo quy tắc phân vị bot: Đồng = p25 bot trung bình (290), Bạc = p75 bot trung bình (320), Vàng = p10 bot giỏi (355 = điểm tối đa, vì bot giỏi luôn được đủ 355).
 *
 * Kết quả đã chạy (xem cả bảng trong spec 05, mục "P4b"):
 *  - bot giỏi (đoạn giữ sổ sửa trong 3 đến 4 giây, không sai): 355 ở cả 300 ván → 100% Vàng, không ván nào hết tim;
 *  - bot trung bình CHÍNH (có sai ở vòng 1, 2: 8% đặt nhầm thẻ, 15% đặt thẳng trang giả vào chuỗi; đoạn giữ sổ sửa trong 6 đến 9 giây, 15% kéo nhầm trang thật vào rổ):
 *    điểm trung bình 292,0 (p25 290, p75 320); chưa đạt 41 ván (13,7%), Đồng 133 (44,3%), Bạc 126 (42,0%), Vàng 0%; hết tim 29 ván (9,7%);
 *  - bot trung bình chơi hoàn hảo vòng 1, 2: điểm trung bình 316,5; Đồng 135, Bạc 165, Vàng 0; hết tim 6 ván (2,0%).
 * Trước P4b (3 vòng, vòng 3 giữ sổ 90 giây, mốc 200 / 400 / 475, tối đa 505): bot giỏi 100% Vàng; bot trung bình chính điểm trung bình 392,2, chưa 7,7%, Đồng 15,7%, Bạc 76,7%, Vàng 0%, hết tim 29,7% (89 ván).
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 3 (hai vòng, vòng 2 có đoạn giữ sổ)', () => {
  const medals = REBUILD_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);
  const clean = simulateMany(AVERAGE_BOT_CLEAN, 300, medals);

  it('bot giỏi: ít nhất 90% ván đạt Vàng, không ván nào hết tim', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
    expect(good.diedByHearts).toBe(0);
    expect(good.min).toBeGreaterThanOrEqual(medals[2]);
  });

  it('bot trung bình chính: chủ yếu Đồng hoặc Bạc, không có Vàng; hết tim 9,7% (mục tiêu ≤ 25% đạt)', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThanOrEqual(0.8);
    expect(avg.medals.vang / avg.games).toBeLessThan(0.1);
    expect(avg.diedByHearts / avg.games).toBeLessThanOrEqual(0.25);
  });

  it('bot trung bình chơi hoàn hảo vòng 1, 2: hết tim không quá 25%', () => {
    expect(clean.diedByHearts / clean.games).toBeLessThanOrEqual(0.25);
  });

  it('mốc đúng quy tắc phân vị: Đồng = p25 bot trung bình, Bạc = p75 bot trung bình, Vàng = p10 bot giỏi', () => {
    const p = (xs: number[], q: number): number => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];
    const avgScores = Array.from({ length: 300 }, (_, i) => simulateRebuild(i + 1, AVERAGE_BOT).score);
    const goodScores = Array.from({ length: 300 }, (_, i) => simulateRebuild(i + 1, GOOD_BOT).score);
    expect([p(avgScores, 0.25), p(avgScores, 0.75), p(goodScores, 0.1)]).toEqual([...medals]);
  });

  it('hết tim giữa đoạn giữ sổ vẫn có điểm các ô đã sửa (bước X2b)', () => {
    let withPoints = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = simulateRebuild(seed, AVERAGE_BOT);
      if (r.over === 'hearts' && r.reachedKeep && r.keepPoints > 0) withPoints++;
    }
    expect(withPoints).toBeGreaterThan(0);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateRebuild(42, AVERAGE_BOT)).toEqual(simulateRebuild(42, AVERAGE_BOT));
    expect(simulateMany(AVERAGE_BOT, 50, medals)).toEqual(simulateMany(AVERAGE_BOT, 50, medals));
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBe(355);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(avg.mean).toBeCloseTo(292.03, 1);
    expect(avg.medals).toEqual({ chua: 41, dong: 133, bac: 126, vang: 0 });
    expect(avg.diedByHearts).toBe(29);
    expect(clean.mean).toBeCloseTo(316.5, 1);
    expect(clean.medals).toEqual({ chua: 0, dong: 135, bac: 165, vang: 0 });
    expect(clean.diedByHearts).toBe(6);
  });
});
