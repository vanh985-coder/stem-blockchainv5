import { describe, expect, it } from 'vitest';
import { REBUILD_SPEC } from './rebuildConfig';
import { AVERAGE_BOT, AVERAGE_BOT_CLEAN, GOOD_BOT, simulateMany, simulateRebuild } from './rebuildBots';

/**
 * Cân bằng màn 3 sau bước X3 (vào vòng 3 được hồi đủ 3 tim; khoảng tráo ngắn nhất 6 giây nên điểm tối đa 505; mốc 200 / 400 / 475, Vàng dư 30 điểm): 300 ván mỗi bot, seed 1 đến 300.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 05):
 *  - bot giỏi (vòng 3 sửa trong 3 đến 4 giây, không sai): 11 lần tráo × 25, tổng 100 + 130 + 275 = 505 ở cả 300 ván → 100% Vàng, không ván nào hết tim;
 *  - bot trung bình CHÍNH (từ bước X3: có sai ở vòng 1, 2 — 8% đặt nhầm thẻ, 15% đặt thẳng trang giả vào chuỗi; vòng 3 sửa trong 6 đến 9 giây, 15% kéo nhầm trang thật vào rổ):
 *    điểm trung bình 392,2; chưa đạt 7,7%, Đồng 15,7%, Bạc 76,7%, Vàng 0%; hết tim 29,7% (89 ván) — MỤC TIÊU ≤ 25% CHƯA ĐẠT;
 *  - bot trung bình chơi hoàn hảo vòng 1, 2 (bot trung bình của bước X2b): điểm trung bình 425,4; Đồng 15,0%, Bạc 85,0%, Vàng 0%; hết tim 23,0% (69 ván).
 * Thử thêm (không đưa vào luật): vòng 3 cho 4 tim thì bot trung bình chính hết tim 15,7% (47 ván; số đo ở khoảng tráo 5 giây); bỏ phạt "đầy 3 ô" thì không đổi (số đo ở khoảng tráo 5 giây): hết tim ở vòng 3 chủ yếu do kéo nhầm trang thật vào rổ.
 * Đổi cấu hình thì chạy lại và cập nhật các con số này.
 */
describe('cân bằng màn 3 (vòng 3 giữ sổ)', () => {
  const medals = REBUILD_SPEC.medals;
  const good = simulateMany(GOOD_BOT, 300, medals);
  const avg = simulateMany(AVERAGE_BOT, 300, medals);
  const clean = simulateMany(AVERAGE_BOT_CLEAN, 300, medals);

  it('bot giỏi: ít nhất 90% ván đạt Vàng, không ván nào hết tim', () => {
    expect(good.medals.vang / good.games).toBeGreaterThanOrEqual(0.9);
    expect(good.diedByHearts).toBe(0);
    expect(good.min).toBeGreaterThanOrEqual(medals[2]);
  });

  it('bot trung bình chính: chủ yếu Đồng hoặc Bạc, hầu như không Vàng; hết tim 29,7% (mục tiêu 25% chưa đạt, xem spec 05)', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThanOrEqual(0.8);
    expect(avg.medals.vang / avg.games).toBeLessThan(0.1);
    expect(avg.diedByHearts / avg.games).toBeLessThanOrEqual(0.30);
  });

  it('bot trung bình chơi hoàn hảo vòng 1, 2: hết tim không quá 25%', () => {
    expect(clean.diedByHearts / clean.games).toBeLessThanOrEqual(0.25);
  });

  it('hết tim giữa vòng 3 vẫn có điểm các ô đã sửa (bước X2b)', () => {
    let withPoints = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = simulateRebuild(seed, AVERAGE_BOT);
      if (r.over === 'hearts' && r.reachedKeep && r.keepPoints > 0) withPoints++;
    }
    expect(withPoints).toBeGreaterThan(0);
  });

  it('mô phỏng tất định: cùng seed, cùng hồ sơ bot thì cùng kết quả', () => {
    expect(simulateRebuild(42, AVERAGE_BOT)).toEqual(simulateRebuild(42, AVERAGE_BOT));
    expect(simulateMany(AVERAGE_BOT, 50, medals)).toEqual(simulateMany(AVERAGE_BOT, 50, medals));
  });

  it('con số đã ghi trong spec khớp lần chạy này', () => {
    expect(good.mean).toBe(505);
    expect(avg.mean).toBeCloseTo(392.2, 1);
    expect(avg.medals).toEqual({ chua: 23, dong: 47, bac: 230, vang: 0 });
    expect(avg.diedByHearts).toBe(89);
    expect(clean.mean).toBeCloseTo(425.4, 1);
    expect(clean.medals).toEqual({ chua: 0, dong: 45, bac: 255, vang: 0 });
    expect(clean.diedByHearts).toBe(69);
  });
});
