import { describe, expect, it } from 'vitest';
import { KITE_SPEC } from './kiteConfig';
import { AVERAGE_BOT, GOOD_BOT, percentile, simulateKite, simulateMany } from './kiteBots';
import { createKiteGame, scoreOf } from './kiteLogic';

/**
 * Cân bằng màn 6 (spec 06): 300 ván mỗi bot, seed 1 đến 300. Bot "nhắm tâm khe kế tiếp" (xem `kiteBots.ts`): nhắm tâm dải trống của khe kế (có tính vị trí diều đen lúc diều tới), đoán độ cao lúc cú bật có
 * hiệu lực và bật khi dự đoán thấp hơn tâm nửa độ cao một cú bật (0,5), có độ trễ và lệch giờ; chỉ dùng thao tác của học sinh (bật, trả lời cổng).
 *
 * Hai mục tiêu: bot giỏi Vàng ≥ 90%; bot trung bình qua trung bình ≥ 2 cổng.
 *  - Mốc của spec 150 / 260 / 360: bot giỏi chỉ 65,7% Vàng (< 90%) → đặt lại mốc theo quy tắc phân vị (TẠM): Đồng = p25 bot trung bình (140), Vàng = p10 bot giỏi (260), Bạc: quy tắc cho p75 bot trung bình = 270
 *    không nhỏ hơn Vàng nên KHÔNG dùng được, tự chọn 200. Mốc mới 140 / 200 / 260: bot giỏi 90,7% Vàng (đạt).
 *  - Bot trung bình chỉ qua trung bình 1,61 cổng (< 2): CHƯA ĐẠT; theo lời giao KHÔNG đổi luật, chỉ báo số liệu (xem spec 06). Bot trung bình cũng không "hầu như không Vàng" (31% Vàng ở mốc mới): hai bot chênh
 *    nhau ít so với độ ngẫu nhiên của màn (bot giỏi mất trung bình 2,5 tim mỗi ván, bot trung bình 2,5).
 *
 * Kết quả đã chạy (mốc 140 / 200 / 260; bảng cả mốc spec trong spec 06):
 *  - bot giỏi (trễ 0,08 giây, σ 0,03, đúng 95%): điểm trung bình 381,9 (125 đến 525); chưa đạt 0,7%, Đồng 5,0%, Bạc 3,7%, Vàng 90,7%; qua trung bình 19,8 khe, 2,94 cổng; thắng (đủ 4 cổng) 28,3% ván;
 *  - bot trung bình (trễ 0,18 giây, σ 0,08, đúng 70%): điểm trung bình 208,8 (40 đến 515); chưa đạt 22,7%, Đồng 30,0%, Bạc 16,3%, Vàng 31,0%; qua trung bình 12,5 khe, 1,61 cổng; thắng 0,3% ván.
 * Đổi cấu hình hay bot thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 6', () => {
  const medals = KITE_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);
  const pct = (b: typeof good, n: number) => `${((100 * n) / b.games).toFixed(1)}%`;

  it('in bảng tỉ lệ từng mốc, điểm trung bình, số khe trung bình, số cổng và % ván qua đủ 4 cổng của các bot', () => {
    const row = (name: string, b: typeof good) =>
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · khe trung bình ${b.meanGaps.toFixed(2)} · cổng trung bình ${b.meanGates.toFixed(2)} · qua đủ 4 cổng ${pct(b, b.complete)} · trang ${b.meanPages.toFixed(1)} · câu đúng ${b.meanCorrect.toFixed(2)} · mất tim ${b.meanHits.toFixed(2)}`;
    console.info(['màn 6, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('bot giỏi', good), row('bot trung bình', avg)].join('\n'));
    for (const b of [good, avg]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
      expect(b.gateCounts[0]).toBe(300);
    }
  });

  it('mục tiêu 1: bot giỏi Vàng ≥ 90%', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
  });

  it('mục tiêu 2 (CHƯA ĐẠT, báo số liệu, không đổi luật): bot trung bình qua trung bình dưới 2 cổng', () => {
    expect(avg.meanGates).toBeCloseTo(1.61, 2);
    expect(avg.meanGates).toBeLessThan(2);
    // ván có qua ít nhất 2 cổng: chừng một nửa
    expect(avg.gateCounts[2] / avg.games).toBeCloseTo(0.5167, 3);
  });

  it('mốc điểm đặt theo phân vị: Đồng = p25 bot trung bình, Vàng = p10 bot giỏi (bội số 10); Bạc tự chọn vì p75 bot trung bình không nhỏ hơn Vàng; Đồng < Bạc < Vàng', () => {
    const floorTo = (x: number, unit: number) => Math.floor(x / unit) * unit;
    expect(percentile(avg.scores, 0.25)).toBe(140);
    expect(percentile(avg.scores, 0.75)).toBe(270);
    expect(percentile(good.scores, 0.1)).toBe(260);
    expect(medals[0]).toBe(floorTo(percentile(avg.scores, 0.25), 10));
    expect(medals[2]).toBe(floorTo(percentile(good.scores, 0.1), 10));
    // quy tắc cho Bạc (p75 bot trung bình) không thỏa Bạc < Vàng
    expect(floorTo(percentile(avg.scores, 0.75), 10)).toBeGreaterThanOrEqual(medals[2]);
    expect([...medals]).toEqual([140, 200, 260]);
    expect(medals[0]).toBeLessThan(medals[1]);
    expect(medals[1]).toBeLessThan(medals[2]);
    // mốc spec (150 / 260 / 360) không cho bot giỏi Vàng ≥ 90%
    const specVang = good.scores.filter((v) => v >= 360).length / good.games;
    expect(specVang).toBeLessThan(0.9);
    expect(specVang).toBeCloseTo(0.6567, 3);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateKite(42, AVERAGE_BOT)).toEqual(simulateKite(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('điểm tối đa lý thuyết: 24 khe + mọi trang có trong 24 khe + 4 câu đúng (tối đa 560, trung bình các seed 1 đến 300 khoảng 511,9); mọi điểm của bot nằm dưới đó', () => {
    let sum = 0;
    let max = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const s = createKiteGame(seed);
      const pages = s.gaps.filter((g) => g.pageY !== null).length;
      const m = scoreOf(24, pages, 4);
      sum += m;
      max = Math.max(max, m);
      expect(m).toBeLessThanOrEqual(scoreOf(24, 24, 4));
    }
    expect(scoreOf(24, 24, 4)).toBe(560);
    expect(sum / 300).toBeCloseTo(511.88, 1);
    expect(max).toBe(540);
    expect(good.max).toBeLessThanOrEqual(540);
    expect(good.mean).toBeLessThan(sum / 300);
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(381.87, 1);
    expect(good.medals).toEqual({ chua: 2, dong: 15, bac: 11, vang: 272 });
    expect(good.meanGates).toBeCloseTo(2.94, 2);
    expect(good.meanGaps).toBeCloseTo(19.77, 2);
    expect(good.complete).toBe(85);
    expect(avg.mean).toBeCloseTo(208.75, 1);
    expect(avg.medals).toEqual({ chua: 68, dong: 90, bac: 49, vang: 93 });
    expect(avg.meanGaps).toBeCloseTo(12.54, 2);
    expect(avg.complete).toBe(1);
  });
});
