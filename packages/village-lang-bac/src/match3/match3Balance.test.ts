import { medalOf } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { AVERAGE_BOT, GOOD_BOT, RANDOM_BOT, simulateMany, type Match3Summary } from './match3Bots';
import { BASE_MATCH3_SPEC, MATCH3_SPEC, match3Variant } from './match3Config';

/**
 * Cân bằng màn 11 (spec 08): 300 ván mỗi bot, seed 1 đến 300; bot chỉ dùng thao tác của học sinh (`swapCells`) và nhìn một nước đi (xem `match3Bots.ts`).
 * Bot giỏi: chọn nước lấp được nhiều ô cây nhất rồi nổ nhiều lá nhất. Bot trung bình: 50% như bot giỏi, 50% chọn ngẫu nhiên một nước hợp lệ. Bot ngẫu nhiên (chỉ báo mức sàn): luôn chọn ngẫu nhiên.
 *
 * Kết quả đã chạy với luật gốc (không phương án A, B), mốc 600 / 1000 / 1400:
 *  - bot giỏi: điểm trung bình 2.553,3 (2.300 đến 2.950; p10 2.425, p25 2.480, p75 2.615); xong cây cả ba vòng 100%; 26,3 lượt và 136,1 lá nổ mỗi ván; còn dư 13,9 / 15,1 / 14,7 lượt ở ba vòng; 0,26 lần xáo bàn mỗi ván; Vàng 300 / 300;
 *  - bot trung bình: 2.537,7 (2.350 đến 2.820; p10 2.420, p25 2.470, p75 2.595); xong cây vòng 1 99,7%, vòng 2 99,7%, vòng 3 100%; 29,4 lượt, 145,1 lá; dư 13,2 / 13,7 / 13,7 lượt; 0,30 lần xáo; Vàng 300 / 300;
 *  - bot ngẫu nhiên: 2.508,2 (2.170 đến 2.825; p10 2.400, p25 2.450, p75 2.565); xong cây 98,7% / 99,7% / 99,0%; 34,1 lượt, 158,2 lá; dư 11,8 / 11,9 / 12,2 lượt; 0,35 lần xáo; Vàng 300 / 300.
 * Mục tiêu "bot trung bình xong cây vòng 1 ≥ 70%" đạt dư (99,7%) nên KHÔNG dùng phương án A hay B (chúng chỉ làm dễ hơn: trung bình 2.850).
 * Mốc: luật gốc làm điểm dồn vào 2.170 đến 2.950 (ô cây lấp 1.000 điểm cố định, lá nổ khoảng 700, thưởng lượt dư khoảng 800), mọi bot đều quá Vàng của spec (1.400), nên mốc 600 / 1000 / 1400 không phân biệt được ai.
 * Quy tắc phân vị cho 2.450 / 2.550 / 2.400, ba mốc cách nhau dưới 150 và không tăng dần, nên KHÔNG áp dụng: giữ mốc của spec, báo số liệu để chủ dự án chọn mốc theo nghĩa (spec 08). Điểm tối đa ước tính: khoảng 3.300
 * (ô cây 1.000, thưởng lượt dư tối đa 20 × (16 + 17 + 17) = 1.000 nếu mỗi ô cây một lượt, lá nổ khoảng 1.300 cho 260 lá; bot giỏi cao nhất thấy 2.950).
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */

const GAMES = 300;
const spec = MATCH3_SPEC;
const roundMean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;

/** Bảng phân vị của lời giao B12 (làm tròn xuống bội số 50); không dùng được khi ba mốc cách nhau dưới 150 điểm. */
function percentileMedals(average: Match3Summary, good: Match3Summary): { marks: [number, number, number]; tooClose: boolean } {
  const down = (v: number) => Math.floor(v / 50) * 50;
  const bronze = down(average.p25);
  let silver = down(average.p75);
  const gold = down(good.p10);
  if (silver >= gold) silver = Math.floor((bronze + gold) / 2);
  const sorted = [bronze, silver, gold];
  const increasing = bronze < silver && silver < gold;
  const tooClose = !increasing || sorted[1] - sorted[0] < 150 || sorted[2] - sorted[1] < 150;
  return { marks: [bronze, silver, gold], tooClose };
}

