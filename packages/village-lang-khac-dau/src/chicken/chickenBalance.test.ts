import { describe, expect, it } from 'vitest';
import { CHICKEN_SPEC, chickenVariant } from './chickenConfig';
import { AVERAGE_BOT, GOOD_BOT, ORACLE_BOT, percentile, simulateChicken, simulateMany } from './chickenBots';

/**
 * Cân bằng màn 9 (spec 07): 300 ván mỗi bot, seed 1 đến 300. Bot bắn con gà gần cổng nhất trước, chỉ dùng thao tác của học sinh (xem `chickenBots.ts`).
 * Bot giỏi: 0,4 giây mỗi phát, đúng thuốc 98%, nạp không sai ở 90% số đợt. Bot trung bình: 0,8 giây mỗi phát, đúng thuốc 85%, nạp sai ít nhất 1 lần ở 50% số đợt.
 *
 * Mục tiêu độ khó: bot giỏi Vàng ≥ 85%; bot trung bình tới được gà trùm ≥ 60%. Luật gốc (không phương án A, B, C) đã đạt cả hai (bot trung bình tới trùm 100%), nên KHÔNG dùng phương án nào.
 * Mốc: 300 / 500 / 700 của spec cho bot giỏi Vàng 97,0% nhưng bot trung bình cũng Vàng 22,3% (> 15%) nên đặt lại theo quy tắc màn 6 (TẠM, chỉnh khi học sinh chơi thật):
 * Đồng = phân vị 25% điểm bot trung bình (650), Bạc = phân vị 75% (695), Vàng = phân vị 10% điểm bot giỏi (715), làm tròn xuống bội số 10 → 650 / 690 / 710.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 07):
 *  - người chơi lý tưởng: 750 điểm ở mọi ván (điểm tối đa 30 × 20 + 3 × 30 + 60), không sai, không mất tim, chữa xong trùm;
 *  - bot giỏi: điểm trung bình 737,4 (675 đến 750); chưa đạt 0%, Đồng 1,3%, Bạc 2,3%, Vàng 96,3%; tới trùm 100%, chữa xong trùm 100%; 0,8 phát sai và 2,71 đợt nạp không sai mỗi ván; không mất tim;
 *  - bot trung bình: điểm trung bình 671,3 (590 đến 750); chưa đạt 23,7%, Đồng 43,3%, Bạc 21,7%, Vàng 11,3%; tới trùm 100%, chữa xong trùm 100%; 6,4 phát sai và 1,45 đợt nạp không sai mỗi ván; không mất tim.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 9', () => {
  const medals = CHICKEN_SPEC.medals;
  const oracle = simulateMany(ORACLE_BOT, 300, medals);
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('in bảng tỉ lệ từng mốc, điểm trung bình, % ván tới gà trùm, % chữa xong trùm và số tim mất của các bot', () => {
    const pct = (b: typeof good, n: number) => `${((100 * n) / b.games).toFixed(1)}%`;
    const row = (name: string, b: typeof good) =>
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · tới gà trùm ${pct(b, b.reachedBoss)} · chữa xong trùm ${pct(b, b.bossCleared)} · hết tim ${pct(b, b.lostHearts)} · trùm tới cổng ${pct(b, b.bossEscaped)} · tim mất ${b.meanHeartsLost.toFixed(2)} · ${b.meanCured.toFixed(1)} gà chữa, ${b.meanWrong.toFixed(1)} phát sai, ${b.meanCleanLoads.toFixed(2)} đợt nạp không sai · ${b.meanSeconds.toFixed(0)} giây`;
    console.info(['màn 9, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('lý tưởng', oracle), row('bot giỏi', good), row('bot trung bình', avg)].join('\n'));
    for (const b of [oracle, good, avg]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
    }
  });

  it('mục tiêu 1: bot giỏi Vàng ≥ 85%', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.85);
  });

  it('mục tiêu 2: bot trung bình tới được gà trùm ≥ 60% số ván', () => {
    expect(avg.reachedBoss / avg.games).toBeGreaterThanOrEqual(0.6);
  });

  it('bot trung bình Vàng không quá 15%, và chủ yếu Đồng, Bạc hoặc chưa đạt', () => {
    expect(avg.medals.vang / avg.games).toBeLessThanOrEqual(0.15);
    expect(avg.medals.dong + avg.medals.bac).toBeGreaterThan(avg.medals.vang);
  });

  it('luật gốc đạt cả hai mục tiêu nên không dùng phương án A, B, C: 3 tim, gà không chậm, nhịp sinh không giãn', () => {
    expect(CHICKEN_SPEC.hearts).toBe(3);
    expect(CHICKEN_SPEC.rounds.map((r) => r.runSeconds)).toEqual([9, 7, 6]);
    expect(CHICKEN_SPEC.rounds.map((r) => r.spawnEvery)).toEqual([1.6, 1.3, 1.1]);
    expect(CHICKEN_SPEC.boss.runSeconds).toBe(14);
  });

  it('các phương án A, B, C (chưa dùng) đúng như lời giao: A gà chậm hơn 20% mọi đợt, B thêm 4 tim, C thêm nhịp sinh giãn 20%', () => {
    const a = chickenVariant('A');
    const b = chickenVariant('B');
    const c = chickenVariant('C');
    expect(chickenVariant('base')).toBe(CHICKEN_SPEC);
    CHICKEN_SPEC.rounds.forEach((r, i) => {
      expect(a.rounds[i].runSeconds).toBeCloseTo(r.runSeconds * 1.25, 9); // tốc độ còn 80%
      expect(a.rounds[i].spawnEvery).toBe(r.spawnEvery);
      expect(c.rounds[i].spawnEvery).toBeCloseTo(r.spawnEvery * 1.2, 9);
      expect(b.rounds[i].spawnEvery).toBe(r.spawnEvery);
    });
    expect(a.boss.runSeconds).toBeCloseTo(17.5, 9);
    expect([a.hearts, b.hearts, c.hearts]).toEqual([3, 4, 4]);
    // vẫn đạt mục tiêu ở phương án A (ván nhẹ hơn): chỉ kiểm nhanh với 40 ván
    const avgA = simulateMany(AVERAGE_BOT, 40, a.medals, a);
    expect(avgA.reachedBoss / avgA.games).toBeGreaterThanOrEqual(0.6);
  });

  it('mốc đặt lại theo quy tắc màn 6: Đồng = p25 bot trung bình, Bạc = p75 bot trung bình, Vàng = p10 bot giỏi, làm tròn xuống bội số 10; Đồng < Bạc < Vàng', () => {
    const floorTo = (x: number, unit: number) => Math.floor(x / unit) * unit;
    expect(percentile(avg.scores, 0.25)).toBe(650);
    expect(percentile(avg.scores, 0.75)).toBe(695);
    expect(percentile(good.scores, 0.1)).toBe(715);
    expect(medals).toEqual([floorTo(percentile(avg.scores, 0.25), 10), floorTo(percentile(avg.scores, 0.75), 10), floorTo(percentile(good.scores, 0.1), 10)]);
    expect(medals).toEqual([650, 690, 710]);
    expect(medals[0]).toBeLessThan(medals[1]);
    expect(medals[1]).toBeLessThan(medals[2]);
  });

  it('mốc của spec (300 / 500 / 700) không đạt mục tiêu: bot trung bình Vàng quá 15% (22,3%)', () => {
    const spec700 = simulateMany(AVERAGE_BOT, 300, [300, 500, 700]);
    expect(spec700.medals.vang / spec700.games).toBeGreaterThan(0.15);
    expect(spec700.medals.vang).toBe(67);
    const good700 = simulateMany(GOOD_BOT, 300, [300, 500, 700]);
    expect(good700.medals.vang).toBe(291); // 97,0%
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateChicken(42, AVERAGE_BOT)).toEqual(simulateChicken(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('người chơi lý tưởng: 750 điểm (tối đa 30 gà × 20 + 3 × 30 + 60), không sai, không mất tim, chữa xong trùm ở mọi ván', () => {
    expect(oracle.min).toBe(750);
    expect(oracle.max).toBe(750);
    expect(oracle.reachedBoss).toBe(300);
    expect(oracle.bossCleared).toBe(300);
    expect(oracle.meanWrong).toBe(0);
    expect(oracle.meanHeartsLost).toBe(0);
    expect(oracle.meanCleanLoads).toBe(3);
    expect(oracle.medals.vang).toBe(300);
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(737.4, 1);
    expect(good.min).toBe(675);
    expect(good.max).toBe(750);
    expect(good.medals).toEqual({ chua: 0, dong: 4, bac: 7, vang: 289 });
    expect(good.reachedBoss).toBe(300);
    expect(good.bossCleared).toBe(300);
    expect(good.meanWrong).toBeCloseTo(0.8, 1);
    expect(good.meanCleanLoads).toBeCloseTo(2.71, 2);
    expect(avg.mean).toBeCloseTo(671.3, 1);
    expect(avg.min).toBe(590);
    expect(avg.max).toBe(750);
    expect(avg.medals).toEqual({ chua: 71, dong: 130, bac: 65, vang: 34 });
    expect(avg.reachedBoss).toBe(300);
    expect(avg.bossCleared).toBe(300);
    expect(avg.meanWrong).toBeCloseTo(6.4, 1);
    expect(avg.meanCleanLoads).toBeCloseTo(1.45, 2);
    expect(avg.lostHearts + avg.bossEscaped).toBe(0);
  });
});
