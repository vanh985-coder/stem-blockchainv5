import { medalOf } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { AVERAGE_BOT, GOOD_BOT, RANDOM_BOT, simulateMany, type Match3SimResult } from './match3Bots';
import { MATCH3_SPEC, match3Variant, type Match3Variant } from './match3Config';

/**
 * Cân bằng màn 11 (spec 08): 300 ván mỗi bot, seed 1 đến 300; bot chỉ dùng thao tác của học sinh (`swapCells`) và nhìn một nước đi (xem `match3Bots.ts`).
 * Bot giỏi: chọn nước lấp được nhiều ô cây nhất rồi nổ nhiều lá nhất. Bot trung bình: 50% như bot giỏi, 50% chọn ngẫu nhiên một nước hợp lệ. Bot ngẫu nhiên: luôn chọn ngẫu nhiên.
 *
 * Lý do chỉnh (lời giao "cân bằng màn 11"): với luật gốc (20, 25, 25 lượt) bot ngẫu nhiên cũng xong cây ~99% và mọi bot đều Vàng, học sinh bấm bừa vẫn thắng.
 * Chỉ đổi số lượt, thử lần lượt A (12, 16, 16), B (10, 14, 14), C (8, 12, 12). Mục tiêu: bot giỏi xong cả 3 cây ≥ 85% và bot ngẫu nhiên xong cả 3 cây ≤ 40% (bot trung bình chỉ in ra).
 *
 * Số ván xong cả 3 cây (trên 300): A giỏi 260 (86,7%), trung bình 240, ngẫu nhiên 177 (59,0% > 40%); B giỏi 215 (71,7% < 85%), trung bình 179, ngẫu nhiên 107 (35,7%); C giỏi 137 (45,7% < 85%), trung bình 101, ngẫu nhiên 45 (15,0%).
 * KHÔNG phương án nào đạt cả hai mục tiêu: A cho bot ngẫu nhiên còn xong cây quá nhiều, B và C làm bot ngẫu nhiên đủ khó nhưng bot giỏi (nhìn một nước đi) xong cây quá ít. Theo lời giao dừng ở C và báo; mục tiêu
 * bot giỏi ≥ 85% ở C ghi bằng `it.fails` (đổi thành `it` khi có phương án đạt).
 *
 * Phương án C (8, 12, 12 lượt), mốc điểm của spec 600 / 1000 / 1400 (hầu như mọi ván đều Vàng):
 *  - bot giỏi: điểm TB 1.737,9; xong 0 / 1 / 2 / 3 cây: 5 / 34 / 124 / 137 ván; chưa đạt / Đồng / Bạc / Vàng 0 / 0 / 2 / 298;
 *  - bot trung bình: điểm TB 1.699,7; 7 / 60 / 132 / 101 ván; 0 / 0 / 2 / 298;
 *  - bot ngẫu nhiên: điểm TB 1.643,1; 32 / 86 / 137 / 45 ván; 0 / 0 / 6 / 294.
 * Mốc theo nghĩa: điểm hầu như không phụ thuộc số cây xong (lá nổ khoảng 1.200 điểm; ô cây và lượt dư chỉ thêm vài trăm), nên điểm của các ván xong 0, 1, 2, 3 cây chồng lên nhau (bảng in ở test dưới).
 * Quét mọi bội số 50: không giá trị nào cho Vàng (≥ 90% ván xong 3 cây đạt, ≤ 10% ván xong ≤ 2 cây đạt), Bạc (ván xong 2 cây / ≤ 1 cây) hay Đồng (ván xong 1 cây / 0 cây). Báo số liệu, không đặt mốc mới.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */

