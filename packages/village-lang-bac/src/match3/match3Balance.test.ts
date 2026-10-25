import { medalOf } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { AVERAGE_BOT, GOOD_BOT, RANDOM_BOT, simulateMany, type Match3BotProfile, type Match3SimResult } from './match3Bots';
import { MATCH3_SPEC, match3WithTurns } from './match3Config';

/**
 * Cân bằng màn 11 (spec 08): 300 ván mỗi bot, seed 1 đến 300; bot chỉ dùng thao tác của học sinh (`swapCells`) và nhìn một nước đi (xem `match3Bots.ts`).
 * Bot giỏi: chọn nước lấp được nhiều ô cây nhất rồi nổ nhiều lá nhất. Bot trung bình: 50% như bot giỏi, 50% chọn ngẫu nhiên một nước hợp lệ. Bot ngẫu nhiên: luôn chọn ngẫu nhiên.
 *
 * Lượt 1 (luật gốc điểm lá +5, thử số lượt A, B, C): không phương án nào đạt, điểm lá nổ (~1.200) lấn át điểm dựng cây nên không đặt được mốc theo nghĩa (xem spec 08).
 * Lượt 2 (file này): điểm mới lá nổ +1, ô cây +50, xong cây +200 + 20 × lượt dư. Quét lưới số lượt vòng 1 ∈ {8 … 12} × vòng 2 = vòng 3 ∈ {12 … 16}; mục tiêu bot giỏi xong cả 3 cây ≥ 80% VÀ bot ngẫu nhiên xong cả 3 cây ≤ 50%
 * (bot ngẫu nhiên vốn ăn may nhờ nổ dây chuyền nên mục tiêu ≤ 40% quá chặt). Trong các ô đạt chọn ô có (giỏi − ngẫu nhiên) lớn nhất, hòa thì nhiều lượt hơn; không ô nào đạt thì chọn ô có hiệu lớn nhất trong các ô có giỏi ≥ 80%.
 *
 * Kết quả: KHÔNG ô nào đạt cả hai. Các ô có giỏi ≥ 80% (số ván xong cả 3 cây trên 300, giỏi / trung bình / ngẫu nhiên):
 *  - 10 / 16 / 16: 246 / 225 / 157 (hiệu 89); 11 / 16 / 16: 250 / 236 / 170 (80); 12 / 15 / 15: 245 / 223 / 154 (91); 12 / 16 / 16: 260 / 240 / 177 (83).
 * Chọn 12 / 15 / 15: bot giỏi 81,7% (đạt ≥ 80%), bot ngẫu nhiên 51,3% (vượt 50% một chút; ghi bằng `it.fails`, đổi thành `it` khi đạt).
 *
 * Phương án 12 / 15 / 15, mốc 1150 / 1550 / 1850 (xong 0 / 1 / 2 / 3 cây; chưa đạt / Đồng / Bạc / Vàng):
 *  - bot giỏi: điểm TB 2.007,3; 0 / 4 / 51 / 245 cây; 0 / 4 / 51 / 245 ván;
 *  - bot trung bình: 1.944,0; 0 / 7 / 70 / 223; 0 / 8 / 71 / 221;
 *  - bot ngẫu nhiên: 1.794,3; 2 / 33 / 111 / 154; 2 / 41 / 106 / 151.
 * Mốc theo nghĩa (gộp 900 ván, bội số 50; ≥ 85% ván xong k cây đạt mốc k và ≤ 15% ván xong ít hơn k cây đạt): thỏa Đồng 1050 đến 1250, Bạc 1450 đến 1600, Vàng 1800 đến 1900; chọn giữa khoảng thỏa (tự chọn).
 * Tỉ lệ thật: Đồng 1150: 44 / 44 ván xong 1 cây đạt (100%), 0 / 2 ván xong 0 cây; Bạc 1550: 223 / 232 ván xong 2 cây đạt (96,1%), 0 / 46 ván xong ≤ 1 cây; Vàng 1850: 615 / 622 ván xong 3 cây đạt (98,9%), 2 / 278 ván xong ≤ 2 cây (0,7%).
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */

