import { describe, expect, it } from 'vitest';
import { REBUILD_SPEC } from './rebuildConfig';
import { REBUILD_MAX_SCORE } from './rebuildLogic';
import { AVERAGE_BOT, AVERAGE_BOT_CLEAN, GOOD_BOT, simulateMany, simulateRebuild } from './rebuildBots';

/**
 * Cân bằng màn 3 sau khi bỏ giữ sổ (02/11/2026; HAI vòng ghép sổ, điểm tối đa 100 + 130 = 230): 300 ván mỗi bot, seed 1 đến 300.
 * Mốc: Đồng = 210 (qua 2 vòng với 2 lỗi), Bạc = 220 (qua 2 vòng với 1 lỗi), Vàng = 230 (hoàn hảo 0 lỗi, p10 bot giỏi = 230 = điểm tối đa).
 *
 * Kết quả mô phỏng (300 ván mỗi bot):
 *  - bot giỏi (ghép hoàn hảo cả 2 vòng, bỏ đúng trang giả): 230 ở cả 300 ván → 100% Vàng, 0 ván hết tim;
 *  - bot trung bình CHÍNH (8% đặt nhầm thẻ sai mã trước, 15% đặt thẳng trang giả vào chuỗi):
 *    điểm trung bình 212,0 (min 80, p10 210, p25 220, p50 220, p75 230, p90 230);
 *    chưa đạt 23 ván (7,7%), Đồng 47 ván (15,7%), Bạc 122 ván (40,7%), Vàng 108 ván (36,0%); hết tim 23 ván (7,7%, mục tiêu ≤ 25% đạt);
 *  - bot trung bình chơi hoàn hảo vòng 1, 2: 300 ván đều 230 điểm (100% Vàng, 0 ván hết tim).
 * Trước đó (P4b, kèm 45 giây giữ sổ, tối đa 355): mốc 290 / 320 / 330; bot giỏi 100% Vàng; bot trung bình chính điểm TB 292,0, chưa 13,7%, Đồng 44,3%, Bạc 25,3%, Vàng 16,7%, hết tim 9,7% (29 ván).
 * Trước P4b (3 vòng, 90 giây giữ sổ, tối đa 505): mốc 200 / 400 / 475.
 */
describe('cân bằng màn 3 (hai vòng ghép sổ, bỏ giữ sổ)', () => {
  const medals = REBUILD_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);
  const clean = simulateMany(AVERAGE_BOT_CLEAN, 300, medals);

  it('bot giỏi: 100% ván đạt Vàng, không ván nào hết tim', () => {
    expect(good.medals.vang / good.games).toBe(1.0);
    expect(good.diedByHearts).toBe(0);
    expect(good.min).toBe(REBUILD_MAX_SCORE);
  });

  it('bot trung bình chính: chủ yếu Đồng hoặc Bạc (56,4%), hết tim 7,7% (đạt mục tiêu ≤ 25%)', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThanOrEqual(0.5);
    expect(avg.diedByHearts / avg.games).toBeLessThanOrEqual(0.25);
  });

  it('bot trung bình chơi hoàn hảo: 100% hoàn thành không hết tim', () => {
    expect(clean.diedByHearts).toBe(0);
  });

  it('mốc điểm: Đồng 210, Bạc 220, Vàng 230 (= REBUILD_MAX_SCORE, p10 bot giỏi = 230)', () => {
    const avgScores = Array.from({ length: 300 }, (_, i) => simulateRebuild(i + 1, AVERAGE_BOT).score);
    const goodScores = Array.from({ length: 300 }, (_, i) => simulateRebuild(i + 1, GOOD_BOT).score);
    const at = (xs: number[], q: number) => xs.slice().sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];
    expect(at(goodScores, 0.1)).toBe(REBUILD_MAX_SCORE);
    expect(at(avgScores, 0.25)).toBe(220);
    expect(at(avgScores, 0.75)).toBe(230);
    expect(medals).toEqual([210, 220, 230]);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateRebuild(42, AVERAGE_BOT)).toEqual(simulateRebuild(42, AVERAGE_BOT));
    expect(simulateMany(AVERAGE_BOT, 50, medals)).toEqual(simulateMany(AVERAGE_BOT, 50, medals));
  });

  it('con số khớp với kết quả mô phỏng', () => {
    expect(good.mean).toBe(230);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(avg.mean).toBe(212);
    expect(avg.medals).toEqual({ chua: 23, dong: 47, bac: 122, vang: 108 });
    expect(avg.diedByHearts).toBe(23);
    expect(clean.mean).toBe(230);
    expect(clean.medals).toEqual({ chua: 0, dong: 0, bac: 0, vang: 300 });
    expect(clean.diedByHearts).toBe(0);
  });
});
