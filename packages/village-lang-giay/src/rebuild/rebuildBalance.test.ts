import { describe, expect, it } from 'vitest';
import { REBUILD_SPEC } from './rebuildConfig';
import { AVERAGE_BOT, AVERAGE_BOT_CLEAN, GOOD_BOT, simulateMany, simulateRebuild } from './rebuildBots';

/**
 * Cân bằng màn 3 sau bước X3 (vào vòng 3 được hồi đủ 3 tim; Vàng hạ xuống 500; mốc 200 / 400 / 500): 300 ván mỗi bot, seed 1 đến 300.
 *
 * Kết quả đã chạy (xem cả bảng trong spec 05):
 *  - bot giỏi (vòng 3 sửa trong 3 đến 4 giây, không sai): 12 lần tráo × 25, tổng 100 + 130 + 300 = 530 ở cả 300 ván → 100% Vàng, không ván nào hết tim;
 *  - bot trung bình CHÍNH (từ bước X3: có sai ở vòng 1, 2 — 8% đặt nhầm thẻ, 15% đặt thẳng trang giả vào chuỗi; vòng 3 sửa trong 6 đến 9 giây, 15% kéo nhầm trang thật vào rổ):
 *    điểm trung bình 396,7; chưa đạt 7,7%, Đồng 15,7%, Bạc 76,7%, Vàng 0%; hết tim 30,3% (91 ván: 23 ở vòng 1, 2 và 68 ở vòng 3) — MỤC TIÊU ≤ 25% CHƯA ĐẠT;
 *  - bot trung bình chơi hoàn hảo vòng 1, 2 (bot trung bình của bước X2b): điểm trung bình 430,1; Đồng 15,0%, Bạc 85,0%, Vàng 0%; hết tim 23,7% (71 ván).
 * Thử thêm (không đưa vào luật): vòng 3 cho 4 tim thì bot trung bình chính hết tim 15,7% (47 ván); bỏ phạt "đầy 3 ô" thì không đổi (91 ván): hết tim ở vòng 3 chủ yếu do kéo nhầm trang thật vào rổ.
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

  it('bot trung bình chính: chủ yếu Đồng hoặc Bạc, hầu như không Vàng; hết tim 30,3% (mục tiêu 25% chưa đạt, xem spec 05)', () => {
    expect((avg.medals.dong + avg.medals.bac) / avg.games).toBeGreaterThanOrEqual(0.8);
    expect(avg.medals.vang / avg.games).toBeLessThan(0.1);
    expect(avg.diedByHearts / avg.games).toBeLessThanOrEqual(0.31);
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
    expect(good.mean).toBe(530);
    expect(avg.mean).toBeCloseTo(396.7, 1);
    expect(avg.medals).toEqual({ chua: 23, dong: 47, bac: 230, vang: 0 });
    expect(avg.diedByHearts).toBe(91);
    expect(clean.mean).toBeCloseTo(430.13, 1);
    expect(clean.medals).toEqual({ chua: 0, dong: 45, bac: 255, vang: 0 });
    expect(clean.diedByHearts).toBe(71);
  });
});