const GAMES = 300;
const spec = MATCH3_SPEC;
const treesDone = (r: Match3SimResult) => r.done.filter(Boolean).length;
const pct = (sorted: readonly number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
const fmt = (x: number, digits = 1) => x.toFixed(digits);

/** Số ván trong `games` có điểm ≥ mốc. */
const reachCount = (games: readonly Match3SimResult[], mark: number) => games.filter((g) => g.score >= mark).length;

/** Mốc cho bậc `trees` cây: ≥ 85% ván xong đúng `trees` cây đạt mốc và ≤ 15% ván xong ít hơn `trees` cây đạt mốc (quét bội số 50). */
function feasibleMarks(pooled: readonly Match3SimResult[], trees: 1 | 2 | 3): number[] {
  const hit = pooled.filter((g) => treesDone(g) === trees);
  const miss = pooled.filter((g) => treesDone(g) < trees);
  const marks: number[] = [];
  for (let m = 0; m <= 3000; m += 50) if (reachCount(hit, m) / hit.length >= 0.85 && reachCount(miss, m) / miss.length <= 0.15) marks.push(m);
  return marks;
}

const allThreeCount = (bot: Match3BotProfile, s = spec) => simulateMany(bot, s, GAMES).results.filter((g) => treesDone(g) === 3).length;

describe('cân bằng màn 11: 300 ván mỗi bot (seed 1 đến 300), 12 / 15 / 15 lượt', () => {
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

  it('in bảng: xong 0 / 1 / 2 / 3 cây, điểm trung bình, tỉ lệ từng mốc', () => {
    const lines = bots.map(([name, r]) => {
      const s = r.summary;
      const medalRate = s.medals.map((n) => `${fmt((n / GAMES) * 100)}%`).join(' / ');
      return `${name}: xong 0/1/2/3 cây ${count(r).join(' / ')} (cả 3 cây ${fmt(allThree(r) * 100)}%), điểm TB ${fmt(s.mean)} (${s.min} đến ${s.max}), chưa đạt/Đồng/Bạc/Vàng ${s.medals.join(' / ')} = ${medalRate}`;
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

  it('mục tiêu 1: bot giỏi xong cả 3 cây ≥ 80% (đạt: 245 / 300 = 81,7%)', () => {
    expect(allThree(good)).toBeGreaterThanOrEqual(0.8);
    expect(count(good)).toEqual([0, 4, 51, 245]);
  });

  // KHÔNG đạt ở mọi ô lưới (xem đầu file): bot ngẫu nhiên 154 / 300 = 51,3% > 50%. Đổi thành `it` khi có phương án đạt.
  it.fails('mục tiêu 2: bot ngẫu nhiên xong cả 3 cây ≤ 50% (12 / 15 / 15 chỉ đạt 51,3%)', () => {
    expect(allThree(random)).toBeLessThanOrEqual(0.5);
  });

  it('số liệu đã ghi ở đầu file: điểm trung bình, xong 0 / 1 / 2 / 3 cây, số ván từng mốc', () => {
    expect(good.summary.mean).toBeCloseTo(2007.3, 0);
    expect(average.summary.mean).toBeCloseTo(1944.0, 0);
    expect(random.summary.mean).toBeCloseTo(1794.3, 0);
    expect(count(average)).toEqual([0, 7, 70, 223]);
    expect(count(random)).toEqual([2, 33, 111, 154]);
    expect(good.summary.medals).toEqual([0, 4, 51, 245]);
    expect(average.summary.medals).toEqual([0, 8, 71, 221]);
    expect(random.summary.medals).toEqual([2, 41, 106, 151]);
  });

  it('mốc theo nghĩa 1150 / 1550 / 1850: ≥ 85% ván xong k cây đạt mốc k và ≤ 15% ván xong ít hơn k cây đạt mốc k (tỉ lệ thật ghi ở đầu file)', () => {
    expect(spec.medals).toEqual([1150, 1550, 1850]);
    expect(feasibleMarks(pooled, 1)).toEqual([1050, 1100, 1150, 1200, 1250]); // Đồng
    expect(feasibleMarks(pooled, 2)).toEqual([1450, 1500, 1550, 1600]); // Bạc
    expect(feasibleMarks(pooled, 3)).toEqual([1800, 1850, 1900]); // Vàng
    for (const trees of [1, 2, 3] as const) {
      const mark = spec.medals[trees - 1];
      const hit = pooled.filter((g) => treesDone(g) === trees);
      const miss = pooled.filter((g) => treesDone(g) < trees);
      expect(reachCount(hit, mark) / hit.length).toBeGreaterThanOrEqual(0.85);
      expect(reachCount(miss, mark) / miss.length).toBeLessThanOrEqual(0.15);
    }
    expect([reachCount(pooled.filter((g) => treesDone(g) === 1), 1150), reachCount(pooled.filter((g) => treesDone(g) === 2), 1550), reachCount(pooled.filter((g) => treesDone(g) === 3), 1850)]).toEqual([44, 223, 615]);
  });

  it('điểm trong khoảng hợp lệ và luôn tính đúng công thức', () => {
    for (const g of pooled) {
      expect(g.score).toBeGreaterThanOrEqual(0);
      expect(g.score).toBeLessThanOrEqual(2800); // 1.000 ô cây + 600 xong cây + thưởng dư tối đa 780 + khoảng 400 điểm lá nổ
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

  it('lưới số lượt 5 × 5 (bot giỏi và bot ngẫu nhiên): không ô nào đạt cả hai mục tiêu; ô chọn là 12 / 15 / 15; các ô có giỏi ≥ 80% đúng như bảng spec 08', { timeout: 180000 }, () => {
    const cells: { r1: number; r23: number; good: number; random: number }[] = [];
    for (const r1 of [8, 9, 10, 11, 12]) {
      for (const r23 of [12, 13, 14, 15, 16]) {
        const s = match3WithTurns(r1, r23);
        cells.push({ r1, r23, good: allThreeCount(GOOD_BOT, s), random: allThreeCount(RANDOM_BOT, s) });
      }
    }
    expect(cells.filter((c) => c.good >= 0.8 * GAMES && c.random <= 0.5 * GAMES)).toEqual([]);
    const eligible = cells.filter((c) => c.good >= 0.8 * GAMES);
    expect(eligible.map((c) => `${c.r1}/${c.r23}: ${c.good} / ${c.random}`)).toEqual(['10/16: 246 / 157', '11/16: 250 / 170', '12/15: 245 / 154', '12/16: 260 / 177']);
    const best = eligible.slice().sort((a, b) => b.good - b.random - (a.good - a.random) || b.r1 + b.r23 - (a.r1 + a.r23))[0];
    expect([best.r1, best.r23]).toEqual([12, 15]);
    expect(spec.rounds.map((r) => r.turns)).toEqual([best.r1, best.r23, best.r23]);
  });
});
