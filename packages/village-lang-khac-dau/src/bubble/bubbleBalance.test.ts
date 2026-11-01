import { medalOf } from '@so-chung/core';
import { describe, expect, it } from 'vitest';
import { BUBBLE_SPEC } from './bubbleConfig';
import { AVERAGE_BOT, GOOD_BOT, WEAK_BOT, simulateBubble, type BubbleBot } from './bubbleBots';

/**
 * Cân bằng màn 9 (spec 07): 300 ván mỗi bot, seed 1 đến 300, chỉ dùng thao tác của học sinh (xem `bubbleBots.ts`): chọn trứng ở khay nạp, chọn loại trứng, chọn góc bắn.
 * Bot giỏi: nạp sai 10% số đợt, dò góc 2 độ, lệch tay 0,4 độ, 2% phát bắn không ngắm. Bot trung bình: nạp sai 50% số đợt, dò góc 4 độ, lệch tay 2 độ, 20% phát bắn ẩu, 12% chọn loại trứng bừa.
 * Bot yếu: nạp sai 70%, dò góc 5 độ, lệch tay 3 độ, 35% bắn ẩu, 20% chọn loại bừa.
 *
 * Mốc 1200 / 2200 / 2750 (TẠM, chỉnh khi học sinh chơi thật), đặt theo phân vị: Vàng 2750 gần phân vị 5% của bot giỏi (bot giỏi ≥ 90% Vàng); Bạc 2200 gần trung vị của bot trung bình;
 * Đồng 1200 gần phân vị 10% của bot trung bình. Kết quả đã chạy ghi ở spec 07 (mục "Màn 9"); đổi cấu hình thì chạy lại và cập nhật số.
 */

const medals = BUBBLE_SPEC.medals;
const GAMES = 300;

interface Row {
  bot: string;
  mean: number;
  min: number;
  max: number;
  medal: [number, number, number, number];
  lost: number;
  heartsLost: number;
  shots: number;
  cleanLoads: number;
  rounds: number;
}

function runBot(bot: BubbleBot): Row {
  const medal: [number, number, number, number] = [0, 0, 0, 0];
  let sum = 0;
  let min = Infinity;
  let max = 0;
  let lost = 0;
  let heartsLost = 0;
  let shots = 0;
  let clean = 0;
  let rounds = 0;
  for (let seed = 1; seed <= GAMES; seed++) {
    const r = simulateBubble(seed, bot);
    medal[medalOf(r.score, medals)]++;
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.state.end === 'hearts') lost++;
    heartsLost += r.state.stats.heartsLost;
    shots += r.state.stats.shots;
    clean += r.state.stats.cleanLoads;
    rounds += r.state.stats.roundsCleared;
  }
  return { bot: bot.name, mean: sum / GAMES, min, max, medal, lost, heartsLost: heartsLost / GAMES, shots: shots / GAMES, cleanLoads: clean / GAMES, rounds: rounds / GAMES };
}

describe('bubbleBalance: 300 ván mỗi bot (seed 1 đến 300)', () => {
  const rows = new Map<string, Row>();
  for (const bot of [GOOD_BOT, AVERAGE_BOT, WEAK_BOT]) {
    it(`chạy bot ${bot.name}`, () => {
      const row = runBot(bot);
      rows.set(bot.name, row);
      const pct = (n: number) => `${((100 * n) / GAMES).toFixed(1)}%`;
      console.log(
        `[bubble] ${row.bot}: điểm TB ${row.mean.toFixed(0)} (${row.min} đến ${row.max}); chưa đạt ${pct(row.medal[0])}, Đồng ${pct(row.medal[1])}, Bạc ${pct(row.medal[2])}, Vàng ${pct(row.medal[3])}; ` +
          `hết tim ${pct(row.lost)}; tim mất TB ${row.heartsLost.toFixed(2)}; phát bắn TB ${row.shots.toFixed(1)}; đợt nạp không sai TB ${row.cleanLoads.toFixed(2)}; đợt xong TB ${row.rounds.toFixed(2)}`,
      );
      expect(row.medal.reduce((a, b) => a + b, 0)).toBe(GAMES);
    }, 240_000);
  }

  it('bot giỏi: ít nhất 90% ván đạt Vàng', () => {
    const r = rows.get('good')!;
    expect(r.medal[3] / GAMES).toBeGreaterThanOrEqual(0.9);
  });

  it('bot trung bình: chủ yếu Đồng hoặc Bạc, hầu như không Vàng (dưới 15%)', () => {
    const r = rows.get('average')!;
    expect((r.medal[1] + r.medal[2]) / GAMES).toBeGreaterThanOrEqual(0.5);
    expect(r.medal[3] / GAMES).toBeLessThan(0.15);
  });

  it('bot yếu: gần như không bao giờ Vàng, và thua nhiều hơn bot giỏi', () => {
    const w = rows.get('weak')!;
    const g = rows.get('good')!;
    expect(w.medal[3] / GAMES).toBeLessThan(0.05);
    expect(w.lost).toBeGreaterThan(g.lost);
  });
});