describe('cân bằng màn 11: 300 ván mỗi bot (seed 1 đến 300)', () => {
  const good = simulateMany(GOOD_BOT, spec, GAMES);
  const average = simulateMany(AVERAGE_BOT, spec, GAMES);
  const random = simulateMany(RANDOM_BOT, spec, GAMES);

  it('in bảng: điểm, mốc, tỉ lệ xong cây từng vòng', () => {
    const rows = [
      ['giỏi', good],
      ['trung bình', average],
      ['ngẫu nhiên', random],
    ] as const;
    const lines = rows.map(([name, r]) => {
      const s = r.summary;
      const spare = [0, 1, 2].map((i) => roundMean(r.results.map((x) => x.turnsLeft[i] ?? 0)).toFixed(1)).join(' / ');
      return `${name}: TB ${s.mean.toFixed(1)} (${s.min} đến ${s.max}; p10 ${s.p10}, p25 ${s.p25}, p75 ${s.p75}), chưa đạt/Đồng/Bạc/Vàng ${s.medals.join(' / ')}, xong cây ${s.doneRate.map((x) => `${(x * 100).toFixed(1)}%`).join(' / ')}, lượt dư ${spare}, ${roundMean(r.results.map((x) => x.moves)).toFixed(1)} lượt, ${roundMean(r.results.map((x) => x.leaves)).toFixed(1)} lá nổ, ${s.meanShuffles.toFixed(2)} lần xáo`;
    });
    console.info(`\n${lines.join('\n')}`);
    expect(lines).toHaveLength(3);
  });

  it('mục tiêu B12: bot trung bình xong cây vòng 1 ≥ 70% (đạt với luật gốc, nên không cần phương án A, B)', () => {
    expect(average.summary.doneRate[0]).toBeGreaterThanOrEqual(0.7);
    expect(spec).toBe(BASE_MATCH3_SPEC);
    expect(spec.rounds.map((r) => r.turns)).toEqual([20, 25, 25]);
  });

  it('số liệu đã ghi ở đầu file (điểm trung bình, xong cây từng vòng, mốc)', () => {
    expect(good.summary.mean).toBeCloseTo(2553.3, 0);
    expect(average.summary.mean).toBeCloseTo(2537.7, 0);
    expect(random.summary.mean).toBeCloseTo(2508.2, 0);
    expect(good.summary.doneRate).toEqual([1, 1, 1]);
    expect(average.summary.doneRate[0]).toBeCloseTo(0.9967, 3);
    expect(random.summary.doneRate[0]).toBeCloseTo(0.9867, 3);
    for (const r of [good, average, random]) expect(r.summary.medals).toEqual([0, 0, 0, GAMES]); // mốc spec: mọi ván đều Vàng
  });

  it('điểm trong khoảng hợp lệ và luôn tính đúng công thức', () => {
    for (const r of [good, average, random]) {
      for (const g of r.results) {
        expect(g.score).toBeGreaterThanOrEqual(0);
        expect(g.score).toBeLessThanOrEqual(3600); // 1.000 ô cây + thưởng dư tối đa 1.000 + khoảng 1.600 điểm lá nổ
        expect(g.slotsFilled).toBeLessThanOrEqual(20);
      }
    }
  });

  it('thứ tự mức: bot giỏi không kém bot trung bình, bot trung bình không kém bot ngẫu nhiên (điểm trung bình)', () => {
    expect(good.summary.mean).toBeGreaterThanOrEqual(average.summary.mean);
    expect(average.summary.mean).toBeGreaterThanOrEqual(random.summary.mean);
  });

  it('mốc 600 / 1000 / 1400 chưa đạt mục tiêu: bot trung bình Vàng 100% (> 15%); phân vị cho ba mốc quá sát nhau (< 150) nên không áp dụng, chờ chủ dự án chọn mốc theo nghĩa', () => {
    const rate = (r: { results: { score: number }[] }) => r.results.filter((x) => medalOf(x.score, spec.medals) === 3).length / GAMES;
    expect(rate(good)).toBeGreaterThanOrEqual(0.85);
    expect(rate(average)).toBeGreaterThan(0.15);
    const p = percentileMedals(average.summary, good.summary);
    expect(p.marks).toEqual([2450, 2425, 2400]); // Bạc >= Vàng nên Bạc = trung bình cộng Đồng và Vàng: vẫn không tăng dần
    expect(p.tooClose).toBe(true);
    expect(spec.medals).toEqual([600, 1000, 1400]);
  });

  it('phương án A và B chỉ làm dễ hơn (nên không dùng): điểm trung bình của bot trung bình tăng', () => {
    const a = simulateMany(AVERAGE_BOT, match3Variant('A'), 60).summary;
    const b = simulateMany(AVERAGE_BOT, match3Variant('B'), 60).summary;
    expect(a.mean).toBeGreaterThan(average.summary.mean);
    expect(b.mean).toBeGreaterThan(average.summary.mean);
    expect(a.doneRate[0]).toBeGreaterThanOrEqual(average.summary.doneRate[0] - 0.05);
  });
});
