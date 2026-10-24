import { describe, expect, it } from 'vitest';
import { KITE_SPEC } from './kiteConfig';
import { AVERAGE_BOT, GOOD_BOT, percentile, simulateKite, simulateMany } from './kiteBots';
import { createKiteGame, scoreOf } from './kiteLogic';

/**
 * Cân bằng màn 6 (spec 06): 300 ván mỗi bot, seed 1 đến 300. Bot "nhắm tâm khe kế tiếp" (xem `kiteBots.ts`): nhắm tâm dải trống của khe kế (có tính vị trí diều đen lúc diều tới), đoán độ cao lúc cú bật có
 * hiệu lực và bật khi dự đoán thấp hơn tâm nửa độ cao một cú bật (0,5), có độ trễ và lệch giờ; chỉ dùng thao tác của học sinh (bật, trả lời cổng). Mô hình bot giữ nguyên từ B8.
 *
 * Sau B8 (sửa lần 2): mọi cặp khe đều được kiểm qua được (`passable`), và độ khó thử lần lượt, dừng ở phương án ĐẦU TIÊN đạt mục tiêu (bot trung bình qua trung bình ≥ 2 cổng VÀ bot giỏi qua đủ 4 cổng ≥ 70%):
 *   (hiện tại, 3 tim)  bot giỏi 3,14 cổng, 42,3% qua đủ 4 cổng; bot trung bình 1,69 cổng → chưa đạt;
 *   A. 5 tim           bot giỏi 3,89 cổng, 89,0% qua đủ 4 cổng; bot trung bình 2,74 cổng → ĐẠT (dừng ở A; B và C không thử).
 *
 * Mốc theo phân vị (TẠM, chỉnh khi học sinh chơi thật): Đồng = p25 bot trung bình (240), Bạc = p75 bot trung bình (405 → 400), Vàng = p10 bot giỏi (425 → 420), làm tròn xuống bội số 10: 240 / 400 / 420.
 * Bot giỏi Vàng 92,0% (đạt ≥ 85%). Bot trung bình Vàng 21,3% (CHƯA đạt ≤ 15%: p75 bot trung bình = 405 sát p10 bot giỏi = 425, nên không mốc nào theo quy tắc này tách được; báo số liệu, không đổi thêm).
 *
 * Kết quả đã chạy (mốc 240 / 400 / 420, 5 tim):
 *  - bot giỏi (trễ 0,08 giây, σ 0,03, đúng 95%): điểm trung bình 474,6 (195 đến 530); chưa đạt 0,3%, Đồng 4,7%, Bạc 3,0%, Vàng 92,0%; qua trung bình 23,66 khe, 3,89 cổng; thắng (đủ 4 cổng) 89,0% ván; mất 2,64 tim;
 *  - bot trung bình (trễ 0,18 giây, σ 0,08, đúng 70%): điểm trung bình 322,2 (105 đến 515); chưa đạt 22,0%, Đồng 51,3%, Bạc 5,3%, Vàng 21,3%; qua trung bình 18,55 khe, 2,74 cổng; thắng 15,3% ván; mất 3,96 tim.
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

  it('luật độ khó đã chọn (phương án A): 5 tim, khe nhỏ nhất 2,4, tốc độ tối đa 6,5 (B và C không dùng)', () => {
    expect(KITE_SPEC.hearts).toBe(5);
    expect(KITE_SPEC.gapHeightMin).toBe(2.4);
    expect(KITE_SPEC.speedMax).toBe(6.5);
  });

  it('mục tiêu 1: bot trung bình qua trung bình ≥ 2 cổng', () => {
    expect(avg.meanGates).toBeGreaterThanOrEqual(2);
    expect(avg.meanGates).toBeCloseTo(2.74, 2);
  });

  it('mục tiêu 2: bot giỏi qua đủ 4 cổng ≥ 70% số ván', () => {
    expect(good.complete / good.games).toBeGreaterThanOrEqual(0.7);
    expect(good.complete / good.games).toBeCloseTo(0.89, 2);
  });

  it('bot giỏi Vàng ≥ 85%', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.85);
  });

  it('bot trung bình Vàng ≤ 15%: CHƯA ĐẠT (21,3%), báo số liệu, không đổi thêm gì', () => {
    const vang = avg.medals.vang / avg.games;
    expect(vang).toBeCloseTo(0.2133, 3);
    expect(vang).toBeGreaterThan(0.15);
  });

  it('mốc đặt theo phân vị: Đồng = p25 và Bạc = p75 của bot trung bình, Vàng = p10 của bot giỏi (bội số 10); Đồng < Bạc < Vàng', () => {
    const floorTo = (x: number, unit: number) => Math.floor(x / unit) * unit;
    expect(percentile(avg.scores, 0.25)).toBe(240);
    expect(percentile(avg.scores, 0.75)).toBe(405);
    expect(percentile(good.scores, 0.1)).toBe(425);
    expect([...medals]).toEqual([floorTo(percentile(avg.scores, 0.25), 10), floorTo(percentile(avg.scores, 0.75), 10), floorTo(percentile(good.scores, 0.1), 10)]);
    expect([...medals]).toEqual([240, 400, 420]);
    expect(medals[0]).toBeLessThan(medals[1]);
    expect(medals[1]).toBeLessThan(medals[2]);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateKite(42, AVERAGE_BOT)).toEqual(simulateKite(42, AVERAGE_BOT));
    expect(simulateMany(GOOD_BOT, 20, medals)).toEqual(simulateMany(GOOD_BOT, 20, medals));
  });

  it('điểm tối đa lý thuyết: 24 khe + mọi trang có trong 24 khe + 4 câu đúng (tối đa 560; trung bình các seed 1 đến 300 khoảng 511,9); mọi điểm của bot nằm dưới đó', () => {
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
    expect(good.max).toBeLessThanOrEqual(max);
    expect(good.mean).toBeLessThan(sum / 300);
  }, 180000);

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(474.55, 1);
    expect(good.min).toBe(195);
    expect(good.max).toBe(530);
    expect(good.medals).toEqual({ chua: 1, dong: 14, bac: 9, vang: 276 });
    expect(good.meanGates).toBeCloseTo(3.89, 2);
    expect(good.meanGaps).toBeCloseTo(23.66, 2);
    expect(good.complete).toBe(267);
    expect(good.meanHits).toBeCloseTo(2.64, 2);
    expect(avg.mean).toBeCloseTo(322.2, 1);
    expect(avg.min).toBe(105);
    expect(avg.max).toBe(515);
    expect(avg.medals).toEqual({ chua: 66, dong: 154, bac: 16, vang: 64 });
    expect(avg.meanGaps).toBeCloseTo(18.55, 2);
    expect(avg.complete).toBe(46);
    expect(avg.meanHits).toBeCloseTo(3.96, 2);
    expect(avg.gateCounts).toEqual([300, 300, 284, 178, 61]);
    expect(good.gateCounts).toEqual([300, 300, 300, 297, 270]);
  });
});
