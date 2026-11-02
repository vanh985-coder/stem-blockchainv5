import { describe, expect, it } from 'vitest';
import { WHACK_SPEC } from './whackConfig';
import { AVERAGE_BOT, GOOD_BOT, ORACLE_BOT, percentile, simulateMany, simulateWhack } from './whackBots';

/**
 * Cân bằng màn 5 (spec 06): 300 ván mỗi bot, seed 1 đến 300. Bot "canh trước" (xem `whackBots.ts`): đập lúc chuột ở giữa vùng đập, lệch giờ theo phân phối chuẩn, một tay, chỉ dùng thao tác của học sinh.
 * Luật vết mực theo phương án A (cân bằng sau B6): sổ chịu tối đa 8 vết mực, đập đúng chuột đáp án xoá 2 vết.
 * P9 (chuột đi từ dưới lên, lượt đáp án): chuột câu hỏi phải bị đập trúng, rồi 4 chuột vàng A–D chạy lên (P9c: 11 giây lần 1–5, 9 giây lần 6–10; trước 18 và 14); điểm đáp án = 100 + 5 × số giây chuột còn cần để tới sổ (nút "Đọc xong" không đổi điểm: bot bấm sau `answerDelay` giây).
 * P9b (chỉnh độ khó): nhịp sinh 1,3 → 0,7 giây (trước 1,2 → 0,55), chuột thường cần 3,2 → 2,2 giây tới đầu vùng đập (trước 3,0 → 1,8); tốc độ chuột đáp án giữ nguyên.
 * Mốc đặt lại theo số liệu này (TẠM, chỉnh khi học sinh chơi thật): Đồng = p25 bot trung bình (1750) làm tròn xuống bội số 50 = 1750; Bạc = p75 bot trung bình (2370) làm tròn xuống bội số 50 = 2350;
 * Vàng = p10 bot giỏi (2570) làm tròn xuống bội số 50 = 2550.
 *
 * Mục tiêu (assert): bot giỏi Vàng ≥ 90% và thua đầy sổ ≤ 2%; bot trung bình thua đầy sổ ≤ 40%, Vàng < 10%, gặp trung bình ≥ 6 lượt trùm.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 06):
 *  - người chơi lý tưởng: điểm trung bình 2819,3 (2675 đến 2975), 123 chuột, đủ 10 lượt ở mọi ván, Vàng 100%;
 *  - bot giỏi: điểm trung bình 2693,4 (2320 đến 2900); chưa đạt 0%, Đồng 0,7%, Bạc 4,7%, Vàng 94,7%; thua 0%; 100% ván chơi hết 10 lượt; đúng 9,47 lượt;
 *  - bot trung bình: điểm trung bình 1997,82 (245 đến 2645); chưa đạt 24,7%, Đồng 47,3%, Bạc 24,7%, Vàng 3,3%; thua vì đầy sổ 37,3%; gặp trung bình 8,97 lượt, 64,3% ván chơi hết 10 lượt; lọt 11,1 chuột mỗi ván.
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
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · thua đầy sổ ${pct(b, b.lost)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · lượt trùm gặp được ${b.meanBosses.toFixed(2)} · hết 10 lượt ${pct(b, b.fullBosses)} · ${b.meanSpawned.toFixed(1)} chuột, đập ${b.meanHits.toFixed(1)}, lọt ${b.meanLeaked.toFixed(2)}, ${b.meanCoins.toFixed(1)} đồng`;
    console.info(['màn 5, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('lý tưởng', oracle), row('bot giỏi', good), row('bot trung bình', avg)].join('\n'));
    for (const b of [oracle, good, avg]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
    }
  });

  it('mục tiêu 1: bot giỏi Vàng ≥ 90%, thua đầy sổ ≤ 2%', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
    expect(good.lost / good.games).toBeLessThanOrEqual(0.02);
  });

  it('mục tiêu 2: bot trung bình thua đầy sổ ≤ 40%, gặp trung bình ≥ 6 lượt trùm', () => {
    expect(avg.lost / avg.games).toBeLessThanOrEqual(0.4);
    expect(avg.meanBosses).toBeGreaterThanOrEqual(6);
  });

  it('bot trung bình: Vàng dưới 10%, chủ yếu Đồng và Bạc', () => {
    expect(avg.medals.vang / avg.games).toBeLessThan(0.1);
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThan(0.6);
  });

  it('luật vết mực theo phương án A: đầy sổ 8 vết, đập đúng đáp án xoá 2 vết; nhịp sinh cuối ván 0,7 giây', () => {
    expect(WHACK_SPEC.inkMax).toBe(8);
    expect(WHACK_SPEC.boss.inkOnCorrect).toBe(-2);
    expect(WHACK_SPEC.spawnEnd).toBe(0.7);
  });

  it('mốc đặt theo số liệu: Đồng = p25 bot trung bình, Bạc = p75 bot trung bình (bội số 50), Vàng = p10 bot giỏi; Đồng < Bạc < Vàng', () => {
    const floorTo = (x: number, unit: number) => Math.floor(x / unit) * unit;
    expect(percentile(avg.scores, 0.25)).toBe(1750);
    expect(percentile(avg.scores, 0.75)).toBe(2370);
    expect(percentile(good.scores, 0.1)).toBe(2570);
    expect(medals).toEqual([floorTo(percentile(avg.scores, 0.25), 50), floorTo(percentile(avg.scores, 0.75), 50), floorTo(percentile(good.scores, 0.1), 50)]);
    expect(medals).toEqual([1750, 2350, 2550]);
    expect(medals[0]).toBeLessThan(medals[1]);
    expect(medals[1]).toBeLessThan(medals[2]);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateWhack(42, AVERAGE_BOT)).toEqual(simulateWhack(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('người chơi lý tưởng không để lọt chuột nào, đập đúng cả 10 lượt đáp án, điểm khoảng 3200 (ước điểm tối đa lý thuyết)', () => {
    expect(oracle.lost).toBe(0);
    expect(oracle.meanLeaked).toBe(0);
    expect(oracle.meanBosses).toBe(10);
    expect(oracle.meanBossCorrect).toBe(10);
    expect(oracle.medals.vang).toBe(300);
    expect(oracle.mean).toBeCloseTo(2819.3, 1);
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(2693.4, 1);
    expect(good.medals).toEqual({ chua: 0, dong: 2, bac: 14, vang: 284 });
    expect(good.lost).toBe(0);
    expect(good.fullBosses).toBe(300);
    expect(avg.mean).toBeCloseTo(1997.82, 2);
    expect(avg.medals).toEqual({ chua: 74, dong: 142, bac: 74, vang: 10 });
    expect(avg.lost).toBe(112);
    expect(avg.fullBosses).toBe(193);
    expect(avg.meanBosses).toBeCloseTo(8.97, 2);
    expect(avg.meanLeaked).toBeCloseTo(11.08, 2);
  });
});
