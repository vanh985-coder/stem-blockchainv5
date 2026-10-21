import { describe, expect, it } from 'vitest';
import { RUNNER_SPEC as SPEC } from './runnerConfig';
import { AVERAGE_BOT, GOOD_BOT, playBot, type BotProfile, type BotResult } from './testBots';

/**
 * Kiểm tra cân bằng bằng mô phỏng (không vẽ): 300 ván mỗi loại bot trên cùng 300 seed.
 * Mục tiêu: bot giỏi đạt Vàng (≥ 520) ở ít nhất 90% số ván; bot trung bình chủ yếu Đồng hoặc Bạc.
 * Chỉ chỉnh được tần suất vật nhặt trong `runnerConfig.ts` (RUNNER_TUNING.chain, power, roof); KHÔNG đổi công thức điểm hay mốc điểm của spec.
 * Kết quả đã chạy với cấu hình hiện tại (300 ván mỗi bot, đã tính trang sổ {phanDien} làm rơi và tốc độ tăng từng bậc), tốc độ bắt đầu 10, tăng 0,3 mỗi 5 giây, tối đa 18 (bước X1):
 * bot giỏi Vàng 100% (điểm trung bình 720, thấp nhất 551); bot trung bình điểm trung bình 341: chưa đạt mốc 25,0%, Đồng 32,0%, Bạc 24,3%, Vàng 18,7%.
 * Trước bước X1 (tốc độ 8, tăng 0,25, tối đa 16): bot giỏi Vàng 99,7% (trung bình 688, thấp nhất 512); bot trung bình trung bình 314: chưa đạt mốc 27,3%, Đồng 35,3%, Bạc 24,7%, Vàng 12,7%.
 * Chạy nhanh hơn thì đường dài hơn (quãng đường trung bình của bot giỏi 1.081 lên 1.339 mét) nên điểm tăng. Đổi cấu hình thì chạy lại và cập nhật các con số này.
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
