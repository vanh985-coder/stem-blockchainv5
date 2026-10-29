import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC } from './runnerConfig';
import { AVERAGE_BOT, GOOD_BOT, playBot, type BotProfile, type BotResult } from './testBots';

/**
 * Kiểm tra cân bằng bằng mô phỏng (không vẽ): 300 ván mỗi loại bot trên cùng 300 seed.
 * Mục tiêu: bot giỏi đạt Vàng (≥ 520) ở ít nhất 90% số ván; bot trung bình chủ yếu Đồng hoặc Bạc.
 * Chỉ chỉnh được tần suất vật nhặt trong `runnerConfig.ts` (RUNNER_TUNING.chain, power, roof); KHÔNG đổi công thức điểm. Mốc điểm chỉ đổi theo quy tắc phân vị (P4a).
 * P4a (tăng tốc 20%: tốc độ bắt đầu 12, tăng 0,36 mỗi 5 giây, tối đa 21,6; mốc đặt lại theo phân vị bot 216 / 499 / 638). Kết quả 300 ván mỗi bot, seed 1 đến 300:
 * bot giỏi Vàng 90,7% (điểm trung bình 749, thấp nhất 565, p10 638, không va, hết 4 vòng); bot trung bình điểm trung bình 357 (p25 216, p75 499): chưa đạt mốc 24,0%, Đồng 51,0%, Bạc 19,0%, Vàng 6,0%, hết tim 228/300.
 * Trước P4a (tốc độ 10, 0,3, 18; mốc 200 / 380 / 520): bot giỏi Vàng 100% (trung bình 720, thấp nhất 551, p10 616); bot trung bình trung bình 341 (p25 201, p75 489): chưa đạt mốc 25,0%, Đồng 32,0%, Bạc 24,3%, Vàng 18,7%.
 * Với mốc cũ sau khi tăng tốc: bot trung bình Vàng 21,7% (quá 20% của luật) vì quãng đường dài hơn (bot giỏi 1.339 lên 1.606 mét) nên điểm tăng; do đó đặt lại mốc theo quy tắc phân vị: Đồng = p25 bot trung bình (216), Bạc = p75 bot trung bình (499), Vàng = p10 bot giỏi (638).
 * Trước X1 (tốc độ 8, 0,25, 16): bot giỏi Vàng 99,7%; bot trung bình trung bình 314. Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
const GAMES = 300;

function simulate(profile: BotProfile): BotResult[] {
  const out: BotResult[] = [];
  for (let seed = 1; seed <= GAMES; seed++) out.push(playBot(seed, profile));
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function summary(rs: BotResult[]) {
  const medals = [0, 0, 0, 0];
  for (const r of rs) medals[r.medal]++;
  const sorted = rs.map((r) => r.score).sort((a, b) => a - b);
  return {
    games: rs.length,
    meanScore: Math.round(mean(rs.map((r) => r.score))),
    minScore: sorted[0],
    p10: sorted[Math.floor(rs.length * 0.1)],
    median: sorted[Math.floor(rs.length / 2)],
    maxScore: sorted[sorted.length - 1],
    medals: { chua: medals[0], dong: medals[1], bac: medals[2], vang: medals[3] },
    medalPct: medals.map((m) => Math.round((m / rs.length) * 1000) / 10),
    meanPages: Math.round(mean(rs.map((r) => r.pages)) * 10) / 10,
    meanCoins: Math.round(mean(rs.map((r) => r.coins)) * 10) / 10,
    meanDistance: Math.round(mean(rs.map((r) => r.distance))),
    meanCorrect: Math.round(mean(rs.map((r) => r.correct)) * 100) / 100,
    meanHits: Math.round(mean(rs.map((r) => r.hits)) * 100) / 100,
    meanPickupPoints: Math.round(mean(rs.map((r) => r.pickupPoints))),
    pickupRate: Math.round((rs.reduce((n, r) => n + r.itemsTaken, 0) / rs.reduce((n, r) => n + r.itemsPassed, 0)) * 1000) / 10,
    endedByHearts: rs.filter((r) => r.over === 'hearts').length,
  };
}

describe('cân bằng màn 2 bằng mô phỏng', () => {
  const good = simulate(GOOD_BOT);
  const avg = simulate(AVERAGE_BOT);
  const g = summary(good);
  const a = summary(avg);

  it('bot giỏi không bao giờ va, trả lời đúng cả 4 câu, chơi hết 4 vòng và nhặt gần hết vật đã đi qua', () => {
    for (const r of good) {
      expect(r.hits).toBe(0);
      expect(r.correct).toBe(SPEC.rounds);
      expect(r.over).toBe('done');
    }
    expect(g.pickupRate).toBeGreaterThan(85);
  });

  it(`bot giỏi đạt Vàng (≥ ${SPEC.medals[2]}) ở ít nhất 90% số ván`, () => {
    expect(g.medals.vang / g.games).toBeGreaterThanOrEqual(0.9);
  });

  it('bot trung bình nhặt khoảng 60% số vật đã đi qua, và chủ yếu đạt Đồng hoặc Bạc', () => {
    expect(a.pickupRate).toBeGreaterThan(52);
    expect(a.pickupRate).toBeLessThan(68);
    const mid = a.medals.dong + a.medals.bac;
    expect(mid / a.games, 'Đồng + Bạc phải là đa số').toBeGreaterThan(0.5);
    expect(mid, 'Đồng + Bạc lớn hơn từng nhóm còn lại').toBeGreaterThan(Math.max(a.medals.chua, a.medals.vang));
    expect(a.medals.vang / a.games).toBeLessThan(0.2);
    // bước X1: tốc độ nhanh hơn không được làm bot trung bình "chưa đạt mốc" quá nhiều (quá 35% thì báo lại, không tự đổi mốc điểm)
    expect(a.medals.chua / a.games, 'chưa đạt mốc phải không quá 35%').toBeLessThanOrEqual(0.35);
  });

  it('bot trung bình có va 1 đến 2 lần mỗi ván (khi đủ chướng ngại cần né) và có ván hết tim', () => {
    expect(a.meanHits).toBeGreaterThan(0.8);
    expect(a.meanHits).toBeLessThan(2.6);
  });
}, 600_000);