const GAMES = 300;
const spec = MATCH3_SPEC;
const roundMean = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;
const treesDone = (r: Match3SimResult) => r.done.filter(Boolean).length;
const pct = (sorted: readonly number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const fmt = (x: number, digits = 1) => x.toFixed(digits);

/** Tỉ lệ ván trong `games` có điểm ≥ mốc. */
const reach = (games: readonly Match3SimResult[], mark: number) => (games.length === 0 ? 0 : games.filter((g) => g.score >= mark).length / games.length);

/**
 * Quét bội số 50: mốc cho một bậc "đạt" nếu ≥ 90% ván xong đúng `trees` cây đạt mốc và ≤ 10% ván xong ít hơn `trees` cây đạt mốc.
 */
function feasibleMarks(pooled: readonly Match3SimResult[], trees: 1 | 2 | 3): number[] {
  const hit = pooled.filter((g) => treesDone(g) === trees);
  const miss = pooled.filter((g) => treesDone(g) < trees);
  const marks: number[] = [];
  for (let m = 0; m <= 3600; m += 50) if (reach(hit, m) >= 0.9 && reach(miss, m) <= 0.1) marks.push(m);
  return marks;
}

describe('cân bằng màn 11: 300 ván mỗi bot (seed 1 đến 300), phương án C', () => {
  const good = simulateMany(GOOD_BOT, spec, GAMES);
  const average = simulateMany(AVERAGE_BOT, spec, GAMES);
  const random = simulateMany(RANDOM_BOT, spec, GAMES);
  const bots = [
    ['giỏi', good],
    ['trung bình', average],
    ['ngẫu nhiên', random],
  ] as const;
  const pooled = [...good.results, ...average.results, ...random.results];
  const count = (r: { results: Match3SimResult[] }) => [0, 1, 2, 3].map((n) => r.results.filter((g) => treesDone(g) === n).length);
  const allThree = (r: { results: Match3SimResult[] }) => count(r)[3] / GAMES;

  it('in bảng: số ván xong 0 / 1 / 2 / 3 cây, điểm trung bình, tỉ lệ từng mốc (mốc spec 600 / 1000 / 1400)', () => {
    const lines = bots.map(([name, r]) => {
      const s = r.summary;
      const medalRate = s.medals.map((n) => `${fmt((n / GAMES) * 100)}%`).join(' / ');
      const spare = [0, 1, 2].map((i) => fmt(roundMean(r.results.map((x) => x.turnsLeft[i] ?? 0)))).join(' / ');
      return `${name}: xong 0/1/2/3 cây ${count(r).join(' / ')} (cả 3 cây ${fmt(allThree(r) * 100)}%), điểm TB ${fmt(s.mean)} (${s.min} đến ${s.max}), chưa đạt/Đồng/Bạc/Vàng ${medalRate}, lượt dư ${spare}, ${s.meanShuffles.toFixed(2)} lần xáo`;
    });
    console.info(`\n${lines.join('\n')}`);
    expect(lines).toHaveLength(3);
  });

  it('in bảng điểm theo số cây xong (cả 3 bot gộp, 900 ván): p10, trung vị, p90', () => {
    const lines = [0, 1, 2, 3].map((n) => {
      const scores = pooled.filter((g) => treesDone(g) === n).map((g) => g.score).sort((a, b) => a - b);
      return `xong ${n} cây: ${scores.length} ván, p10 ${pct(scores, 0.1)}, trung vị ${pct(scores, 0.5)}, p90 ${pct(scores, 0.9)} (${scores[0]} đến ${scores[scores.length - 1]})`;
    });
    console.info(`\n${lines.join('\n')}`);
    expect(lines).toHaveLength(4);
    expect(pooled).toHaveLength(900);
  });

  it('mục tiêu 2: bot ngẫu nhiên xong cả 3 cây ≤ 40% (đạt: 15,0%)', () => {
    expect(allThree(random)).toBeLessThanOrEqual(0.4);
    expect(count(random)).toEqual([32, 86, 137, 45]);
  });

  // KHÔNG đạt ở cả A, B, C (xem đầu file): đổi thành `it` khi có phương án đạt.
  it.fails('mục tiêu 1: bot giỏi xong cả 3 cây ≥ 85% (C chỉ đạt 45,7%)', () => {
    expect(allThree(good)).toBeGreaterThanOrEqual(0.85);
  });

  it('số liệu đã ghi ở đầu file: điểm trung bình và số ván xong 0 / 1 / 2 / 3 cây của phương án C', () => {
    expect(good.summary.mean).toBeCloseTo(1737.9, 0);
    expect(average.summary.mean).toBeCloseTo(1699.7, 0);
    expect(random.summary.mean).toBeCloseTo(1643.1, 0);
    expect(count(good)).toEqual([5, 34, 124, 137]);
    expect(count(average)).toEqual([7, 60, 132, 101]);
    expect(count(random)).toEqual([32, 86, 137, 45]);
  });

  it('mốc theo nghĩa: không bội số 50 nào cho Vàng, Bạc hay Đồng thỏa ≥ 90% và ≤ 10% (điểm các ván xong 0 đến 3 cây chồng lên nhau); giữ mốc 600 / 1000 / 1400 của spec', () => {
    expect(feasibleMarks(pooled, 3)).toEqual([]); // Vàng
    expect(feasibleMarks(pooled, 2)).toEqual([]); // Bạc
    expect(feasibleMarks(pooled, 1)).toEqual([]); // Đồng
    expect(spec.medals).toEqual([600, 1000, 1400]);
    expect(good.summary.medals).toEqual([0, 0, 2, 298]);
    expect(average.summary.medals).toEqual([0, 0, 2, 298]);
    expect(random.summary.medals).toEqual([0, 0, 6, 294]);
  });

  it('điểm trong khoảng hợp lệ và luôn tính đúng công thức', () => {
    for (const g of pooled) {
      expect(g.score).toBeGreaterThanOrEqual(0);
      expect(g.score).toBeLessThanOrEqual(3600); // 1.000 ô cây + thưởng dư tối đa 1.000 + khoảng 1.600 điểm lá nổ
      expect(g.slotsFilled).toBeLessThanOrEqual(20);
      expect(medalOf(g.score, spec.medals)).toBeGreaterThanOrEqual(0);
    }
  });

  it('thứ tự mức: bot giỏi không kém bot trung bình, bot trung bình không kém bot ngẫu nhiên (số ván xong cả 3 cây và điểm trung bình)', () => {
    expect(allThree(good)).toBeGreaterThanOrEqual(allThree(average));
    expect(allThree(average)).toBeGreaterThanOrEqual(allThree(random));
    expect(good.summary.mean).toBeGreaterThanOrEqual(average.summary.mean);
    expect(average.summary.mean).toBeGreaterThanOrEqual(random.summary.mean);
  });

  it('ba phương án đã thử: càng ít lượt càng ít ván xong cả 3 cây (bot ngẫu nhiên, 300 ván); A 59,0% > 40%, B 35,7% và C 15,0% ≤ 40%', () => {
    const rate = (v: Match3Variant) => {
      const r = simulateMany(RANDOM_BOT, match3Variant(v), GAMES);
      return r.results.filter((g) => treesDone(g) === 3).length / GAMES;
    };
    const a = rate('A');
    const b = rate('B');
    expect(a).toBeGreaterThan(0.4);
    expect(b).toBeLessThanOrEqual(0.4);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(allThree(random));
    expect(a).toBeCloseTo(177 / 300, 3);
    expect(b).toBeCloseTo(107 / 300, 3);
  });

  it('bot giỏi: A đạt mục tiêu 1 (260 / 300 = 86,7% ≥ 85%) nhưng B (215) và C (137) thì không', () => {
    const n = (v: Match3Variant) => simulateMany(GOOD_BOT, match3Variant(v), GAMES).results.filter((g) => treesDone(g) === 3).length;
    expect(n('A')).toBe(260);
    expect(n('B')).toBe(215);
    expect(n('A') / GAMES).toBeGreaterThanOrEqual(0.85);
    expect(n('B') / GAMES).toBeLessThan(0.85);
  });
});
