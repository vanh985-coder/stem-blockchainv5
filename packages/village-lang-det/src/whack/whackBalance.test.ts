import { describe, expect, it } from 'vitest';
import { WHACK_SPEC } from './whackConfig';
import { AVERAGE_BOT, GOOD_BOT, ORACLE_BOT, simulateMany, simulateWhack } from './whackBots';

/**
 * Cân bằng màn 5 với mốc 800 / 1600 / 2400 (spec 06): 300 ván mỗi bot, seed 1 đến 300. Bot chỉ dùng thao tác của học sinh (xem `whackBots.ts`).
 * Spec ghi mốc "chỉnh lại sau khi chơi thử" nên test này KHÔNG assert ngưỡng (bot giỏi ≥ 90% Vàng, bot trung bình hầu như không Vàng): chỉ in bảng và ghim các con số đã chạy.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 06):
 *  - người chơi lý tưởng (phản xạ 0, đúng hết): điểm trung bình 3579,9 (3445 đến 3765), 143 chuột, 14,5 đồng, 10 lượt trùm → ước điểm tối đa lý thuyết khoảng 3580 (không ván nào hết tim);
 *  - bot giỏi (phản xạ 0,25 giây, đúng 95%, trả lời sau 4 giây): điểm trung bình 3080,0 (1985 đến 3485); chưa đạt 0%, Đồng 0%, Bạc 1,7%, Vàng 98,3%; thua vì đủ 5 vết mực 65,7% (197 ván, gần hết ở lượt trùm thứ 9
 *    vì chuột lọt 4 con mỗi ván cộng trùm sai) nhưng vẫn qua 2400 điểm;
 *  - bot trung bình (phản xạ 0,45 giây, bỏ sót 25% chuột, đúng 70%, trả lời sau 7 giây): điểm trung bình 295,6 (0 đến 980); chưa đạt 99,3%, Đồng 0,7%, Bạc 0%, Vàng 0%; thua vì 5 vết mực 100%,
 *    gần hết ở trước lượt trùm thứ 3 (bỏ sót 25% thì 5 vết mực tới sau khoảng 20 con chuột, tức vài chục giây đầu).
 * KẾT LUẬN: mốc 800 / 1600 / 2400 chưa khớp bot trung bình (không rơi vào Đồng/Bạc); bot giỏi đạt Vàng 98,3% (đạt). Không sửa mốc ở bước này; mốc đề xuất ghi ở spec 06.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 5', () => {
  const medals = WHACK_SPEC.medals;
  const oracle = simulateMany(ORACLE_BOT, 300, medals);
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);

  it('in bảng tỉ lệ từng mốc và điểm trung bình của cả hai bot (không assert ngưỡng; mốc chỉnh sau khi chơi thử)', () => {
    const pct = (b: typeof good, n: number) => `${((100 * n) / b.games).toFixed(1)}%`;
    const row = (name: string, b: typeof good) =>
      `${name}: chưa đạt ${pct(b, b.medals.chua)} · Đồng ${pct(b, b.medals.dong)} · Bạc ${pct(b, b.medals.bac)} · Vàng ${pct(b, b.medals.vang)} · thua 5 vết mực ${pct(b, b.lost)} · điểm trung bình ${b.mean.toFixed(1)} (${b.min} đến ${b.max}) · ${b.meanSpawned.toFixed(1)} chuột, đập ${b.meanHits.toFixed(1)}, lọt ${b.meanLeaked.toFixed(2)}, ${b.meanCoins.toFixed(1)} đồng, trùm ${b.meanBosses.toFixed(2)} (đúng ${b.meanBossCorrect.toFixed(2)})`;
    console.info(['màn 5, 300 ván mỗi bot, mốc ' + medals.join(' / '), row('lý tưởng', oracle), row('bot giỏi', good), row('bot trung bình', avg)].join('\n'));
    for (const b of [oracle, good, avg]) {
      expect(b.games).toBe(300);
      expect(b.medals.chua + b.medals.dong + b.medals.bac + b.medals.vang).toBe(300);
    }
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
    expect(oracle.mean).toBeCloseTo(3579.9, 1);
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBeCloseTo(3080.0, 1);
    expect(good.medals).toEqual({ chua: 0, dong: 0, bac: 5, vang: 295 });
    expect(good.lost).toBe(197);
    expect(avg.mean).toBeCloseTo(295.6, 1);
    expect(avg.medals).toEqual({ chua: 298, dong: 2, bac: 0, vang: 0 });
    expect(avg.lost).toBe(300);
  });
});
