import { describe, expect, it } from 'vitest';
import { WHACK_SPEC } from './whackConfig';
import { AVERAGE_BOT, GOOD_BOT, ORACLE_BOT, percentile, simulateMany, simulateWhack } from './whackBots';

/**
 * Cân bằng màn 5 (spec 06): 300 ván mỗi bot, seed 1 đến 300. Bot "canh trước" (xem `whackBots.ts`): đập lúc chuột ở giữa vùng đập, lệch giờ theo phân phối chuẩn, một tay, chỉ dùng thao tác của học sinh.
 * Mốc 550 / 1500 / 3100 đặt từ chính số liệu này (TẠM, chỉnh khi học sinh chơi thật): Đồng = phân vị 25% điểm bot trung bình (575) làm tròn xuống bội số 50; Bạc = phân vị 75% điểm bot trung bình (1535) làm tròn
 * xuống bội số 50; Vàng = phân vị 10% điểm bot giỏi (3120) làm tròn xuống bội số 100.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 06):
 *  - người chơi lý tưởng (σ 0, không sót, đúng hết): điểm trung bình 3576,4 (3395 đến 3745), 143 chuột, 14,5 đồng, đủ 10 lượt trùm ở mọi ván → ước điểm tối đa lý thuyết khoảng 3580;
 *  - bot giỏi (σ 0,05 giây, sót 2%, đúng 95%, trả lời sau 4 giây): điểm trung bình 3264,9 (2310 đến 3490); chưa đạt 0%, Đồng 0%, Bạc 8,7%, Vàng 91,3%; thua vì 5 vết mực 0,3%; gặp trung bình 9,997 lượt trùm,
 *    99,7% ván chơi hết 10 lượt;
 *  - bot trung bình (σ 0,12 giây, sót 10%, đúng 70%, trả lời sau 7 giây): điểm trung bình 1105,6 (55 đến 2940); chưa đạt 23,0%, Đồng 49,0%, Bạc 28,0%, Vàng 0%; thua vì 5 vết mực 98,7%; gặp trung bình 4,74 lượt trùm,
 *    chỉ 1,3% ván chơi hết 10 lượt.
 * MỤC TIÊU CHƯA ĐẠT: bot trung bình gặp trung bình 4,74 lượt trùm, dưới mục tiêu 6 (lọt 6,0 chuột mỗi ván, chủ yếu trước khi tới lượt trùm cuối). Theo lời giao KHÔNG tự đổi thêm luật; số thật ghi ở đây và spec 06.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 5', () => {
  const medals = WHACK_SPEC.medals;
  const oracle = simulateMany(ORACLE_BOT, 300, medals);
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('in bảng tỉ lệ từng mốc, điểm trung bình, số lượt trùm gặp được và % ván hết 10 lượt trùm của các bot', () => {
    const pct = (b: typeof good, n: number) => `${((100 * n) / b.games).toFixed(1)}%`;
    const row = (name: string, b: typeof good) =>
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · thua 5 vết mực ${pct(b, b.lost)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · lượt trùm gặp được ${b.meanBosses.toFixed(2)} · hết 10 lượt ${pct(b, b.fullBosses)} · ${b.meanSpawned.toFixed(1)} chuột, đập ${b.meanHits.toFixed(1)}, lọt ${b.meanLeaked.toFixed(2)}, ${b.meanCoins.toFixed(1)} đồng`;
    console.info(['màn 5, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('lý tưởng', oracle), row('bot giỏi', good), row('bot trung bình', avg)].join('\n'));
    for (const b of [oracle, good, avg]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
    }
  });

  it('bot giỏi: Vàng ≥ 90%', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
  });

  it('bot trung bình: không Vàng, chủ yếu Đồng và Bạc', () => {
    expect(avg.medals.vang).toBe(0);
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThan(0.7);
  });

  it('mốc đặt theo phân vị: Đồng = p25 bot trung bình, Bạc = p75 bot trung bình (bội số 50), Vàng = p10 bot giỏi (bội số 100); Đồng < Bạc < Vàng', () => {
    const floorTo = (x: number, unit: number) => Math.floor(x / unit) * unit;
    expect(percentile(avg.scores, 0.25)).toBe(575);
    expect(percentile(avg.scores, 0.75)).toBe(1535);
    expect(percentile(good.scores, 0.1)).toBe(3120);
    expect(medals).toEqual([floorTo(575, 50), floorTo(1535, 50), floorTo(3120, 100)]);
    expect(medals).toEqual([550, 1500, 3100]);
    expect(medals[0]).toBeLessThan(medals[1]);
    expect(medals[1]).toBeLessThan(medals[2]);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateWhack(42, AVERAGE_BOT)).toEqual(simulateWhack(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('người chơi lý tưởng không để lọt chuột nào, trả lời đúng cả 10 lượt trùm, điểm khoảng 3580 (ước điểm tối đa lý thuyết)', () => {
    expect(oracle.lost).toBe(0);
    expect(oracle.meanLeaked).toBe(0);
    expect(oracle.meanBosses).toBe(10);
    expect(oracle.meanBossCorrect).toBe(10);
    expect(oracle.medals.vang).toBe(300);
    // lượt trùm tối đa: 5 × (100 + 5 × 15) + 5 × (100 + 5 × 10) = 1625
    expect(oracle.min).toBeGreaterThan(1625);
    expect(oracle.mean).toBeCloseTo(3576.4, 1);
  });

  it('con số đã ghi trong spec khớp lần chạy này (kể cả mục tiêu 6 lượt trùm của bot trung bình CHƯA đạt: 4,74)', () => {
    expect(good.mean).toBeCloseTo(3264.9, 1);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 26, vang: 274 });
    expect(good.lost).toBe(1);
    expect(good.fullBosses).toBe(299);
    expect(good.meanBosses).toBeCloseTo(9.997, 3);
    expect(avg.mean).toBeCloseTo(1105.55, 2);
    expect(avg.medals).toEqual({ chua: 69, dong: 147, bac: 84, vang: 0 });
    expect(avg.lost).toBe(296);
    expect(avg.fullBosses).toBe(4);
    expect(avg.meanBosses).toBeCloseTo(4.74, 2);
    expect(avg.meanBosses).toBeLessThan(6); // mục tiêu ≥ 6 chưa đạt; không tự đổi luật, báo số liệu
  });
});
